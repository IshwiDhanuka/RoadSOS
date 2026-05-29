import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SosProvider } from './context/SosContext.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SosProvider>
      <App />
    </SosProvider>
  </React.StrictMode>,
);
