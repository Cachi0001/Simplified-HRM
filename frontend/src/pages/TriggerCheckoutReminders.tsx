import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../components/ui/Toast';

export const TriggerCheckoutReminders: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ count: number; message: string } | null>(null);
  const { addToast } = useToast();

  const triggerReminders = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await api.post('/notifications/checkout-reminders');
      setResult(response.data);
      addToast('success', response.data.message);
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error?.response?.data?.error || 'Failed to send reminders';
      addToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Checkout Reminders
            </h1>
          </div>

          <p className="text-gray-600 mb-6">
            Send checkout reminders to all employees who have clocked in but haven't clocked out today.
          </p>

          <button
            onClick={triggerReminders}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Sending...
              </>
            ) : (
              <>
                <Bell className="h-5 w-5" />
                Send Checkout Reminders Now
              </>
            )}
          </button>

          {result && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">
                ✅ {result.message}
              </p>
              <p className="text-green-600 text-sm mt-1">
                Sent to {result.count} employee{result.count !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">ℹ️ Information</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Reminders are sent to employees who clocked in but haven't clocked out</li>
              <li>• Both push notifications and emails are sent</li>
              <li>• Clicking the notification takes users to the check-in/out section</li>
              <li>• Automated reminders run Monday-Friday at 6:00 PM</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
