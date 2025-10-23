import React, { useState } from 'react';
import { AuthCard } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { authService } from '../../services/authService';
import { useToast } from '../ui/Toast';
import { Eye, EyeOff } from 'lucide-react';

interface ForgotPasswordCardProps {
  onSwitchToLogin: () => void;
}

const ForgotPasswordCard: React.FC<ForgotPasswordCardProps> = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

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

    setIsLoading(true);

    try {
      // For now, we'll use the reset password functionality
      // In a real implementation, you might want to use a token-based system
      await authService.updatePassword(email, newPassword);
      addToast('success', 'Password updated successfully! You can now sign in with your new password.');
      onSwitchToLogin();
    } catch (err) {
      if (err instanceof Error) {
        addToast('error', err.message);
      } else {
        addToast('error', 'An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Reset Password"
      subtitle="Enter your email and create a new password."
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

        <div className="relative">
          <Input
            id="newPassword"
            type={showPassword ? "text" : "password"}
            label="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-8 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-8 text-gray-500 hover:text-gray-700"
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Update Password
        </Button>
        <p className="text-center text-sm text-gray-400">
          Remember your password?{' '}
          <button type="button" onClick={onSwitchToLogin} className="font-medium text-highlight hover:text-blue-500">
            Sign in
          </button>
        </p>
      </form>
    </AuthCard>
  );
};

export default ForgotPasswordCard;