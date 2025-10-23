import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthCard } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PasswordInput } from '../ui/PasswordInput';
import { authService } from '../../services/authService';
import { useToast } from '../ui/Toast';

interface LoginCardProps {
  onSwitchToSignup: () => void;
  onSwitchToForgotPassword: () => void;
}

const LoginCard: React.FC<LoginCardProps> = ({ onSwitchToSignup, onSwitchToForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Double prevention - ensure no form submission
    if (e.target !== e.currentTarget) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.login({ email, password });

      // Check if response has the expected structure
      if (!response || !response.data || !response.data.user) {
        console.error('Invalid response structure:', response);
        throw new Error('Invalid response from server');
      }

      const user = response.data.user;
      const { accessToken, refreshToken } = response.data;

      // Check if email verification is required
      if (response.data.requiresEmailVerification) {
        setShowResendButton(true);
        addToast('info', response.data.message || 'Please verify your email before logging in');
        return;
      }

      // Redirect based on user role with immediate navigation
      if (user.role === 'admin') {
        addToast('success', 'Login successful! Redirecting to dashboard...');
        setTimeout(() => {
          try {
            navigate('/dashboard', { replace: true });
          } catch (error) {
            console.error('Navigation error:', error);
            window.location.href = '/dashboard';
          }
        }, 1000);
      } else if (user.role === 'employee') {
        addToast('success', 'Login successful! Redirecting to dashboard...');
        setTimeout(() => {
          try {
            navigate('/employee-dashboard', { replace: true });
          } catch (error) {
            console.error('Navigation error:', error);
            window.location.href = '/employee-dashboard';
          }
        }, 1000);
      } else {
        addToast('success', 'Login successful! Redirecting...');
        setTimeout(() => {
          try {
            navigate('/', { replace: true });
          } catch (error) {
            console.error('Navigation error:', error);
            window.location.href = '/';
          }
        }, 1000);
      }

      // Clear any pending confirmation data since user is now logged in
      localStorage.removeItem('pendingConfirmationEmail');
      setShowResendButton(false);

    } catch (err: any) {
      console.error('Login error:', err);

      if (err.response?.data?.errorType === 'email_not_confirmed') {
        setShowResendButton(true);
        addToast('info', err.response.data.message);
        return; // Don't set error state for confirmation messages
      }

      if (err instanceof Error) {
        let errorMessage = err.message;

        // Provide more specific guidance based on error type
        if (errorMessage.includes('Invalid email or password')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (errorMessage.includes('Account pending admin approval')) {
          // Use warning toast for pending status since it's expected behavior
          addToast('warning', 'Your account is pending admin approval. You will receive an email notification once your account is activated. Please wait for approval before signing in.');
          return; // Don't continue with error flow
        } else if (errorMessage.includes('Account not found')) {
          errorMessage = 'Account not found. Please check your email or contact support.';
        } else if (errorMessage.includes('Please verify your email')) {
          setShowResendButton(true);
          addToast('info', 'Please verify your email address before logging in. Check your inbox for the confirmation link.');
          return;
        }

        addToast('error', errorMessage);
      } else {
        addToast('error', 'An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    try {
      addToast('info', 'Sending confirmation email...');
      const result = await authService.resendConfirmationEmail(email);
      addToast('success', result.message);
      setShowResendButton(false); // Hide button after successful resend
    } catch (error: any) {
      addToast('error', 'Failed to resend confirmation email. Please try again.');
      setTimeout(() => {
        addToast('info', 'Please confirm your email address before signing in. Check your inbox for the confirmation link.');
      }, 3000);
    }
  };

  return (
    <AuthCard
      title="Welcome Back!"
      subtitle="Sign in with your email and password"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          id="email"
          type="email"
          label="Email Address"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setShowResendButton(false); // Hide resend button when email changes
          }}
          required
          autoComplete="email"
        />
        <PasswordInput
          id="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="Enter your password"
        />

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onSwitchToForgotPassword}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Forgot password?
          </button>

          {showResendButton && (
            <button
              type="button"
              onClick={handleResendConfirmation}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Resend confirmation email
            </button>
          )}
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Sign In
        </Button>

        <div className="text-center text-sm text-gray-500">
          <p className="mb-2">Sign in with your email and password</p>
          <p>Don't have an account?{' '}
          <button type="button" onClick={onSwitchToSignup} className="font-medium text-highlight hover:text-blue-500">
            Sign up
          </button></p>
        </div>
      </form>
    </AuthCard>
  );
};

export default LoginCard;