import { useState, useEffect } from 'react';
import { employeeService } from '../services/employeeService';

const SESSION_STORAGE_KEY = 'profile_completion_dismissed';
const SESSION_STORAGE_TIMESTAMP = 'profile_completion_dismissed_time';

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
      console.log('[useProfileCompletion] Starting profile check...');
      
      // Check if user dismissed modal recently (within last 5 minutes)
      const dismissedTime = sessionStorage.getItem(SESSION_STORAGE_TIMESTAMP);
      if (dismissedTime) {
        const timeSinceDismissal = Date.now() - parseInt(dismissedTime);
        const fiveMinutes = 5 * 60 * 1000;
        
        if (timeSinceDismissal < fiveMinutes) {
          console.log('[useProfileCompletion] Modal was dismissed recently, not showing again');
          setIsLoading(false);
          return;
        } else {
          // Clear old dismissal
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          sessionStorage.removeItem(SESSION_STORAGE_TIMESTAMP);
        }
      }

      // Fetch profile with completion percentage
      const response = await employeeService.getMyProfile();
      console.log('[useProfileCompletion] Profile response:', response);
      
      // Calculate completion percentage based on ACTUAL database fields
      const profile = response as any;
      let completed = 0;
      let total = 8;  // Reduced from 9 to 8 (removed department_id requirement)

      // Check actual database fields (not profile_picture - that's out of MVP scope)
      if (profile.full_name) completed++;
      if (profile.email) completed++;
      if (profile.phone) completed++;
      if (profile.address) completed++;
      if (profile.date_of_birth) completed++;
      if (profile.position) completed++;  // This is NULL in your DB!
      // if (profile.department_id) completed++;  // COMMENTED OUT - Not required for superadmin/CEO roles
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
          // department_id: !!profile.department_id,  // COMMENTED OUT
          emergency_contact_name: !!profile.emergency_contact_name,
          emergency_contact_phone: !!profile.emergency_contact_phone
        }
      });
      setCompletionPercentage(percentage);

      // Show modal if profile is incomplete
      if (percentage < 100) {
        console.log('[useProfileCompletion] Profile incomplete, showing modal');
        setShowModal(true);
      } else {
        console.log('[useProfileCompletion] Profile complete, hiding modal');
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error checking profile completion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    // Store dismissal with timestamp - will show again after 5 minutes
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
    sessionStorage.setItem(SESSION_STORAGE_TIMESTAMP, Date.now().toString());
    console.log('[useProfileCompletion] Modal dismissed, will show again after 5 minutes or page refresh');
  };

  return {
    showModal,
    completionPercentage,
    isLoading,
    closeModal: handleCloseModal,
    recheckProfile: checkProfileCompletion
  };
}
