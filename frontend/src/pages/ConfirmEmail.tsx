// 🚨🚨🚨 FORCE LOG - OUTSIDE COMPONENT - SHOULD ALWAYS SHOW
console.log('%c🟢🟢🟢 CONFIRM PAGE FILE LOADED', 'color: green; font-size: 24px; font-weight: bold; background: yellow; padding: 10px');
console.log('Timestamp:', new Date().toISOString());
console.log('Location:', window.location.href);

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import Logo from '../components/ui/Logo';
import { Button } from '../components/ui/Button';
import api from '../lib/api';
import { authService } from '../services/authService';

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

    // Check if we have stored confirmation status from a previous attempt
    try {
      const status = sessionStorage.getItem('emailConfirmationStatus');
      const message = sessionStorage.getItem('emailConfirmationMessage');
      
      if (status && message) {
        console.log('Found stored confirmation status:', { status, message });
        
        // Handle different statuses
        if (status === 'success') {
          setIsSuccess(true);
          setHasCompleted(true);
          addToast('success', message);
        } else if (status === 'error') {
          const errorId = sessionStorage.getItem('emailConfirmationErrorId') || '';
          setError(message);
          addToast('error', message);
          
          // Check if it was an expired token error
          if (message.includes('expired')) {
            setIsExpired(true);
          }
        } else if (status === 'already-confirmed') {
          // Already confirmed - redirect to login
          addToast('info', message);
          setTimeout(() => {
            navigate('/auth', { replace: true });
          }, 1000);
        }
        
        // Clear the stored status to prevent showing the same message again
        sessionStorage.removeItem('emailConfirmationStatus');
        sessionStorage.removeItem('emailConfirmationMessage');
        sessionStorage.removeItem('emailConfirmationErrorId');
      }
    } catch (e) {
      console.warn('Failed to check sessionStorage for confirmation status', e);
    }

    // Don't auto-execute confirmation - let user click the button
  }, [token, navigate, addToast]);

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
      // Generate a unique request ID for tracking this confirmation attempt
      const requestId = `confirm_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      
      console.log(`📡 Making confirmation API call... [RequestID: ${requestId}]`, {
        token: token.substring(0, 5) + '...' // Only log part of the token for security
      });
      
      // Use the API client instead of direct fetch
      try {
        // Set a longer timeout for this specific request
        const response = await api.get(`/auth/confirm/${token}`, {
          timeout: 15000, // 15 second timeout
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'X-Request-ID': requestId
          }
        });
        
        console.log(`📥 Confirmation API response [RequestID: ${requestId}]:`, { 
          status: response.status, 
          data: response.data,
          contentType: response.headers['content-type']
        });

        const result = response.data;

        console.log(`✅ Confirmation successful [RequestID: ${requestId}] - updating client state`);

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

        // Store the email confirmation status in sessionStorage to persist across page refreshes
        try {
          sessionStorage.setItem('emailConfirmationStatus', 'success');
          sessionStorage.setItem('emailConfirmationMessage', result.message || 'Email confirmed successfully!');
        } catch (e) {
          console.warn('Failed to store confirmation status in sessionStorage', e);
        }

        setTimeout(() => {
          if (result.data?.user?.role === 'admin') {
            navigate('/dashboard', { replace: true });
          } else if (result.data?.accessToken) {
            navigate('/employee-dashboard', { replace: true });
          } else {
            navigate('/auth', { replace: true });
          }
        }, 3000);
      } catch (apiError: any) {
        console.error(`❌ API error during confirmation [RequestID: ${requestId}]:`, apiError);
        
        // Check for specific error messages
        const errorMessage = apiError.response?.data?.message || apiError.message;
        
        if (errorMessage.includes('expired') || errorMessage.includes('Invalid')) {
          setIsExpired(true);
          throw new Error(errorMessage);
        } else if (errorMessage.includes('already')) {
          // Handle "already confirmed" as a special case
          throw new Error(`This email has already been confirmed. ${errorMessage}`);
        } else if (apiError.code === 'ECONNABORTED') {
          throw new Error('The confirmation request timed out. Please check your internet connection and try again.');
        } else {
          throw apiError;
        }
      }
    } catch (err: any) {
      // Create a unique error ID for tracking
      const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      
      console.error(`❌ Confirmation failed [ErrorID: ${errorId}]:`, err);

      // Handle specific error cases with user-friendly messages
      if (err.message?.includes('already been verified') || 
          err.message?.includes('already confirmed') || 
          err.message?.includes('already been confirmed')) {
        console.log(`ℹ️ Email already confirmed [ErrorID: ${errorId}] - redirecting`);
        
        // Backend says already confirmed - trust it and redirect
        localStorage.setItem('emailConfirmed', 'true');
        localStorage.removeItem('pendingConfirmationEmail'); // Clear pending email
        setHasCompleted(true); // Mark as completed
        
        // Show a friendly message
        const friendlyMessage = 'Your email has already been confirmed. You can now log in to your account.';
        addToast('info', friendlyMessage);
        
        // Store in session storage for persistence
        try {
          sessionStorage.setItem('emailConfirmationStatus', 'already-confirmed');
          sessionStorage.setItem('emailConfirmationMessage', friendlyMessage);
        } catch (e) {
          console.warn('Failed to store confirmation status in sessionStorage', e);
        }
        
        navigate('/auth', { replace: true });
        return;
      }

      // Handle different error types with specific messages
      let userFriendlyMessage = '';
      
      if (err.message?.includes('expired')) {
        setIsExpired(true);
        userFriendlyMessage = 'This confirmation link has expired. Please request a new confirmation email.';
      } else if (err.message?.includes('HTML page instead of JSON') || 
                err.message?.includes('invalid response format') ||
                err.message?.includes('unexpected response')) {
        userFriendlyMessage = `The server returned an unexpected response. This might be due to server maintenance or configuration issues. Please try again later or contact support. (Error ID: ${errorId})`;
      } else if (err.message?.includes('Unexpected token') || 
                err.message?.includes('JSON.parse') ||
                err.message?.includes('invalid JSON')) {
        userFriendlyMessage = `There was a problem processing the server response. This is likely a temporary issue. Please try again later. (Error ID: ${errorId})`;
      } else if (err.message?.includes('timed out')) {
        userFriendlyMessage = 'The confirmation request timed out. Please check your internet connection and try again.';
      } else if (err.message?.includes('Network error') || err.message?.includes('internet connection')) {
        userFriendlyMessage = 'Network error. Please check your internet connection and try again.';
      } else {
        // Generic error message with the error ID for tracking
        userFriendlyMessage = `Email confirmation failed: ${err.message || 'Unknown error'}. (Error ID: ${errorId})`;
      }
      
      // Set the error message for display in the UI
      setError(userFriendlyMessage);
      
      // Log detailed error information for debugging
      console.error(`Confirmation error details [ErrorID: ${errorId}]:`, {
        errorId,
        message: err.message,
        stack: err.stack,
        name: err.name,
        code: err.code
      });
      
      // Show toast with the user-friendly message
      addToast('error', userFriendlyMessage);
      
      // Store error in session storage for persistence across refreshes
      try {
        sessionStorage.setItem('emailConfirmationStatus', 'error');
        sessionStorage.setItem('emailConfirmationMessage', userFriendlyMessage);
        sessionStorage.setItem('emailConfirmationErrorId', errorId);
      } catch (e) {
        console.warn('Failed to store error in sessionStorage', e);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendConfirmation = async () => {
    setIsResending(true);
    
    // Generate a unique request ID for tracking this resend attempt
    const requestId = `resend_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    try {
      // Try to get email from various sources
      let email = localStorage.getItem('pendingConfirmationEmail');
      
      // If not found in pendingConfirmationEmail, try to get from user object
      if (!email) {
        try {
          const userJson = localStorage.getItem('user');
          if (userJson) {
            const user = JSON.parse(userJson);
            if (user && user.email) {
              email = user.email;
              console.log('Using email from user object:', email);
            }
          }
        } catch (e) {
          console.warn('Failed to parse user JSON:', e);
        }
      }
      
      // If still not found, show a prompt to enter email
      if (!email) {
        // Ask the user for their email
        const userEmail = window.prompt('Please enter your email address to receive a new confirmation link:');
        
        if (userEmail && userEmail.includes('@')) {
          email = userEmail;
          // Save it for future use
          localStorage.setItem('pendingConfirmationEmail', email);
          console.log('Using email from user prompt:', email);
        } else {
          throw new Error('Valid email address is required. Please try again with a valid email.');
        }
      }
      
      console.log(`📧 Resending confirmation email [RequestID: ${requestId}]...`, {
        email: email.substring(0, 3) + '***' + email.substring(email.indexOf('@')) // Mask email for privacy
      });
      
      try {
        // Use the authService to resend the confirmation email
        const result = await authService.resendConfirmationEmail(email);
        
        console.log(`✅ Confirmation email resent successfully [RequestID: ${requestId}]`, result);
        
        const successMessage = result.message || 'Confirmation email resent successfully! Please check your inbox and spam folder.';
        addToast('success', successMessage);
        
        // Reset UI state
        setIsExpired(false);
        setError(null);
      } catch (apiError: any) {
        console.error(`❌ API error during resend confirmation [RequestID: ${requestId}]:`, apiError);
        
        // Check for specific error messages
        const errorMessage = apiError.response?.data?.message || apiError.message;
        
        if (errorMessage.includes('already verified') || errorMessage.includes('already confirmed')) {
          // Handle "already confirmed" as a special case
          throw new Error(`This email has already been confirmed. ${errorMessage}`);
        } else if (apiError.code === 'ECONNABORTED') {
          throw new Error('The request timed out. Please check your internet connection and try again.');
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
          throw new Error('You have requested too many confirmation emails. Please wait a few minutes before trying again.');
        } else {
          throw apiError;
        }
      }
    } catch (err: any) {
      // Create a unique error ID for tracking
      const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      
      console.error(`❌ Resend confirmation failed [ErrorID: ${errorId}]:`, err);
      
      // Handle different error types with specific messages
      let userFriendlyMessage = '';
      
      if (err.message?.includes('No email address found')) {
        userFriendlyMessage = 'No email address found. Please go back to the login page and try again.';
      } else if (err.message?.includes('already verified') || err.message?.includes('already confirmed')) {
        userFriendlyMessage = 'This email has already been confirmed. You can now log in to your account.';
        
        // Redirect to login page after showing the message
        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 3000);
      } else if (err.message?.includes('timed out')) {
        userFriendlyMessage = 'The request timed out. Please check your internet connection and try again.';
      } else if (err.message?.includes('Network error') || err.message?.includes('internet connection')) {
        userFriendlyMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.message?.includes('rate limit') || err.message?.includes('too many requests')) {
        userFriendlyMessage = 'You have requested too many confirmation emails. Please wait a few minutes before trying again.';
      } else {
        // Use the error message from the server if available, otherwise use a generic message
        userFriendlyMessage = `Failed to resend confirmation email: ${err.message || 'Unknown error'}. (Error ID: ${errorId})`;
      }
      
      // Show toast with the user-friendly message
      addToast('error', userFriendlyMessage);
      
      // Log detailed error information for debugging
      console.error(`Resend confirmation error details [ErrorID: ${errorId}]:`, {
        errorId,
        message: err.message,
        stack: err.stack,
        name: err.name,
        code: err.code
      });
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
