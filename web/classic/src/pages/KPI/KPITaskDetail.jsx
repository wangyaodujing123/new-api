import React, { useEffect, useState } from 'react';
import { Card, Typography, Tag, Button, TextArea, Upload, Spin, Empty, Image, Table } from '@douyinfe/semi-ui';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../../helpers';

const { Title, Paragraph, Text } = Typography;
const statusMap = { 0: { text: '待审核', color: 'yellow' }, 1: { text: '已通过', color: 'green' }, 2: { text: '已驳回', color: 'red' } };

const KPITaskDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
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
        showSuccess('提交成功');
        setDescription('');
        setFileList([]);
        loadSubmissions();
      } else {
        showError(res.data.message);
      }
    } catch (err) {
      showError('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spin size='large' style={{ display: 'block', margin: '40px auto' }} />;
  if (!task) return <Empty description='任务不存在' />;

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
    { title: '评分', dataIndex: 'score', width: 80, render: (v) => v != null ? v : '-' },
    { title: '驳回原因', dataIndex: 'review_comment', width: 150, render: (v) => v || '-' },
  ];

  return (
    <div>
      <Button theme='borderless' onClick={() => navigate('/console/kpi')} style={{ marginBottom: 16 }}>
        ← 返回任务列表
      </Button>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title heading={4} style={{ margin: 0 }}>{task.title}</Title>
          <Tag color={task.status === 1 ? 'green' : 'grey'}>
            {task.status === 1 ? '进行中' : task.status === 2 ? '已结束' : '已归档'}
          </Tag>
        </div>
        <Paragraph style={{ marginTop: 8 }}>{task.description}</Paragraph>
        <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
          <Text type='tertiary'>周期: {task.period_type === 'weekly' ? '每周' : '每月'}</Text>
          <Text type='tertiary'>开始: {new Date(task.start_time * 1000).toLocaleDateString()}</Text>
          <Text type='tertiary'>截止: {new Date(task.end_time * 1000).toLocaleDateString()}</Text>
        </div>
      </Card>

      {task.status === 1 && (
        <Card title='提交每日记录' style={{ marginBottom: 24 }}>
          <Upload
            action=''
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
            accept='image/jpeg,image/png,image/webp'
            multiple
            limit={5}
            beforeUpload={() => false}
            draggable
            dragMainText={t('点击或拖拽上传截图')}
            dragSubText={t('支持 JPEG、PNG、WebP，最多5张，单张不超过5MB')}
          />
          <TextArea
            value={description}
            onChange={setDescription}
            placeholder='描述今天的 AI 使用情况...'
            maxCount={2000}
            rows={4}
            style={{ marginTop: 16 }}
          />
          <Button
            theme='solid'
            type='primary'
            onClick={handleSubmit}
            loading={submitting}
            style={{ marginTop: 16 }}
          >
            提交
          </Button>
        </Card>
      )}

      <Card title='我的提交记录'>
        <Table columns={columns} dataSource={submissions} rowKey='id' pagination={false} empty={<Empty description='暂无提交记录' />} />
      </Card>
    </div>
  );
};

export default KPITaskDetail;
