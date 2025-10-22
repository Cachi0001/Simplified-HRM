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
        // Supabase automatically handles the session from the URL hash
        // Just wait for the auth state to be ready
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          throw new Error(error.message);
        }

        if (!session || !session.user) {
          addToast('error', 'Invalid confirmation link. Please try again.');
          setLoading(false);
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        const user = session.user;
        console.log('✅ Email confirmed successfully', {
          userId: user.id,
          email: user.email
        });

        // Check if user exists in employees table
        const { data: employee, error: empError } = await supabase
          .from('employees')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (empError && empError.code !== 'PGRST116') {
          console.error('Employee lookup failed', { error: empError.message });
          throw new Error('Failed to verify user account');
        }

        if (!employee) {
          // Create employee record for new signup
          console.log('Creating new employee record');
          const { data: newEmployee, error: createError } = await supabase
            .from('employees')
            .insert({
              user_id: user.id,
              email: user.email!,
              full_name: user.user_metadata?.full_name || user.email!,
              role: user.user_metadata?.role || 'employee',
              status: 'pending'
            })
            .select()
            .single();

          if (createError) {
            console.error('Failed to create employee record', { error: createError.message });
            throw new Error('Failed to create account. Please contact support.');
          }

          // Send admin notification
          try {
            await fetch(`${(import.meta as any).env.VITE_API_URL}/auth/notify-admin`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: user.email,
                fullName: user.user_metadata?.full_name || user.email!
              })
            });
          } catch (emailError) {
            console.warn('Admin notification failed', { error: emailError });
          }

          addToast('success', '🎉 Email confirmed successfully! Your account is pending admin approval.');
          setLoading(false);
          setTimeout(() => navigate('/auth'), 5000);
          return;
        }

        // User exists - check status
        if (employee.status === 'active') {
          // Approved user - go to dashboard
          console.log('User approved, redirecting to dashboard');
          addToast('success', `Welcome back! Redirecting to dashboard...`);

          localStorage.setItem('user', JSON.stringify({
            id: user.id,
            email: user.email,
            fullName: employee.full_name,
            role: employee.role,
            emailVerified: true,
            createdAt: user.created_at,
            updatedAt: user.updated_at || user.created_at
          }));
          localStorage.setItem('accessToken', session.access_token);
          localStorage.setItem('refreshToken', session.refresh_token);

          setLoading(false);
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          // Still pending approval
          console.log('User pending approval');
          addToast('warning', 'Your account is still pending admin approval.');
          setLoading(false);
          setTimeout(() => navigate('/auth'), 3000);
        }
      } catch (err: any) {
        console.error('Confirmation failed', { error: err.message });
        addToast('error', err.message || 'Confirmation failed. Please try again or contact support.');
        setLoading(false);
        setTimeout(() => navigate('/auth'), 3000);
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
