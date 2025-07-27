import { useParams } from 'react-router-dom';

const CaseDetail = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Case Details</h2>
        <p className="text-gray-600">View and manage case information</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <span className="text-4xl">📋</span>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Case View</h3>
            <p className="mt-1 text-sm text-gray-500">
              Case detail view will be implemented in future tasks
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Case ID: {id}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseDetail;