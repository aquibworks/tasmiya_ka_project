import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Toaster } from 'react-hot-toast';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Toaster position="top-right" toastOptions={{
      style: { background: '#0f172a', color: '#fff' },
      success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
    }} />
    <App />
  </React.StrictMode>
);