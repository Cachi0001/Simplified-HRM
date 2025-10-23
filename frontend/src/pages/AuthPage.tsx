
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import LoginCard from '../components/auth/LoginCard';
import SignupCard from '../components/auth/SignupCard';
import ForgotPasswordCard from '../components/auth/ForgotPasswordCard';

type AuthView = 'login' | 'signup' | 'forgot-password';

const AuthPage: React.FC = () => {
  
  const location = useLocation();
  const [view, setView] = useState<AuthView>('login');

  useEffect(() => {
    const initialView = location.state?.initialView;
    if (initialView === 'signup') {
      setView('signup');
    } else if (initialView === 'login') {
      setView('login');
    }
  }, [location.state]);

  const renderView = () => {
    switch (view) {
      case 'signup':
        return <SignupCard key="signup" onSwitchToLogin={() => setView('login')} />;
      case 'forgot-password':
        return <ForgotPasswordCard key="forgot-password" onSwitchToLogin={() => setView('login')} />;
      case 'login':
      default:
        return <LoginCard key="login" onSwitchToSignup={() => setView('signup')} onSwitchToForgotPassword={() => setView('forgot-password')} />;
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4 bg-primary">
        {renderView()}
    </div>
  );
};

export default AuthPage;
