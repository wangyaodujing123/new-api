import React, { useEffect, useState } from 'react';
import { Card, Tag, Typography, Spin, Empty, Banner } from '@douyinfe/semi-ui';
import { IconCalendar, IconClock } from '@douyinfe/semi-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API, showError } from '../../helpers';

const { Title, Paragraph, Text } = Typography;

const KPITaskList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    try {
      const res = await API.get('/api/kpi/task/active?page_size=50');
      if (res.data.success) {
        setTasks(res.data.data?.list || []);
      } else {
        showError(res.data.message);
      }
    } catch (err) {
      showError('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <Spin size='large' />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Empty
        title={t('暂无考核任务')}
        description={t('当前没有进行中的 KPI 考核任务')}
        style={{ marginTop: 60 }}
      />
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))' }}>
      {tasks.map((task) => {
        const now = Date.now() / 1000;
        const daysLeft = Math.max(0, Math.ceil((task.end_time - now) / 86400));

        return (
          <Card
            key={task.id}
            hoverable
            style={{ cursor: 'pointer', borderRadius: 12 }}
            onClick={() => navigate(`/console/kpi/task/${task.id}`)}
            bodyStyle={{ padding: '20px 24px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <Title heading={5} style={{ margin: 0, flex: 1 }}>{task.title}</Title>
              <Tag color='blue' size='large' style={{ marginLeft: 12 }}>
                {task.period_type === 'weekly' ? '每周' : '每月'}
              </Tag>
            </div>

            <Paragraph
              ellipsis={{ rows: 2 }}
              style={{ color: 'var(--semi-color-text-2)', marginBottom: 16, minHeight: 40 }}
            >
              {task.description || '暂无描述'}
            </Paragraph>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <Text type='tertiary' size='small' style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IconCalendar size='small' />
                  {new Date(task.start_time * 1000).toLocaleDateString()} - {new Date(task.end_time * 1000).toLocaleDateString()}
                </Text>
              </div>
              <Tag color={daysLeft <= 3 ? 'red' : 'green'} size='small'>
                <IconClock size='extra-small' style={{ marginRight: 4 }} />
                剩余 {daysLeft} 天
              </Tag>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default KPITaskList;
