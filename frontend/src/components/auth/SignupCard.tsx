import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthCard } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { authService } from '../../services/authService';
import { Eye, EyeOff } from 'lucide-react';

interface SignupCardProps {
  onSwitchToLogin: () => void;
}

const SignupCard: React.FC<SignupCardProps> = ({ onSwitchToLogin }) => {
  const [fullName, setFullName] = useState('');
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
      await authService.signup({
        fullName,
        email,
        password,
        role: 'employee'
      });

      setSuccess("Check your inbox – we sent you a confirmation email. Please verify your account to continue.");

      // Clear form
      setFullName('');
      setEmail('');
      setPassword('');

    } catch (err) {
      if (err instanceof Error) {
        let errorMessage = err.message;

        // Provide more specific guidance based on error type
        if (errorMessage.includes('Email already registered')) {
          errorMessage = 'This email is already registered. Please try signing in instead, or contact support if you need help.';
        } else if (errorMessage.includes('Database error')) {
          errorMessage = 'There was an issue creating your account. Please try again in a few minutes or contact support.';
        } else if (errorMessage.includes('Check your inbox')) {
          errorMessage = 'Please check your email for a confirmation link. The link will expire in 24 hours.';
        } else if (errorMessage.includes('Password')) {
          errorMessage = 'Password must be at least 6 characters long and contain letters and numbers.';
        }

        setError(errorMessage);
      } else {
        setError('An unexpected error occurred. Please try again or contact support.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Create an Account"
      subtitle="Join Go3net to streamline your HR processes"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          id="fullName"
          type="text"
          label="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
        />
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
            autoComplete="new-password"
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all duration-200 flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100"
            style={{ top: '50%', transform: 'translateY(-50%)', marginTop: '1px' }}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {success && <p className="text-green-500 text-sm text-center">{success}</p>}

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Create Account
        </Button>
        <p className="text-center text-sm text-gray-400">
          Already have an account?{' '}
          <button type="button" onClick={onSwitchToLogin} className="font-medium text-highlight hover:text-blue-500">
            Sign in
          </button>
        </p>
      </form>
    </AuthCard>
  );
};

export default SignupCard;