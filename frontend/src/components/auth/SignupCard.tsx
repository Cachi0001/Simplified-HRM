import React, { useState } from 'react';
import { AuthCard } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface SignupCardProps {
  onSwitchToLogin: () => void;
}

const API_BASE_URL = 'https://go3nethrm-backend.vercel.app/api';

const SignupCard: React.FC<SignupCardProps> = ({ onSwitchToLogin }) => {
  const [fullName, setFullName] = useState('');
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

    const payload = { fullName, email, password, role: 'employee' };
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'An unknown error occurred during signup.');
      }
      
      if (data.message.includes('confirmation email')) {
        setSuccess("Check your inbox – we sent you a new confirmation email.");
      } else {
        setSuccess(data.message || 'Registration successful! Please check your email to verify your account.');
      }

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
      title="Create an Account"
      subtitle="Join GoNet to streamline your HR processes"
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
        <Input
          id="password"
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        
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