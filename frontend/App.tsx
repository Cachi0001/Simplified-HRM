import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './src/pages/HomePage';
import AuthPage from './src/pages/AuthPage';
import ConfirmEmail from './src/pages/ConfirmEmail';
import ResetPasswordCard from './src/components/auth/ResetPasswordCard';
import AdminDashboard from './src/pages/AdminDashboard';
import EmployeeDashboard from './src/pages/EmployeeDashboard';
import HRDashboard from './src/pages/HRDashboard';
import TeamLeadDashboard from './src/pages/TeamLeadDashboard';
import SuperAdminDashboardPage from './src/pages/SuperAdminDashboardPage';
import AttendanceReportPage from './src/pages/AttendanceReportPage';
import TasksPage from './src/pages/TasksPage';
import UserSettingsPage from './src/pages/UserSettingsPage';
import ChatPage from './src/pages/ChatPage';
import { LeaveRequestsPage } from './src/pages/LeaveRequestsPage';
import { PurchaseRequestsPage } from './src/pages/PurchaseRequestsPage';
import { NotificationsPage } from './src/pages/NotificationsPage';
import { EmployeeManagementPage } from './src/pages/EmployeeManagementPage';
import PerformanceMetrics from './src/pages/PerformanceMetrics';
import Header from './src/components/layout/Header';
import Footer from './src/components/layout/Footer';
import { ToastProvider } from './src/components/ui/Toast';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ProtectedRoute } from './src/components/auth/ProtectedRoute';
import ApiConnectionTest from './src/components/ApiConnectionTest';
import { FloatingChatWidget } from './src/components/chat/FloatingChatWidget';
import { ChatDemo } from './src/components/demo/ChatDemo';
import ErrorBoundary from './src/components/ErrorBoundary';
import ProfileCompletionPopup from './src/components/profile/ProfileCompletionPopup';
import ProfileCompletionTest from './src/components/profile/ProfileCompletionTest';
import { useProfileCompletion } from './src/hooks/useProfileCompletion';
import { useTheme } from './src/contexts/ThemeContext';
import { useEffect } from 'react';

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
  const { isAuthenticated, user } = useAuth();
  const { darkMode } = useTheme();
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

  // Profile completion logic
  const {
    showPopup,
    completionStatus,
    dismissPopup,
    refreshProfileStatus
  } = useProfileCompletion();

  const handleCompleteProfile = () => {
    // Navigate to settings page to complete profile
    window.location.href = '/settings';
  };

  // Refresh profile status when returning from settings
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated) {
        refreshProfileStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, refreshProfileStatus]);

  return (
    <div className="flex flex-col min-h-screen bg-primary">
      {!isDashboardPage && <Header />}
      {isAuthenticated && isDashboardPage && <FloatingChatWidget />}
      
      {/* Profile Completion Popup */}
      {isAuthenticated && (
        <ProfileCompletionPopup
          isOpen={showPopup}
          onClose={dismissPopup}
          onCompleteProfile={handleCompleteProfile}
          completionStatus={completionStatus}
          darkMode={darkMode}
        />
      )}
      
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
          <Route path="/profile-completion-test" element={<ProfileCompletionTest />} />
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
