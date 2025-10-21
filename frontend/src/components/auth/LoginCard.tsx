import React, { useState } from 'react';
import { AuthCard } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface LoginCardProps {
  onSwitchToSignup: () => void;
  onSwitchToForgotPassword: () => void;
}

const API_BASE_URL = 'https://go3nethrm-backend.vercel.app/api';

const LoginCard: React.FC<LoginCardProps> = ({ onSwitchToSignup, onSwitchToForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'An unknown error occurred.');
      }

      setSuccess(data.message || 'Login successful! Redirecting...');
      // In a real app, you'd store the tokens and redirect the user here.
      // For example: localStorage.setItem('accessToken', data.data.accessToken);
      // window.location.href = '/dashboard';

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
      title="Welcome Back!"
      subtitle="Sign in to continue to GoNet"
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
          <div className="text-sm">
            <button
              type="button"
              onClick={onSwitchToForgotPassword}
              className="font-medium text-highlight hover:text-blue-500"
            >
              Forgot your password?
            </button>
          </div>
        </div>
        
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {success && <p className="text-green-500 text-sm text-center">{success}</p>}

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Sign In
        </Button>
        <p className="text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <button type="button" onClick={onSwitchToSignup} className="font-medium text-highlight hover:text-blue-500">
            Sign up
          </button>
        </p>
      </form>
    </AuthCard>
  );
};

export default LoginCard;