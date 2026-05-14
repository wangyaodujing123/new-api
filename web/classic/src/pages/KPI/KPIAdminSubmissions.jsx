import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Image, Modal, Input, InputNumber, Empty, Select } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../../helpers';

const statusMap = { 0: { text: '待审核', color: 'yellow' }, 1: { text: '已通过', color: 'green' }, 2: { text: '已驳回', color: 'red' } };

const KPIAdminSubmissions = () => {
  const { t } = useTranslation();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(-1);
  const [reviewModal, setReviewModal] = useState({ visible: false, id: null });
  const [reviewForm, setReviewForm] = useState({ score: null, comment: '' });

  const loadSubmissions = async (p = 1) => {
    setLoading(true);
    try {
      let url = `/api/kpi/submission?page=${p}&page_size=20`;
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
    try {
      const data = { action, comment: reviewForm.comment || undefined };
      if (reviewForm.score !== null && reviewForm.score !== '') {
        data.score = Number(reviewForm.score);
      }
      const res = await API.post(`/api/kpi/submission/${reviewModal.id}/review`, data);
      if (res.data.success) {
        showSuccess('审核完成');
        setReviewModal({ visible: false, id: null });
        setReviewForm({ score: null, comment: '' });
        loadSubmissions(page);
      } else {
        showError(res.data.message);
      }
    } catch (err) {
      showError('操作失败');
    }
  };

  const handleUpdateScore = async (id) => {
    const score = prompt('输入新分数 (0-100)');
    if (score === null) return;
    const num = Number(score);
    if (isNaN(num) || num < 0 || num > 100) {
      showError('分数必须在 0-100 之间');
      return;
    }
    try {
      const res = await API.put(`/api/kpi/submission/${id}/score`, { score: num });
      if (res.data.success) {
        showSuccess('评分更新成功');
        loadSubmissions(page);
      } else {
        showError(res.data.message);
      }
    } catch (err) {
      showError('操作失败');
    }
  };

  const columns = [
    { title: '用户ID', dataIndex: 'user_id', width: 80 },
    { title: '任务ID', dataIndex: 'task_id', width: 80 },
    { title: '日期', dataIndex: 'submission_date', width: 110 },
    {
      title: '截图',
      dataIndex: 'screenshot_urls',
      width: 120,
      render: (text) => {
        try {
          const urls = JSON.parse(text || '[]');
          return (
            <Image.PreviewGroup>
              {urls.map((url, i) => (
                <Image key={i} src={`/api/kpi/uploads/${url}`} width={40} height={40} style={{ objectFit: 'cover', borderRadius: 4, marginRight: 4 }} />
              ))}
            </Image.PreviewGroup>
          );
        } catch { return '-'; }
      },
    },
    { title: '说明', dataIndex: 'description', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status) => {
        const s = statusMap[status] || { text: '未知', color: 'grey' };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    { title: '评分', dataIndex: 'score', width: 80, render: (v) => v != null ? v : '-' },
    {
      title: '操作',
      width: 150,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 4 }}>
          {record.status === 0 && (
            <Button size='small' theme='solid' onClick={() => setReviewModal({ visible: true, id: record.id })}>
              审核
            </Button>
          )}
          {record.status === 1 && (
            <Button size='small' onClick={() => handleUpdateScore(record.id)}>改分</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 120 }}>
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
        pagination={{ currentPage: page, pageSize: 20, total, onPageChange: setPage }}
        empty={<Empty description='暂无提交记录' />}
      />

      <Modal
        title='审核提交'
        visible={reviewModal.visible}
        onCancel={() => { setReviewModal({ visible: false, id: null }); setReviewForm({ score: null, comment: '' }); }}
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button theme='solid' type='primary' onClick={() => handleReview('approve')}>通过</Button>
            <Button theme='solid' type='danger' onClick={() => handleReview('reject')}>驳回</Button>
            <Button onClick={() => setReviewModal({ visible: false, id: null })}>取消</Button>
          </div>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <label>评分 (0-100，可选)</label>
          <InputNumber value={reviewForm.score} onChange={(v) => setReviewForm({ ...reviewForm, score: v })} min={0} max={100} style={{ width: '100%', marginTop: 4 }} />
        </div>
        <div>
          <label>驳回原因（驳回时必填）</label>
          <Input value={reviewForm.comment} onChange={(v) => setReviewForm({ ...reviewForm, comment: v })} placeholder='填写驳回原因...' style={{ marginTop: 4 }} />
        </div>
      </Modal>
    </div>
  );
};

export default KPIAdminSubmissions;
