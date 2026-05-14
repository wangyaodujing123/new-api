import React, { useEffect, useState } from 'react';
import { Table, Tag, Empty, Avatar, AvatarGroup, Typography } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { API, showError } from '../../helpers';

const { Text } = Typography;

const statusMap = {
  0: { text: '待审核', color: 'amber' },
  1: { text: '已通过', color: 'green' },
  2: { text: '已驳回', color: 'red' },
};

const KPIMySubmissions = () => {
  const { t } = useTranslation();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const loadSubmissions = async (p = 1) => {
    setLoading(true);
    try {
      const res = await API.get(`/api/kpi/submission/self?page=${p}&page_size=10`);
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

  useEffect(() => {
    loadSubmissions(page);
  }, [page]);

  const columns = [
    {
      title: '提交日期',
      dataIndex: 'submission_date',
      width: 120,
      render: (text) => <Tag>{text}</Tag>,
    },
    {
      title: '截图',
      dataIndex: 'screenshot_urls',
      width: 140,
      render: (text) => {
        try {
          const urls = JSON.parse(text || '[]');
          if (urls.length === 0) return '-';
          return (
            <AvatarGroup size='small' maxCount={3}>
              {urls.map((url, i) => (
                <Avatar key={i} src={`/api/kpi/uploads/${url}`} shape='square' />
              ))}
            </AvatarGroup>
          );
        } catch { return '-'; }
      },
    },
    {
      title: '使用说明',
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
      render: (score) => score != null ? (
        <Tag color='blue' shape='circle'>{score} 分</Tag>
      ) : (
        <Text type='tertiary'>-</Text>
      ),
    },
    {
      title: '审核意见',
      dataIndex: 'review_comment',
      width: 180,
      ellipsis: { showTooltip: true },
      render: (text) => text || '-',
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={submissions}
      rowKey='id'
      loading={loading}
      pagination={{
        currentPage: page,
        pageSize: 10,
        total,
        onPageChange: setPage,
        showTotal: true,
        showSizeChanger: false,
      }}
      empty={<Empty title={t('暂无提交记录')} description={t('点击考核任务进行每日提交')} />}
      style={{ borderRadius: 8 }}
    />
  );
};

export default KPIMySubmissions;
