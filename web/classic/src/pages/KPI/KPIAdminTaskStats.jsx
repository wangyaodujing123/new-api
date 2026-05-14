import React, { useEffect, useState } from 'react';
import { Card, Table, Typography, Tag, Spin, Empty, Button, Progress } from '@douyinfe/semi-ui';
import { IconArrowLeft } from '@douyinfe/semi-icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API, showError } from '../../helpers';

const { Title, Text, Paragraph } = Typography;

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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <Spin size='large' />
      </div>
    );
  }

  if (!task) return <Empty title='任务不存在' style={{ marginTop: 80 }} />;

  const columns = [
    {
      title: '排名',
      width: 70,
      render: (_, __, idx) => {
        const medals = ['🥇', '🥈', '🥉'];
        return idx < 3 ? <span style={{ fontSize: 18 }}>{medals[idx]}</span> : <Text>{idx + 1}</Text>;
      },
    },
    {
      title: '用户',
      dataIndex: 'username',
      render: (v, r) => <Text strong>{v || `用户 #${r.user_id}`}</Text>,
    },
    { title: '提交数', dataIndex: 'submit_count', width: 80 },
    {
      title: '通过数',
      dataIndex: 'approved_count',
      width: 80,
      render: (v) => <Tag color='green'>{v}</Tag>,
    },
    {
      title: '平均分',
      dataIndex: 'average_score',
      width: 90,
      render: (v) => v > 0 ? <Tag color='blue'>{v.toFixed(1)}</Tag> : <Text type='tertiary'>-</Text>,
    },
    {
      title: '完成率',
      dataIndex: 'completion_rate',
      width: 160,
      render: (v) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress percent={Math.min(v || 0, 100)} size='small' style={{ flex: 1 }} />
          <Text size='small'>{(v || 0).toFixed(0)}%</Text>
        </div>
      ),
    },
  ];

  return (
    <div className='mt-[60px] px-2'>
      <Button
        icon={<IconArrowLeft />}
        theme='borderless'
        onClick={() => navigate('/console/kpi/admin')}
        style={{ marginBottom: 16 }}
      >
        返回任务列表
      </Button>

      {/* 任务信息 */}
      <Card style={{ marginBottom: 20, borderRadius: 12 }} bodyStyle={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title heading={3} style={{ margin: 0 }}>{task.title}</Title>
            <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
              <Tag color='blue'>{task.period_type === 'weekly' ? '每周考核' : '每月考核'}</Tag>
              <Text type='tertiary'>
                {new Date(task.start_time * 1000).toLocaleDateString()} ~ {new Date(task.end_time * 1000).toLocaleDateString()}
              </Text>
            </div>
          </div>
          <Tag color={task.status === 1 ? 'green' : 'grey'} size='large'>
            {task.status === 1 ? '进行中' : task.status === 2 ? '已结束' : '已归档'}
          </Tag>
        </div>
        {task.description && (
          <Paragraph style={{ marginTop: 12, color: 'var(--semi-color-text-2)' }}>{task.description}</Paragraph>
        )}
      </Card>

      {/* 统计概览 */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
          <Card bodyStyle={{ textAlign: 'center', padding: '20px 16px' }} style={{ borderRadius: 12 }}>
            <Title heading={2} style={{ margin: 0 }}>{stats.total_count || 0}</Title>
            <Text type='tertiary'>总提交</Text>
          </Card>
          <Card bodyStyle={{ textAlign: 'center', padding: '20px 16px' }} style={{ borderRadius: 12 }}>
            <Title heading={2} style={{ margin: 0, color: 'var(--semi-color-success)' }}>{stats.approved_count || 0}</Title>
            <Text type='tertiary'>已通过</Text>
          </Card>
          <Card bodyStyle={{ textAlign: 'center', padding: '20px 16px' }} style={{ borderRadius: 12 }}>
            <Title heading={2} style={{ margin: 0, color: 'var(--semi-color-danger)' }}>{stats.rejected_count || 0}</Title>
            <Text type='tertiary'>已驳回</Text>
          </Card>
          <Card bodyStyle={{ textAlign: 'center', padding: '20px 16px' }} style={{ borderRadius: 12 }}>
            <Title heading={2} style={{ margin: 0, color: 'var(--semi-color-warning)' }}>{stats.pending_count || 0}</Title>
            <Text type='tertiary'>待审核</Text>
          </Card>
        </div>
      )}

      {/* 用户排名 */}
      <Card title='用户排名' style={{ borderRadius: 12 }}>
        <Table
          columns={columns}
          dataSource={ranking}
          rowKey='user_id'
          pagination={false}
          empty={<Empty title='暂无数据' description='等待用户提交后即可查看排名' />}
        />
      </Card>
    </div>
  );
};

export default KPIAdminTaskStats;
