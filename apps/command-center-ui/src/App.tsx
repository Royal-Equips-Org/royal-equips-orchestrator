import React from 'react';
import AppRouter from './routes/AppRouter';
import { ToastProvider } from './contexts/ToastContext';
import './styles/globals.css';

function App() {
  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  );
}

export default App;
