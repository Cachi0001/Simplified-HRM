import { useState, useEffect, useCallback } from 'react';
import { 
  Announcement, 
  AnnouncementTemplate, 
  CreateAnnouncementRequest, 
  AnnouncementFilters 
} from '../types/announcement';
import announcementService from '../services/announcementService';
import { useAuth } from '../contexts/AuthContext';

export const useAnnouncements = (initialFilters: AnnouncementFilters = {}) => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [templates, setTemplates] = useState<AnnouncementTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnnouncementFilters>(initialFilters);

  // Check if user can create announcements
  const canCreate = user?.role && ['admin', 'hr', 'superadmin'].includes(user.role);

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await announcementService.getAnnouncements(filters);
      setAnnouncements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    if (!canCreate) return;
    
    try {
      const data = await announcementService.getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  }, [canCreate]);

  // Create announcement
  const createAnnouncement = useCallback(async (data: CreateAnnouncementRequest, publish = false) => {
    try {
      setLoading(true);
      const announcement = await announcementService.createAnnouncement(data);
      
      if (publish) {
        await announcementService.publishAnnouncement(announcement.id);
      }
      
      // Refresh announcements list
      await fetchAnnouncements();
      return announcement;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create announcement';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchAnnouncements]);

  // Add reaction
  const addReaction = useCallback(async (announcementId: string, reactionType: string) => {
    try {
      await announcementService.addReaction(announcementId, reactionType);
      
      // Update local state optimistically
      setAnnouncements(prev => prev.map(announcement => {
        if (announcement.id === announcementId) {
          const currentCount = announcement.reaction_counts?.[reactionType as keyof typeof announcement.reaction_counts] || 0;
          return {
            ...announcement,
            reaction_counts: {
              ...announcement.reaction_counts,
              [reactionType]: currentCount + 1
            },
            user_reaction: reactionType
          };
        }
        return announcement;
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add reaction');
    }
  }, []);

  // Remove reaction
  const removeReaction = useCallback(async (announcementId: string, reactionType: string) => {
    try {
      await announcementService.removeReaction(announcementId, reactionType);
      
      // Update local state optimistically
      setAnnouncements(prev => prev.map(announcement => {
        if (announcement.id === announcementId) {
          const currentCount = announcement.reaction_counts?.[reactionType as keyof typeof announcement.reaction_counts] || 0;
          return {
            ...announcement,
            reaction_counts: {
              ...announcement.reaction_counts,
              [reactionType]: Math.max(0, currentCount - 1)
            },
            user_reaction: undefined
          };
        }
        return announcement;
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove reaction');
    }
  }, []);

  // Mark as read
  const markAsRead = useCallback(async (announcementId: string) => {
    try {
      await announcementService.markAsRead(announcementId);
      
      // Update local state
      setAnnouncements(prev => prev.map(announcement => {
        if (announcement.id === announcementId) {
          return {
            ...announcement,
            is_read: true,
            read_count: (announcement.read_count || 0) + 1
          };
        }
        return announcement;
      }));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, []);

  // Handle reaction (add or remove based on current state)
  const handleReaction = useCallback(async (announcementId: string, reactionType: string) => {
    const announcement = announcements.find(a => a.id === announcementId);
    if (!announcement) return;

    if (announcement.user_reaction === reactionType) {
      await removeReaction(announcementId, reactionType);
    } else {
      // Remove existing reaction if any
      if (announcement.user_reaction) {
        await removeReaction(announcementId, announcement.user_reaction);
      }
      await addReaction(announcementId, reactionType);
    }
  }, [announcements, addReaction, removeReaction]);

  // Update filters
  const updateFilters = useCallback((newFilters: AnnouncementFilters) => {
    setFilters(newFilters);
  }, []);

  // Refresh data
  const refresh = useCallback(() => {
    fetchAnnouncements();
    if (canCreate) {
      fetchTemplates();
    }
  }, [fetchAnnouncements, fetchTemplates, canCreate]);

  // Initial load
  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  useEffect(() => {
    if (canCreate) {
      fetchTemplates();
    }
  }, [fetchTemplates, canCreate]);

  return {
    announcements,
    templates,
    loading,
    error,
    canCreate,
    filters,
    createAnnouncement,
    handleReaction,
    markAsRead,
    updateFilters,
    refresh,
    setError
  };
};

export default useAnnouncements;