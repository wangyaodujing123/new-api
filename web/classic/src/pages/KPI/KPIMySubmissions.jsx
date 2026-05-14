import React, { useEffect, useState } from 'react';
import { Table, Tag, Image, Empty, Spin } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import { API, showError } from '../../helpers';

const statusMap = { 0: { text: '待审核', color: 'yellow' }, 1: { text: '已通过', color: 'green' }, 2: { text: '已驳回', color: 'red' } };

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
    {
      title: '评分',
      dataIndex: 'score',
      width: 80,
      render: (score) => score != null ? score : '-',
    },
    {
      title: '驳回原因',
      dataIndex: 'review_comment',
      width: 150,
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
      }}
      empty={<Empty description={t('暂无提交记录')} />}
    />
  );
};

export default KPIMySubmissions;
