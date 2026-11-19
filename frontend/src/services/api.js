
import axios from 'axios';

const BASE = 'http://127.0.0.1:8000/api';
const ROOT = 'http://127.0.0.1:8000';

const client = axios.create({ 
  baseURL: BASE, 
  timeout: 3600000  // 1 hour — for full 4000-sample quantum kernels
});

export const api = {
  health: () => axios.get(ROOT).then(r => r.data),
  trainClassical: () => client.post('/train/classical').then(r => r.data),
  trainQuantum: (sampleSize = 100, testSize = 50) =>
    client.post('/train/quantum', { sample_size: sampleSize, test_size: testSize }).then(r => r.data),
  compare: (sampleSize = 100, testSize = 50) =>
    client.post('/compare', { sample_size: sampleSize, test_size: testSize }).then(r => r.data),
  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return client.post('/upload', form).then(r => r.data);
  },
  pipelineUpload: (payload) => client.post('/pipeline/upload', payload).then(r => r.data),
  listUploads: () => client.get('/uploads').then(r => r.data),
  getUpload: (id) => client.get(`/uploads/${id}`).then(r => r.data),
  getReport: (runId) => client.get(`/report/${runId}`).then(r => r.data),
  getStatus: (runId) => client.get(`/status/${runId}`).then(r => r.data),
  listReports: () => client.get('/reports').then(r => r.data),

  // Raw prediction
  predictRaw: (model, features) =>
    client.post('/predict/raw', { model, features }).then(r => r.data),
};
