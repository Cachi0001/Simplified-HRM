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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header with brand colors */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-400 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Welcome, {userName}!</h2>
                <p className="text-xs text-blue-50">Complete your profile</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Progress Circle */}
          <div className="flex justify-center mb-4">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  stroke="#E5E7EB"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  stroke="url(#gradient)"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - completionPercentage / 100)}`}
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
                  <div className="text-2xl font-bold text-gray-900">
                    {completionPercentage}%
                  </div>
                  <div className="text-xs text-gray-500">Complete</div>
                </div>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="text-center mb-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Your profile is {completionPercentage}% complete
            </h3>
            <p className="text-xs text-gray-600">
              Complete your profile to unlock all features.
            </p>
          </div>

          {/* Missing Fields Hint */}
          {completionPercentage < 100 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-gray-700">
                  <p className="font-medium text-gray-900 mb-1">Add missing info:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                    {completionPercentage < 100 && <li>Personal details</li>}
                    {completionPercentage < 80 && <li>Contact info</li>}
                    {completionPercentage < 60 && <li>Emergency contacts</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleUpdateProfile}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-400 text-white py-2 px-4 rounded-lg text-sm font-semibold hover:from-blue-600 hover:to-cyan-500 transition-all shadow-md hover:shadow-lg"
            >
              Update Profile
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Later
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-center text-gray-500 mt-3">
            This reminder will appear each time you log in until your profile is complete
          </p>
        </div>
      </div>
    </div>
  );
};
