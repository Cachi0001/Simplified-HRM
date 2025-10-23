import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthCard } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
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
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        addToast('info', response.data.message || 'Please verify your email before logging in');
        return;
      }

      addToast('success', 'Login successful! Redirecting...');

      // Store user data for UI state
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // Redirect based on user role with immediate navigation
      if (user.role === 'admin') {
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
      } else if (user.role === 'employee') {
        setTimeout(() => {
          navigate('/employee-dashboard');
        }, 500);
      } else {
        setTimeout(() => {
          navigate('/');
        }, 500);
      }

    } catch (err: any) {
      console.error('Login error:', err);

      if (err.response?.data?.errorType === 'email_not_confirmed') {
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
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          id="password"
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onSwitchToForgotPassword}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Forgot password?
          </button>
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