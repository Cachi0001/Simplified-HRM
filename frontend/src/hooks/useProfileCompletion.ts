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
      
      // Always check profile completion on every login/token update
      // No session-based dismissal - modal shows until profile is 100% complete

      // Fetch profile with completion percentage
      const response = await employeeService.getMyProfile();
      
      // Calculate completion percentage
      const profile = response as any;
      let completed = 0;
      let total = 9; // Increased to 9 fields

      // Required fields for profile completion
      if (profile.full_name || profile.fullName) completed++;
      if (profile.email) completed++;
      if (profile.phone) completed++;
      if (profile.address) completed++;
      if (profile.date_of_birth || profile.dateOfBirth) completed++;
      if (profile.position) completed++;
      if (profile.department) completed++; // Added department
      if (profile.emergency_contact_name || profile.emergencyContactName) completed++;
      if (profile.emergency_contact_phone || profile.emergencyContactPhone) completed++;

      const percentage = Math.round((completed / total) * 100);
      console.log('Profile completion check:', { completed, total, percentage, profile });
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
    // Don't store dismissal - modal will show again on next login if incomplete
  };

  return {
    showModal,
    completionPercentage,
    isLoading,
    closeModal: handleCloseModal,
    recheckProfile: checkProfileCompletion
  };
}
