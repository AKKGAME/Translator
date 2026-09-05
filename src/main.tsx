import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AlertToastProvider } from './components/AlertToastProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AlertToastProvider>
      <App />
    </AlertToastProvider>
  </StrictMode>,
);
