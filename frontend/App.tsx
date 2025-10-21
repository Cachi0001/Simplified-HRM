
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './src/pages/HomePage';
import AuthPage from './src/pages/AuthPage';
import ConfirmEmail from './src/pages/ConfirmEmail';
import AdminDashboard from './src/pages/AdminDashboard';
import EmployeeDashboard from './src/pages/EmployeeDashboard';
import Header from './src/components/layout/Header';
import Footer from './src/components/layout/Footer';
import { NotificationManager } from './src/components/notifications/NotificationManager';
import { ProtectedRoute } from './src/components/auth/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <div className="flex flex-col min-h-screen bg-primary">
          <Header />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/confirm" element={<ConfirmEmail />} />
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
            </Routes>
          </main>
          <Footer />

          {/* Global Notification Manager */}
          <NotificationManager position="top-right" maxToasts={5} />
        </div>
      </HashRouter>
    </QueryClientProvider>
  );
}

export default App;
