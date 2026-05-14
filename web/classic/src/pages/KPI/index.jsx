import React from 'react';
import { Tabs, TabPane } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import KPITaskList from './KPITaskList';
import KPIMySubmissions from './KPIMySubmissions';

const KPI = () => {
  const { t } = useTranslation();

  return (
    <div className='mt-[60px] px-2'>
      <Tabs type='line' size='large'>
        <TabPane tab={t('考核任务')} itemKey='tasks'>
          <div style={{ paddingTop: 16 }}>
            <KPITaskList />
          </div>
        </TabPane>
        <TabPane tab={t('我的提交')} itemKey='submissions'>
          <div style={{ paddingTop: 16 }}>
            <KPIMySubmissions />
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default KPI;
