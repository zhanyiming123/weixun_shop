import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Cascader,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Message,
  Radio,
  Select,
  Switch,
  Typography,
} from '@arco-design/web-react';
import { IconDelete, IconPlus } from '@arco-design/web-react/icon';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import styles from './index.module.less';
import {
  buildCouponFormValuesFromRecord,
  buildMarketingProductSelectorSpus,
  buildCreateValuesFromCoupon,
  COUPON_DISCOUNT_OPTIONS,
  CouponDetailRecord,
  CouponDiscountType,
  CouponEditRuleSet,
  CouponFormValues,
  COUPON_STACKING_TYPE_OPTIONS,
  getCreatePageProductScopeOptions,
  getCouponEditRuleSet,
  getCreatePageDefaultStackingCouponType,
  isCouponEditableStatus,
  isCouponEditFieldEditable,
  getCouponOwnershipType,
  normalizeCouponConditionSpecValues,
  CouponPageMode,
  CouponProductScope,
  CouponStackingType,
  CouponValidityType,
  DEFAULT_COUPON_FORM_VALUES,
  isAllCouponStoresSelected,
  normalizeCouponStoreIds,
  PRODUCT_SCOPE_OPTIONS,
  readCouponById,
  updateCouponById,
  VALIDITY_TYPE_OPTIONS,
} from '../data';
import {
  buildProductCatalogCascaderOptions,
  buildProductCatalogLeafItems,
  ProductCatalogLeafItem,
  readProductCatalogItems,
} from '@/pages/product/catalog/data';
import {
  ProductCatalogAttributeItem,
  readProductCatalogAttributes,
} from '@/pages/product/attribute/data';
import {
  buildProductCatalogAttributesFromTemplate,
  getEnabledProductCatalogAttributeTemplateByCatalogId,
  readProductCatalogAttributeTemplates,
} from '@/pages/product/attribute-template/data';
import {
  buildProductOwnershipCascaderOptions,
  buildProductOwnershipLeafItems,
  readProductOwnershipItems,
} from '@/pages/product/category/data';
import { readProductStoreItems } from '@/pages/product/store-config/data';
import { GlobalState } from '@/store';
import MarketingProductSelector from '../../components/product-selector';
import CouponStoreSelector from '../../components/store-selector';
import {
  buildConditionCardDrafts,
  buildConditionCatalogOptions,
  buildConditionFormStateFromCardDrafts,
  createEmptyConditionCardDraft,
  CouponConditionCardDraft,
} from './condition-cards';
import {
  getApplicableStoresEmptyDescription,
  shouldShowApplicableStoresSection,
} from '../detail-view';

const Option = Select.Option;
const RangePicker = DatePicker.RangePicker;

type CouponFormPageProps = {
  mode?: CouponPageMode;
  couponId?: string;
  embedded?: boolean;
  onClose?: () => void;
  onOpenDetail?: (couponId: string) => void;
};

type CouponErrorKey =
  | 'discountConfig'
  | 'stackingType'
  | 'storeIds'
  | 'productScope'
  | 'conditionCategoryPaths'
  | 'selectedSkuIds'
  | 'name'
  | 'couponQuantity'
  | 'receiveTimeRange'
  | 'validityConfig';

type CouponFormErrors = Partial<Record<CouponErrorKey, string>>;

function createDefaultFormValues(): CouponFormValues {
  return {
    ...DEFAULT_COUPON_FORM_VALUES,
    storeIds: [],
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: [],
    receiveTimeRange: [],
    validityType: 'custom',
    customUseTimeRange: [],
  };
}

function normalizeCascaderMultipleValues(
  value: Array<string | string[]> | undefined
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string[] => Array.isArray(item));
}

function isPathPrefix(prefix: string[], target: string[]) {
  return prefix.every((value, index) => target[index] === value);
}

const FORM_CONFIG_ITEM_OFFSET_STYLE: React.CSSProperties = {
  marginLeft: 24,
};

function formatCurrentCouponDateTime(date = new Date()) {
  const pad = (value: number) => `${value}`.padStart(2, '0');

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('/') + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getCouponDateTimestamp(dateTime?: string) {
  if (!dateTime) {
    return Number.NaN;
  }

  return new Date(dateTime.replace(/\//g, '-').replace(' ', 'T')).getTime();
}

export function normalizeCreateModeFormValues(
  values: CouponFormValues,
  isStoreSystem: boolean
): CouponFormValues {
  const createModeUseTimeRange =
    values.customUseTimeRange.length === 2
      ? [...values.customUseTimeRange]
      : values.receiveTimeRange.length === 2
        ? [...values.receiveTimeRange]
        : [];
  let nextValues =
    values.discountType !== 'fullReduction'
      ? {
        ...values,
        discountType: 'fullReduction' as CouponDiscountType,
        fullReductionThreshold: undefined,
        fullReductionAmount: undefined,
        directReductionAmount: undefined,
        discountRate: undefined,
        receiveTimeRange: createModeUseTimeRange,
        validityType: 'custom' as CouponValidityType,
        validDays: undefined,
        customUseTimeRange: createModeUseTimeRange,
      }
      : {
        ...values,
        receiveTimeRange: createModeUseTimeRange,
        validityType: 'custom' as CouponValidityType,
        validDays: undefined,
        customUseTimeRange: createModeUseTimeRange,
      };

  if (!isStoreSystem && nextValues.productScope === 'specific') {
    nextValues = {
      ...nextValues,
      productScope: 'condition',
      conditionCategoryPaths: [],
      conditionOwnershipSelections: [],
      selectedSkuIds: [],
    };
  }

  if (!isStoreSystem) {
    return {
      ...nextValues,
      allowStacking: false,
      stackingCouponType: undefined,
    };
  }

  if (!nextValues.allowStacking) {
    return nextValues;
  }

  return {
    ...nextValues,
    stackingCouponType: getCreatePageDefaultStackingCouponType(isStoreSystem),
  };
}

type CouponConditionSelection = CouponFormValues['conditionOwnershipSelections'][number];
type ConditionSpecOption = {
  label: string;
  value: string;
  values: string[];
};

type CouponConditionCard = CouponConditionCardDraft & {
  id: string;
};

function createConditionCardState(
  id: number,
  card?: Partial<CouponConditionCardDraft>
): CouponConditionCard {
  const specValues = normalizeCouponConditionSpecValues(card?.specValue);

  return {
    id: `condition-card-${id}`,
    catalogPath: card?.catalogPath ? [...card.catalogPath] : [],
    ownershipPaths: (card?.ownershipPaths || []).map((path) => [...path]),
    specAttributeId: card?.specAttributeId,
    specValue: specValues.length ? specValues : undefined,
  };
}

function buildConditionSpecOptions(
  catalogPath: string[],
  catalogLeafItems: ProductCatalogLeafItem[],
  catalogAttributes: ProductCatalogAttributeItem[],
  catalogAttributeTemplates: ReturnType<typeof readProductCatalogAttributeTemplates>
): ConditionSpecOption[] {
  const matchedCatalogLeaves = catalogLeafItems.filter((item) =>
    isPathPrefix(catalogPath, item.path)
  );

  if (!matchedCatalogLeaves.length) {
    return [];
  }

  const shouldAppendCatalogLabel = matchedCatalogLeaves.length > 1;

  return matchedCatalogLeaves.flatMap((catalogItem) =>
    buildProductCatalogAttributesFromTemplate(
      getEnabledProductCatalogAttributeTemplateByCatalogId(
        catalogAttributeTemplates,
        catalogItem.id
      ),
      catalogAttributes
    )
      .filter(
        (attribute) =>
          (attribute.type === 'single' || attribute.type === 'multi') &&
          attribute.name === '班型'
      )
      .map((attribute) => ({
        label: shouldAppendCatalogLabel
          ? `${attribute.name}（${catalogItem.label}）`
          : attribute.name,
        value: attribute.id,
        values: [...attribute.values],
      }))
  );
}

function sanitizeConditionSelection(
  selection: CouponConditionSelection,
  specOptions: ConditionSpecOption[]
): CouponConditionSelection {
  const matchedSpecOption = specOptions.find(
    (item) => item.value === selection.specAttributeId
  );
  const selectedSpecValues = normalizeCouponConditionSpecValues(selection.specValue);

  return {
    ...selection,
    specAttributeId: matchedSpecOption?.value,
    specValue:
      matchedSpecOption &&
        selectedSpecValues.length
        ? selectedSpecValues.filter((item) => matchedSpecOption.values.includes(item))
        : undefined,
  };
}

export function CouponFormPage({
  mode = 'create',
  couponId: couponIdProp,
  embedded = false,
  onClose,
  onOpenDetail,
}: CouponFormPageProps) {
  const history = useHistory();
  const location = useLocation();
  const currentOrganization = useSelector(
    (state: GlobalState) => state.currentOrganization
  );
  const isStoreSystem = useSelector(
    (state: GlobalState) => state.currentDemoSystem === 'store'
  );
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const sourceId = query.get('sourceId')?.trim() || '';
  const routeCouponId = query.get('id')?.trim() || '';
  const couponId = couponIdProp || routeCouponId;
  const visibleStoreIds = useMemo(
    () =>
      currentOrganization?.scope === 'headquarter'
        ? undefined
        : currentOrganization?.storeIds || [],
    [currentOrganization]
  );

  const catalogItems = useMemo(() => readProductCatalogItems(), []);
  const couponCategories = useMemo(
    () => buildProductCatalogLeafItems(catalogItems),
    [catalogItems]
  );
  const catalogAttributes = useMemo(() => readProductCatalogAttributes(), []);
  const catalogAttributeTemplates = useMemo(
    () => readProductCatalogAttributeTemplates(catalogAttributes),
    [catalogAttributes]
  );
  const ownershipItems = useMemo(() => readProductOwnershipItems(), []);
  const storeItems = useMemo(() => readProductStoreItems(), []);
  const ownershipLeafItems = useMemo(
    () => buildProductOwnershipLeafItems(ownershipItems),
    [ownershipItems]
  );
  const couponCatalogOptions = useMemo(
    () => buildProductCatalogCascaderOptions(catalogItems),
    [catalogItems]
  );
  const couponOwnershipOptions = useMemo(
    () => buildProductOwnershipCascaderOptions(ownershipItems),
    [ownershipItems]
  );
  const selectorSpuData = useMemo(
    () =>
      buildMarketingProductSelectorSpus(
        couponCategories,
        ownershipLeafItems,
        visibleStoreIds
      ),
    [couponCategories, ownershipLeafItems, visibleStoreIds]
  );
  const conditionCardIdRef = useRef(1);
  const [formValues, setFormValues] = useState<CouponFormValues>(createDefaultFormValues);
  const [conditionCards, setConditionCards] = useState<CouponConditionCard[]>(() => [
    createConditionCardState(1, createEmptyConditionCardDraft()),
  ]);

  const conditionOwnershipSections = useMemo(
    () =>
      conditionCards.map((card) => {
        const matchedCatalogLeaves = card.catalogPath.length
          ? couponCategories.filter((item) => isPathPrefix(card.catalogPath, item.path))
          : [];
        const labelPath = card.catalogPath.length
          ? matchedCatalogLeaves[0]?.labelPath.slice(0, card.catalogPath.length) ||
            card.catalogPath
          : [];

        return {
          key: card.id,
          card,
          labelPath,
          specOptions: card.catalogPath.length
            ? buildConditionSpecOptions(
                card.catalogPath,
                couponCategories,
                catalogAttributes,
                catalogAttributeTemplates
              )
            : [],
        };
      }),
    [catalogAttributeTemplates, catalogAttributes, conditionCards, couponCategories]
  );
  const selectedConditionCatalogPaths = useMemo(
    () =>
      conditionCards
        .map((card) => card.catalogPath)
        .filter((path) => path.length > 0),
    [conditionCards]
  );

  const [formErrors, setFormErrors] = useState<CouponFormErrors>({});
  const [skuModalVisible, setSkuModalVisible] = useState(false);
  const [storeModalVisible, setStoreModalVisible] = useState(false);
  const [couponRecord, setCouponRecord] = useState<CouponDetailRecord>();

  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';
  const isDetailMode = mode === 'detail';
  const canEditCoupon = isCreateMode || isEditMode;
  const showApplicableStoresSection = shouldShowApplicableStoresSection(
    isStoreSystem,
    mode
  );
  const shouldShowStackingConfig = isStoreSystem;

  const closeCouponView = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }

    history.push('/marketing/center/coupon/list');
  }, [history, onClose]);

  const openCouponDetail = useCallback(
    (couponDetailId: string) => {
      if (onOpenDetail) {
        onOpenDetail(couponDetailId);
        return;
      }

      history.replace(`/marketing/center/coupon/detail?id=${couponDetailId}`);
    },
    [history, onOpenDetail]
  );

  useEffect(() => {
    function buildInitialConditionCards(
      values: Pick<CouponFormValues, 'conditionCategoryPaths' | 'conditionOwnershipSelections'>
    ) {
      conditionCardIdRef.current = 0;
      const cards = buildConditionCardDrafts(
        values.conditionCategoryPaths,
        values.conditionOwnershipSelections
      );

      return (cards.length ? cards : [createEmptyConditionCardDraft()]).map((item) => {
        conditionCardIdRef.current += 1;
        return createConditionCardState(conditionCardIdRef.current, item);
      });
    }

    if (isCreateMode) {
      if (!sourceId) {
        const nextFormValues = createDefaultFormValues();
        setCouponRecord(undefined);
        setFormValues(nextFormValues);
        setConditionCards(buildInitialConditionCards(nextFormValues));
        setFormErrors({});
        return;
      }
      const sourceValues = buildCreateValuesFromCoupon(sourceId, visibleStoreIds, {
        isStoreSystem,
      });
      if (!sourceValues) {
        Message.error('复制来源优惠券不存在');
        history.replace('/marketing/center/coupon/list');
        return;
      }
      const nextFormValues = normalizeCreateModeFormValues(
        sourceValues,
        isStoreSystem
      );
      setCouponRecord(undefined);
      setFormValues(nextFormValues);
      setConditionCards(buildInitialConditionCards(nextFormValues));
      setFormErrors({});
      return;
    }

    if (!couponId) {
      Message.error('缺少优惠券 ID');
      closeCouponView();
      return;
    }

    const record = readCouponById(couponId, visibleStoreIds, { isStoreSystem });
    if (!record) {
      Message.error('优惠券不存在或已删除');
      closeCouponView();
      return;
    }

    const isOwner =
      typeof visibleStoreIds === 'undefined' ||
      visibleStoreIds.includes(record.ownershipStoreId);
    if (isEditMode && !isOwner) {
      openCouponDetail(record.id);
      return;
    }

    if (
      isEditMode &&
      isStoreSystem &&
      getCouponOwnershipType(record) === 'platform'
    ) {
      Message.error('店铺运营工作台中的平台券仅支持查看和复制');
      openCouponDetail(record.id);
      return;
    }

    if (isEditMode && !isCouponEditableStatus(record.status)) {
      Message.warning('当前优惠券状态不支持编辑');
      openCouponDetail(record.id);
      return;
    }

    const nextFormValues = buildCouponFormValuesFromRecord(record);
    setCouponRecord(record);
    setFormValues(nextFormValues);
    setConditionCards(buildInitialConditionCards(nextFormValues));
    setFormErrors({});
  }, [
    closeCouponView,
    couponId,
    isCreateMode,
    isEditMode,
    isStoreSystem,
    openCouponDetail,
    sourceId,
    visibleStoreIds,
  ]);

  const selectedSkuCount = formValues.selectedSkuIds.length;
  const selectedStoreIds = useMemo(
    () =>
      normalizeCouponStoreIds(
        formValues.storeIds,
        storeItems.map((item) => item.id)
      ),
    [formValues.storeIds, storeItems]
  );
  const selectedStoreNames = useMemo(() => {
    const nameMap = new Map(storeItems.map((item) => [item.id, item.name]));

    return selectedStoreIds
      .map((item) => nameMap.get(item))
      .filter((item): item is string => Boolean(item));
  }, [selectedStoreIds, storeItems]);
  const storeSummaryTitle = useMemo(() => {
    if (!selectedStoreIds.length) {
      return '未选择店铺';
    }

    return isAllCouponStoresSelected(
      selectedStoreIds,
      storeItems.map((item) => item.id)
    )
      ? '全部店铺'
      : `已选 ${selectedStoreIds.length} 家店铺`;
  }, [selectedStoreIds, storeItems]);
  const storeSummaryDescription = useMemo(() => {
    if (!selectedStoreIds.length) {
      return getApplicableStoresEmptyDescription(mode);
    }

    if (
      isAllCouponStoresSelected(
        selectedStoreIds,
        storeItems.map((item) => item.id)
      )
    ) {
      return `当前共覆盖 ${storeItems.length} 家店铺`;
    }

    return selectedStoreNames.join('、');
  }, [mode, selectedStoreIds, selectedStoreNames, storeItems]);
  const createModeStackingLabel = isStoreSystem ? '是否叠加平台券' : '是否叠加店铺券';
  const productScopeOptions = useMemo(
    () =>
      isCreateMode
        ? getCreatePageProductScopeOptions(isStoreSystem)
        : PRODUCT_SCOPE_OPTIONS,
    [isCreateMode, isStoreSystem]
  );
  const stackingTypeOptions = useMemo(
    () =>
      isStoreSystem
        ? COUPON_STACKING_TYPE_OPTIONS
        : COUPON_STACKING_TYPE_OPTIONS.filter((item) => item.value !== 'shopOnly'),
    [isStoreSystem]
  );
  const editRuleSet = useMemo<CouponEditRuleSet | undefined>(
    () => (isEditMode && couponRecord ? getCouponEditRuleSet(couponRecord) : undefined),
    [couponRecord, isEditMode]
  );
  const canEditDiscountConfig =
    canEditCoupon && (!editRuleSet || isCouponEditFieldEditable(editRuleSet.discountInfo));
  const canEditStoreIds =
    canEditCoupon && (!editRuleSet || isCouponEditFieldEditable(editRuleSet.storeIds));
  const canEditProductScope =
    canEditCoupon && (!editRuleSet || isCouponEditFieldEditable(editRuleSet.productScope));
  const canEditName =
    canEditCoupon && (!editRuleSet || isCouponEditFieldEditable(editRuleSet.name));
  const canEditIssueCount =
    canEditCoupon && (!editRuleSet || isCouponEditFieldEditable(editRuleSet.issueCount));
  const canEditLimitPerUser =
    canEditCoupon && (!editRuleSet || isCouponEditFieldEditable(editRuleSet.limitPerUser));
  const canEditReceiveStartAt =
    canEditCoupon && (!editRuleSet || isCouponEditFieldEditable(editRuleSet.receiveStartAt));
  const canEditReceiveEndAt =
    canEditCoupon && (!editRuleSet || isCouponEditFieldEditable(editRuleSet.receiveEndAt));
  const canEditValidity =
    canEditCoupon && (!editRuleSet || isCouponEditFieldEditable(editRuleSet.validity));
  const canEditStacking =
    canEditCoupon && (!editRuleSet || isCouponEditFieldEditable(editRuleSet.stacking));
  const isActiveEditMode = isEditMode && couponRecord?.status === 'active';
  const isIssueCountIncreaseOnly = editRuleSet?.issueCount === 'increaseOnly';
  const isLimitPerUserIncreaseOnly = editRuleSet?.limitPerUser === 'increaseOnly';
  const currentDateTimeText = useMemo(() => formatCurrentCouponDateTime(), []);
  const applicableStoresActionText = canEditStoreIds ? '选择店铺' : '查看店铺';
  const applicableStoresModalTitle = canEditStoreIds ? '选择适用店铺' : '查看适用店铺';

  function patchFormValues(patch: Partial<CouponFormValues>) {
    setFormValues((previous) => ({
      ...previous,
      ...patch,
    }));
  }

  function clearErrors(...keys: CouponErrorKey[]) {
    if (!keys.length) {
      return;
    }

    setFormErrors((previous) => {
      const next = { ...previous };
      keys.forEach((key) => {
        delete next[key];
      });
      return next;
    });
  }

  function createConditionCard(
    card?: Partial<CouponConditionCardDraft>
  ): CouponConditionCard {
    conditionCardIdRef.current += 1;
    return createConditionCardState(conditionCardIdRef.current, card);
  }

  function syncConditionCards(nextCards: CouponConditionCard[]) {
    const normalizedCards = nextCards.length ? nextCards : [createConditionCard()];
    const nextConditionState = buildConditionFormStateFromCardDrafts(
      normalizedCards.map((item) => ({
        catalogPath: [...item.catalogPath],
        ownershipPaths: item.ownershipPaths.map((path) => [...path]),
        specAttributeId: item.specAttributeId,
        specValue: item.specValue ? [...item.specValue] : undefined,
      }))
    );

    setConditionCards(normalizedCards);
    setFormValues((previous) => ({
      ...previous,
      ...nextConditionState,
    }));
  }

  function sanitizeConditionCard(
    card: CouponConditionCard,
    nextCatalogPath: string[]
  ): CouponConditionCard {
    const sanitizedSelection = sanitizeConditionSelection(
      {
        catalogPath: [...nextCatalogPath],
        ownershipPaths: card.ownershipPaths.map((path) => [...path]),
        specAttributeId: card.specAttributeId,
        specValue: card.specValue ? [...card.specValue] : undefined,
      },
      nextCatalogPath.length
        ? buildConditionSpecOptions(
            nextCatalogPath,
            couponCategories,
            catalogAttributes,
            catalogAttributeTemplates
          )
        : []
    );
    const sanitizedSpecValues = normalizeCouponConditionSpecValues(
      sanitizedSelection.specValue
    );

    return {
      ...card,
      catalogPath: [...nextCatalogPath],
      specAttributeId: sanitizedSelection.specAttributeId,
      specValue: sanitizedSpecValues.length ? sanitizedSpecValues : undefined,
    };
  }

  function handleDiscountTypeChange(value: string) {
    if (!canEditDiscountConfig) {
      return;
    }

    patchFormValues({
      discountType: value as CouponDiscountType,
      fullReductionThreshold: undefined,
      fullReductionAmount: undefined,
      directReductionAmount: undefined,
      discountRate: undefined,
    });
    clearErrors('discountConfig');
  }

  function handleProductScopeChange(value: string) {
    if (!canEditProductScope) {
      return;
    }

    const nextScope = value as CouponProductScope;
    if (nextScope === 'condition' && !conditionCards.length) {
      setConditionCards([createConditionCard()]);
    }
    patchFormValues({
      productScope: nextScope,
    });
    clearErrors('productScope', 'conditionCategoryPaths', 'selectedSkuIds');
  }

  function handleConditionCategoryChange(
    cardId: string,
    value: string[] | string | undefined
  ) {
    if (!canEditProductScope) {
      return;
    }

    const nextCatalogPath = Array.isArray(value) ? value : [];
    const isDuplicateCatalogPath = conditionCards.some(
      (card) =>
        card.id !== cardId &&
        card.catalogPath.length === nextCatalogPath.length &&
        card.catalogPath.every((item, index) => item === nextCatalogPath[index])
    );

    if (nextCatalogPath.length > 0 && isDuplicateCatalogPath) {
      Message.warning('该商品类目已在其他条件中选择');
      return;
    }

    syncConditionCards(
      conditionCards.map((card) =>
        card.id === cardId
          ? sanitizeConditionCard(card, nextCatalogPath)
          : card
      )
    );
    clearErrors('conditionCategoryPaths');
  }

  function handleConditionOwnershipChange(
    cardId: string,
    value: Array<string | string[]> | undefined
  ) {
    if (!canEditProductScope) {
      return;
    }

    const nextOwnershipPaths = normalizeCascaderMultipleValues(value);
    syncConditionCards(
      conditionCards.map((card) =>
        card.id === cardId
          ? {
            ...card,
            ownershipPaths: nextOwnershipPaths,
          }
          : card
      )
    );
  }

  function handleConditionSpecAttributeChange(
    cardId: string,
    value: string | undefined
  ) {
    if (!canEditProductScope) {
      return;
    }

    syncConditionCards(
      conditionCards.map((card) => {
        if (card.id !== cardId || !card.catalogPath.length) {
          return card;
        }

        const specOptions = buildConditionSpecOptions(
          card.catalogPath,
          couponCategories,
          catalogAttributes,
          catalogAttributeTemplates
        );
        const matchedSpecOption = specOptions.find((item) => item.value === value);

        return {
          ...card,
          specAttributeId: matchedSpecOption?.value,
          specValue:
            matchedSpecOption &&
              card.specValue?.length
              ? card.specValue.filter((item) =>
                matchedSpecOption.values.includes(item)
              )
              : undefined,
        };
      })
    );
  }

  function handleConditionSpecValueChange(
    cardId: string,
    value: string[] | string | undefined
  ) {
    if (!canEditProductScope) {
      return;
    }

    const nextSpecValues = normalizeCouponConditionSpecValues(value);

    syncConditionCards(
      conditionCards.map((card) => {
        if (card.id !== cardId || !card.catalogPath.length) {
          return card;
        }

        const specOptions = buildConditionSpecOptions(
          card.catalogPath,
          couponCategories,
          catalogAttributes,
          catalogAttributeTemplates
        );
        const matchedSpecOption = specOptions.find(
          (item) => item.value === card.specAttributeId
        );

        return {
          ...card,
          specValue:
            matchedSpecOption &&
              nextSpecValues.length
              ? nextSpecValues.filter((item) =>
                matchedSpecOption.values.includes(item)
              )
              : undefined,
        };
      })
    );
  }

  function handleAddConditionCard() {
    if (!canEditProductScope) {
      return;
    }

    syncConditionCards([...conditionCards, createConditionCard()]);
  }

  function handleRemoveConditionCard(cardId: string) {
    if (!canEditProductScope || conditionCards.length <= 1) {
      return;
    }

    syncConditionCards(conditionCards.filter((card) => card.id !== cardId));
  }

  function handleReceiveTimeChange(dateString: string[]) {
    if (!canEditReceiveStartAt && !canEditReceiveEndAt) {
      return;
    }

    patchFormValues({
      receiveTimeRange:
        Array.isArray(dateString) && dateString[0] && dateString[1]
          ? [dateString[0], dateString[1]]
          : [],
    });
    clearErrors('receiveTimeRange');
  }

  function handleReceiveStartAtChange(value: string | undefined) {
    if (!canEditReceiveStartAt) {
      return;
    }

    patchFormValues({
      receiveTimeRange: [
        value || '',
        formValues.receiveTimeRange[1] || '',
      ].filter((item) => item) as string[],
    });
    clearErrors('receiveTimeRange');
  }

  function handleReceiveEndAtChange(value: string | undefined) {
    if (!canEditReceiveEndAt) {
      return;
    }

    patchFormValues({
      receiveTimeRange: [
        formValues.receiveTimeRange[0] || '',
        value || '',
      ].filter((item) => item) as string[],
    });
    clearErrors('receiveTimeRange');
  }

  function handleValidityTypeChange(value: string) {
    if (!canEditValidity) {
      return;
    }

    patchFormValues({
      validityType: value as CouponValidityType,
      customUseTimeRange: [],
      validDays:
        value === 'afterReceiveDays'
          ? formValues.validDays || 1
          : formValues.validDays,
    });
    clearErrors('validityConfig');
  }

  function handleAllowStackingChange(checked: boolean) {
    if (!canEditStacking) {
      return;
    }

    patchFormValues({
      allowStacking: checked,
      stackingCouponType: checked
        ? isCreateMode
          ? getCreatePageDefaultStackingCouponType(isStoreSystem)
          : formValues.stackingCouponType
        : undefined,
    });
    clearErrors('stackingType');
  }

  function handleStackingTypeChange(value: string) {
    if (!canEditStacking) {
      return;
    }

    patchFormValues({
      stackingCouponType: value as CouponStackingType,
    });
    clearErrors('stackingType');
  }

  function handleCustomUseTimeChange(dateString: string[]) {
    if (!canEditValidity) {
      return;
    }

    const nextTimeRange =
      Array.isArray(dateString) && dateString[0] && dateString[1]
        ? [dateString[0], dateString[1]]
        : [];

    patchFormValues({
      customUseTimeRange: nextTimeRange,
      receiveTimeRange: isCreateMode ? nextTimeRange : formValues.receiveTimeRange,
    });
    clearErrors('validityConfig');
  }

  function updateNumberField(
    field:
      | 'fullReductionThreshold'
      | 'fullReductionAmount'
      | 'directReductionAmount'
      | 'discountRate'
      | 'issueCount'
      | 'limitPerUser'
      | 'validDays',
    value: number | undefined
  ) {
    const canEditFieldMap = {
      fullReductionThreshold: canEditDiscountConfig,
      fullReductionAmount: canEditDiscountConfig,
      directReductionAmount: canEditDiscountConfig,
      discountRate: canEditDiscountConfig,
      issueCount: canEditIssueCount,
      limitPerUser: canEditLimitPerUser,
      validDays: canEditValidity,
    };

    if (!canEditFieldMap[field]) {
      return;
    }

    patchFormValues({
      [field]: typeof value === 'number' ? value : undefined,
    } as Partial<CouponFormValues>);

    if (
      field === 'fullReductionThreshold' ||
      field === 'fullReductionAmount' ||
      field === 'directReductionAmount' ||
      field === 'discountRate'
    ) {
      clearErrors('discountConfig');
    }

    if (field === 'issueCount' || field === 'limitPerUser') {
      clearErrors('couponQuantity');
    }

    if (field === 'validDays') {
      clearErrors('validityConfig');
    }
  }

  function openSelectSkuModal() {
    if (!canEditProductScope) {
      return;
    }
    setSkuModalVisible(true);
  }

  function openStoreModal() {
    setStoreModalVisible(true);
  }

  function handleStoreModalConfirm(nextStoreIds: string[]) {
    if (!canEditStoreIds) {
      setStoreModalVisible(false);
      return;
    }

    patchFormValues({
      storeIds: normalizeCouponStoreIds(
        nextStoreIds,
        storeItems.map((item) => item.id)
      ),
    });
    clearErrors('storeIds');
    setStoreModalVisible(false);
  }

  function openReadonlySkuModal() {
    setSkuModalVisible(true);
  }

  function handleSkuModalConfirm(selectedSkuIds: string[]) {
    if (!canEditProductScope) {
      setSkuModalVisible(false);
      return;
    }

    patchFormValues({
      selectedSkuIds,
    });
    clearErrors('selectedSkuIds');
    setSkuModalVisible(false);
  }

  function validateCreateForm() {
    const errors: CouponFormErrors = {};

    if (formValues.discountType === 'fullReduction') {
      if (
        !formValues.fullReductionThreshold ||
        formValues.fullReductionThreshold <= 0 ||
        !formValues.fullReductionAmount ||
        formValues.fullReductionAmount <= 0
      ) {
        errors.discountConfig = '请填写正确的满减规则';
      }
    }

    if (formValues.discountType === 'directReduction') {
      if (
        !formValues.directReductionAmount ||
        formValues.directReductionAmount <= 0
      ) {
        errors.discountConfig = '请填写正确的直减金额';
      }
    }

    if (formValues.discountType === 'discount') {
      if (
        !formValues.discountRate ||
        formValues.discountRate <= 0 ||
        formValues.discountRate >= 10
      ) {
        errors.discountConfig = '请填写 0-10 之间的折扣值';
      }
    }

    if (!isStoreSystem && !formValues.storeIds.length) {
      errors.storeIds = '请选择适用店铺';
    }

    if (!formValues.productScope) {
      errors.productScope = '请选择商品范围';
    }

    if (
      formValues.productScope === 'condition' &&
      !formValues.conditionCategoryPaths.length
    ) {
      errors.conditionCategoryPaths = '请至少选择一个类目';
    }

    if (formValues.productScope === 'specific' && !formValues.selectedSkuIds.length) {
      errors.selectedSkuIds = '请选择至少 1 个 SKU';
    }

    const trimmedName = formValues.name.trim();

    if (
      shouldShowStackingConfig &&
      !isCreateMode &&
      formValues.allowStacking &&
      !formValues.stackingCouponType
    ) {
      errors.stackingType = '请选择叠加券类型';
    }

    if (!trimmedName) {
      errors.name = '请输入券名称';
    } else if (trimmedName.length > 15) {
      errors.name = '券名称支持 15 个字以内';
    }

    if (
      !formValues.issueCount ||
      formValues.issueCount <= 0 ||
      !formValues.limitPerUser ||
      formValues.limitPerUser <= 0
    ) {
      errors.couponQuantity = '请填写正确的发放张数和每人限领数量';
    }

    if (!isCreateMode && formValues.receiveTimeRange.length !== 2) {
      errors.receiveTimeRange = '请选择领取时间';
    }

    if (formValues.validityType === 'afterReceiveDays') {
      if (!formValues.validDays || formValues.validDays <= 0) {
        errors.validityConfig = '请填写领取后有效天数';
      }
    }

    if (formValues.validityType === 'custom') {
      if (formValues.customUseTimeRange.length !== 2) {
        errors.validityConfig = '请选择自定义使用时间';
      }
    }

    if (isActiveEditMode && couponRecord) {
      if (
        formValues.issueCount < couponRecord.issueCount ||
        formValues.limitPerUser < couponRecord.limitPerUser
      ) {
        errors.couponQuantity = '生效中仅支持增大发放总量和每人限领数量';
      }

      if (
        formValues.receiveTimeRange[1] &&
        getCouponDateTimestamp(formValues.receiveTimeRange[1]) <
          getCouponDateTimestamp(currentDateTimeText)
      ) {
        errors.receiveTimeRange = '生效中的领取结束时间不能早于当前时间';
      }
    }

    return errors;
  }

  function handleSubmit() {
    if (isDetailMode) {
      return;
    }

    const nextErrors = validateCreateForm();
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      Message.error(isEditMode ? '请完善必填项后再保存' : '请完善必填项后再创建');
      return;
    }

    if (isEditMode) {
      if (!couponId) {
        Message.error('缺少优惠券 ID');
        return;
      }
      const updated = updateCouponById(couponId, formValues, { isStoreSystem });
      if (!updated) {
        Message.error('优惠券不存在或已删除');
        return;
      }
      Message.success('保存成功');
      history.push('/marketing/center/coupon/list');
      return;
    }

    Message.success('创建成功');
    history.push('/marketing/center/coupon/list');
  }

  const pageTitle = isCreateMode
    ? '创建优惠券'
    : isEditMode
      ? '修改优惠券'
      : '优惠券详情';
  const primaryButtonText = isEditMode ? '保存' : '创建';

  return (
    <div className={styles.page}>
      {!embedded && (
        <Typography.Title className={styles.pageTitle} heading={4}>
          {pageTitle}
        </Typography.Title>
      )}

      <Card className={styles.formCard}>
        <Form
          className={styles.couponForm}
          labelCol={{ span: 3 }}
          wrapperCol={{ span: 21 }}
        >
          <div className={styles.sectionBlock}>
            <Typography.Title className={styles.sectionTitle} heading={5}>
              优惠信息
            </Typography.Title>

            <Form.Item required label="优惠方式">
              <div className={styles.inlineField}>
                {isCreateMode ? (
                  <div className={styles.fixedDiscountTypeValue}>满减</div>
                ) : (
                  <Select
                    className={styles.discountTypeSelect}
                    value={formValues.discountType}
                    disabled={!canEditDiscountConfig}
                    onChange={handleDiscountTypeChange}
                  >
                    {COUPON_DISCOUNT_OPTIONS.map((item) => (
                      <Option key={item.value} value={item.value}>
                        {item.label}
                      </Option>
                    ))}
                  </Select>
                )}

                {formValues.discountType === 'fullReduction' && (
                  <>
                    <span className={styles.inlineText}>满</span>
                    <InputNumber
                      className={styles.moneyInput}
                      min={0}
                      precision={2}
                      placeholder="0.00"
                      disabled={!canEditDiscountConfig}
                      value={formValues.fullReductionThreshold}
                      onChange={(value) =>
                        updateNumberField(
                          'fullReductionThreshold',
                          typeof value === 'number' ? value : undefined
                        )
                      }
                    />
                    <span className={styles.inlineUnit}>元</span>
                    <span className={styles.inlineText}>减</span>
                    <InputNumber
                      className={styles.moneyInput}
                      min={0}
                      precision={2}
                      placeholder="0.00"
                      disabled={!canEditDiscountConfig}
                      value={formValues.fullReductionAmount}
                      onChange={(value) =>
                        updateNumberField(
                          'fullReductionAmount',
                          typeof value === 'number' ? value : undefined
                        )
                      }
                    />
                    <span className={styles.inlineUnit}>元</span>
                  </>
                )}

                {formValues.discountType === 'directReduction' && (
                  <>
                    <span className={styles.inlineText}>立减</span>
                    <InputNumber
                      className={styles.moneyInput}
                      min={0}
                      precision={2}
                      placeholder="0.00"
                      disabled={!canEditDiscountConfig}
                      value={formValues.directReductionAmount}
                      onChange={(value) =>
                        updateNumberField(
                          'directReductionAmount',
                          typeof value === 'number' ? value : undefined
                        )
                      }
                    />
                    <span className={styles.inlineUnit}>元</span>
                  </>
                )}

                {formValues.discountType === 'discount' && (
                  <>
                    <span className={styles.inlineText}>打</span>
                    <InputNumber
                      className={styles.discountInput}
                      min={0}
                      max={9.9}
                      precision={1}
                      placeholder="8.5"
                      disabled={!canEditDiscountConfig}
                      value={formValues.discountRate}
                      onChange={(value) =>
                        updateNumberField(
                          'discountRate',
                          typeof value === 'number' ? value : undefined
                        )
                      }
                    />
                    <span className={styles.inlineText}>折</span>
                  </>
                )}
              </div>
              {formErrors.discountConfig && (
                <div className={styles.fieldError}>{formErrors.discountConfig}</div>
              )}
              {isActiveEditMode && !canEditDiscountConfig && (
                <div className={styles.fieldHint}>
                  生效中的优惠方式不可编辑，避免已领券用户的面值发生变化。
                </div>
              )}
            </Form.Item>

            {showApplicableStoresSection && (
              <Form.Item required label="适用店铺">
                <div className={styles.storeSelectorTrigger}>
                  <div className={styles.storeSelectorSummary}>
                    <div
                      className={`${styles.storeSelectorTitle} ${selectedStoreIds.length ? '' : styles.storeSelectorTitleEmpty
                        }`}
                    >
                      {storeSummaryTitle}
                    </div>
                    <div className={styles.storeSelectorDescription}>
                      {storeSummaryDescription}
                    </div>
                  </div>

                  <Button type="outline" onClick={openStoreModal}>
                    {applicableStoresActionText}
                  </Button>
                </div>
                {formErrors.storeIds && (
                  <div className={styles.fieldError}>{formErrors.storeIds}</div>
                )}
                {isActiveEditMode && !canEditStoreIds && (
                  <div className={styles.fieldHint}>
                    生效中的平台券适用店铺不可编辑。
                  </div>
                )}
              </Form.Item>
            )}

            <Form.Item required label="选择商品">
              <div className={styles.scopeBlock}>
                <Radio.Group
                  value={formValues.productScope}
                  disabled={!canEditProductScope}
                  onChange={handleProductScopeChange}
                >
                  {productScopeOptions.map((item) => (
                    <Radio key={item.value} value={item.value}>
                      {item.label}
                    </Radio>
                  ))}
                </Radio.Group>

                {formValues.productScope === 'condition' && (
                  <div
                    className={styles.conditionScopePanel}
                    style={FORM_CONFIG_ITEM_OFFSET_STYLE}
                  >
                    <Typography.Text
                      type="secondary"
                      className={styles.conditionRuleText}
                    >
                      命中规则：满足任一条件卡片即可
                    </Typography.Text>

                    <div className={styles.conditionCardList}>
                      {conditionOwnershipSections.map((section, index) => {
                        const selectedSpecOption = section.specOptions.find(
                          (item) => item.value === section.card.specAttributeId
                        );
                        const currentCardCatalogOptions = buildConditionCatalogOptions(
                          couponCatalogOptions,
                          selectedConditionCatalogPaths,
                          section.card.catalogPath
                        );

                        return (
                          <div key={section.key} className={styles.conditionCard}>
                            <div className={styles.conditionCardHeader}>
                              <div className={styles.conditionCardHeaderContent}>
                                <Typography.Text
                                  className={styles.conditionCardTitle}
                                >
                                  {`条件${index + 1}`}
                                </Typography.Text>
                              </div>

                              {canEditProductScope && conditionCards.length > 1 && (
                                <Button
                                  type="text"
                                  size="small"
                                  status="danger"
                                  icon={<IconDelete />}
                                  onClick={() => handleRemoveConditionCard(section.card.id)}
                                >
                                  删除
                                </Button>
                              )}
                            </div>

                            <div className={styles.conditionCardBody}>
                              <div className={styles.conditionCardField}>
                                <span className={styles.conditionCardFieldLabel}>
                                  商品类目
                                </span>
                                <Cascader
                                  allowClear
                                  expandTrigger="hover"
                                  className={styles.conditionCardCascader}
                                  placeholder="请选择商品类目"
                                  options={currentCardCatalogOptions}
                                  showSearch={{ retainInputValueWhileSelect: true }}
                                  disabled={!canEditProductScope}
                                  value={
                                    section.card.catalogPath.length
                                      ? section.card.catalogPath
                                      : undefined
                                  }
                                  onChange={(value) =>
                                    handleConditionCategoryChange(
                                      section.card.id,
                                      value as string[] | string | undefined
                                    )
                                  }
                                />
                              </div>

                              <div className={styles.conditionCardField}>
                                <span className={styles.conditionCardFieldLabel}>
                                  商品分类
                                </span>
                                <Cascader
                                  mode="multiple"
                                  allowClear
                                  checkedStrategy="parent"
                                  expandTrigger="hover"
                                  className={styles.conditionCardCascader}
                                  placeholder="请选择商品分类（可多选）"
                                  options={couponOwnershipOptions}
                                  showSearch={{ retainInputValueWhileSelect: true }}
                                  disabled={!canEditProductScope || !couponOwnershipOptions.length}
                                  value={section.card.ownershipPaths}
                                  onChange={(value) =>
                                    handleConditionOwnershipChange(
                                      section.card.id,
                                      value
                                    )
                                  }
                                />
                              </div>

                              {section.card.catalogPath.length > 0 && (
                                <div className={styles.conditionCardSpecGrid}>
                                  <div className={styles.conditionCardField}>
                                    <span className={styles.conditionCardFieldLabel}>
                                      规格项
                                    </span>
                                    <Select
                                      allowClear
                                      className={styles.conditionCardSelect}
                                      placeholder={
                                        section.specOptions.length
                                          ? '请选择规格项'
                                          : '当前类目暂无规格项'
                                      }
                                      disabled={
                                        !canEditProductScope || !section.specOptions.length
                                      }
                                      value={section.card.specAttributeId}
                                      onChange={(value) =>
                                        handleConditionSpecAttributeChange(
                                          section.card.id,
                                          typeof value === 'string'
                                            ? value
                                            : undefined
                                        )
                                      }
                                    >
                                      {section.specOptions.map((item) => (
                                        <Option key={item.value} value={item.value}>
                                          {item.label}
                                        </Option>
                                      ))}
                                    </Select>
                                  </div>

                                  <div className={styles.conditionCardField}>
                                    <span className={styles.conditionCardFieldLabel}>
                                      规格值
                                    </span>
                                    <Select
                                      allowClear
                                      className={styles.conditionCardSelect}
                                      mode="multiple"
                                      placeholder={
                                        selectedSpecOption
                                          ? '请选择规格值'
                                          : '请先选择规格项'
                                      }
                                      disabled={!canEditProductScope || !selectedSpecOption}
                                      value={section.card.specValue}
                                      onChange={(value) =>
                                        handleConditionSpecValueChange(
                                          section.card.id,
                                          Array.isArray(value) || typeof value === 'string'
                                            ? value
                                            : undefined
                                        )
                                      }
                                    >
                                      {(selectedSpecOption?.values || []).map((item) => (
                                        <Option key={item} value={item}>
                                          {item}
                                        </Option>
                                      ))}
                                    </Select>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {canEditProductScope && (
                      <Button
                        type="outline"
                        icon={<IconPlus />}
                        className={styles.addConditionCardButton}
                        onClick={handleAddConditionCard}
                      >
                        新增条件
                      </Button>
                    )}
                  </div>
                )}

                {formValues.productScope === 'specific' && (
                  <div
                    className={styles.scopeActionRow}
                    style={FORM_CONFIG_ITEM_OFFSET_STYLE}
                  >
                    {canEditProductScope && (
                      <Button type="outline" onClick={openSelectSkuModal}>
                        选择商品
                      </Button>
                    )}

                    {!canEditProductScope && (
                      <Button
                        type="outline"
                        disabled={!selectedSkuCount}
                        onClick={openReadonlySkuModal}
                      >
                        查看商品
                      </Button>
                    )}

                    <Typography.Text type="secondary">
                      {selectedSkuCount
                        ? `已选 ${selectedSkuCount} 个 SKU`
                        : '暂未选择 SKU'}
                    </Typography.Text>
                  </div>
                )}
              </div>
              {isActiveEditMode && !canEditProductScope && (
                <div className={styles.fieldHint}>
                  生效中的适用商品范围不可编辑。
                </div>
              )}
              {(formErrors.productScope ||
                formErrors.conditionCategoryPaths ||
                formErrors.selectedSkuIds) && (
                  <div className={styles.fieldError}>
                    {formErrors.productScope ||
                      formErrors.conditionCategoryPaths ||
                      formErrors.selectedSkuIds}
                  </div>
                )}
            </Form.Item>
          </div>

          <Divider className={styles.sectionDivider} />

          <div className={styles.sectionBlock}>
            <Typography.Title className={styles.sectionTitle} heading={5}>
              基础信息
            </Typography.Title>

            <Form.Item required label="名称">
              <Input
                className={styles.formControl}
                placeholder="请输入券名称"
                maxLength={15}
                showWordLimit
                disabled={!canEditName}
                value={formValues.name}
                onChange={(value) => {
                  if (!canEditName) {
                    return;
                  }
                  patchFormValues({ name: value });
                  clearErrors('name');
                }}
              />
              {formErrors.name && <div className={styles.fieldError}>{formErrors.name}</div>}
            </Form.Item>

            <Form.Item required label="券数量">
              <div className={styles.inlineField}>
                <span className={styles.inlineText}>发放张数</span>
                <InputNumber
                  className={styles.countInput}
                  min={isIssueCountIncreaseOnly ? couponRecord?.issueCount || 0 : 0}
                  precision={0}
                  disabled={!canEditIssueCount}
                  value={formValues.issueCount}
                  onChange={(value) =>
                    updateNumberField(
                      'issueCount',
                      typeof value === 'number' ? value : undefined
                    )
                  }
                />
                <span className={styles.inlineUnit}>张</span>
                <span className={styles.inlineText}>每人限领</span>
                <InputNumber
                  className={styles.countInput}
                  min={isLimitPerUserIncreaseOnly ? couponRecord?.limitPerUser || 1 : 1}
                  precision={0}
                  disabled={!canEditLimitPerUser}
                  value={formValues.limitPerUser}
                  onChange={(value) =>
                    updateNumberField(
                      'limitPerUser',
                      typeof value === 'number' ? value : undefined
                    )
                  }
                />
                <span className={styles.inlineUnit}>张</span>
              </div>
              {formErrors.couponQuantity && (
                <div className={styles.fieldError}>{formErrors.couponQuantity}</div>
              )}
              {isActiveEditMode &&
                (isIssueCountIncreaseOnly || isLimitPerUserIncreaseOnly) && (
                  <div className={styles.fieldHint}>
                    生效中仅支持增大，不支持调小发放总量或每人限领数量。
                  </div>
                )}
            </Form.Item>

            {!isCreateMode && (
              <Form.Item required label="领取时间">
                {!isActiveEditMode && (
                  <RangePicker
                    className={styles.rangePicker}
                    placeholder={['开始日期', '结束日期']}
                    disabled={!canEditCoupon}
                    value={
                      formValues.receiveTimeRange.length
                        ? formValues.receiveTimeRange
                        : undefined
                    }
                    onChange={handleReceiveTimeChange}
                  />
                )}

                {isActiveEditMode && (
                  <div className={styles.inlineField}>
                    <DatePicker
                      className={styles.datePicker}
                      format="YYYY/MM/DD HH:mm:ss"
                      showTime
                      disabled
                      value={formValues.receiveTimeRange[0] || undefined}
                      onChange={(value) =>
                        handleReceiveStartAtChange(
                          typeof value === 'string' ? value : undefined
                        )
                      }
                    />
                    <span className={styles.inlineUnit}>至</span>
                    <DatePicker
                      className={styles.datePicker}
                      format="YYYY/MM/DD HH:mm:ss"
                      showTime
                      disabled={!canEditReceiveEndAt}
                      value={formValues.receiveTimeRange[1] || undefined}
                      onChange={(value) =>
                        handleReceiveEndAtChange(
                          typeof value === 'string' ? value : undefined
                        )
                      }
                    />
                  </div>
                )}
                {formErrors.receiveTimeRange && (
                  <div className={styles.fieldError}>{formErrors.receiveTimeRange}</div>
                )}
                {isActiveEditMode && (
                  <div className={styles.fieldHint}>
                    领取开始时间已锁定；领取结束时间可调整，但不能早于当前时间（{currentDateTimeText}）。
                  </div>
                )}
              </Form.Item>
            )}

            <Form.Item required label="使用时间">
              <div className={styles.validityBlock}>
                {isCreateMode ? (
                  <RangePicker
                    className={styles.rangePicker}
                    format="YYYY-MM-DD HH:mm"
                    placeholder={['开始时间', '结束时间']}
                    showTime
                    disabled={!canEditValidity}
                    value={
                      formValues.customUseTimeRange.length
                        ? formValues.customUseTimeRange
                        : undefined
                    }
                    onChange={handleCustomUseTimeChange}
                  />
                ) : (
                  <>
                    <Radio.Group
                      value={formValues.validityType}
                      disabled={!canEditValidity}
                      onChange={handleValidityTypeChange}
                    >
                      {VALIDITY_TYPE_OPTIONS.map((item) => (
                        <Radio key={item.value} value={item.value}>
                          {item.label}
                        </Radio>
                      ))}
                    </Radio.Group>

                    {formValues.validityType === 'afterReceiveDays' && (
                      <div
                        className={styles.validityActionRow}
                        style={FORM_CONFIG_ITEM_OFFSET_STYLE}
                      >
                        <InputNumber
                          className={styles.validDaysInput}
                          min={1}
                          precision={0}
                          disabled={!canEditValidity}
                          value={formValues.validDays}
                          onChange={(value) =>
                            updateNumberField(
                              'validDays',
                              typeof value === 'number' ? value : undefined
                            )
                          }
                        />
                        <span className={styles.inlineText}>天内有效</span>
                      </div>
                    )}

                    {formValues.validityType === 'custom' && (
                      <div style={FORM_CONFIG_ITEM_OFFSET_STYLE}>
                        <RangePicker
                          className={styles.rangePicker}
                          format="YYYY-MM-DD HH:mm:ss"
                          placeholder={['开始时间', '结束时间']}
                          showTime
                          disabled={!canEditValidity}
                          value={
                            formValues.customUseTimeRange.length
                              ? formValues.customUseTimeRange
                              : undefined
                          }
                          onChange={handleCustomUseTimeChange}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
              {formErrors.validityConfig && (
                <div className={styles.fieldError}>{formErrors.validityConfig}</div>
              )}
              {isActiveEditMode && !canEditValidity && (
                <div className={styles.fieldHint}>
                  生效中的使用时间不可编辑。
                </div>
              )}
            </Form.Item>

            {shouldShowStackingConfig && (
              <>
                <Form.Item label={isCreateMode ? createModeStackingLabel : '是否叠加'}>
                  <div className={styles.inlineField}>
                    <Switch
                      checked={formValues.allowStacking}
                      disabled={!canEditStacking}
                      onChange={handleAllowStackingChange}
                    />
                    <span className={styles.inlineText}>
                      {formValues.allowStacking ? '开启' : '关闭'}
                    </span>
                  </div>
                </Form.Item>

                {!isCreateMode && formValues.allowStacking && (
                  <Form.Item required label="选择叠加券类型">
                    <Radio.Group
                      value={formValues.stackingCouponType}
                      disabled={!canEditStacking}
                      onChange={handleStackingTypeChange}
                    >
                      {stackingTypeOptions.map((item) => (
                        <Radio key={item.value} value={item.value}>
                          {item.label}
                        </Radio>
                      ))}
                    </Radio.Group>
                    {formErrors.stackingType && (
                      <div className={styles.fieldError}>{formErrors.stackingType}</div>
                    )}
                  </Form.Item>
                )}
                {isActiveEditMode && !canEditStacking && (
                  <div className={styles.fieldHint}>
                    生效中的叠加/抵扣配置不可编辑。
                  </div>
                )}
              </>
            )}
          </div>
        </Form>
      </Card>

      {!embedded && (
        <Card className={styles.actionCard}>
          <div className={styles.actionRow}>
            <Button onClick={closeCouponView}>
              {isDetailMode ? '返回列表' : '取消'}
            </Button>
            {!isDetailMode && (
              <Button type="primary" onClick={handleSubmit}>
                {primaryButtonText}
              </Button>
            )}
          </div>
        </Card>
      )}

      <MarketingProductSelector
        visible={skuModalVisible}
        title={canEditProductScope ? '选择商品' : '查看商品'}
        readonly={!canEditProductScope}
        selectedSkuIds={formValues.selectedSkuIds}
        data={selectorSpuData}
        onCancel={() => setSkuModalVisible(false)}
        onConfirm={handleSkuModalConfirm}
      />

      {showApplicableStoresSection && (
        <CouponStoreSelector
          visible={storeModalVisible}
          readonly={!canEditStoreIds}
          title={applicableStoresModalTitle}
          entityLabel="店铺"
          simple
          selectedStoreIds={selectedStoreIds}
          onCancel={() => setStoreModalVisible(false)}
          onConfirm={handleStoreModalConfirm}
        />
      )}
    </div>
  );
}

function CouponCreatePage() {
  return <CouponFormPage mode="create" />;
}

export default CouponCreatePage;
