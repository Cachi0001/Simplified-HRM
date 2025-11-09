import { useState, useEffect } from 'react';
import { employeeService } from '../services/employeeService';

export function useProfileCompletion() {
  const [showModal, setShowModal] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(100);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkProfileCompletion();
  }, []);

  const checkProfileCompletion = async () => {
    try {
      setIsLoading(true);
      
      // Check if user has dismissed the modal in this session
      const dismissed = sessionStorage.getItem('profileModalDismissed');
      if (dismissed === 'true') {
        setIsLoading(false);
        return;
      }

      // Fetch profile with completion percentage
      const response = await employeeService.getMyProfile();
      
      // Calculate completion percentage
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

      // Show modal if profile is incomplete
      if (percentage < 100) {
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error checking profile completion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    // Mark as dismissed for this session only
    sessionStorage.setItem('profileModalDismissed', 'true');
  };

  return {
    showModal,
    completionPercentage,
    isLoading,
    closeModal: handleCloseModal,
    recheckProfile: checkProfileCompletion
  };
}
