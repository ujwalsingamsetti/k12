import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import executiveTheme from './theme';
import { ToastProvider } from './context/ToastContext';
import EvaluationStudio from './components/evaluation/EvaluationStudio';
import PreviousEvaluationsPage from './components/evaluation/PreviousEvaluationsPage';

function App() {
  React.useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);

  return (
    <MuiThemeProvider theme={executiveTheme}>
      <CssBaseline />
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/setup" replace />} />
            <Route path="/setup" element={<EvaluationStudio />} />
            <Route path="/upload" element={<EvaluationStudio />} />
            <Route path="/evaluate" element={<EvaluationStudio />} />
            <Route path="/results" element={<EvaluationStudio />} />
            <Route path="/report" element={<EvaluationStudio />} />
            <Route path="/textbooks" element={<EvaluationStudio />} />
            <Route path="/history" element={<PreviousEvaluationsPage />} />
            <Route path="/previous-evaluations" element={<Navigate to="/history" replace />} />
            <Route path="/evaluation" element={<Navigate to="/setup" replace />} />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </MuiThemeProvider>
  );
}

export default App;
