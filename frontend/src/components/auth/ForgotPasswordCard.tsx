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
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authService.resetPassword(email);
      addToast('success', 'If an account exists, a reset link has been sent to your email.');
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
      title="Forgot Password?"
      subtitle="Enter your email and we'll send you a reset link."
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
        
        <Button type="submit" className="w-full" isLoading={isLoading}>
          Send Reset Link
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