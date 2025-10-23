// 🚨🚨🚨 FORCE LOG - OUTSIDE COMPONENT - SHOULD ALWAYS SHOW
console.log('%c🟢🟢🟢 CONFIRM PAGE FILE LOADED', 'color: green; font-size: 24px; font-weight: bold; background: yellow; padding: 10px');
console.log('Timestamp:', new Date().toISOString());
console.log('Location:', window.location.href);

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import Logo from '../components/ui/Logo';
import { Button } from '../components/ui/Button';

interface ConfirmEmailProps {}

const ConfirmEmail: React.FC<ConfirmEmailProps> = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid confirmation link');
      return;
    }

    // Don't auto-execute - let user click the button
  }, [token]);

  const handleConfirm = async () => {
    // Prevent multiple simultaneous requests
    if (isVerifying) {
      console.log('🚫 Confirmation already in progress, ignoring duplicate request');
      return;
    }

    // Prevent confirmation if already completed
    if (hasCompleted) {
      console.log('🚫 Confirmation already completed, ignoring request');
      return;
    }

    console.log('🔄 MANUAL CONFIRMATION STARTED - User clicked button');

    // Don't check localStorage first - let backend be the source of truth
    setIsVerifying(true);
    setError(null);
    setIsExpired(false);

    try {
      const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000');
      const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

      console.log('📡 Making confirmation API call...');
      const response = await fetch(`${apiUrl}/auth/confirm/${token}`);
      const result = await response.json();

      console.log('📥 Confirmation API response:', { status: response.status, result });

      if (response.ok) {
        console.log('✅ Confirmation successful - updating database');

        // Backend confirmed successfully - update localStorage
        localStorage.setItem('emailConfirmed', 'true');
        localStorage.removeItem('pendingConfirmationEmail'); // Clear pending email

        // Also store user data for immediate login if tokens provided
        if (result.data?.accessToken) {
          localStorage.setItem('accessToken', result.data.accessToken);
          localStorage.setItem('refreshToken', result.data.refreshToken);
          localStorage.setItem('user', JSON.stringify(result.data.user));
        }

        setHasCompleted(true); // Mark as completed to prevent further requests
        setIsSuccess(true);
        addToast('success', result.message || 'Email confirmed successfully!');

        setTimeout(() => {
          if (result.data?.user?.role === 'admin') {
            navigate('/dashboard', { replace: true });
          } else if (result.data?.accessToken) {
            navigate('/employee-dashboard', { replace: true });
          } else {
            navigate('/auth', { replace: true });
          }
        }, 3000);
      } else {
        if (result.message?.includes('expired') || result.message?.includes('Invalid')) {
          setIsExpired(true);
          throw new Error(result.message);
        } else {
          throw new Error(result.message || 'Confirmation failed');
        }
      }
    } catch (err: any) {
      console.error('❌ Confirmation failed:', err);

      if (err.message?.includes('already been verified') || err.message?.includes('already confirmed')) {
        console.log('ℹ️ Email already confirmed - redirecting');
        // Backend says already confirmed - trust it and redirect
        localStorage.setItem('emailConfirmed', 'true');
        localStorage.removeItem('pendingConfirmationEmail'); // Clear pending email
        setHasCompleted(true); // Mark as completed
        addToast('info', 'Email already confirmed');
        navigate('/auth', { replace: true });
        return;
      }

      if (err.message?.includes('expired')) {
        setIsExpired(true);
        setError('This confirmation link has expired. Please request a new one.');
      } else {
        setError(err.message || 'Confirmation failed');
      }
      addToast('error', err.message || 'Confirmation failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendConfirmation = async () => {
    setIsResending(true);
    try {
      const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000');
      const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

      // Try to get email from localStorage (set during signup) or use default
      const email = localStorage.getItem('pendingConfirmationEmail') || 'passioncaleb5@gmail.com';

      await fetch(`${apiUrl}/auth/resend-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      addToast('success', 'Confirmation email resent successfully! Please check your inbox.');
      setIsExpired(false);
      setError(null);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to resend confirmation email');
    } finally {
      setIsResending(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Logo className="h-12 w-auto" />
            </div>
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-6"></div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">Invalid Link</h2>
            <p className="text-gray-600 mb-4">This confirmation link is invalid or missing.</p>
            <Button onClick={() => navigate('/auth')} className="w-full bg-blue-600 hover:bg-blue-700">
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Logo className="h-12 w-auto" />
            </div>
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">Confirming Your Email</h2>
            <p className="text-gray-600 mb-4">Please wait while we verify your email address...</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                🔄 Processing your confirmation link...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Logo className="h-12 w-auto" />
            </div>

            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Email Confirmed Successfully!
            </h2>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800">
                🎉 Your email has been confirmed successfully! we will notify you once the admin approves your account.
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
              <Button onClick={() => navigate('/auth')} className="w-full bg-blue-600 hover:bg-blue-700">
                Go to Login
              </Button>

              <Button onClick={() => navigate('/')} className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50">
                Go to Home
              </Button>
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
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            {isExpired ? 'Link Expired' : 'Confirm Your Email'}
          </h2>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 text-center">
              {isExpired
                ? 'This confirmation link has expired. Please request a new confirmation email.'
                : 'Click the button below to confirm your email address and activate your account.'
              }
            </p>
          </div>

          {error && !isExpired && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800 text-center">
                ❌ {error}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {isExpired ? (
              <>
                <Button
                  onClick={handleResendConfirmation}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  isLoading={isResending}
                >
                  {isResending ? 'Sending...' : 'Resend Confirmation Email'}
                </Button>

                <Button
                  onClick={() => navigate('/auth')}
                  className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Back to Login
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleConfirm}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  isLoading={isVerifying}
                >
                  {isVerifying ? 'Confirming Email...' : 'Confirm Email Address'}
                </Button>

                <Button
                  onClick={() => navigate('/auth')}
                  className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Back to Login
                </Button>
              </>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Need help? Contact your HR department or system administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmEmail;
