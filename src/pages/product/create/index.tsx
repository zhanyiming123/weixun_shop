import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Cascader,
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
import { useHistory } from 'react-router-dom';
import styles from './index.module.less';

type CascaderOption = {
  label: string;
  value: string;
  children?: CascaderOption[];
};

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

const CATEGORY_OPTIONS: CascaderOption[] = [
  {
    label: '留学服务',
    value: 'overseas',
    children: [
      {
        label: '国际课程',
        value: 'international-course',
        children: [
          { label: 'IGCSE', value: 'igcse' },
          { label: 'A-Level', value: 'a-level' },
          { label: 'IB', value: 'ib' },
        ],
      },
      {
        label: '标化考试',
        value: 'standardized',
        children: [
          { label: '雅思', value: 'ielts' },
          { label: '托福', value: 'toefl' },
        ],
      },
    ],
  },
  {
    label: '背景提升',
    value: 'background-boost',
    children: [
      {
        label: '科研项目',
        value: 'research',
        children: [{ label: '导师课题', value: 'mentor-project' }],
      },
      {
        label: '竞赛规划',
        value: 'contest',
        children: [{ label: '学术竞赛', value: 'academic-contest' }],
      },
    ],
  },
];

const CLASSIFICATION_OPTIONS: CascaderOption[] = [
  {
    label: '课程类',
    value: 'course',
    children: [
      {
        label: '系统课',
        value: 'system-course',
        children: [
          { label: '录播课', value: 'recorded' },
          { label: '直播课', value: 'live' },
        ],
      },
      {
        label: '短期班',
        value: 'short-term',
        children: [{ label: '冲刺班', value: 'sprint' }],
      },
    ],
  },
  {
    label: '服务类',
    value: 'service',
    children: [
      {
        label: '咨询服务',
        value: 'consult',
        children: [{ label: '1V1服务', value: 'one-to-one' }],
      },
      {
        label: '资料服务',
        value: 'material',
        children: [{ label: '资料包', value: 'resource-pack' }],
      },
    ],
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

function findLabelPath(options: CascaderOption[], path: string[]): string[] {
  const labels: string[] = [];
  let currentOptions = options;

  for (const value of path) {
    const matched = currentOptions.find((item) => item.value === value);
    if (!matched) {
      break;
    }
    labels.push(matched.label);
    currentOptions = matched.children || [];
  }

  return labels;
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

function ProductCreatePage() {
  const history = useHistory();
  const [classificationPath, setClassificationPath] = useState<string[]>([]);
  const [uploadFileList, setUploadFileList] = useState<UploadItem[]>([]);
  const [carouselImages, setCarouselImages] = useState<CarouselImage[]>([]);
  const [draggingUid, setDraggingUid] = useState<string>('');
  const [specItems, setSpecItems] = useState<SpecItem[]>([]);
  const [isLimited, setIsLimited] = useState(false);
  const [limitCount, setLimitCount] = useState<number | undefined>(1);
  const [detailHtml, setDetailHtml] = useState(DEFAULT_DETAIL_HTML);
  const [detailBlockType, setDetailBlockType] = useState('p');
  const [detailFontSize, setDetailFontSize] = useState('16');
  const [detailLineHeight, setDetailLineHeight] = useState('1.75');
  const objectUrlMapRef = useRef<Map<string, string>>(new Map());
  const detailEditorRef = useRef<HTMLDivElement | null>(null);

  const classificationLabelPath = useMemo(
    () => findLabelPath(CLASSIFICATION_OPTIONS, classificationPath),
    [classificationPath]
  );

  useEffect(() => {
    const objectUrlMap = objectUrlMapRef.current;
    return () => {
      objectUrlMap.forEach((url) => URL.revokeObjectURL(url));
      objectUrlMap.clear();
    };
  }, []);

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

  return (
    <div className={styles.page}>
      <Card className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div>
            <Typography.Title heading={4} style={{ marginTop: 0, marginBottom: 6 }}>
              添加商品
            </Typography.Title>
            <Typography.Paragraph className={styles.headerDesc} type="secondary">
              当前已完成“基础信息”模块，正在逐步补充“规格与库存”等后续配置模块。
            </Typography.Paragraph>
          </div>
          <Button onClick={() => history.push('/product/list')}>返回商品列表</Button>
        </div>
      </Card>

      <Card className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <Typography.Title className={styles.sectionTitle} heading={6}>
            基础信息
          </Typography.Title>
          <Typography.Paragraph className={styles.sectionDesc} type="secondary">
            基础信息用于定义商品的基本归属和上架方式，包含类型、类目、分类、名称与上架策略。
          </Typography.Paragraph>
        </div>

        <Form
          layout="vertical"
          initialValues={{
            shelfTime: 'immediately',
          }}
        >
          <div className={styles.formGrid}>
            <Form.Item label="商品类型">
              <Select value="virtual" disabled>
                {PRODUCT_TYPE_OPTIONS.map((item) => (
                  <Select.Option key={item.value} value={item.value}>
                    {item.label}
                  </Select.Option>
                ))}
              </Select>
              <div className={styles.fieldHelp}>当前默认选择“虚拟商品”，暂不支持修改。</div>
            </Form.Item>

            <Form.Item field="productCategory" label="商品类目">
              <Cascader options={CATEGORY_OPTIONS} placeholder="请选择商品类目" allowClear />
            </Form.Item>

            <Form.Item field="productClassification" label="商品分类">
              <Cascader
                allowClear
                options={CLASSIFICATION_OPTIONS}
                placeholder="请选择商品分类"
                onChange={(value) => {
                  setClassificationPath(normalizePath(value));
                }}
              />
            </Form.Item>

            <Form.Item className={styles.fullWidth} label="分类属性">
              <div className={styles.attributePanel}>
                <Typography.Paragraph className={styles.attributeHint}>
                  {classificationLabelPath.length
                    ? `已选择商品分类：${classificationLabelPath.join(
                        ' / '
                      )}。分类属性将随该分类动态变化（待配置）。`
                    : '请先选择“商品分类”。分类属性区域会根据分类结果动态变化（当前先预留配置区域）。'}
                </Typography.Paragraph>
                <div className={styles.placeholderRows}>
                  <div className={styles.placeholderRow}>分类属性配置项预留区 01</div>
                  <div className={styles.placeholderRow}>分类属性配置项预留区 02</div>
                  <div className={styles.placeholderRow}>分类属性配置项预留区 03</div>
                </div>
              </div>
            </Form.Item>

            <Form.Item
              field="productName"
              label="商品名称"
              rules={[
                {
                  max: 15,
                  message: '商品名称支持 15 字以内字符',
                },
              ]}
            >
              <Input
                maxLength={15}
                placeholder="请输入商品名称"
                showWordLimit
                allowClear
              />
            </Form.Item>

            <Form.Item className={styles.fullWidth} label="商品轮播图">
              <div className={styles.uploadPanel}>
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
                  建议尺寸 800px × 800px，默认首张图为主图，最多可上传 10 张图。
                </Typography.Paragraph>

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
            </Form.Item>

            <Form.Item field="shelfTime" label="上架时间">
              <Radio.Group>
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
                    hideButton
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
          <Typography.Paragraph className={styles.sectionDesc} type="secondary">
            先完成规格模式切换和属性配置占位，后续再逐步补充库存规则与 SKU 明细配置。
          </Typography.Paragraph>
        </div>

        <Form layout="vertical">
          <div className={styles.formGrid}>
            <Form.Item className={styles.fullWidth} label="商品规格">
              <Radio.Group value="multi">
                <Radio value="multi">多规格</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item className={styles.fullWidth} label="规格信息">
              <div className={styles.specPanel}>
                <Button type="outline" onClick={handleAddSpec}>
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
                            onClick={() => handleRemoveSpec(item.id)}
                          >
                            删除
                          </Button>
                        </div>

                        <div className={styles.specInputs}>
                          <Input
                            value={item.name}
                            placeholder="请输入规格名称，例如：颜色"
                            onChange={(value) => handleSpecChange(item.id, 'name', value)}
                          />
                          <Input
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
            </Form.Item>

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
          </div>
        </Form>
      </Card>

      <Card className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <Typography.Title className={styles.sectionTitle} heading={6}>
            图文配置
          </Typography.Title>
          <Typography.Paragraph className={styles.sectionDesc} type="secondary">
            在该模块中配置商品详情图文内容，编辑器样式与内容区可同步预览。
          </Typography.Paragraph>
        </div>

        <Form layout="vertical">
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
