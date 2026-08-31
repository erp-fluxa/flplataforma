import React from 'react';
import ReactDOM from 'react-dom/client';
import { DbProvider } from './context/DbContext';
import { AuthProvider } from './context/AuthContext';
import { DeleteProvider } from './context/DeleteContext';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DbProvider>
      <AuthProvider>
        <DeleteProvider>
          <App />
        </DeleteProvider>
      </AuthProvider>
    </DbProvider>
  </React.StrictMode>
);
