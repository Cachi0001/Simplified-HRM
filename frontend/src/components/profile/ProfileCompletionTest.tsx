import React, { useState } from 'react';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import ProfileCompletionPopup from './ProfileCompletionPopup';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useTheme } from '../../contexts/ThemeContext';

const ProfileCompletionTest: React.FC = () => {
  const { darkMode } = useTheme();
  const {
    showPopup,
    completionStatus,
    dismissPopup,
    refreshProfileStatus,
    isLoading
  } = useProfileCompletion();

  const [forceShowPopup, setForceShowPopup] = useState(false);

  const handleCompleteProfile = () => {
    console.log('Navigate to profile completion...');
    setForceShowPopup(false);
  };

  const handleForceShow = () => {
    setForceShowPopup(true);
  };

  const handleForceClose = () => {
    setForceShowPopup(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card className={`p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Profile Completion Test
        </h2>
        
        <div className="space-y-4">
          <div>
            <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              Current Status
            </h3>
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <strong>Show Popup:</strong> {showPopup ? 'Yes' : 'No'}
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <strong>Completion:</strong> {completionStatus.completionPercentage}%
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <strong>Is Complete:</strong> {completionStatus.isComplete ? 'Yes' : 'No'}
              </p>
              {completionStatus.missingFields.length > 0 && (
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <strong>Missing Fields:</strong> {completionStatus.missingFields.join(', ')}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={refreshProfileStatus} disabled={isLoading}>
              Refresh Status
            </Button>
            <Button onClick={handleForceShow} variant="outline">
              Force Show Popup
            </Button>
            <Button onClick={dismissPopup} variant="outline">
              Dismiss Popup
            </Button>
          </div>
        </div>
      </Card>

      {/* Profile Completion Popup */}
      <ProfileCompletionPopup
        isOpen={showPopup || forceShowPopup}
        onClose={forceShowPopup ? handleForceClose : dismissPopup}
        onCompleteProfile={handleCompleteProfile}
        completionStatus={completionStatus}
        darkMode={darkMode}
      />
    </div>
  );
};

export default ProfileCompletionTest;