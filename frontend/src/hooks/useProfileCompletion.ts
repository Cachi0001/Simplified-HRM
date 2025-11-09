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
      
      // Calculate completion percentage based on ACTUAL database fields
      const profile = response as any;
      let completed = 0;
      let total = 9;

      // Check actual database fields (not profile_picture - that's out of MVP scope)
      if (profile.full_name) completed++;
      if (profile.email) completed++;
      if (profile.phone) completed++;
      if (profile.address) completed++;
      if (profile.date_of_birth) completed++;
      if (profile.position) completed++;  // This is NULL in your DB!
      if (profile.department_id) completed++;  // UUID field, not department string!
      if (profile.emergency_contact_name) completed++;
      if (profile.emergency_contact_phone) completed++;

      const percentage = Math.round((completed / total) * 100);
      console.log('[ProfileCompletion] Check:', { 
        completed, 
        total, 
        percentage,
        fields: {
          full_name: !!profile.full_name,
          email: !!profile.email,
          phone: !!profile.phone,
          address: !!profile.address,
          date_of_birth: !!profile.date_of_birth,
          position: !!profile.position,
          department_id: !!profile.department_id,
          emergency_contact_name: !!profile.emergency_contact_name,
          emergency_contact_phone: !!profile.emergency_contact_phone
        }
      });
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
