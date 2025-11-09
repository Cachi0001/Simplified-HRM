import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, CheckCircle } from 'lucide-react';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  completionPercentage: number;
  userName: string;
}

export const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
  isOpen,
  onClose,
  completionPercentage,
  userName
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUpdateProfile = () => {
    navigate('/settings');
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header with brand colors */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-400 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Welcome, {userName}!</h2>
                <p className="text-sm text-blue-50">Complete your profile</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Progress Circle */}
          <div className="flex justify-center mb-6">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#E5E7EB"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - completionPercentage / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {completionPercentage}%
                  </div>
                  <div className="text-xs text-gray-500">Complete</div>
                </div>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Your profile is {completionPercentage}% complete
            </h3>
            <p className="text-sm text-gray-600">
              Complete your profile to unlock all features and help your team know you better.
            </p>
          </div>

          {/* Missing Fields Hint */}
          {completionPercentage < 100 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium text-gray-900 mb-1">Add missing information:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    {completionPercentage < 100 && <li>Personal details</li>}
                    {completionPercentage < 80 && <li>Contact information</li>}
                    {completionPercentage < 60 && <li>Emergency contacts</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleUpdateProfile}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-400 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-500 transition-all shadow-md hover:shadow-lg"
            >
              Update Profile
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Later
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-center text-gray-500 mt-4">
            This reminder will appear each time you log in until your profile is complete
          </p>
        </div>
      </div>
    </div>
  );
};
