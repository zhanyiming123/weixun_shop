import React from 'react';
import { Card, Empty, Tag, Typography } from '@arco-design/web-react';
import useLocale from '@/utils/useLocale';
import locale from './locale';
import {
  HeadquartersDashboardAlert,
  HeadquartersDashboardAlertLevel,
  HeadquartersDashboardTodo,
} from './types';
import { getAlertLevelColor, getTodoStatusColor } from './utils';
import styles from './style/index.module.less';

const ALERT_LEVELS: HeadquartersDashboardAlertLevel[] = ['high', 'medium', 'low'];

function OperationsPanel({
  alerts,
  todos,
}: {
  alerts: HeadquartersDashboardAlert[];
  todos: HeadquartersDashboardTodo[];
}) {
  const t = useLocale(locale);

  return (
    <>
      <Card className={styles.sideCard}>
        <div className={styles.sectionHeader}>
          <div>
            <Typography.Title heading={6} className={styles.sectionTitle}>
              {t['workplace.alerts']}
            </Typography.Title>
            <Typography.Text type="secondary">
              {t['workplace.alerts.description']}
            </Typography.Text>
          </div>
        </div>

        {alerts.length ? (
          <div className={styles.alertGroupList}>
            {ALERT_LEVELS.map((level) => {
              const currentAlerts = alerts.filter((item) => item.level === level);

              if (!currentAlerts.length) {
                return null;
              }

              return (
                <div key={level} className={styles.alertGroup}>
                  <div className={styles.alertGroupTitle}>
                    <Tag color={getAlertLevelColor(level)}>
                      {t[`workplace.alertLevel.${level}`]}
                    </Tag>
                  </div>
                  <div className={styles.alertList}>
                    {currentAlerts.map((alert) => (
                      <div key={alert.id} className={styles.alertItem}>
                        <div className={styles.alertTitleRow}>
                          <span className={styles.alertTitle}>{alert.title}</span>
                          <Typography.Text type="secondary">
                            {alert.targetName}
                          </Typography.Text>
                        </div>
                        <Typography.Text type="secondary">
                          {alert.description}
                        </Typography.Text>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty description={t['workplace.empty']} />
        )}
      </Card>

      <Card className={styles.sideCard}>
        <div className={styles.sectionHeader}>
          <div>
            <Typography.Title heading={6} className={styles.sectionTitle}>
              {t['workplace.todos']}
            </Typography.Title>
            <Typography.Text type="secondary">
              {t['workplace.todos.description']}
            </Typography.Text>
          </div>
        </div>

        {todos.length ? (
          <div className={styles.todoList}>
            {todos.map((todo) => (
              <div key={todo.id} className={styles.todoItem}>
                <div className={styles.todoHeader}>
                  <Typography.Text className={styles.todoTitle}>
                    {todo.title}
                  </Typography.Text>
                  <Tag color={getTodoStatusColor(todo.status)}>{todo.status}</Tag>
                </div>
                <div className={styles.todoMeta}>
                  <Typography.Text type="secondary">
                    {t['workplace.todo.owner']}：{todo.owner}
                  </Typography.Text>
                  <Typography.Text type="secondary">{todo.dueText}</Typography.Text>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty description={t['workplace.empty']} />
        )}
      </Card>
    </>
  );
}

export default OperationsPanel;
