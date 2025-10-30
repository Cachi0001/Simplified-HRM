import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './src/pages/HomePage';
import AuthPage from './src/pages/AuthPage';
import ConfirmEmail from './src/pages/ConfirmEmail';
import ResetPasswordCard from './src/components/auth/ResetPasswordCard';
import AdminDashboard from './src/pages/AdminDashboard';
import EmployeeDashboard from './src/pages/EmployeeDashboard';
import HRDashboard from './src/pages/HRDashboard';
import SuperAdminDashboardPage from './src/pages/SuperAdminDashboardPage';
import AttendanceReportPage from './src/pages/AttendanceReportPage';
import TasksPage from './src/pages/TasksPage';
import UserSettingsPage from './src/pages/UserSettingsPage';
import ChatPage from './src/pages/ChatPage';
import { LeaveRequestsPage } from './src/pages/LeaveRequestsPage';
import { PurchaseRequestsPage } from './src/pages/PurchaseRequestsPage';
import { NotificationsPage } from './src/pages/NotificationsPage';
import Header from './src/components/layout/Header';
import Footer from './src/components/layout/Footer';
import { ToastProvider } from './src/components/ui/Toast';
import { ProtectedRoute } from './src/components/auth/ProtectedRoute';
import ApiConnectionTest from './src/components/ApiConnectionTest';
import { FloatingChatWidget } from './src/components/chat/FloatingChatWidget';

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
                         location.pathname.startsWith('/hr-dashboard') ||
                         location.pathname.startsWith('/super-admin-dashboard') ||
                         location.pathname.startsWith('/attendance-report') ||
                         location.pathname.startsWith('/tasks') ||
                         location.pathname.startsWith('/settings') ||
                         location.pathname.startsWith('/leave-requests') ||
                         location.pathname.startsWith('/purchase-requests') ||
                         location.pathname.startsWith('/notifications') ||
                         location.pathname.startsWith('/chat');

  return (
    <div className="flex flex-col min-h-screen bg-primary">
      {!isDashboardPage && <Header />}
      <FloatingChatWidget />
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
          <Route path="/hr-dashboard" element={
            <ProtectedRoute>
              <HRDashboard />
            </ProtectedRoute>
          } />
          <Route path="/super-admin-dashboard" element={
            <ProtectedRoute>
              <SuperAdminDashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/tasks" element={
            <ProtectedRoute>
              <TasksPage />
            </ProtectedRoute>
          } />
          <Route path="/attendance-report" element={
            <ProtectedRoute>
              <AttendanceReportPage />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <UserSettingsPage />
            </ProtectedRoute>
          } />
          <Route path="/leave-requests" element={
            <ProtectedRoute>
              <LeaveRequestsPage />
            </ProtectedRoute>
          } />
          <Route path="/purchase-requests" element={
            <ProtectedRoute>
              <PurchaseRequestsPage />
            </ProtectedRoute>
          } />
          <Route path="/chat" element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute>
              <NotificationsPage />
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
