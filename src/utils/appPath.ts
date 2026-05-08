const appBasePath = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '');

export function buildAppPath(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${appBasePath}${normalizedPath}`;
}

export function getAppRoutePath() {
  const pathname = window.location.pathname;

  if (appBasePath && pathname.startsWith(appBasePath)) {
    const nextPath = pathname.slice(appBasePath.length);
    return nextPath.startsWith('/') ? nextPath : `/${nextPath}`;
  }

  return pathname;
}
