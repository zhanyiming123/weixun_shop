const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const RULES = [
  {
    name: 'utils must not depend on pages',
    directory: path.join(SRC, 'utils'),
    forbiddenDirs: [path.join(SRC, 'pages')],
    allowlist: ['src/utils/organization.ts'],
  },
  {
    name: 'services must not depend on pages/components',
    directory: path.join(SRC, 'services'),
    forbiddenDirs: [path.join(SRC, 'pages'), path.join(SRC, 'components')],
    allowlist: [],
  },
  {
    name: 'repositories must not depend on pages/components/services',
    directory: path.join(SRC, 'repositories'),
    forbiddenDirs: [
      path.join(SRC, 'pages'),
      path.join(SRC, 'components'),
      path.join(SRC, 'services'),
    ],
    allowlist: [],
  },
];

function walkFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }

    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractImports(line) {
  const specs = [];
  const patterns = [/from\s+['"]([^'"]+)['"]/g, /import\(\s*['"]([^'"]+)['"]\s*\)/g];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(line)) !== null) {
      specs.push(match[1]);
    }
  }

  return specs;
}

function resolveImportPath(fromFile, spec) {
  if (spec.startsWith('@/')) {
    return path.resolve(SRC, spec.slice(2));
  }

  if (spec.startsWith('.')) {
    return path.resolve(path.dirname(fromFile), spec);
  }

  return null;
}

function isInside(targetPath, basePath) {
  return targetPath === basePath || targetPath.startsWith(`${basePath}${path.sep}`);
}

function normalizePath(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

const violations = [];

for (const rule of RULES) {
  const files = walkFiles(rule.directory);
  const allowlistSet = new Set(rule.allowlist);

  for (const file of files) {
    const relativeFile = normalizePath(file);
    if (allowlistSet.has(relativeFile)) {
      continue;
    }

    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

    lines.forEach((line, index) => {
      const specs = extractImports(line);
      if (!specs.length) {
        return;
      }

      for (const spec of specs) {
        const resolved = resolveImportPath(file, spec);
        if (!resolved) {
          continue;
        }

        const hit = rule.forbiddenDirs.find((forbiddenDir) => isInside(resolved, forbiddenDir));
        if (!hit) {
          continue;
        }

        violations.push({
          rule: rule.name,
          file: relativeFile,
          line: index + 1,
          importSpec: spec,
          forbidden: normalizePath(hit),
        });
      }
    });
  }
}

if (violations.length > 0) {
  console.error('Architecture violations found:');
  violations.forEach((item) => {
    console.error(
      `- [${item.rule}] ${item.file}:${item.line} imports "${item.importSpec}" (forbidden target: ${item.forbidden})`
    );
  });
  process.exit(1);
}

console.log('Architecture check passed.');
