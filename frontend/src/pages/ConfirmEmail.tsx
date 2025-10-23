// 🚨🚨🚨 FORCE LOG - OUTSIDE COMPONENT - SHOULD ALWAYS SHOW
console.log('%c🟢🟢🟢 CONFIRM PAGE FILE LOADED', 'color: green; font-size: 24px; font-weight: bold; background: yellow; padding: 10px');
console.log('Timestamp:', new Date().toISOString());
console.log('Location:', window.location.href);

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import Logo from '../components/ui/Logo';

interface ConfirmEmailProps {}

const ConfirmEmail: React.FC<ConfirmEmailProps> = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResendForm, setShowResendForm] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    // Guard against double confirmation
    const isConfirmed = localStorage.getItem('emailConfirmed');
    if (isConfirmed) {
      console.log('🔒 Email already confirmed, redirecting to auth');
      navigate('/auth', { replace: true });
      return;
    }

    const confirmEmail = async () => {
      console.log('%c🔍 CONFIRM START', 'color: red; font-size: 18px; font-weight: bold');

      const params = new URLSearchParams(window.location.search);
      const error = params.get('error');

      if (error) {
        console.error('❌ SUPABASE ERROR:', error, params.get('error_description'));
        addToast('error', 'Confirmation failed.');
        navigate('/auth', { replace: true });
        return;
      }

      const token = params.get('token');

      console.log('TOKEN:', token);

      if (token) {
        console.log('🔑 VERIFYING TOKEN:', token);
        try {
          // Make API call to backend to verify token
          const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000');
          const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
          const response = await fetch(`${apiUrl}/auth/confirm/${token}`);
          const result = await response.json();

          console.log('📧 CONFIRMATION RESPONSE:', { status: response.status, result });

          if (response.ok) {
            console.log('✅ EMAIL CONFIRMED:', result.data?.user?.id);
            setLoading(false);

            // Set guard to prevent double confirmation
            localStorage.setItem('emailConfirmed', 'true');

            addToast('success', result.message || 'Email confirmed successfully!');

            // If user is logged in (has tokens), redirect to dashboard
            if (result.data?.accessToken) {
              localStorage.setItem('accessToken', result.data.accessToken);
              localStorage.setItem('refreshToken', result.data.refreshToken);
              localStorage.setItem('user', JSON.stringify(result.data.user));

              setTimeout(() => {
                if (result.data.user.role === 'admin') {
                  navigate('/dashboard');
                } else {
                  navigate('/employee-dashboard');
                }
              }, 2000);
            } else {
              // Email confirmed but user needs to login
              setTimeout(() => {
                navigate('/auth');
              }, 3000);
            }
          } else {
            // Handle error response
            const errorMessage = result?.message || result?.error || 'Confirmation failed';
            console.error('❌ CONFIRMATION ERROR:', errorMessage);
            setError(errorMessage);
            setLoading(false);
            setShowResendForm(true);
          }
        } catch (err: any) {
          console.error('❌ NETWORK ERROR:', err);
          const errorMessage = err?.message || 'Network error occurred. Please try again.';
          setError(errorMessage);
          setLoading(false);
          setShowResendForm(true);
        }
      } else {
        console.log('❌ INVALID LINK');
        setError('Invalid confirmation link.');
        setLoading(false);
        setShowResendForm(true);
      }
    };

    confirmEmail();
  }, [navigate, addToast]);

  const handleResendConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      addToast('error', 'Please enter your email address');
      return;
    }

    setIsResending(true);
    try {
      const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000');
      const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
      await fetch(`${apiUrl}/auth/resend-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resendEmail }),
      });

      addToast('success', 'Confirmation email resent successfully! Please check your inbox.');
      setShowResendForm(false);
      setError(null);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to resend confirmation email');
    } finally {
      setIsResending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Logo className="h-12 w-auto" />
            </div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Confirming Your Email</h2>
            <p className="text-gray-600">Please wait while we verify your email address...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && showResendForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Logo className="h-12 w-auto" />
            </div>

            <div className="mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Email Confirmation Failed</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>

            <form onSubmit={handleResendConfirmation} className="mb-6">
              <div className="mb-4">
                <label htmlFor="resendEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter your email address to resend confirmation:
                </label>
                <input
                  type="email"
                  id="resendEmail"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-500"
                  placeholder="your.email@example.com"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isResending}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50"
              >
                {isResending ? 'Sending...' : 'Resend Confirmation Email'}
              </button>
            </form>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/auth')}
                className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors font-semibold"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Logo className="h-12 w-auto" />
          </div>

          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Email Confirmed Successfully!
          </h2>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800">
              🎉 Your email has been confirmed successfully!
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">📋 Next Steps:</h3>
            <ul className="text-sm text-blue-700 text-left space-y-1">
              <li>• Your email has been verified successfully</li>
              <li>• If you're an admin, you'll be redirected to dashboard</li>
              <li>• If you're an employee, your account is pending admin approval</li>
              <li>• You'll receive an email notification once approved</li>
              <li>• Redirecting automatically...</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/auth')}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Go to Login
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
            >
              Go to Home
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Need help? Contact your HR department or system administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmEmail;
