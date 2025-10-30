import { Request, Response } from 'express';
import supabaseConfig from '../config/supabase';
import logger from '../utils/logger';

export class AnnouncementController {
  /**
   * Create a new announcement
   * POST /api/announcements
   */
  async createAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { title, content, priority = 'normal' } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      // Check if user has permission to create announcements
      if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have permission to create announcements'
        });
        return;
      }

      if (!title || !content) {
        res.status(400).json({
          status: 'error',
          message: 'Title and content are required'
        });
        return;
      }

      logger.info('📢 [AnnouncementController] Creating announcement', {
        title,
        userId,
        userRole,
        contentLength: content.length
      });

      const supabase = supabaseConfig.getClient();

      // Insert announcement
      const { data: announcement, error: insertError } = await supabase
        .from('announcements')
        .insert({
          title,
          content,
          author_id: userId,
          priority
        })
        .select('id, title, content, priority, created_at')
        .single();

      if (insertError) {
        throw insertError;
      }

      // Get author details
      const { data: author, error: authorError } = await supabase
        .from('employees')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      if (authorError) {
        logger.warn('Could not fetch author details', { error: authorError });
      }

      // Send notifications to all users (this would typically be done via a job queue)
      try {
        await this.notifyAllUsers(announcement, author);
      } catch (notifyError) {
        logger.error('Failed to send notifications', { error: notifyError });
        // Don't fail the announcement creation if notifications fail
      }

      res.status(201).json({
        status: 'success',
        message: 'Announcement created successfully',
        data: {
          announcement: {
            ...announcement,
            author_name: author?.full_name || 'Unknown',
            author_email: author?.email
          }
        }
      });
    } catch (error) {
      logger.error('❌ [AnnouncementController] Create announcement error', {
        error: (error as Error).message,
        body: req.body
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to create announcement'
      });
    }
  }

  /**
   * Get all announcements
   * GET /api/announcements
   */
  async getAnnouncements(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      logger.info('📢 [AnnouncementController] Getting announcements', {
        limit,
        offset
      });

      const supabase = supabaseConfig.getClient();

      const { data: announcements, error } = await supabase
        .from('announcements')
        .select(`
          id, title, content, priority, created_at, updated_at,
          employees!announcements_author_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      // Transform the data to match expected format
      const formattedData = announcements?.map((announcement: any) => ({
        ...announcement,
        author_name: announcement.employees?.full_name || 'Unknown',
        author_email: announcement.employees?.email || '',
        employees: undefined // Remove the nested object
      })) || [];

      res.status(200).json({
        status: 'success',
        data: formattedData,
        count: formattedData.length,
        limit,
        offset
      });
    } catch (error) {
      logger.error('❌ [AnnouncementController] Get announcements error', {
        error: (error as Error).message
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to get announcements'
      });
    }
  }

  /**
   * Get a specific announcement
   * GET /api/announcements/:id
   */
  async getAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      logger.info('📢 [AnnouncementController] Getting announcement', { id });

      const supabase = supabaseConfig.getClient();

      const { data: announcement, error } = await supabase
        .from('announcements')
        .select(`
          id, title, content, priority, created_at, updated_at,
          employees!announcements_author_id_fkey (
            full_name,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (error || !announcement) {
        res.status(404).json({
          status: 'error',
          message: 'Announcement not found'
        });
        return;
      }

      // Transform the data to match expected format
      const formattedData = {
        ...announcement,
        author_name: (announcement as any).employees?.full_name || 'Unknown',
        author_email: (announcement as any).employees?.email || '',
        employees: undefined // Remove the nested object
      };

      res.status(200).json({
        status: 'success',
        data: formattedData
      });
    } catch (error) {
      logger.error('❌ [AnnouncementController] Get announcement error', {
        error: (error as Error).message,
        id: req.params.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to get announcement'
      });
    }
  }

  /**
   * Update an announcement
   * PUT /api/announcements/:id
   */
  async updateAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, content, priority } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      // Check if user has permission to update announcements
      if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have permission to update announcements'
        });
        return;
      }

      logger.info('📢 [AnnouncementController] Updating announcement', {
        id,
        userId,
        userRole
      });

      const supabase = supabaseConfig.getClient();

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (priority !== undefined) updateData.priority = priority;

      const { data: announcement, error } = await supabase
        .from('announcements')
        .update(updateData)
        .eq('id', id)
        .select('id, title, content, priority, created_at, updated_at')
        .single();

      if (error || !announcement) {
        res.status(404).json({
          status: 'error',
          message: 'Announcement not found'
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        message: 'Announcement updated successfully',
        data: announcement
      });
    } catch (error) {
      logger.error('❌ [AnnouncementController] Update announcement error', {
        error: (error as Error).message,
        id: req.params.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to update announcement'
      });
    }
  }

  /**
   * Delete an announcement
   * DELETE /api/announcements/:id
   */
  async deleteAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;

      // Check if user has permission to delete announcements
      if (!['super-admin', 'admin'].includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have permission to delete announcements'
        });
        return;
      }

      logger.info('📢 [AnnouncementController] Deleting announcement', {
        id,
        userRole
      });

      const supabase = supabaseConfig.getClient();

      const { data: announcement, error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)
        .select('id')
        .single();

      if (error || !announcement) {
        res.status(404).json({
          status: 'error',
          message: 'Announcement not found'
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        message: 'Announcement deleted successfully'
      });
    } catch (error) {
      logger.error('❌ [AnnouncementController] Delete announcement error', {
        error: (error as Error).message,
        id: req.params.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete announcement'
      });
    }
  }

  /**
   * Notify all users about a new announcement
   * This would typically be done via a job queue in production
   */
  private async notifyAllUsers(announcement: any, author: any): Promise<void> {
    try {
      const supabase = supabaseConfig.getClient();

      // Get all active users
      const { data: users, error: usersError } = await supabase
        .from('employees')
        .select('id, email, full_name')
        .eq('active', true);

      if (usersError) {
        throw usersError;
      }

      if (!users || users.length === 0) {
        logger.warn('No active users found for notification');
        return;
      }
      
      // Insert notifications for all users
      const notifications = users.map((user: any) => ({
        user_id: user.id,
        title: `📢 New Announcement: ${announcement.title}`,
        message: `${announcement.content.substring(0, 200)}${announcement.content.length > 200 ? '...' : ''}\n\n- ${author?.full_name || 'Admin'}`,
        type: 'announcement'
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        throw notificationError;
      }

      logger.info('📢 [AnnouncementController] Notifications sent to all users', {
        announcementId: announcement.id,
        userCount: users.length
      });

      // TODO: Send email notifications here
      // TODO: Send push notifications here

    } catch (error) {
      logger.error('❌ [AnnouncementController] Failed to notify users', {
        error: (error as Error).message,
        announcementId: announcement.id
      });
      throw error;
    }
  }
}
