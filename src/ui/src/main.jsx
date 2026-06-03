import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Intercept all fetch requests globally to inject the dynamic authorization token header
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
  const urlStr = typeof url === 'string' ? url : (url instanceof URL ? url.href : '');
  // Intercept local API routes to inject authorization token
  if (urlStr.startsWith('/api/') && !urlStr.startsWith('/api/token.js')) {
    options.headers = options.headers || {};
    const token = window.MATRIX_API_TOKEN || '';
    if (options.headers instanceof Headers) {
      options.headers.set('X-Matrix-Token', token);
    } else if (Array.isArray(options.headers)) {
      options.headers.push(['X-Matrix-Token', token]);
    } else {
      options.headers['X-Matrix-Token'] = token;
    }
  }
  return originalFetch(url, options);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
