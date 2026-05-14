import React, { useEffect, useState } from 'react';
import { Card, Tag, Typography, Spin, Empty } from '@douyinfe/semi-ui';
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

  if (loading) return <Spin size='large' style={{ display: 'block', margin: '40px auto' }} />;

  if (tasks.length === 0) {
    return <Empty description={t('暂无进行中的考核任务')} style={{ marginTop: 40 }} />;
  }

  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
      {tasks.map((task) => (
        <Card
          key={task.id}
          hoverable
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/console/kpi/task/${task.id}`)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title heading={5} style={{ margin: 0 }}>{task.title}</Title>
            <Tag color='blue'>{task.period_type === 'weekly' ? '每周' : '每月'}</Tag>
          </div>
          <Paragraph style={{ marginTop: 8, color: 'var(--semi-color-text-2)' }} ellipsis={{ rows: 2 }}>
            {task.description || '暂无描述'}
          </Paragraph>
          <div style={{ marginTop: 12, display: 'flex', gap: 16 }}>
            <Text type='tertiary' size='small'>
              开始: {new Date(task.start_time * 1000).toLocaleDateString()}
            </Text>
            <Text type='tertiary' size='small'>
              截止: {new Date(task.end_time * 1000).toLocaleDateString()}
            </Text>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default KPITaskList;
