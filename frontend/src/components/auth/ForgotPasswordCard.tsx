import React, { useState } from 'react';
import { AuthCard } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface ForgotPasswordCardProps {
  onSwitchToLogin: () => void;
}

const API_BASE_URL = 'https://go3nethrm-backend.vercel.app/api';

const ForgotPasswordCard: React.FC<ForgotPasswordCardProps> = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'An unknown error occurred.');
      }
      
      setSuccess(data.message || 'If an account exists, a reset link has been sent.');

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
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
        
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {success && <p className="text-green-500 text-sm text-center">{success}</p>}

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