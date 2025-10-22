// 🚨🚨🚨 FORCE LOG - OUTSIDE COMPONENT - SHOULD ALWAYS SHOW
console.log('%c🟢🟢🟢 CONFIRM PAGE FILE LOADED', 'color: green; font-size: 24px; font-weight: bold; background: yellow; padding: 10px');
console.log('Timestamp:', new Date().toISOString());
console.log('Location:', window.location.href);

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from '../components/ui/Logo';
import { useToast } from '../components/ui/Toast';

const ConfirmEmail: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);

  const handleAuthSuccess = useCallback(async (session: any, isSignup: boolean) => {
    try {
      const user = session.user;

      if (isSignup) {
        await supabase.from('employees').insert({
          user_id: user.id,
          email: user.email!,
          full_name: user.user_metadata.full_name,
          role: 'employee',
          status: 'pending'
        });
        addToast('success', 'Confirmed! Pending approval.');
        setLoading(false);
        setTimeout(() => navigate('/auth'), 3000);
      } else {
        const { data: emp } = await supabase.from('employees').select('status').eq('email', user.email!).single();
        if (emp?.status === 'active') {
          localStorage.setItem('accessToken', session.access_token);
          setLoading(false);
          navigate('/dashboard');
        } else {
          addToast('warning', 'Pending approval.');
          setLoading(false);
          navigate('/auth');
        }
      }
    } catch (err: any) {
      console.error('Auth success handling failed:', err);
      addToast('error', 'Authentication failed. Please contact support.');
      setLoading(false);
      navigate('/auth');
    }
  }, [navigate, addToast]);

  useEffect(() => {
    const confirm = async () => {
      console.clear();
      console.log('%c🔍 CONFIRM START', 'color: red; font-size: 18px; font-weight: bold');

      const params = new URLSearchParams(window.location.search);
      const error = params.get('error');

      if (error) {
        console.error('❌ SUPABASE ERROR:', error, params.get('error_description'));
        addToast('error', 'Confirmation failed.');
        navigate('/auth', { replace: true });
        return;
      }

      const token_hash = params.get('token_hash');
      const type = params.get('type');

      console.log('TOKEN_HASH:', token_hash);
      console.log('TYPE:', type);

      if (token_hash && type === 'signup') {
        console.log('🔑 VERIFYING OTP:', token_hash);
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'email'
        });

        if (error) throw error;
        console.log('✅ CONFIRMED:', data.session?.user?.id);
        await handleAuthSuccess(data.session, true);
      } else {
        console.log('❌ INVALID LINK');
        addToast('error', 'Invalid confirmation link.');
        navigate('/auth', { replace: true });
      }
    };

    confirm();
  }, [navigate, addToast]); // ← FIXED DEPENDENCY ARRAY

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
              🎉 Your email has been confirmed successfully!
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">📋 Next Steps:</h3>
            <ul className="text-sm text-blue-700 text-left space-y-1">
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
