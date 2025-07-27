import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { NewCase, CaseDetail } from './pages';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">AI Case Management System</h2>
              <p className="text-gray-500">Application components will be implemented in future tasks</p>
            </div>
          </div>
        } />
        <Route path="cases/new" element={<NewCase />} />
        <Route path="cases/:id" element={<CaseDetail />} />
      </Route>
    </Routes>
  );
}

export default App;