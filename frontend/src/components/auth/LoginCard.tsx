import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthCard } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { authService } from '../../services/authService';
import { Eye, EyeOff } from 'lucide-react';

interface LoginCardProps {
  onSwitchToSignup: () => void;
  onSwitchToForgotPassword: () => void;
}

const LoginCard: React.FC<LoginCardProps> = ({ onSwitchToSignup, onSwitchToForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await authService.login({ email, password });

      // Check if response has the expected structure
      if (!response || !response.data || !response.data.user) {
        console.error('Invalid response structure:', response);
        throw new Error('Invalid response from server');
      }

      const user = response.data.user;
      const { accessToken, refreshToken } = response.data;

      setSuccess('Login successful! Redirecting...');

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

    } catch (err) {
      console.error('Login error:', err);
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
      subtitle="Sign in to continue to Go3net"
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
            id="password"
            type={showPassword ? "text" : "password"}
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all duration-200 flex items-center justify-center w-6 h-6"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
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