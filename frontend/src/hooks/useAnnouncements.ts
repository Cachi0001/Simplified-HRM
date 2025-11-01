import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Announcement } from '../components/announcements/AnnouncementCard';
import { CreateAnnouncementData } from '../components/announcements/CreateAnnouncement';

interface UseAnnouncementsReturn {
  announcements: Announcement[];
  loading: boolean;
  error: string | null;
  currentUserReactions: { [announcementId: string]: string };
  loadAnnouncements: () => Promise<void>;
  createAnnouncement: (data: CreateAnnouncementData) => Promise<void>;
  updateAnnouncement: (id: string, data: Partial<CreateAnnouncementData>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  publishAnnouncement: (id: string) => Promise<void>;
  archiveAnnouncement: (id: string) => Promise<void>;
  addReaction: (announcementId: string, reactionType: string) => Promise<void>;
  removeReaction: (announcementId: string) => Promise<void>;
  loadReactions: (announcementId: string) => Promise<any>;
}

export function useAnnouncements(): UseAnnouncementsReturn {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserReactions, setCurrentUserReactions] = useState<{ [announcementId: string]: string }>({});

  // Load announcements
  const loadAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/announcements', {
        params: {
          limit: 100,
          offset: 0,
          status: 'published' // Only load published announcements by default
        }
      });

      if (response.data?.status === 'success') {
        const announcementsData = response.data.data || [];
        setAnnouncements(announcementsData);

        // Load reactions for each announcement
        await loadAllReactions(announcementsData);
      } else {
        throw new Error(response.data?.message || 'Failed to load announcements');
      }
    } catch (error) {
      console.error('Failed to load announcements:', error);
      setError(error instanceof Error ? error.message : 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load reactions for all announcements
  const loadAllReactions = async (announcementsData: Announcement[]) => {
    try {
      const reactionPromises = announcementsData.map(async (announcement) => {
        try {
          const response = await api.get(`/announcements/${announcement.id}/reactions`);
          if (response.data?.status === 'success') {
            return {
              announcementId: announcement.id,
              reactions: response.data.data
            };
          }
        } catch (error) {
          console.error(`Failed to load reactions for announcement ${announcement.id}:`, error);
        }
        return null;
      });

      const results = await Promise.all(reactionPromises);
      
      // Update announcements with reaction data
      setAnnouncements(prev => prev.map(announcement => {
        const reactionData = results.find(r => r?.announcementId === announcement.id);
        if (reactionData) {
          return {
            ...announcement,
            reactions: reactionData.reactions
          };
        }
        return announcement;
      }));

      // Update current user reactions
      const userReactions: { [announcementId: string]: string } = {};
      results.forEach(result => {
        if (result?.reactions?.reactions) {
          const currentUserId = getCurrentUserId();
          const userReaction = result.reactions.reactions.find((r: any) => 
            r.employees?.id === currentUserId
          );
          if (userReaction) {
            userReactions[result.announcementId] = userReaction.reaction_type;
          }
        }
      });
      setCurrentUserReactions(userReactions);

    } catch (error) {
      console.error('Failed to load reactions:', error);
    }
  };

  // Create announcement
  const createAnnouncement = useCallback(async (data: CreateAnnouncementData) => {
    try {
      setError(null);

      const response = await api.post('/announcements', data);

      if (response.data?.status === 'success') {
        // Reload announcements to get the new one
        await loadAnnouncements();
      } else {
        throw new Error(response.data?.message || 'Failed to create announcement');
      }
    } catch (error) {
      console.error('Failed to create announcement:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create announcement';
      setError(errorMessage);
      throw error;
    }
  }, [loadAnnouncements]);

  // Update announcement
  const updateAnnouncement = useCallback(async (id: string, data: Partial<CreateAnnouncementData>) => {
    try {
      setError(null);

      const response = await api.put(`/announcements/${id}`, data);

      if (response.data?.status === 'success') {
        // Update the announcement in the list
        setAnnouncements(prev => prev.map(announcement => 
          announcement.id === id 
            ? { ...announcement, ...data, updated_at: new Date().toISOString() }
            : announcement
        ));
      } else {
        throw new Error(response.data?.message || 'Failed to update announcement');
      }
    } catch (error) {
      console.error('Failed to update announcement:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update announcement';
      setError(errorMessage);
      throw error;
    }
  }, []);

  // Delete announcement
  const deleteAnnouncement = useCallback(async (id: string) => {
    try {
      setError(null);

      const response = await api.delete(`/announcements/${id}`);

      if (response.data?.status === 'success') {
        // Remove the announcement from the list
        setAnnouncements(prev => prev.filter(announcement => announcement.id !== id));
      } else {
        throw new Error(response.data?.message || 'Failed to delete announcement');
      }
    } catch (error) {
      console.error('Failed to delete announcement:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete announcement';
      setError(errorMessage);
      throw error;
    }
  }, []);

  // Publish announcement
  const publishAnnouncement = useCallback(async (id: string) => {
    try {
      setError(null);

      const response = await api.post(`/announcements/${id}/publish`);

      if (response.data?.status === 'success') {
        // Update the announcement status
        setAnnouncements(prev => prev.map(announcement => 
          announcement.id === id 
            ? { ...announcement, status: 'published' as const, updated_at: new Date().toISOString() }
            : announcement
        ));
      } else {
        throw new Error(response.data?.message || 'Failed to publish announcement');
      }
    } catch (error) {
      console.error('Failed to publish announcement:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to publish announcement';
      setError(errorMessage);
      throw error;
    }
  }, []);

  // Archive announcement
  const archiveAnnouncement = useCallback(async (id: string) => {
    try {
      setError(null);

      const response = await api.post(`/announcements/${id}/archive`);

      if (response.data?.status === 'success') {
        // Update the announcement status
        setAnnouncements(prev => prev.map(announcement => 
          announcement.id === id 
            ? { ...announcement, status: 'archived' as const, updated_at: new Date().toISOString() }
            : announcement
        ));
      } else {
        throw new Error(response.data?.message || 'Failed to archive announcement');
      }
    } catch (error) {
      console.error('Failed to archive announcement:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to archive announcement';
      setError(errorMessage);
      throw error;
    }
  }, []);

  // Add reaction
  const addReaction = useCallback(async (announcementId: string, reactionType: string) => {
    try {
      setError(null);

      const response = await api.post(`/announcements/${announcementId}/reactions`, {
        reactionType
      });

      if (response.data?.status === 'success') {
        // Update current user reactions
        setCurrentUserReactions(prev => ({
          ...prev,
          [announcementId]: reactionType
        }));

        // Reload reactions for this announcement
        await loadReactions(announcementId);
      } else {
        throw new Error(response.data?.message || 'Failed to add reaction');
      }
    } catch (error) {
      console.error('Failed to add reaction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add reaction';
      setError(errorMessage);
      throw error;
    }
  }, []);

  // Remove reaction
  const removeReaction = useCallback(async (announcementId: string) => {
    try {
      setError(null);

      const response = await api.delete(`/announcements/${announcementId}/reactions`);

      if (response.data?.status === 'success') {
        // Remove current user reaction
        setCurrentUserReactions(prev => {
          const newReactions = { ...prev };
          delete newReactions[announcementId];
          return newReactions;
        });

        // Reload reactions for this announcement
        await loadReactions(announcementId);
      } else {
        throw new Error(response.data?.message || 'Failed to remove reaction');
      }
    } catch (error) {
      console.error('Failed to remove reaction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove reaction';
      setError(errorMessage);
      throw error;
    }
  }, []);

  // Load reactions for a specific announcement
  const loadReactions = useCallback(async (announcementId: string) => {
    try {
      const response = await api.get(`/announcements/${announcementId}/reactions`);

      if (response.data?.status === 'success') {
        const reactionData = response.data.data;

        // Update the announcement with new reaction data
        setAnnouncements(prev => prev.map(announcement => 
          announcement.id === announcementId 
            ? { ...announcement, reactions: reactionData }
            : announcement
        ));

        return reactionData;
      }
    } catch (error) {
      console.error('Failed to load reactions:', error);
    }
    return null;
  }, []);

  // Helper function to get current user ID
  const getCurrentUserId = () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        return user.id;
      }

      // Try to extract from JWT token
      const token = localStorage.getItem('accessToken');
      if (token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const decoded = JSON.parse(jsonPayload);
        return decoded.id || decoded.userId || decoded.user_id || decoded.sub;
      }
    } catch (error) {
      console.error('Failed to get current user ID:', error);
    }
    return null;
  };

  // Load announcements on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      loadAnnouncements();
    }
  }, [loadAnnouncements]);

  return {
    announcements,
    loading,
    error,
    currentUserReactions,
    loadAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    publishAnnouncement,
    archiveAnnouncement,
    addReaction,
    removeReaction,
    loadReactions
  };
}