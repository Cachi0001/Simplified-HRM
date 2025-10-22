import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from '../components/ui/Logo';
import { Button } from '../components/ui/Button';

const ConfirmEmail: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorType, setErrorType] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Check for URL query parameters (Supabase error redirects)
        const error = searchParams.get('error');
        const errorCode = searchParams.get('error_code');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          // Handle Supabase error redirects
          let errorMessage = 'Email confirmation failed. Please try again.';

          if (errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
            errorMessage = 'Your confirmation link has expired. Please request a new confirmation email.';
            setErrorType('expired');
          } else if (errorCode === 'access_denied' || errorDescription?.includes('invalid')) {
            errorMessage = 'This confirmation link is invalid or has already been used. Please request a new confirmation email.';
            setErrorType('invalid');
          } else {
            errorMessage = decodeURIComponent(errorDescription || 'Email confirmation failed. Please try again.');
            setErrorType('general');
          }

          setMessage(errorMessage);
          setIsSuccess(false);
          setLoading(false);
          return;
        }

        // Handle the confirmation from URL hash (normal flow)
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const token = params.get('access_token');
        const type = params.get('type');

        if (token && type === 'signup') {
          // Set the session with the token
          const { data, error } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: params.get('refresh_token') || '',
          });

          if (error) {
            let errorMessage = 'Email confirmation failed. The link may be expired or invalid. Please try registering again or contact support.';

            if (error.message.includes('expired')) {
              errorMessage = 'Your confirmation link has expired. Please request a new confirmation email.';
              setErrorType('expired');
            } else if (error.message.includes('invalid')) {
              errorMessage = 'This confirmation link is invalid. Please request a new confirmation email.';
              setErrorType('invalid');
            }

            setMessage(errorMessage);
            setIsSuccess(false);
          } else if (data.session) {
            setMessage('🎉 Email confirmed successfully! Your account is now pending admin approval. You will receive a notification once your account is activated.');
            setIsSuccess(true);

            // Redirect to login after 5 seconds
            setTimeout(() => {
              navigate('/auth');
            }, 5000);
          }
        } else {
          setMessage('Invalid confirmation link. Please check your email for the correct confirmation link or try registering again.');
          setIsSuccess(false);
          setErrorType('invalid');
        }
      } catch (error) {
        setMessage('An unexpected error occurred during email confirmation. Please try again or contact support.');
        setIsSuccess(false);
        setErrorType('general');
      } finally {
        setLoading(false);
      }
    };

    handleEmailConfirmation();
  }, [navigate, searchParams]);

  const handleResendConfirmation = async () => {
    setLoading(true);
    try {
      // Extract email from URL or redirect to auth page
      const email = searchParams.get('email');
      if (email) {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: decodeURIComponent(email),
          options: {
            emailRedirectTo: `${(import.meta as any).env.VITE_FRONTEND_URL || window.location.origin}/confirm`,
          },
        });

        if (error) throw error;

        setMessage('A new confirmation email has been sent. Please check your inbox and click the link to confirm your account.');
        setIsSuccess(true);
        setErrorType(null);
      } else {
        // No email in URL, redirect to auth
        navigate('/auth');
      }
    } catch (error: any) {
      setMessage('Failed to resend confirmation email. Please try registering again.');
      setIsSuccess(false);
      setErrorType('general');
    } finally {
      setLoading(false);
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
            <div className="mt-4">
              <div className="flex items-center justify-center space-x-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
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
            {isSuccess ? (
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            ) : (
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {errorType === 'expired' ? (
                  <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : errorType === 'invalid' ? (
                  <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            {isSuccess
              ? 'Email Confirmed Successfully!'
              : errorType === 'expired'
                ? 'Link Expired'
                : errorType === 'invalid'
                  ? 'Invalid Link'
                  : 'Confirmation Failed'
            }
          </h2>

          <div className={`p-4 rounded-lg mb-6 ${isSuccess ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <p className={`text-sm ${isSuccess ? 'text-green-800' : 'text-red-800'}`}>
              {message}
            </p>
          </div>

          {isSuccess && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">📋 Next Steps:</h3>
              <ul className="text-sm text-blue-700 text-left space-y-1">
                <li>• Your account is now submitted for admin review</li>
                <li>• You'll receive an email notification once approved</li>
                <li>• Check your notifications in the app for updates</li>
                <li>• Redirecting to login page in a few seconds...</li>
              </ul>
            </div>
          )}

          <div className="space-y-3">
            {!isSuccess && (
              <>
                <Button
                  onClick={handleResendConfirmation}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  isLoading={loading}
                >
                  {loading ? 'Sending...' : 'Resend Confirmation Email'}
                </Button>

                <button
                  onClick={() => navigate('/auth')}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                >
                  Go to Registration
                </button>
              </>
            )}

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
