import React, { useState } from 'react';
import { X, User, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { ProfileCompletionStatus } from '../../utils/profileCompletion';

interface ProfileCompletionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteProfile: () => void;
  completionStatus: ProfileCompletionStatus;
  darkMode?: boolean;
}

const ProfileCompletionPopup: React.FC<ProfileCompletionPopupProps> = ({
  isOpen,
  onClose,
  onCompleteProfile,
  completionStatus,
  darkMode = false
}) => {
  const [isClosing, setIsClosing] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleCompleteProfile = () => {
    handleClose();
    onCompleteProfile();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
      isClosing ? 'animate-fadeOut' : 'animate-fadeIn'
    }`}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 transition-opacity duration-200 ${
          darkMode ? 'bg-gray-900/80' : 'bg-black/50'
        } ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-md transform transition-all duration-200 ${
        isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
      } ${
        darkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      } rounded-xl border shadow-2xl`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              darkMode ? 'bg-blue-900/30' : 'bg-blue-50'
            }`}>
              <User className={`h-5 w-5 ${
                darkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Complete Your Profile
              </h3>
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Help us serve you better
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 rounded-lg transition-colors ${
              darkMode 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300' 
                : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Profile Completion
              </span>
              <span className={`text-sm font-semibold ${
                completionStatus.completionPercentage >= 70 
                  ? (darkMode ? 'text-green-400' : 'text-green-600')
                  : completionStatus.completionPercentage >= 40
                  ? (darkMode ? 'text-yellow-400' : 'text-yellow-600')
                  : (darkMode ? 'text-red-400' : 'text-red-600')
              }`}>
                {completionStatus.completionPercentage}%
              </span>
            </div>
            <div className={`w-full h-2 rounded-full ${
              darkMode ? 'bg-gray-700' : 'bg-gray-200'
            }`}>
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  completionStatus.completionPercentage >= 70 
                    ? 'bg-green-500'
                    : completionStatus.completionPercentage >= 40
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${completionStatus.completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Missing Fields */}
          {completionStatus.missingFields.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className={`h-4 w-4 ${
                  darkMode ? 'text-yellow-400' : 'text-yellow-500'
                }`} />
                <span className={`text-sm font-medium ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Missing Information
                </span>
              </div>
              <div className="space-y-2">
                {completionStatus.missingFields.map((field, index) => (
                  <div 
                    key={index}
                    className={`flex items-center gap-2 text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      darkMode ? 'bg-gray-500' : 'bg-gray-400'
                    }`} />
                    {field}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          <div className="mb-6">
            <h4 className={`text-sm font-medium mb-3 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Why complete your profile?
            </h4>
            <div className="space-y-2">
              {[
                'Get personalized notifications',
                'Enable better task assignments',
                'Improve team collaboration',
                'Access all platform features'
              ].map((benefit, index) => (
                <div 
                  key={index}
                  className={`flex items-center gap-2 text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  <CheckCircle className={`h-3 w-3 ${
                    darkMode ? 'text-green-400' : 'text-green-500'
                  }`} />
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex gap-3 p-6 border-t ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={handleClose}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              darkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Maybe Later
          </button>
          <button
            onClick={handleCompleteProfile}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
              darkMode 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Complete Profile
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionPopup;