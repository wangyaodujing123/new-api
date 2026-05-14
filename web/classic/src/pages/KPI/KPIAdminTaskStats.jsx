import React, { useEffect, useState } from 'react';
import { Card, Table, Typography, Tag, Spin, Empty, Button } from '@douyinfe/semi-ui';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API, showError } from '../../helpers';

const { Title, Text } = Typography;

const KPIAdminTaskStats = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [stats, setStats] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [taskRes, statsRes, rankingRes] = await Promise.all([
          API.get(`/api/kpi/task/${id}`),
          API.get(`/api/kpi/task/${id}/stats`),
          API.get(`/api/kpi/task/${id}/ranking?page_size=50`),
        ]);
        if (taskRes.data.success) setTask(taskRes.data.data?.task);
        if (statsRes.data.success) setStats(statsRes.data.data);
        if (rankingRes.data.success) setRanking(rankingRes.data.data?.list || []);
      } catch (err) {
        showError('加载数据失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <Spin size='large' style={{ display: 'block', margin: '40px auto' }} />;
  if (!task) return <Empty description='任务不存在' />;

  const columns = [
    { title: '排名', render: (_, __, idx) => idx + 1, width: 60 },
    { title: '用户', dataIndex: 'username', render: (v, r) => v || `用户${r.user_id}` },
    { title: '提交数', dataIndex: 'submit_count', width: 80 },
    { title: '通过数', dataIndex: 'approved_count', width: 80 },
    { title: '平均分', dataIndex: 'average_score', width: 80, render: (v) => v?.toFixed(1) || '0.0' },
    { title: '完成率', dataIndex: 'completion_rate', width: 80, render: (v) => `${(v || 0).toFixed(1)}%` },
  ];

  return (
    <div>
      <Button theme='borderless' onClick={() => navigate('/console/kpi/admin')} style={{ marginBottom: 16 }}>
        ← 返回任务列表
      </Button>

      <Card style={{ marginBottom: 24 }}>
        <Title heading={4}>{task.title}</Title>
        <Text type='tertiary'>{task.description}</Text>
      </Card>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Title heading={2} style={{ margin: 0 }}>{stats.total_count || 0}</Title>
              <Text type='tertiary'>总提交</Text>
            </div>
          </Card>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Title heading={2} style={{ margin: 0, color: 'var(--semi-color-success)' }}>{stats.approved_count || 0}</Title>
              <Text type='tertiary'>已通过</Text>
            </div>
          </Card>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Title heading={2} style={{ margin: 0, color: 'var(--semi-color-danger)' }}>{stats.rejected_count || 0}</Title>
              <Text type='tertiary'>已驳回</Text>
            </div>
          </Card>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Title heading={2} style={{ margin: 0, color: 'var(--semi-color-warning)' }}>{stats.pending_count || 0}</Title>
              <Text type='tertiary'>待审核</Text>
            </div>
          </Card>
        </div>
      )}

      <Card title='用户排名'>
        <Table columns={columns} dataSource={ranking} rowKey='user_id' pagination={false} empty={<Empty description='暂无数据' />} />
      </Card>
    </div>
  );
};

export default KPIAdminTaskStats;
