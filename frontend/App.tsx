import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './src/pages/HomePage';
import AuthPage from './src/pages/AuthPage';
import ConfirmEmail from './src/pages/ConfirmEmail';
import ResetPasswordCard from './src/components/auth/ResetPasswordCard';
import AdminDashboard from './src/pages/AdminDashboard';
import EmployeeDashboard from './src/pages/EmployeeDashboard';
import AttendanceReportPage from './src/pages/AttendanceReportPage';
import Header from './src/components/layout/Header';
import Footer from './src/components/layout/Footer';
import { ToastProvider } from './src/components/ui/Toast';
import { ProtectedRoute } from './src/components/auth/ProtectedRoute';
import ApiConnectionTest from './src/components/ApiConnectionTest';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const location = useLocation();
  const isDashboardPage = location.pathname.startsWith('/dashboard') ||
                         location.pathname.startsWith('/employee-dashboard') ||
                         location.pathname.startsWith('/attendance-report');

  return (
    <div className="flex flex-col min-h-screen bg-primary">
      {!isDashboardPage && <Header />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/confirm" element={<ConfirmEmail />} />
          <Route path="/reset-password" element={<ResetPasswordCard />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/employee-dashboard" element={
            <ProtectedRoute>
              <EmployeeDashboard />
            </ProtectedRoute>
          } />
          <Route path="/attendance-report" element={
            <ProtectedRoute>
              <AttendanceReportPage />
            </ProtectedRoute>
          } />
          <Route path="/api-test" element={<ApiConnectionTest />} />
        </Routes>
      </main>
      {!isDashboardPage && <Footer />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
