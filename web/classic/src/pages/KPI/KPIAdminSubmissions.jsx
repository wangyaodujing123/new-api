import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Modal, Input, InputNumber, Empty, Select, Typography, Space } from '@douyinfe/semi-ui';
import { IconTick, IconClose } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../../helpers';

const { Text } = Typography;
const statusMap = {
  0: { text: '待审核', color: 'amber' },
  1: { text: '已通过', color: 'green' },
  2: { text: '已驳回', color: 'red' },
};

const KPIAdminSubmissions = () => {
  const { t } = useTranslation();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(-1);
  const [reviewModal, setReviewModal] = useState({ visible: false, id: null, description: '' });
  const [reviewForm, setReviewForm] = useState({ score: null, comment: '' });
  const [reviewLoading, setReviewLoading] = useState(false);

  const loadSubmissions = async (p = 1) => {
    setLoading(true);
    try {
      let url = `/api/kpi/submission?page=${p}&page_size=15`;
      if (statusFilter >= 0) url += `&status=${statusFilter}`;
      const res = await API.get(url);
      if (res.data.success) {
        setSubmissions(res.data.data?.list || []);
        setTotal(res.data.data?.total || 0);
      } else {
        showError(res.data.message);
      }
    } catch (err) {
      showError('获取提交列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSubmissions(page); }, [page, statusFilter]);

  const handleReview = async (action) => {
    if (action === 'reject' && !reviewForm.comment.trim()) {
      showError('驳回时必须填写原因');
      return;
    }
    setReviewLoading(true);
    try {
      const data = { action, comment: reviewForm.comment || undefined };
      if (reviewForm.score !== null && reviewForm.score !== '') {
        data.score = Number(reviewForm.score);
      }
      const res = await API.post(`/api/kpi/submission/${reviewModal.id}/review`, data);
      if (res.data.success) {
        showSuccess('审核完成');
        setReviewModal({ visible: false, id: null, description: '' });
        setReviewForm({ score: null, comment: '' });
        loadSubmissions(page);
      } else {
        showError(res.data.message);
      }
    } catch (err) {
      showError('操作失败');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleUpdateScore = (id, currentScore) => {
    Modal.confirm({
      title: '修改评分',
      content: (
        <InputNumber
          defaultValue={currentScore}
          min={0}
          max={100}
          style={{ width: '100%' }}
          onChange={(v) => { window.__kpi_new_score = v; }}
        />
      ),
      onOk: async () => {
        const score = window.__kpi_new_score;
        if (score === undefined || score === null) return;
        try {
          const res = await API.put(`/api/kpi/submission/${id}/score`, { score: Number(score) });
          if (res.data.success) {
            showSuccess('评分更新成功');
            loadSubmissions(page);
          } else {
            showError(res.data.message);
          }
        } catch (err) {
          showError('操作失败');
        }
      },
    });
  };

  const columns = [
    { title: '用户', dataIndex: 'user_id', width: 80, render: (v) => <Tag>#{v}</Tag> },
    { title: '任务', dataIndex: 'task_id', width: 70, render: (v) => <Text type='tertiary'>#{v}</Text> },
    { title: '日期', dataIndex: 'submission_date', width: 110, render: (v) => <Tag>{v}</Tag> },
    {
      title: '截图',
      dataIndex: 'screenshot_urls',
      width: 130,
      render: (text) => {
        try {
          const urls = JSON.parse(text || '[]');
          return (
            <div style={{ display: 'flex', gap: 4 }}>
              {urls.slice(0, 3).map((url, i) => (
                <a key={i} href={`/api/kpi/uploads/${url}`} target='_blank' rel='noopener noreferrer'>
                  <img src={`/api/kpi/uploads/${url}`} width={32} height={32} style={{ objectFit: 'cover', borderRadius: 4, border: '1px solid var(--semi-color-border)' }} />
                </a>
              ))}
              {urls.length > 3 && <Text type='tertiary' size='small'>+{urls.length - 3}</Text>}
            </div>
          );
        } catch { return '-'; }
      },
    },
    {
      title: '说明',
      dataIndex: 'description',
      ellipsis: { showTooltip: true },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status) => {
        const s = statusMap[status] || { text: '未知', color: 'grey' };
        return <Tag color={s.color} shape='circle'>{s.text}</Tag>;
      },
    },
    {
      title: '评分',
      dataIndex: 'score',
      width: 80,
      render: (v) => v != null ? <Tag color='blue'>{v} 分</Tag> : <Text type='tertiary'>-</Text>,
    },
    {
      title: '操作',
      width: 140,
      render: (_, record) => (
        <Space>
          {record.status === 0 && (
            <Button
              size='small'
              theme='solid'
              type='primary'
              onClick={() => setReviewModal({ visible: true, id: record.id, description: record.description })}
            >
              审核
            </Button>
          )}
          {record.status === 1 && (
            <Button size='small' theme='light' onClick={() => handleUpdateScore(record.id, record.score)}>
              改分
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Text strong>状态筛选：</Text>
        <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 130 }}>
          <Select.Option value={-1}>全部</Select.Option>
          <Select.Option value={0}>待审核</Select.Option>
          <Select.Option value={1}>已通过</Select.Option>
          <Select.Option value={2}>已驳回</Select.Option>
        </Select>
      </div>

      <Table
        columns={columns}
        dataSource={submissions}
        rowKey='id'
        loading={loading}
        pagination={{
          currentPage: page,
          pageSize: 15,
          total,
          onPageChange: setPage,
          showTotal: true,
        }}
        empty={<Empty title='暂无提交记录' />}
        style={{ borderRadius: 8 }}
      />

      <Modal
        title='审核提交'
        visible={reviewModal.visible}
        onCancel={() => { setReviewModal({ visible: false, id: null, description: '' }); setReviewForm({ score: null, comment: '' }); }}
        footer={null}
        width={480}
      >
        {reviewModal.description && (
          <div style={{ marginBottom: 16, padding: 12, background: 'var(--semi-color-fill-0)', borderRadius: 8 }}>
            <Text type='tertiary' size='small'>提交说明：</Text>
            <div style={{ marginTop: 4 }}>{reviewModal.description}</div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>评分（0-100，可选）</Text>
          <InputNumber
            value={reviewForm.score}
            onChange={(v) => setReviewForm({ ...reviewForm, score: v })}
            min={0}
            max={100}
            style={{ width: '100%' }}
            placeholder='输入评分'
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>审核意见（驳回时必填）</Text>
          <Input
            value={reviewForm.comment}
            onChange={(v) => setReviewForm({ ...reviewForm, comment: v })}
            placeholder='填写审核意见或驳回原因...'
            maxLength={500}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={() => setReviewModal({ visible: false, id: null, description: '' })}>取消</Button>
          <Button
            icon={<IconClose />}
            type='danger'
            theme='solid'
            loading={reviewLoading}
            onClick={() => handleReview('reject')}
          >
            驳回
          </Button>
          <Button
            icon={<IconTick />}
            type='primary'
            theme='solid'
            loading={reviewLoading}
            onClick={() => handleReview('approve')}
          >
            通过
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default KPIAdminSubmissions;
