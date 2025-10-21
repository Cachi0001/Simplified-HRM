import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ConfirmEmail: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Handle the confirmation from URL hash
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
            setMessage('Confirmation failed. Please try again or contact support.');
          } else if (data.session) {
            setMessage('Email confirmed successfully! Please wait for admin approval.');
            // Redirect to login after 3 seconds
            setTimeout(() => {
              navigate('/auth');
            }, 3000);
          }
        } else {
          setMessage('Invalid confirmation link. Please check your email for the correct link.');
        }
      } catch (error) {
        setMessage('An error occurred during confirmation. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    handleEmailConfirmation();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Confirming Email...</h2>
            <p className="text-gray-600">Please wait while we confirm your email address.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mb-4">
            {message.includes('successfully') ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {message.includes('successfully') ? 'Email Confirmed!' : 'Confirmation Failed'}
          </h2>
          <p className="text-gray-600 mb-6">{message}</p>
          {!message.includes('successfully') && (
            <button
              onClick={() => navigate('/auth')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmEmail;
