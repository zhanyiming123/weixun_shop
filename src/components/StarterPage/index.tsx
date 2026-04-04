import React from 'react';
import {
  Card,
  Grid,
  List,
  Space,
  Tag,
  Typography,
} from '@arco-design/web-react';

type SummaryItem = {
  label: string;
  value: string;
  helper: string;
};

type StarterPageProps = {
  title: string;
  description: string;
  badge: string;
  summaries: SummaryItem[];
  modules: string[];
  nextSteps: string[];
};

const { Row, Col } = Grid;

function renderList(items: string[], color: 'arcoblue' | 'green') {
  return (
    <List
      dataSource={items}
      render={(item, index) => (
        <List.Item key={`${item}-${index}`}>
          <Space>
            <Tag color={color}>{String(index + 1).padStart(2, '0')}</Tag>
            <Typography.Text>{item}</Typography.Text>
          </Space>
        </List.Item>
      )}
    />
  );
}

function StarterPage(props: StarterPageProps) {
  const { title, description, badge, summaries, modules, nextSteps } = props;

  return (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card>
        <Space direction="vertical" size={12} style={{ display: 'flex' }}>
          <Tag color="arcoblue" size="large">
            {badge}
          </Tag>
          <Typography.Title heading={4} style={{ margin: 0 }}>
            {title}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {description}
          </Typography.Paragraph>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        {summaries.map((item) => (
          <Col xs={24} md={8} key={item.label}>
            <Card>
              <Typography.Text type="secondary">{item.label}</Typography.Text>
              <Typography.Title heading={3} style={{ margin: '8px 0' }}>
                {item.value}
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                {item.helper}
              </Typography.Paragraph>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="首期建议模块">{renderList(modules, 'arcoblue')}</Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="后续扩展方向">{renderList(nextSteps, 'green')}</Card>
        </Col>
      </Row>
    </Space>
  );
}

export default StarterPage;
