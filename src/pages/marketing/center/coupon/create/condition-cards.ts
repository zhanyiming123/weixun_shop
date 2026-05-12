import {
  CouponConditionOwnershipSelection,
  CouponFormValues,
  normalizeCouponConditionSpecValues,
} from '../data';
import { ProductCatalogCascaderOption } from '@/pages/product/catalog/data';

export type CouponConditionCardDraft = {
  catalogPath: string[];
  ownershipPaths: string[][];
  specAttributeId?: string;
  specValue?: string[];
};

function clonePath(path: string[]) {
  return [...path];
}

function clonePathList(paths: string[][]) {
  return paths.map(clonePath);
}

function getPathKey(path: string[]) {
  return path.join('__');
}

function hasConditionSelectionContent(selection: CouponConditionOwnershipSelection) {
  return Boolean(
    selection.ownershipPaths.length ||
      selection.specAttributeId ||
      normalizeCouponConditionSpecValues(selection.specValue).length
  );
}

export function createEmptyConditionCardDraft(): CouponConditionCardDraft {
  return {
    catalogPath: [],
    ownershipPaths: [],
  };
}

export function buildConditionCardDrafts(
  conditionCategoryPaths: string[][],
  conditionOwnershipSelections: CouponConditionOwnershipSelection[]
) {
  const categoryPathKeySet = new Set(conditionCategoryPaths.map(getPathKey));
  const selectionMap = new Map(
    conditionOwnershipSelections.map((item) => [getPathKey(item.catalogPath), item])
  );

  const orderedCards = conditionCategoryPaths.map((catalogPath) => {
    const matchedSelection = selectionMap.get(getPathKey(catalogPath));
    const specValues = normalizeCouponConditionSpecValues(matchedSelection?.specValue);

    return {
      catalogPath: clonePath(catalogPath),
      ownershipPaths: clonePathList(matchedSelection?.ownershipPaths || []),
      specAttributeId: matchedSelection?.specAttributeId,
      specValue: specValues.length ? specValues : undefined,
    };
  });

  const fallbackCards = conditionOwnershipSelections
    .filter((item) => !categoryPathKeySet.has(getPathKey(item.catalogPath)))
    .map((item) => {
      const specValues = normalizeCouponConditionSpecValues(item.specValue);

      return {
        catalogPath: clonePath(item.catalogPath),
        ownershipPaths: clonePathList(item.ownershipPaths),
        specAttributeId: item.specAttributeId,
        specValue: specValues.length ? specValues : undefined,
      };
    });

  return [...orderedCards, ...fallbackCards];
}

export function buildConditionFormStateFromCardDrafts(
  cards: CouponConditionCardDraft[]
): Pick<CouponFormValues, 'conditionCategoryPaths' | 'conditionOwnershipSelections'> {
  const validCards = cards.filter((item) => item.catalogPath.length > 0);
  const conditionCategoryPaths = validCards.map((item) => clonePath(item.catalogPath));
  const conditionOwnershipSelections = validCards
    .map((item) => {
      const specValues = normalizeCouponConditionSpecValues(item.specValue);

      return {
        catalogPath: clonePath(item.catalogPath),
        ownershipPaths: clonePathList(item.ownershipPaths),
        specAttributeId: item.specAttributeId,
        specValue: specValues.length ? specValues : undefined,
      };
    })
    .filter(hasConditionSelectionContent);

  return {
    conditionCategoryPaths,
    conditionOwnershipSelections,
  };
}

export function buildConditionCatalogOptions(
  options: ProductCatalogCascaderOption[],
  selectedCatalogPaths: string[][],
  currentCatalogPath: string[] = []
) {
  const selectedPathKeySet = new Set(
    selectedCatalogPaths
      .filter((path) => path.length > 0 && getPathKey(path) !== getPathKey(currentCatalogPath))
      .map(getPathKey)
  );

  function markOptions(
    currentOptions: ProductCatalogCascaderOption[],
    parentPath: string[] = []
  ): ProductCatalogCascaderOption[] {
    return currentOptions.map((item) => {
      const nextPath = [...parentPath, item.value];
      const nextChildren = item.children?.length
        ? markOptions(item.children, nextPath)
        : undefined;
      const disabled = nextChildren?.length
        ? nextChildren.every((child) => Boolean(child.disabled))
        : selectedPathKeySet.has(getPathKey(nextPath));

      return {
        ...item,
        disabled,
        children: nextChildren,
      };
    });
  }

  return markOptions(options);
}
