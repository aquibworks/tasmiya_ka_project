import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import TrainingLab from './pages/TrainingLab';
import UploadPage from './pages/UploadPage';
import ComparisonPage from './pages/ComparisonPage';
import RunHistory from './pages/RunHistory';
import LivePrediction from './pages/LivePrediction';
import ReportDetail from './pages/ReportDetail';
import ProofOfWork from './pages/ProofOfWork';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/training" element={<TrainingLab />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/compare" element={<ComparisonPage />} />
          <Route path="/history" element={<RunHistory />} />
          <Route path="/predict" element={<LivePrediction />} />
          <Route path="/report/:runId" element={<ReportDetail />} />
          <Route path="/proof" element={<ProofOfWork />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}