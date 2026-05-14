import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Modal, Form, Select, Tabs, TabPane, Typography, Empty, Banner } from '@douyinfe/semi-ui';
import { IconPlus, IconDelete } from '@douyinfe/semi-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../../helpers';
import KPIAdminSubmissions from './KPIAdminSubmissions';

const { Title } = Typography;
const statusMap = {
  1: { text: '进行中', color: 'green' },
  2: { text: '已结束', color: 'grey' },
  3: { text: '已归档', color: 'light-grey' },
};

const KPIAdmin = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createVisible, setCreateVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/kpi/task?page_size=100');
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

  useEffect(() => { loadTasks(); }, []);

  const handleCreate = async (values) => {
    setCreateLoading(true);
    try {
      const res = await API.post('/api/kpi/task', {
        title: values.title,
        description: values.description || '',
        period_type: values.period_type,
        start_time: Math.floor(new Date(values.date_range[0]).getTime() / 1000),
        end_time: Math.floor(new Date(values.date_range[1]).getTime() / 1000),
      });
      if (res.data.success) {
        showSuccess('任务创建成功');
        setCreateVisible(false);
        loadTasks();
      } else {
        showError(res.data.message);
      }
    } catch (err) {
      showError('创建失败');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const res = await API.put(`/api/kpi/task/${id}/status`, { status });
      if (res.data.success) {
        showSuccess('状态变更成功');
        loadTasks();
      } else {
        showError(res.data.message);
      }
    } catch (err) {
      showError('操作失败');
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除任务将同时删除所有关联的提交记录，此操作不可恢复。确定继续？',
      type: 'danger',
      onOk: async () => {
        try {
          const res = await API.delete(`/api/kpi/task/${id}`);
          if (res.data.success) {
            showSuccess('删除成功');
            loadTasks();
          } else {
            showError(res.data.message);
          }
        } catch (err) {
          showError('删除失败');
        }
      },
    });
  };

  const columns = [
    {
      title: '任务标题',
      dataIndex: 'title',
      render: (text, record) => (
        <a
          onClick={() => navigate(`/console/kpi/admin/task/${record.id}`)}
          style={{ fontWeight: 500 }}
        >
          {text}
        </a>
      ),
    },
    {
      title: '周期',
      dataIndex: 'period_type',
      width: 90,
      render: (v) => <Tag>{v === 'weekly' ? '每周' : '每月'}</Tag>,
    },
    {
      title: '时间范围',
      width: 200,
      render: (_, record) => (
        <span style={{ fontSize: 13 }}>
          {new Date(record.start_time * 1000).toLocaleDateString()} ~ {new Date(record.end_time * 1000).toLocaleDateString()}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (v) => {
        const s = statusMap[v] || { text: '未知', color: 'grey' };
        return <Tag color={s.color} shape='circle'>{s.text}</Tag>;
      },
    },
    {
      title: '操作',
      width: 200,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {record.status === 1 && (
            <Button size='small' type='warning' theme='light' onClick={() => handleStatusChange(record.id, 2)}>
              结束
            </Button>
          )}
          {record.status === 2 && (
            <Button size='small' type='tertiary' theme='light' onClick={() => handleStatusChange(record.id, 3)}>
              归档
            </Button>
          )}
          <Button size='small' type='danger' theme='light' icon={<IconDelete />} onClick={() => handleDelete(record.id)} />
        </div>
      ),
    },
  ];

  return (
    <div className='mt-[60px] px-2'>
      <Tabs type='line' size='large'>
        <TabPane tab='任务管理' itemKey='tasks'>
          <div style={{ paddingTop: 16 }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title heading={5} style={{ margin: 0 }}>KPI 考核任务</Title>
              <Button icon={<IconPlus />} theme='solid' type='primary' onClick={() => setCreateVisible(true)}>
                创建任务
              </Button>
            </div>

            <Table
              columns={columns}
              dataSource={tasks}
              rowKey='id'
              loading={loading}
              pagination={false}
              empty={<Empty title='暂无任务' description='点击右上角创建第一个 KPI 考核任务' />}
              style={{ borderRadius: 8 }}
            />
          </div>

          <Modal
            title='创建 KPI 考核任务'
            visible={createVisible}
            onCancel={() => setCreateVisible(false)}
            footer={null}
            width={520}
          >
            <Form onSubmit={handleCreate} labelPosition='top'>
              <Form.Input
                field='title'
                label='任务标题'
                placeholder='例如：第 20 周 AI 使用考核'
                rules={[{ required: true, message: '请输入标题' }]}
                maxLength={128}
              />
              <Form.TextArea
                field='description'
                label='任务描述'
                placeholder='描述考核要求和评分标准...'
                maxCount={5000}
                rows={4}
              />
              <Form.Select
                field='period_type'
                label='考核周期'
                initValue='weekly'
                rules={[{ required: true }]}
                style={{ width: '100%' }}
              >
                <Select.Option value='weekly'>每周</Select.Option>
                <Select.Option value='monthly'>每月</Select.Option>
              </Form.Select>
              <Form.DatePicker
                field='date_range'
                label='考核时间范围'
                type='dateRange'
                rules={[{ required: true, message: '请选择时间范围' }]}
                style={{ width: '100%' }}
              />
              <div style={{ marginTop: 20, textAlign: 'right' }}>
                <Button style={{ marginRight: 8 }} onClick={() => setCreateVisible(false)}>取消</Button>
                <Button htmlType='submit' theme='solid' type='primary' loading={createLoading}>
                  确认创建
                </Button>
              </div>
            </Form>
          </Modal>
        </TabPane>

        <TabPane tab='提交审核' itemKey='submissions'>
          <div style={{ paddingTop: 16 }}>
            <KPIAdminSubmissions />
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default KPIAdmin;
