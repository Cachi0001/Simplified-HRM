import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  calculateProfileCompletion, 
  shouldShowProfileCompletionPopup,
  wasProfileCompletionDismissed,
  markProfileCompletionDismissed,
  clearProfileCompletionDismissal,
  ProfileCompletionStatus
} from '../utils/profileCompletion';
import api from '../lib/api';

interface UseProfileCompletionReturn {
  showPopup: boolean;
  completionStatus: ProfileCompletionStatus;
  dismissPopup: () => void;
  refreshProfileStatus: () => Promise<void>;
  isLoading: boolean;
}

export const useProfileCompletion = (): UseProfileCompletionReturn => {
  const { user, isAuthenticated } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [completionStatus, setCompletionStatus] = useState<ProfileCompletionStatus>({
    isComplete: true,
    missingFields: [],
    completionPercentage: 100
  });
  const [isLoading, setIsLoading] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState<any>(null);

  // Fetch employee profile data
  const fetchEmployeeProfile = async () => {
    if (!user?.id || !isAuthenticated) return;

    try {
      setIsLoading(true);
      const response = await api.get('/employees/my-profile');
      
      if (response.data.status === 'success') {
        const profile = response.data.data.employee;
        setEmployeeProfile(profile);
        return profile;
      }
    } catch (error) {
      console.error('Error fetching employee profile:', error);
      // If profile doesn't exist, treat as incomplete
      setEmployeeProfile(null);
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  // Calculate and update completion status
  const updateCompletionStatus = (profile: any) => {
    const status = calculateProfileCompletion(profile);
    setCompletionStatus(status);
    
    // Determine if popup should be shown
    const wasDismissed = user?.id ? wasProfileCompletionDismissed(user.id) : false;
    const shouldShow = shouldShowProfileCompletionPopup(profile, wasDismissed);
    setShowPopup(shouldShow);
  };

  // Refresh profile status
  const refreshProfileStatus = async () => {
    const profile = await fetchEmployeeProfile();
    updateCompletionStatus(profile);
  };

  // Dismiss popup
  const dismissPopup = () => {
    setShowPopup(false);
    if (user?.id) {
      markProfileCompletionDismissed(user.id);
    }
  };

  // Initial load and auth state changes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      refreshProfileStatus();
    } else {
      setShowPopup(false);
      setEmployeeProfile(null);
      setCompletionStatus({
        isComplete: true,
        missingFields: [],
        completionPercentage: 100
      });
    }
  }, [isAuthenticated, user?.id]);

  // Clear dismissal when profile becomes complete
  useEffect(() => {
    if (completionStatus.isComplete && user?.id) {
      clearProfileCompletionDismissal(user.id);
      setShowPopup(false);
    }
  }, [completionStatus.isComplete, user?.id]);

  return {
    showPopup,
    completionStatus,
    dismissPopup,
    refreshProfileStatus,
    isLoading
  };
};