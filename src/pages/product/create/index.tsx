import React, { useEffect, useMemo, useRef, useState } from 'react';
import qs from 'query-string';
import {
  Button,
  Card,
  Cascader,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Message,
  Radio,
  Select,
  Switch,
  Typography,
  Upload,
} from '@arco-design/web-react';
import { UploadItem } from '@arco-design/web-react/es/Upload/interface';
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconApps,
  IconBgColors,
  IconBold,
  IconCheckSquare,
  IconFontColors,
  IconImage,
  IconItalic,
  IconLink,
  IconMore,
  IconOrderedList,
  IconPlus,
  IconRedo,
  IconUnderline,
  IconUndo,
  IconUnorderedList,
  IconVideoCamera,
} from '@arco-design/web-react/icon';
import { useHistory, useLocation } from 'react-router-dom';
import styles from './index.module.less';
import {
  buildProductCatalogCascaderOptions,
  getProductCatalogIdFromPath,
  getProductCatalogPathById,
  readProductCatalogItems,
} from '../catalog/data';
import {
  buildProductOwnershipCascaderOptions,
  getProductOwnershipIdFromPath,
  getProductOwnershipPathById,
  readProductOwnershipItems,
} from '../category/data';
import {
  ProductCatalogAttributeItem,
  getEnabledAttributesByCatalogId,
  readProductCatalogAttributes,
} from '../attribute/data';
import {
  DEFAULT_INVENTORY_UNIT,
  INVENTORY_UNIT_OPTIONS,
  getMockProductById,
  ProductItem,
} from '../list/data';

type CarouselImage = {
  uid: string;
  name: string;
  url?: string;
};

type SpecItem = {
  id: number;
  name: string;
  value: string;
};

type SpecMode = 'single' | 'multi';
type ProductCreateMode = 'create' | 'edit' | 'copy';
type ProductCreateLocationState = {
  mode?: Exclude<ProductCreateMode, 'create'>;
  sourceProduct?: ProductItem;
};

const PRODUCT_TYPE_OPTIONS = [
  {
    label: '实物商品',
    value: 'physical',
  },
  {
    label: '虚拟商品',
    value: 'virtual',
  },
];

function normalizePath(value: (string | string[])[] | undefined): string[] {
  if (!Array.isArray(value) || !value.length) {
    return [];
  }

  const firstValue = value[0];
  if (Array.isArray(firstValue)) {
    return firstValue;
  }

  return value as string[];
}

function moveArrayItem<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...list];
  const [picked] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, picked);
  return next;
}

const DEFAULT_DETAIL_HTML =
  '';

const DETAIL_BLOCK_OPTIONS = [
  { label: '正文', value: 'p' },
  { label: '标题 1', value: 'h1' },
  { label: '标题 2', value: 'h2' },
  { label: '标题 3', value: 'h3' },
];

const DETAIL_FONT_SIZE_OPTIONS = [
  { label: '默认字号', value: '16' },
  { label: '14px', value: '14' },
  { label: '18px', value: '18' },
  { label: '20px', value: '20' },
];

const DETAIL_LINE_HEIGHT_OPTIONS = [
  { label: '默认行高', value: '1.75' },
  { label: '1.5', value: '1.5' },
  { label: '2.0', value: '2.0' },
];

const COPY_PRODUCT_NAME_SUFFIX = '（副本）';
const PRODUCT_FORM_LAYOUT = {
  layout: 'horizontal' as const,
  labelCol: { flex: '120px' },
  wrapperCol: { flex: '1' },
  requiredSymbol: true,
};

function buildCopyProductName(name: string) {
  const maxLength = 15;
  const baseLength = maxLength - COPY_PRODUCT_NAME_SUFFIX.length;

  if (name.length <= baseLength) {
    return `${name}${COPY_PRODUCT_NAME_SUFFIX}`;
  }

  return `${name.slice(0, baseLength)}${COPY_PRODUCT_NAME_SUFFIX}`;
}

function renderCatalogAttributeField(
  attribute: ProductCatalogAttributeItem,
  className: string,
  disabled = false
) {
  if (attribute.type === 'text') {
    return (
      <Input
        className={className}
        placeholder={`请输入${attribute.name}`}
        disabled={disabled}
        allowClear
      />
    );
  }

  if (attribute.type === 'number') {
    return (
      <InputNumber
        className={className}
        disabled={disabled}
        min={0}
        precision={0}
        placeholder={`请输入${attribute.name}`}
      />
    );
  }

  if (attribute.type === 'single') {
    return (
      <Select
        className={className}
        disabled={disabled}
        placeholder={`请选择${attribute.name}`}
        allowClear
      >
        {attribute.values.map((value) => (
          <Select.Option key={value} value={value}>
            {value}
          </Select.Option>
        ))}
      </Select>
    );
  }

  return (
    <Checkbox.Group className={styles.attributeCheckboxGroup} disabled={disabled}>
      {attribute.values.map((value) => (
        <Checkbox key={value} disabled={disabled} value={value}>
          {value}
        </Checkbox>
      ))}
    </Checkbox.Group>
  );
}

function ProductCreatePage() {
  const history = useHistory();
  const location = useLocation<ProductCreateLocationState>();
  const catalogItems = useMemo(() => readProductCatalogItems(), []);
  const ownershipItems = useMemo(() => readProductOwnershipItems(), []);
  const catalogAttributes = useMemo(() => readProductCatalogAttributes(), []);
  const locationQuery = useMemo(
    () => qs.parse(location.search),
    [location.search]
  );
  const pageMode = useMemo<ProductCreateMode>(() => {
    const rawMode = location.state?.mode || locationQuery.mode;

    return rawMode === 'edit' || rawMode === 'copy' ? rawMode : 'create';
  }, [location.state, locationQuery.mode]);
  const isEditMode = pageMode === 'edit';
  const sourceProduct = useMemo(() => {
    if (location.state?.sourceProduct) {
      return location.state.sourceProduct;
    }

    const sourceId =
      typeof locationQuery.sourceId === 'string' ? locationQuery.sourceId : '';

    return getMockProductById(sourceId);
  }, [location.state, locationQuery.sourceId]);
  const productCatalogOptions = useMemo(
    () => buildProductCatalogCascaderOptions(catalogItems),
    [catalogItems]
  );
  const productOwnershipOptions = useMemo(
    () => buildProductOwnershipCascaderOptions(ownershipItems),
    [ownershipItems]
  );
  const [productCatalogId, setProductCatalogId] = useState<string>();
  const [productOwnershipId, setProductOwnershipId] = useState<string>();
  const [productName, setProductName] = useState('');
  const [shelfTime, setShelfTime] = useState('immediately');
  const [uploadFileList, setUploadFileList] = useState<UploadItem[]>([]);
  const [carouselImages, setCarouselImages] = useState<CarouselImage[]>([]);
  const [draggingUid, setDraggingUid] = useState<string>('');
  const [inventoryUnit, setInventoryUnit] = useState(DEFAULT_INVENTORY_UNIT);
  const [specMode, setSpecMode] = useState<SpecMode>('multi');
  const [specItems, setSpecItems] = useState<SpecItem[]>([]);
  const [singleSpecFileList, setSingleSpecFileList] = useState<UploadItem[]>([]);
  const [singleSpecPrice, setSingleSpecPrice] = useState<number | undefined>();
  const [singleSpecStock, setSingleSpecStock] = useState<number | undefined>();
  const [isLimited, setIsLimited] = useState(false);
  const [limitCount, setLimitCount] = useState<number | undefined>(1);
  const [detailHtml, setDetailHtml] = useState(DEFAULT_DETAIL_HTML);
  const [detailBlockType, setDetailBlockType] = useState('p');
  const [detailFontSize, setDetailFontSize] = useState('16');
  const [detailLineHeight, setDetailLineHeight] = useState('1.75');
  const objectUrlMapRef = useRef<Map<string, string>>(new Map());
  const detailEditorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const objectUrlMap = objectUrlMapRef.current;
    return () => {
      objectUrlMap.forEach((url) => URL.revokeObjectURL(url));
      objectUrlMap.clear();
    };
  }, []);

  useEffect(() => {
    if (!sourceProduct) {
      setProductCatalogId(undefined);
      setProductOwnershipId(undefined);
      setProductName('');
      setShelfTime('immediately');
      setInventoryUnit(DEFAULT_INVENTORY_UNIT);
      setSpecMode('multi');
      setSpecItems([]);
      setSingleSpecFileList([]);
      setSingleSpecPrice(undefined);
      setSingleSpecStock(undefined);
      return;
    }

    setProductCatalogId(sourceProduct.productCatalogId);
    setProductOwnershipId(sourceProduct.productOwnershipId);
    setProductName(
      pageMode === 'copy'
        ? buildCopyProductName(sourceProduct.name)
        : sourceProduct.name
    );
    setShelfTime(sourceProduct.status === 'on' ? 'immediately' : 'warehouse');
    setInventoryUnit(sourceProduct.inventoryUnit || DEFAULT_INVENTORY_UNIT);
    setSpecMode('single');
    setSpecItems([]);
    setSingleSpecFileList([]);
    setSingleSpecPrice(sourceProduct.price);
    setSingleSpecStock(sourceProduct.stock);
  }, [pageMode, sourceProduct]);

  function revokeObjectUrl(uid: string) {
    const target = objectUrlMapRef.current.get(uid);
    if (target) {
      URL.revokeObjectURL(target);
      objectUrlMapRef.current.delete(uid);
    }
  }

  function toCarouselImages(nextFiles: UploadItem[], previous: CarouselImage[]) {
    const previousMap = new Map(previous.map((item) => [item.uid, item]));
    const nextImages = nextFiles.map((item, index) => {
      const cached = previousMap.get(item.uid);
      if (cached) {
        return {
          ...cached,
          name: item.name || cached.name || `图片${index + 1}`,
        };
      }

      if (item.url) {
        return {
          uid: item.uid,
          name: item.name || `图片${index + 1}`,
          url: item.url,
        };
      }

      if (item.originFile) {
        const objectUrl = URL.createObjectURL(item.originFile);
        objectUrlMapRef.current.set(item.uid, objectUrl);
        return {
          uid: item.uid,
          name: item.name || `图片${index + 1}`,
          url: objectUrl,
        };
      }

      return {
        uid: item.uid,
        name: item.name || `图片${index + 1}`,
      };
    });

    previous.forEach((image) => {
      if (!nextImages.find((item) => item.uid === image.uid)) {
        revokeObjectUrl(image.uid);
      }
    });

    return nextImages;
  }

  function handleUploadChange(nextFileList: UploadItem[]) {
    const trimmed = nextFileList.slice(0, 8).map((item) => ({
      ...item,
      status: 'done' as const,
    }));
    setUploadFileList(trimmed);
    setCarouselImages((previous) => toCarouselImages(trimmed, previous));
  }

  function handleRemoveImage(uid: string) {
    setUploadFileList((previous) => previous.filter((item) => item.uid !== uid));
    setCarouselImages((previous) =>
      previous.filter((item) => item.uid !== uid)
    );
    revokeObjectUrl(uid);
  }

  function handleDropTo(uid: string) {
    if (!draggingUid || draggingUid === uid) {
      setDraggingUid('');
      return;
    }

    setCarouselImages((previous) => {
      const fromIndex = previous.findIndex((item) => item.uid === draggingUid);
      const toIndex = previous.findIndex((item) => item.uid === uid);
      if (fromIndex === -1 || toIndex === -1) {
        return previous;
      }
      return moveArrayItem(previous, fromIndex, toIndex);
    });

    setUploadFileList((previous) => {
      const fromIndex = previous.findIndex((item) => item.uid === draggingUid);
      const toIndex = previous.findIndex((item) => item.uid === uid);
      if (fromIndex === -1 || toIndex === -1) {
        return previous;
      }
      return moveArrayItem(previous, fromIndex, toIndex);
    });

    setDraggingUid('');
  }

  function handleSingleSpecUploadChange(nextFileList: UploadItem[]) {
    const latestFiles = nextFileList.slice(-1);

    setSingleSpecFileList((previous) => {
      previous.forEach((item) => {
        if (!latestFiles.find((nextItem) => nextItem.uid === item.uid)) {
          revokeObjectUrl(item.uid);
        }
      });

      return latestFiles.map((item) => {
        const nextItem = {
          ...item,
          status: 'done' as const,
        };

        if (nextItem.url) {
          return nextItem;
        }

        if (item.originFile) {
          const cachedUrl = objectUrlMapRef.current.get(item.uid);
          const objectUrl = cachedUrl || URL.createObjectURL(item.originFile);

          if (!cachedUrl) {
            objectUrlMapRef.current.set(item.uid, objectUrl);
          }

          return {
            ...nextItem,
            url: objectUrl,
          };
        }

        return nextItem;
      });
    });
  }

  function handleSingleSpecRemove(file: UploadItem) {
    revokeObjectUrl(file.uid);
    setSingleSpecFileList((previous) =>
      previous.filter((item) => item.uid !== file.uid)
    );
    return true;
  }

  function handleAddSpec() {
    setSpecItems((previous) => [
      ...previous,
      {
        id: Date.now(),
        name: '',
        value: '',
      },
    ]);
  }

  function handleSpecChange(id: number, field: 'name' | 'value', value: string) {
    setSpecItems((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  function handleRemoveSpec(id: number) {
    setSpecItems((previous) => previous.filter((item) => item.id !== id));
  }

  function syncDetailHtml() {
    if (!detailEditorRef.current) {
      return;
    }
    setDetailHtml(detailEditorRef.current.innerHTML);
  }

  function handleDetailInput() {
    syncDetailHtml();
  }

  function escapeHtmlValue(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function runDetailCommand(command: string, value?: string) {
    if (!detailEditorRef.current) {
      return;
    }
    detailEditorRef.current.focus();
    document.execCommand(command, false, value);
    syncDetailHtml();
  }

  function handleInsertImage() {
    const imageUrl = window.prompt('请输入图片 URL');
    if (!imageUrl) {
      return;
    }
    runDetailCommand('insertImage', imageUrl);
  }

  function handleInsertLink() {
    const linkUrl = window.prompt('请输入链接 URL');
    if (!linkUrl) {
      return;
    }
    runDetailCommand('createLink', linkUrl);
  }

  function handleInsertVideo() {
    const videoUrl = window.prompt('请输入视频 URL');
    if (!videoUrl) {
      return;
    }
    const safeUrl = escapeHtmlValue(videoUrl);
    runDetailCommand(
      'insertHTML',
      `<p><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a></p>`
    );
  }

  function handleInsertTable() {
    runDetailCommand(
      'insertHTML',
      '<table border="1" style="width:100%; border-collapse: collapse;"><tbody><tr><td>表头1</td><td>表头2</td></tr><tr><td>内容1</td><td>内容2</td></tr></tbody></table>'
    );
  }

  function handleDetailBlockChange(value: string) {
    setDetailBlockType(value);
    runDetailCommand('formatBlock', `<${value}>`);
  }

  function handleDetailFontSizeChange(value: string) {
    setDetailFontSize(value);
  }

  function handleDetailLineHeightChange(value: string) {
    setDetailLineHeight(value);
  }

  const currentCatalogAttributes = useMemo(
    () => getEnabledAttributesByCatalogId(catalogAttributes, productCatalogId),
    [catalogAttributes, productCatalogId]
  );

  return (
    <div className={styles.page}>
      <div className={styles.pageActions}>
        <Button onClick={() => history.push('/product/list')}>返回商品列表</Button>
      </div>

      <Card className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <Typography.Title className={styles.sectionTitle} heading={6}>
            基础信息
          </Typography.Title>
        </div>

        <Form
          className={styles.sectionForm}
          initialValues={{
            shelfTime: 'immediately',
          }}
          {...PRODUCT_FORM_LAYOUT}
        >
          <div className={styles.formGrid}>
            <Form.Item label="商品类型">
              <Select className={styles.singleFieldControl} value="virtual" disabled>
                {PRODUCT_TYPE_OPTIONS.map((item) => (
                  <Select.Option key={item.value} value={item.value}>
                    {item.label}
                  </Select.Option>
                ))}
              </Select>
              <div className={styles.fieldHelp}>当前默认选择“虚拟商品”，暂不支持修改。</div>
            </Form.Item>

            <Form.Item
              field="productCategory"
              label="商品类目"
              required
              rules={[{ required: true, message: '请选择商品类目' }]}
            >
              <Cascader
                allowClear
                className={styles.singleFieldControl}
                disabled={isEditMode}
                options={productCatalogOptions}
                placeholder="请选择商品类目"
                value={
                  productCatalogId
                    ? getProductCatalogPathById(productCatalogId, catalogItems)
                    : undefined
                }
                onChange={(value) => {
                  const nextPath = normalizePath(value);
                  setProductCatalogId(
                    getProductCatalogIdFromPath(nextPath, catalogItems)
                  );
                }}
              />
            </Form.Item>

            <Form.Item
              field="productClassification"
              label="商品分类"
              required
              rules={[{ required: true, message: '请选择商品分类' }]}
            >
              <Cascader
                allowClear
                className={styles.singleFieldControl}
                disabled={isEditMode}
                options={productOwnershipOptions}
                placeholder="请选择商品分类"
                value={
                  productOwnershipId
                    ? getProductOwnershipPathById(
                        productOwnershipId,
                        ownershipItems
                      )
                    : undefined
                }
                onChange={(value) => {
                  const nextPath = normalizePath(value);
                  setProductOwnershipId(
                    getProductOwnershipIdFromPath(nextPath, ownershipItems)
                  );
                }}
              />
              <div className={styles.fieldHelp}>
                商品分类用于店铺内部经营管理与财务利润核算。
              </div>
            </Form.Item>

            <Form.Item
              field="productName"
              label="商品名称"
              required
              rules={[
                {
                  required: true,
                  message: '请输入商品名称',
                },
                {
                  max: 15,
                  message: '商品名称支持 15 字以内字符',
                },
              ]}
            >
              <Input
                className={styles.singleFieldControl}
                maxLength={15}
                placeholder="请输入商品名称"
                showWordLimit
                value={productName}
                onChange={setProductName}
                allowClear
              />
            </Form.Item>

            {productCatalogId && currentCatalogAttributes.length > 0 && (
              <Form.Item className={styles.fullWidth} label="商品类目属性">
                <div className={styles.attributePanel}>
                  <div className={styles.attributeFieldList}>
                    {currentCatalogAttributes.map((attribute) => (
                      <Form.Item
                        key={attribute.id}
                        className={styles.attributeFieldItem}
                        field={`catalogAttributeValue_${attribute.id}`}
                        label={attribute.name}
                        rules={
                          attribute.required
                            ? [
                                {
                                  required: true,
                                  message:
                                    attribute.type === 'text' ||
                                    attribute.type === 'number'
                                      ? `请输入${attribute.name}`
                                      : `请选择${attribute.name}`,
                                },
                              ]
                            : undefined
                        }
                      >
                        {renderCatalogAttributeField(
                          attribute,
                          styles.singleFieldControl,
                          isEditMode
                        )}
                      </Form.Item>
                    ))}
                  </div>
                </div>
              </Form.Item>
            )}

            <Form.Item className={styles.fullWidth} label="商品轮播图">
              <div className={styles.uploadPanel}>
                <div className={styles.uploadContent}>
                  <div className={styles.uploadPrimary}>
                    <Upload
                      accept="image/*"
                      fileList={uploadFileList}
                      imagePreview={false}
                      limit={8}
                      listType="picture-card"
                      multiple
                      showUploadList={false}
                      customRequest={({ onSuccess }) => {
                        onSuccess({});
                      }}
                      onChange={handleUploadChange}
                      onExceedLimit={() => {
                        Message.warning('最多可上传 8 张图片');
                      }}
                    >
                      <div className={styles.uploadTrigger}>
                        <IconPlus />
                        <span className={styles.uploadTriggerText}>上传图片</span>
                      </div>
                    </Upload>

                    <Typography.Paragraph className={styles.uploadTips}>
                      建议尺寸 800px × 800px，默认首张图为主图，最多可上传 8 张图。
                    </Typography.Paragraph>
                  </div>

                  {!!carouselImages.length && (
                    <div className={styles.thumbList}>
                      {carouselImages.map((item, index) => (
                        <div
                          key={item.uid}
                          className={`${styles.thumbItem} ${
                            draggingUid === item.uid ? styles.thumbItemDragging : ''
                          }`}
                          draggable
                          onDragStart={() => setDraggingUid(item.uid)}
                          onDragOver={(event) => event.preventDefault()}
                          onDragEnd={() => setDraggingUid('')}
                          onDrop={() => handleDropTo(item.uid)}
                        >
                          <div className={styles.thumbImageBox}>
                            {item.url ? (
                              <img
                                alt={item.name || `商品轮播图${index + 1}`}
                                className={styles.thumbImage}
                                src={item.url}
                              />
                            ) : (
                              <div className={styles.thumbNoPreview}>暂无预览</div>
                            )}
                            <Button
                              className={styles.thumbDelete}
                              size="mini"
                              type="secondary"
                              onClick={() => handleRemoveImage(item.uid)}
                            >
                              删除
                            </Button>
                          </div>
                          <div className={styles.thumbFooter}>
                            <span className={styles.thumbOrder}>第 {index + 1} 张</span>
                            {index === 0 && <span className={styles.thumbMain}>主图</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Form.Item>

            <Form.Item field="shelfTime" label="上架时间">
              <Radio.Group
                disabled={isEditMode}
                value={shelfTime}
                onChange={setShelfTime}
              >
                <Radio value="immediately">立即上架</Radio>
                <Radio value="warehouse">仓库中</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item className={styles.fullWidth} label="是否限购">
              <div className={styles.limitSwitchRow}>
                <Switch checked={isLimited} onChange={setIsLimited} />
                <span className={styles.limitSwitchText}>
                  {isLimited ? '已开启限购' : '不限购'}
                </span>
              </div>
            </Form.Item>

            {isLimited && (
              <Form.Item className={styles.fullWidth} label="限购">
                <div className={styles.limitConfigRow}>
                  <span className={styles.limitConfigLabel}>每人限购</span>
                  <InputNumber
                    className={styles.limitCountInput}
                    min={1}
                    precision={0}
                    value={limitCount}
                    onChange={(value) =>
                      setLimitCount(typeof value === 'number' ? value : undefined)
                    }
                  />
                  <span className={styles.limitConfigUnit}>件</span>
                </div>
              </Form.Item>
            )}
          </div>
        </Form>
      </Card>

      <Card className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <Typography.Title className={styles.sectionTitle} heading={6}>
            规格与库存
          </Typography.Title>
        </div>

        <Form className={styles.sectionForm} {...PRODUCT_FORM_LAYOUT}>
          <div className={styles.formGrid}>
            <Form.Item className={styles.fullWidth} label="库存单位" required>
              <Select
                className={styles.singleFieldControl}
                disabled={isEditMode}
                value={inventoryUnit}
                onChange={setInventoryUnit}
              >
                {INVENTORY_UNIT_OPTIONS.map((item) => (
                  <Select.Option key={item} value={item}>
                    {item}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item className={styles.fullWidth} label="商品规格" required>
              <Radio.Group
                disabled={isEditMode}
                value={specMode}
                onChange={setSpecMode}
              >
                <Radio value="single">单规格</Radio>
                <Radio value="multi">多规格</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item className={styles.fullWidth} label="规格信息">
              {specMode === 'single' ? (
                <div className={styles.specPanel}>
                  <div className={styles.singleSpecGrid}>
                    <div className={styles.singleSpecField}>
                      <div className={styles.singleSpecLabel}>图片</div>
                      <Upload
                        accept="image/*"
                        className={styles.singleSpecUpload}
                        disabled={isEditMode}
                        fileList={singleSpecFileList}
                        imagePreview
                        limit={1}
                        listType="picture-card"
                        multiple={false}
                        customRequest={({ onSuccess }) => {
                          onSuccess({});
                        }}
                        onChange={handleSingleSpecUploadChange}
                        onRemove={handleSingleSpecRemove}
                        onExceedLimit={() => {
                          Message.warning('单规格仅支持上传 1 张图片');
                        }}
                      />
                      <div className={styles.fieldHelp}>仅支持上传 1 张图片</div>
                    </div>

                    <div className={styles.singleSpecField}>
                      <div className={styles.singleSpecLabel}>售价</div>
                      <InputNumber
                        className={styles.singleSpecControl}
                        disabled={isEditMode}
                        min={0}
                        precision={2}
                        placeholder="请输入售价"
                        value={singleSpecPrice}
                        onChange={(value) =>
                          setSingleSpecPrice(
                            typeof value === 'number' ? value : undefined
                          )
                        }
                      />
                    </div>

                    <div className={styles.singleSpecField}>
                      <div className={styles.singleSpecLabel}>库存</div>
                      <div className={styles.singleSpecInputRow}>
                        <InputNumber
                          className={styles.singleSpecControl}
                          disabled={isEditMode}
                          min={0}
                          precision={0}
                          placeholder="请输入库存"
                          value={singleSpecStock}
                          onChange={(value) =>
                            setSingleSpecStock(
                              typeof value === 'number' ? value : undefined
                            )
                          }
                        />
                        <span className={styles.singleSpecUnit}>{inventoryUnit}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.specPanel}>
                  <Button type="outline" disabled={isEditMode} onClick={handleAddSpec}>
                    添加新规格
                  </Button>

                  {specItems.length ? (
                    <div className={styles.specList}>
                      {specItems.map((item, index) => (
                        <div key={item.id} className={styles.specItem}>
                          <div className={styles.specItemHeader}>
                            <span className={styles.specItemTitle}>规格 {index + 1}</span>
                            <Button
                              size="mini"
                              type="text"
                              status="danger"
                              disabled={isEditMode}
                              onClick={() => handleRemoveSpec(item.id)}
                            >
                              删除
                            </Button>
                          </div>

                          <div className={styles.specInputs}>
                            <Input
                              disabled={isEditMode}
                              value={item.name}
                              placeholder="请输入规格名称，例如：颜色"
                              onChange={(value) => handleSpecChange(item.id, 'name', value)}
                            />
                            <Input
                              disabled={isEditMode}
                              value={item.value}
                              placeholder="请输入规格值，例如：红色,蓝色"
                              onChange={(value) => handleSpecChange(item.id, 'value', value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Typography.Paragraph className={styles.specEmpty}>
                      当前仅支持多规格，可点击“添加新规格”开始配置规格信息。
                    </Typography.Paragraph>
                  )}
                </div>
              )}
            </Form.Item>

            {specMode === 'multi' && (
              <Form.Item className={styles.fullWidth} label="商品属性配置项">
                {specItems.length ? (
                  <div className={styles.specAttributePanel}>
                    <Typography.Paragraph className={styles.attributeHint}>
                      已添加规格信息。商品属性配置区域已激活，后续可按规格联动展示具体属性项。
                    </Typography.Paragraph>
                    <div className={styles.placeholderRows}>
                      <div className={styles.placeholderRow}>商品属性配置项预留区 01</div>
                      <div className={styles.placeholderRow}>商品属性配置项预留区 02</div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.specAttributeTip}>
                    请先在规格模块中添加规格信息。添加规格信息后，商品属性才会展示。
                  </div>
                )}
              </Form.Item>
            )}
          </div>
        </Form>
      </Card>

      <Card className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <Typography.Title className={styles.sectionTitle} heading={6}>
            商品详情页配置
          </Typography.Title>
        </div>

        <Form className={styles.sectionForm} {...PRODUCT_FORM_LAYOUT}>
          <div className={styles.formGrid}>
            <Form.Item className={styles.fullWidth} label="商品详情页">
              <div className={styles.detailLayout}>
                <div className={styles.detailPreview}>
                  <div className={styles.detailPanelHeader}>详情预览</div>
                  <div className={styles.detailPanelBody}>
                    {detailHtml.trim() ? (
                      <div
                        className={styles.detailPreviewContent}
                        style={{
                          fontSize: `${detailFontSize}px`,
                          lineHeight: detailLineHeight,
                        }}
                        dangerouslySetInnerHTML={{ __html: detailHtml }}
                      />
                    ) : (
                      <div className={styles.detailEmpty}>
                        请输入商品详细介绍...
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.detailEditor}>
                  <div className={styles.detailToolbar}>
                    <div className={styles.detailToolbarRow}>
                      <Select
                        size="small"
                        className={styles.toolbarSelectCompact}
                        value={detailBlockType}
                        onChange={handleDetailBlockChange}
                      >
                        {DETAIL_BLOCK_OPTIONS.map((item) => (
                          <Select.Option key={item.value} value={item.value}>
                            {item.label}
                          </Select.Option>
                        ))}
                      </Select>
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconBold />}
                        onClick={() => runDetailCommand('bold')}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconUnderline />}
                        onClick={() => runDetailCommand('underline')}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconItalic />}
                        onClick={() => runDetailCommand('italic')}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconMore />}
                        onClick={() => runDetailCommand('strikethrough')}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconFontColors />}
                        onClick={() => runDetailCommand('foreColor', '#111827')}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconBgColors />}
                        onClick={() => runDetailCommand('hiliteColor', '#FFF5D6')}
                      />
                      <span className={styles.toolbarDivider} />
                      <Select
                        size="small"
                        className={styles.toolbarSelect}
                        value={detailFontSize}
                        onChange={handleDetailFontSizeChange}
                      >
                        {DETAIL_FONT_SIZE_OPTIONS.map((item) => (
                          <Select.Option key={item.value} value={item.value}>
                            {item.label}
                          </Select.Option>
                        ))}
                      </Select>
                      <Select
                        size="small"
                        className={styles.toolbarSelect}
                        value={detailLineHeight}
                        onChange={handleDetailLineHeightChange}
                      >
                        {DETAIL_LINE_HEIGHT_OPTIONS.map((item) => (
                          <Select.Option key={item.value} value={item.value}>
                            {item.label}
                          </Select.Option>
                        ))}
                      </Select>
                      <span className={styles.toolbarDivider} />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconUnorderedList />}
                        onClick={() => runDetailCommand('insertUnorderedList')}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconOrderedList />}
                        onClick={() => runDetailCommand('insertOrderedList')}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconCheckSquare />}
                        onClick={() =>
                          runDetailCommand(
                            'insertHTML',
                            '<ul><li><input type="checkbox" /> 待办项</li></ul>'
                          )
                        }
                      />
                      <span className={styles.toolbarDivider} />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconAlignLeft />}
                        onClick={() => runDetailCommand('justifyLeft')}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconAlignCenter />}
                        onClick={() => runDetailCommand('justifyCenter')}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconAlignRight />}
                        onClick={() => runDetailCommand('justifyRight')}
                      />
                    </div>
                    <div className={styles.detailToolbarRow}>
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconImage />}
                        onClick={handleInsertImage}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconLink />}
                        onClick={handleInsertLink}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconVideoCamera />}
                        onClick={handleInsertVideo}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconApps />}
                        onClick={handleInsertTable}
                      />
                      <span className={styles.toolbarDivider} />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconUndo />}
                        onClick={() => runDetailCommand('undo')}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconRedo />}
                        onClick={() => runDetailCommand('redo')}
                      />
                    </div>
                  </div>
                  <div
                    ref={detailEditorRef}
                    className={styles.detailEditable}
                    contentEditable
                    style={{
                      fontSize: `${detailFontSize}px`,
                      lineHeight: detailLineHeight,
                    }}
                    data-placeholder="请输入商品详细介绍..."
                    onInput={handleDetailInput}
                    suppressContentEditableWarning
                  />
                </div>
              </div>
            </Form.Item>
          </div>
        </Form>
      </Card>
    </div>
  );
}

export default ProductCreatePage;
