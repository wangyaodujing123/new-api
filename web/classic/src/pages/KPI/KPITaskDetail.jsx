import React, { useEffect, useState } from 'react';
import { Card, Typography, Tag, Button, TextArea, Upload, Spin, Empty, Table, Divider, Banner } from '@douyinfe/semi-ui';
import { IconArrowLeft, IconImage, IconSend } from '@douyinfe/semi-icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../../helpers';

const { Title, Paragraph, Text } = Typography;
const statusMap = {
  0: { text: '待审核', color: 'amber' },
  1: { text: '已通过', color: 'green' },
  2: { text: '已驳回', color: 'red' },
};

const KPITaskDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [stats, setStats] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState('');
  const [fileList, setFileList] = useState([]);

  const loadTask = async () => {
    try {
      const res = await API.get(`/api/kpi/task/${id}`);
      if (res.data.success) {
        setTask(res.data.data?.task);
        setStats({
          total: res.data.data?.total_count || 0,
          approved: res.data.data?.approved_count || 0,
          rejected: res.data.data?.rejected_count || 0,
          pending: res.data.data?.pending_count || 0,
        });
      } else {
        showError(res.data.message);
      }
    } catch (err) {
      showError('获取任务详情失败');
    }
  };

  const loadSubmissions = async () => {
    try {
      const res = await API.get(`/api/kpi/submission/self?task_id=${id}&page_size=50`);
      if (res.data.success) {
        setSubmissions(res.data.data?.list || []);
      }
    } catch (err) { /* ignore */ }
  };

  useEffect(() => {
    Promise.all([loadTask(), loadSubmissions()]).finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (fileList.length === 0) {
      showError('请至少上传一张截图');
      return;
    }
    if (!description.trim()) {
      showError('请填写使用说明');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('task_id', id);
    formData.append('description', description);
    fileList.forEach((file) => {
      formData.append('screenshots', file.fileInstance);
    });

    try {
      const res = await API.post('/api/kpi/submission', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        showSuccess('提交成功！');
        setDescription('');
        setFileList([]);
        loadSubmissions();
        loadTask();
      } else {
        showError(res.data.message);
      }
    } catch (err) {
      showError('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <Spin size='large' />
      </div>
    );
  }

  if (!task) return <Empty title='任务不存在' style={{ marginTop: 80 }} />;

  const columns = [
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
              {urls.map((url, i) => (
                <a key={i} href={`/api/kpi/uploads/${url}`} target='_blank' rel='noopener noreferrer'>
                  <img src={`/api/kpi/uploads/${url}`} width={36} height={36} style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid var(--semi-color-border)' }} />
                </a>
              ))}
            </div>
          );
        } catch { return '-'; }
      },
    },
    { title: '说明', dataIndex: 'description', ellipsis: { showTooltip: true } },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status) => {
        const s = statusMap[status] || { text: '未知', color: 'grey' };
        return <Tag color={s.color} shape='circle'>{s.text}</Tag>;
      },
    },
    { title: '评分', dataIndex: 'score', width: 70, render: (v) => v != null ? <Tag color='blue'>{v}</Tag> : '-' },
    { title: '审核意见', dataIndex: 'review_comment', width: 160, ellipsis: { showTooltip: true }, render: (v) => v || '-' },
  ];

  return (
    <div className='mt-[60px] px-2'>
      <Button
        icon={<IconArrowLeft />}
        theme='borderless'
        onClick={() => navigate('/console/kpi')}
        style={{ marginBottom: 16 }}
      >
        返回任务列表
      </Button>

      {/* 任务信息卡片 */}
      <Card style={{ marginBottom: 20, borderRadius: 12 }} bodyStyle={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Title heading={3} style={{ margin: 0 }}>{task.title}</Title>
            <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Tag color='blue' size='large'>{task.period_type === 'weekly' ? '每周考核' : '每月考核'}</Tag>
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
          <Paragraph style={{ marginTop: 16, color: 'var(--semi-color-text-2)', whiteSpace: 'pre-wrap' }}>
            {task.description}
          </Paragraph>
        )}

        {/* 统计数据 */}
        {stats && (
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div style={{ textAlign: 'center', padding: '12px 0', background: 'var(--semi-color-fill-0)', borderRadius: 8 }}>
              <Title heading={4} style={{ margin: 0 }}>{stats.total}</Title>
              <Text type='tertiary' size='small'>总提交</Text>
            </div>
            <div style={{ textAlign: 'center', padding: '12px 0', background: 'var(--semi-color-fill-0)', borderRadius: 8 }}>
              <Title heading={4} style={{ margin: 0, color: 'var(--semi-color-success)' }}>{stats.approved}</Title>
              <Text type='tertiary' size='small'>已通过</Text>
            </div>
            <div style={{ textAlign: 'center', padding: '12px 0', background: 'var(--semi-color-fill-0)', borderRadius: 8 }}>
              <Title heading={4} style={{ margin: 0, color: 'var(--semi-color-danger)' }}>{stats.rejected}</Title>
              <Text type='tertiary' size='small'>已驳回</Text>
            </div>
            <div style={{ textAlign: 'center', padding: '12px 0', background: 'var(--semi-color-fill-0)', borderRadius: 8 }}>
              <Title heading={4} style={{ margin: 0, color: 'var(--semi-color-warning)' }}>{stats.pending}</Title>
              <Text type='tertiary' size='small'>待审核</Text>
            </div>
          </div>
        )}
      </Card>

      {/* 提交表单 */}
      {task.status === 1 && (
        <Card
          title={<span><IconImage style={{ marginRight: 8 }} />提交每日记录</span>}
          style={{ marginBottom: 20, borderRadius: 12 }}
        >
          <Upload
            action=''
            fileList={fileList}
            onChange={({ fileList: fl }) => setFileList(fl)}
            accept='image/jpeg,image/png,image/webp'
            multiple
            limit={5}
            beforeUpload={() => false}
            draggable
            dragMainText='点击或拖拽上传截图'
            dragSubText='支持 JPEG、PNG、WebP 格式，最多 5 张，单张不超过 5MB'
            style={{ marginBottom: 16 }}
          />
          <TextArea
            value={description}
            onChange={setDescription}
            placeholder='描述今天的 AI 使用情况，例如：使用 ChatGPT 完成了代码审查...'
            maxCount={2000}
            rows={4}
            showClear
            style={{ marginBottom: 16 }}
          />
          <Button
            icon={<IconSend />}
            theme='solid'
            type='primary'
            size='large'
            onClick={handleSubmit}
            loading={submitting}
          >
            提交记录
          </Button>
        </Card>
      )}

      {task.status !== 1 && (
        <Banner
          type='info'
          description='该任务已结束，不再接受新的提交'
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      {/* 提交历史 */}
      <Card title='我的提交记录' style={{ borderRadius: 12 }}>
        <Table
          columns={columns}
          dataSource={submissions}
          rowKey='id'
          pagination={false}
          empty={<Empty title='暂无提交记录' description='上传截图并填写说明即可提交' />}
        />
      </Card>
    </div>
  );
};

export default KPITaskDetail;
