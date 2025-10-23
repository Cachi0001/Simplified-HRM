import React, { useState } from 'react';
import { AuthCard } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { authService } from '../../services/authService';
import { useToast } from '../ui/Toast';

interface ForgotPasswordCardProps {
  onSwitchToLogin: () => void;
}

const ForgotPasswordCard: React.FC<ForgotPasswordCardProps> = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Double prevention - ensure no form submission
    if (e.target !== e.currentTarget) {
      return;
    }

    if (!email.trim()) {
      addToast('error', 'Please enter your email address');
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(email);
      setIsEmailSent(true);
      addToast('success', 'Password reset email sent! Please check your inbox and follow the instructions to reset your password.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <AuthCard
        title="Check Your Email"
        subtitle="Password reset instructions sent"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              We've sent password reset instructions to <strong>{email}</strong>
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Click the link in the email to reset your password. The link will expire in 1 hour.
            </p>

            <Button onClick={() => setIsEmailSent(false)} className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200">
              Send Another Email
            </Button>

            <button
              type="button"
              onClick={onSwitchToLogin}
              className="w-full text-sm text-gray-600 hover:text-gray-800"
            >
              Back to Login
            </button>
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot Password"
      subtitle="Enter your email to receive password reset instructions"
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
          placeholder="Enter your registered email address"
        />

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Send Reset Instructions
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Back to Login
          </button>
        </div>
      </form>
    </AuthCard>
  );
};

export default ForgotPasswordCard;