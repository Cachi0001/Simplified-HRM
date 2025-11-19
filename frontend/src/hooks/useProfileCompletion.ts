import { useState, useEffect, useCallback, useRef } from 'react';
import { employeeService } from '../services/employeeService';

const DISMISSED_UNTIL_KEY = 'profile_completion_dismissed_until';

export function useProfileCompletion() {
  const [showModal, setShowModal] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const hasCheckedRef = useRef(false);

  const checkProfileCompletion = useCallback(async () => {
    if (hasCheckedRef.current) {
      return;
    }

    try {
      hasCheckedRef.current = true;
      setIsLoading(true);
      
      // Check if user dismissed it recently (within 1 hour)
      const dismissedUntil = localStorage.getItem(DISMISSED_UNTIL_KEY);
      if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) {
        setIsLoading(false);
        return;
      }

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

      // Show modal every time user visits dashboard if profile incomplete
      if (percentage < 100) {
        setShowModal(true);
      }
    } catch (error) {
      // Silent error handling
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkProfileCompletion();
  }, [checkProfileCompletion]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    // Dismiss for 1 hour
    const dismissUntil = Date.now() + (60 * 60 * 1000);
    localStorage.setItem(DISMISSED_UNTIL_KEY, dismissUntil.toString());
  }, []);

  return {
    showModal,
    completionPercentage,
    isLoading,
    closeModal: handleCloseModal,
    recheckProfile: checkProfileCompletion
  };
}
