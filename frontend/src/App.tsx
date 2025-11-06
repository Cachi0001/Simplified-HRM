import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import ConfirmEmail from './pages/ConfirmEmail';
import ResetPasswordCard from './components/auth/ResetPasswordCard';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import HRDashboard from './pages/HRDashboard';
import TeamLeadDashboard from './pages/TeamLeadDashboard';
import SuperAdminDashboardPage from './pages/SuperAdminDashboardPage';
import AttendanceReportPage from './pages/AttendanceReportPage';
import TasksPage from './pages/TasksPage';
import UserSettingsPage from './pages/UserSettingsPage';
import ChatPage from './pages/ChatPage';
import { LeaveRequestsPage } from './pages/LeaveRequestsPage';
import { PurchaseRequestsPage } from './pages/PurchaseRequestsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { EmployeeManagementPage } from './pages/EmployeeManagementPage';
import PerformanceMetrics from './pages/PerformanceMetrics';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import { ToastProvider } from './components/ui/Toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import ApiConnectionTest from './components/ApiConnectionTest';
import { FloatingChatWidget } from './components/chat/FloatingChatWidget';
import { ChatDemo } from './components/demo/ChatDemo';
import ErrorBoundary from './components/ErrorBoundary';

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
  const { isAuthenticated } = useAuth();
  const isDashboardPage = location.pathname.startsWith('/dashboard') ||
                         location.pathname.startsWith('/employee-dashboard') ||
                         location.pathname.startsWith('/hr-dashboard') ||
                         location.pathname.startsWith('/teamlead-dashboard') ||
                         location.pathname.startsWith('/super-admin-dashboard') ||
                         location.pathname.startsWith('/attendance-report') ||
                         location.pathname.startsWith('/tasks') ||
                         location.pathname.startsWith('/settings') ||
                         location.pathname.startsWith('/leave-requests') ||
                         location.pathname.startsWith('/purchase-requests') ||
                         location.pathname.startsWith('/notifications') ||
                         location.pathname.startsWith('/admin/employees') ||
                         location.pathname.startsWith('/employee-management') ||
                         location.pathname.startsWith('/performance-metrics') ||
                         location.pathname.startsWith('/chat');

  return (
    <div className="flex flex-col min-h-screen bg-primary">
      {!isDashboardPage && <Header />}
      {isAuthenticated && isDashboardPage && <FloatingChatWidget />}
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
          <Route path="/teamlead-dashboard" element={
            <ProtectedRoute>
              <TeamLeadDashboard />
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
          <Route path="/admin/employees" element={
            <ProtectedRoute>
              <EmployeeManagementPage />
            </ProtectedRoute>
          } />
          <Route path="/employee-management" element={
            <ProtectedRoute>
              <EmployeeManagementPage />
            </ProtectedRoute>
          } />
          <Route path="/performance-metrics" element={
            <ProtectedRoute>
              <PerformanceMetrics />
            </ProtectedRoute>
          } />
          <Route path="/api-test" element={<ApiConnectionTest />} />
          <Route path="/chat-demo" element={<ChatDemo />} />
        </Routes>
      </main>
      {!isDashboardPage && <Footer />}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <BrowserRouter>
              <AuthProvider>
                <AppContent />
              </AuthProvider>
            </BrowserRouter>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
