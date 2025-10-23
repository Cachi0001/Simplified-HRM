import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthCard } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PasswordInput } from '../ui/PasswordInput';
import { authService } from '../../services/authService';
import { useToast } from '../ui/Toast';

interface SignupCardProps {
  onSwitchToLogin: () => void;
}

const SignupCard: React.FC<SignupCardProps> = ({ onSwitchToLogin }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstSignup, setIsFirstSignup] = useState(true);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Triple prevention - ensure no form submission
    if (e.target !== e.currentTarget) {
      return;
    }

    // Prevent multiple submissions
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.signup({
        fullName,
        email,
        password,
        role: 'employee'
      });

      if (result.requiresConfirmation) {
        // Store email for potential resend functionality
        localStorage.setItem('pendingConfirmationEmail', email);

        // Email confirmation required - show appropriate message
        if (isFirstSignup) {
          addToast('success', result.message || 'Account created! Please check your email to verify your account before logging in.');
          setIsFirstSignup(false); // Mark as not first signup for future attempts
        } else {
          addToast('success', 'Check your inbox – we sent you a new confirmation email. Please verify your account to continue.');
        }
      } else {
        // User is logged in immediately - show success toast and redirect
        addToast('success', result.message || "Account created successfully!");

        // Redirect to dashboard or appropriate page
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }

      // Clear form
      setFullName('');
      setEmail('');
      setPassword('');

    } catch (err: any) {
      let errorMessage = 'An unexpected error occurred. Please try again or contact support.';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      }

      // Provide more specific guidance based on error type
      if (errorMessage.includes('Email already registered')) {
        errorMessage = 'This email is already registered. Please try signing in instead, or contact support if you need help.';
        setIsFirstSignup(false); // Reset to first signup state for new email
      } else if (errorMessage.includes('Database error')) {
        errorMessage = 'There was an issue creating your account. Please try again in a few minutes or contact support.';
      } else if (errorMessage.includes('Email and full name are required')) {
        errorMessage = 'Please fill in all required fields: full name, email, and password.';
      }

      // Show red error toast
      addToast('error', errorMessage);
      console.error('Signup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Join Go3net"
      subtitle="Create your account with email and password"
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
          onChange={(e) => {
            setEmail(e.target.value);
            setIsFirstSignup(true);
          }}
          required
          autoComplete="email"
        />
        <PasswordInput
          id="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          minLength={6}
          placeholder="Create a strong password"
        />

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Create Account
        </Button>
        <div className="text-center text-sm text-gray-500">
          <p className="mb-2">Create an account with your email and password. You'll need to verify your email before logging in.</p>
          <p>Already have an account?{' '}
          <button type="button" onClick={onSwitchToLogin} className="font-medium text-highlight hover:text-blue-500">
            Sign in
          </button></p>
        </div>
      </form>
    </AuthCard>
  );
};

export default SignupCard;