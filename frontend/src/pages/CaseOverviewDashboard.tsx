import React from 'react';
import { useCases } from '@/hooks/useCases';
import { CaseStatus } from '@/types';
import { Card, DashboardPage, DonutChart, CaseList } from '@/components/dashboard';

const CaseOverviewDashboard: React.FC = () => {
  const { data: allCasesData, isLoading: allLoading, error: allError } = useCases({ page: 1, limit: 25 });

  const { data: activeCasesData } = useCases({ status: CaseStatus.ACTIVE, page: 1, limit: 1 });
  const { data: pendingCasesData } = useCases({ status: CaseStatus.PENDING, page: 1, limit: 1 });

  const openActive = activeCasesData?.total ?? 0;
  const openPending = pendingCasesData?.total ?? 0;

  const chartData = [
    { label: 'Active', value: openActive, color: '#3b82f6' },
    { label: 'Pending', value: openPending, color: '#f59e0b' },
  ];

  return (
    <DashboardPage title="Case Overview" description="A quick overview of current cases and their statuses.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Open Cases by Status" subtitle="Current distribution of open cases">
          <DonutChart data={chartData} centerLabel={`${openActive + openPending}`} />
        </Card>
        <Card title="All Cases" subtitle="Most recent cases (first 25)">
          <CaseList cases={allCasesData?.cases || []} isLoading={allLoading} error={allError} />
        </Card>
      </div>
    </DashboardPage>
  );
};

export default CaseOverviewDashboard;