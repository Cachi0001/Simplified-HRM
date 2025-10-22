import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from '../components/ui/Logo';
import { useToast } from '../components/ui/Toast';

const ConfirmEmail: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    const handleConfirmation = async () => {
      try {
        // Check for URL query parameters (Supabase verification endpoint redirects)
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        const token = urlParams.get('token') || hashParams.get('access_token');
        const type = urlParams.get('type') || hashParams.get('type');
        const refreshToken = hashParams.get('refresh_token');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        // Handle Supabase verification endpoint errors
        if (error) {
          let errorMessage = 'Email confirmation failed. Please try again.';

          if (errorDescription?.includes('expired')) {
            errorMessage = 'Your confirmation link has expired. Please request a new confirmation email.';
          } else if (errorDescription?.includes('invalid')) {
            errorMessage = 'This confirmation link is invalid. Please request a new confirmation email.';
          }

          addToast('error', errorMessage);
          setLoading(false);
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        // Handle magic link confirmation (hash-based)
        if (token && refreshToken) {
          // Set session first
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: refreshToken,
          });

          if (sessionError) throw sessionError;

          // Get user info
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            // Check user metadata to determine if it's signup or login
            const isSignup = user.user_metadata?.signup === true;
            const isLogin = user.user_metadata?.login === true;
            const isResend = user.user_metadata?.resend === true;

            if (isSignup) {
              // Handle signup confirmation
              try {
                // Create employee record using service role
                const { data: employee, error: empError } = await supabase
                  .from('employees')
                  .insert({
                    user_id: user.id,
                    email: user.email!,
                    full_name: user.user_metadata.full_name || user.email!,
                    role: user.user_metadata.role || 'employee',
                    status: 'pending'
                  })
                  .select()
                  .single();

                if (empError) {
                  console.warn('Failed to create employee record:', empError);
                } else {
                  // Send admin notification email
                  try {
                    const response = await fetch(`${(import.meta as any).env.VITE_API_URL}/auth/notify-admin`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        email: user.email,
                        fullName: user.user_metadata.full_name || user.email!
                      })
                    });

                    if (response.ok) {
                      console.log('Admin notification sent');
                    }
                  } catch (emailError) {
                    console.warn('Failed to send admin notification:', emailError);
                  }
                }
              } catch (recordError) {
                console.warn('Failed to create employee record after confirmation:', recordError);
              }

              addToast('success', '🎉 Email confirmed successfully! Your account is now pending admin approval.');
              setLoading(false);

              // Redirect to login after 5 seconds
              setTimeout(() => {
                navigate('/auth');
              }, 5000);
            } else if (isLogin || isResend) {
              // Handle login confirmation or resend confirmation
              // Check if user is approved
              const { data: employee } = await supabase
                .from('employees')
                .select('role, status, full_name')
                .eq('email', user.email!)
                .single();

              if (employee?.status === 'active') {
                // User is approved - redirect to dashboard
                addToast('success', `Welcome back! Redirecting to dashboard...`);

                // Store user data
                localStorage.setItem('user', JSON.stringify({
                  id: user.id,
                  email: user.email,
                  fullName: employee.full_name || user.email,
                  role: employee.role,
                  emailVerified: true,
                  createdAt: user.created_at,
                  updatedAt: user.updated_at || user.created_at
                }));
                localStorage.setItem('accessToken', token);
                localStorage.setItem('refreshToken', refreshToken);

                setLoading(false);
                setTimeout(() => {
                  navigate('/dashboard');
                }, 1500);
              } else if (employee?.status === 'pending') {
                // User is still pending approval
                addToast('warning', 'Your account is still pending admin approval. Please wait for approval.');
                setLoading(false);
                setTimeout(() => {
                  navigate('/auth');
                }, 3000);
              } else {
                // User not found in employee records
                addToast('error', 'Account not found. Please contact support.');
                setLoading(false);
                setTimeout(() => {
                  navigate('/auth');
                }, 3000);
              }
            } else {
              // Fallback: assume login for existing users or resend
              const { data: employee } = await supabase
                .from('employees')
                .select('role, status, full_name')
                .eq('email', user.email!)
                .single();

              if (employee?.status === 'active') {
                addToast('success', `Welcome back! Redirecting to dashboard...`);
                localStorage.setItem('user', JSON.stringify({
                  id: user.id,
                  email: user.email,
                  fullName: employee.full_name || user.email,
                  role: employee.role,
                  emailVerified: true,
                  createdAt: user.created_at,
                  updatedAt: user.updated_at || user.created_at
                }));
                localStorage.setItem('accessToken', token);
                localStorage.setItem('refreshToken', refreshToken);
                setLoading(false);
                setTimeout(() => {
                  navigate('/dashboard');
                }, 1500);
              } else {
                addToast('info', 'Please confirm your email address first.');
                setLoading(false);
                setTimeout(() => {
                  navigate('/auth');
                }, 3000);
              }
            }
          }
        } else {
          throw new Error('Invalid confirmation link - missing tokens');
        }
      } catch (err: any) {
        console.error('Confirmation failed:', err);
        addToast('error', 'Confirmation failed. Please try again or contact support.');
        setLoading(false);
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      }
    };

    handleConfirmation();
  }, [navigate, addToast]);

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
              🎉 Your email has been confirmed successfully! Your account is now pending admin approval.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">📋 Next Steps:</h3>
            <ul className="text-sm text-blue-700 text-left space-y-1">
              <li>• Your account is now submitted for admin review</li>
              <li>• You'll receive an email notification once approved</li>
              <li>• Check your notifications in the app for updates</li>
              <li>• Redirecting to login page in a few seconds...</li>
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
