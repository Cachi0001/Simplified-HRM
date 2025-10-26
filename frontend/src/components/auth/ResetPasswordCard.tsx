import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthCard } from '../ui/Card';
import { PasswordInput } from '../ui/PasswordInput';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import api from '../../lib/api';

interface ResetPasswordCardProps {}

const ResetPasswordCard: React.FC<ResetPasswordCardProps> = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      addToast('error', 'Invalid reset link. Please request a new password reset.');
      navigate('/auth', { replace: true });
      return;
    }
    setToken(tokenParam);
  }, [searchParams, navigate, addToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      addToast('error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      addToast('error', 'Password must be at least 8 characters long');
      return;
    }

    if (!token) {
      addToast('error', 'Invalid reset token. Please request a new password reset.');
      navigate('/auth', { replace: true });
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post(`auth/reset-password/${token}`, { newPassword });

      if (response.status === 200) {
        addToast('success', 'Password reset successfully! You can now sign in with your new password.');

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 2000);
      }
    } catch (err: any) {
      addToast('error', err.message || 'Network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Verifying Reset Link</h2>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <AuthCard
        title="Reset Your Password"
        subtitle="Enter your new password below"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <PasswordInput
            id="newPassword"
            label="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Enter your new password"
          />

          <PasswordInput
            id="confirmPassword"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Confirm your new password"
          />

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Reset Password
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Back to Login
            </button>
          </div>
        </form>
      </AuthCard>
    </div>
  );
};

export default ResetPasswordCard;
