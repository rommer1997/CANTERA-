import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { startAnalytics } from './community/analytics';

const stopAnalytics = startAnalytics();
if (import.meta.hot) import.meta.hot.dispose(stopAnalytics);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
