import { useState, useEffect } from 'react';
import { employeeService } from '../services/employeeService';

const SESSION_STORAGE_KEY = 'profile_completion_dismissed_session';

export function useProfileCompletion() {
  // DISABLED: Profile completion popup logic removed per user request
  // The modal will never show automatically, but the card component can still be used manually
  const [showModal] = useState(false); // Always false - never shows popup
  const [completionPercentage, setCompletionPercentage] = useState(100);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate completion percentage for display purposes only (no popup)
  const checkProfileCompletion = async () => {
    try {
      setIsLoading(true);
      console.log('[useProfileCompletion] Calculating profile completion (popup disabled)');
      
      const response = await employeeService.getMyProfile();
      const profile = response as any;
      let completed = 0;
      let total = 8;

      if (profile.full_name) completed++;
      if (profile.email) completed++;
      if (profile.phone) completed++;
      if (profile.address) completed++;
      if (profile.date_of_birth) completed++;
      if (profile.position) completed++;
      if (profile.emergency_contact_name) completed++;
      if (profile.emergency_contact_phone) completed++;

      const percentage = Math.round((completed / total) * 100);
      setCompletionPercentage(percentage);
      
      console.log('[useProfileCompletion] Profile completion:', percentage + '%', '(popup will NOT show)');
    } catch (error) {
      console.error('Error checking profile completion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    // No-op since modal never shows
    console.log('[useProfileCompletion] Close called but modal is disabled');
  };

  return {
    showModal, // Always false
    completionPercentage,
    isLoading,
    closeModal: handleCloseModal,
    recheckProfile: checkProfileCompletion
  };
}
