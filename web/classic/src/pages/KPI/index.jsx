import React from 'react';
import { Tabs, TabPane } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import KPITaskList from './KPITaskList';
import KPIMySubmissions from './KPIMySubmissions';

const KPI = () => {
  const { t } = useTranslation();

  return (
    <>
      <Tabs>
        <TabPane tab={t('考核任务')} itemKey='tasks'>
          <KPITaskList />
        </TabPane>
        <TabPane tab={t('我的提交')} itemKey='submissions'>
          <KPIMySubmissions />
        </TabPane>
      </Tabs>
    </>
  );
};

export default KPI;
