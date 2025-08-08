import React from 'react';
import { Link } from 'react-router-dom';
import { Case } from '@/types';
import { formatCaseStatus, formatDateTime } from '@/utils/formatting';

interface CaseListProps {
  cases: Case[];
  isLoading?: boolean;
  error?: unknown;
}

const CaseList: React.FC<CaseListProps> = ({ cases, isLoading, error }) => {
  if (isLoading) {
    return <div className="text-gray-500">Loading cases...</div>;
  }

  if (error) {
    return <div className="text-red-600">Failed to load cases</div>;
  }

  if (!cases || cases.length === 0) {
    return <div className="text-gray-500">No cases found.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Case ID</th>
            <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Applicant</th>
            <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
            <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
            <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {cases.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-2 font-mono text-sm text-blue-600">
                <Link to={`/cases/${encodeURIComponent(c.id)}`} className="hover:underline">{c.id.slice(0, 8)}</Link>
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">{c.applicationData.applicantName}</td>
              <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">{c.applicationData.applicationType}</td>
              <td className="whitespace-nowrap px-4 py-2 text-sm">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                  {formatCaseStatus(c.status)}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700">{formatDateTime(c.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CaseList;