import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { NewCase, CaseDetail } from './pages';
import LandingPage from './components/LandingPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route path="cases/new" element={<NewCase />} />
        <Route path="cases/:id" element={<CaseDetail />} />
      </Route>
    </Routes>
  );
}

export default App;