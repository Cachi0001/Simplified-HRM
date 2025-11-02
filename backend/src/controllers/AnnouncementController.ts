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
      const { title, content, priority = 'normal', status = 'published', target_audience = 'all', scheduled_for } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      // Check if user has permission to create announcements
      if (!['superadmin', 'admin', 'hr'].includes(userRole)) {
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

      // Validate status
      if (!['draft', 'published', 'archived'].includes(status)) {
        res.status(400).json({
          status: 'error',
          message: 'Status must be one of: draft, published, archived'
        });
        return;
      }

      // Validate target_audience
      if (!['all', 'employees', 'hr', 'managers', 'department'].includes(target_audience)) {
        res.status(400).json({
          status: 'error',
          message: 'Target audience must be one of: all, employees, hr, managers, department'
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

      // First, verify the user exists in employees table
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, full_name, email, user_id')
        .eq('user_id', userId)
        .single();

      if (employeeError || !employee) {
        logger.error('User not found in employees table', { userId, error: employeeError });
        res.status(400).json({
          status: 'error',
          message: 'User not found in employees table. Please contact administrator.'
        });
        return;
      }

      // Insert announcement
      const insertData: any = {
        title,
        content,
        author_id: employee.id, // Use employee ID, not user ID
        priority,
        status,
        target_audience
      };

      // Add scheduled_for if provided and status is draft
      if (scheduled_for && status === 'draft') {
        insertData.scheduled_for = scheduled_for;
      }

      const { data: announcement, error: insertError } = await supabase
        .from('announcements')
        .insert(insertData)
        .select('id, title, content, priority, status, target_audience, scheduled_for, created_at')
        .single();

      if (insertError) {
        throw insertError;
      }

      // Use the employee data we already fetched
      const author = employee;

      // Send notifications to all users only if status is published
      if (status === 'published') {
        try {
          await this.notifyAllUsers(announcement, author);
        } catch (notifyError) {
          logger.error('Failed to send notifications', { error: notifyError });
          // Don't fail the announcement creation if notifications fail
        }
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
      const status = req.query.status as string;
      const priority = req.query.priority as string;
      const target_audience = req.query.target_audience as string;

      logger.info('📢 [AnnouncementController] Getting announcements', {
        limit,
        offset,
        status,
        priority,
        target_audience
      });

      const supabase = supabaseConfig.getClient();

      let query = supabase
        .from('announcements')
        .select(`
          id, title, content, priority, status, target_audience, scheduled_for, created_at, updated_at,
          employees!announcements_author_id_fkey (
            full_name,
            email
          )
        `);

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }
      if (priority) {
        query = query.eq('priority', priority);
      }
      if (target_audience) {
        query = query.eq('target_audience', target_audience);
      }

      const { data: announcements, error } = await query
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
          id, title, content, priority, status, target_audience, scheduled_for, created_at, updated_at,
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
      const { title, content, priority, status, target_audience, scheduled_for } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      // Check if user has permission to update announcements
      if (!['superadmin', 'admin', 'hr'].includes(userRole)) {
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

      // Validate status if provided
      if (status && !['draft', 'published', 'archived'].includes(status)) {
        res.status(400).json({
          status: 'error',
          message: 'Status must be one of: draft, published, archived'
        });
        return;
      }

      // Validate target_audience if provided
      if (target_audience && !['all', 'employees', 'hr', 'managers', 'department'].includes(target_audience)) {
        res.status(400).json({
          status: 'error',
          message: 'Target audience must be one of: all, employees, hr, managers, department'
        });
        return;
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (priority !== undefined) updateData.priority = priority;
      if (status !== undefined) updateData.status = status;
      if (target_audience !== undefined) updateData.target_audience = target_audience;
      if (scheduled_for !== undefined) updateData.scheduled_for = scheduled_for;

      // Get current announcement to check status change
      const { data: currentAnnouncement, error: getCurrentError } = await supabase
        .from('announcements')
        .select('status, author_id')
        .eq('id', id)
        .single();

      if (getCurrentError || !currentAnnouncement) {
        res.status(404).json({
          status: 'error',
          message: 'Announcement not found'
        });
        return;
      }

      const { data: announcement, error } = await supabase
        .from('announcements')
        .update(updateData)
        .eq('id', id)
        .select('id, title, content, priority, status, target_audience, scheduled_for, created_at, updated_at')
        .single();

      if (error || !announcement) {
        res.status(404).json({
          status: 'error',
          message: 'Announcement not found'
        });
        return;
      }

      // If status changed from draft to published, send notifications
      if (currentAnnouncement.status === 'draft' && status === 'published') {
        try {
          // Get author info for notifications
          const { data: author } = await supabase
            .from('employees')
            .select('id, full_name, email')
            .eq('id', currentAnnouncement.author_id)
            .single();

          if (author) {
            await this.notifyAllUsers(announcement, author);
          }
        } catch (notifyError) {
          logger.error('Failed to send notifications on status change', { error: notifyError });
          // Don't fail the update if notifications fail
        }
      }

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
      if (!['superadmin', 'admin'].includes(userRole)) {
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
   * Get announcements by status
   * GET /api/announcements/status/:status
   */
  async getAnnouncementsByStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      if (!['draft', 'published', 'archived'].includes(status)) {
        res.status(400).json({
          status: 'error',
          message: 'Status must be one of: draft, published, archived'
        });
        return;
      }

      logger.info('📢 [AnnouncementController] Getting announcements by status', {
        status,
        limit,
        offset
      });

      const supabase = supabaseConfig.getClient();

      const { data: announcements, error } = await supabase
        .from('announcements')
        .select(`
          id, title, content, priority, status, target_audience, scheduled_for, created_at, updated_at,
          employees!announcements_author_id_fkey (
            full_name,
            email
          )
        `)
        .eq('status', status)
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
      logger.error('❌ [AnnouncementController] Get announcements by status error', {
        error: (error as Error).message,
        status: req.params.status
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to get announcements by status'
      });
    }
  }

  /**
   * Publish a draft announcement
   * POST /api/announcements/:id/publish
   */
  async publishAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;

      // Check if user has permission to publish announcements
      if (!['superadmin', 'admin', 'hr'].includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have permission to publish announcements'
        });
        return;
      }

      logger.info('📢 [AnnouncementController] Publishing announcement', {
        id,
        userRole
      });

      const supabase = supabaseConfig.getClient();

      // Get current announcement
      const { data: currentAnnouncement, error: getCurrentError } = await supabase
        .from('announcements')
        .select('status, author_id, title, content')
        .eq('id', id)
        .single();

      if (getCurrentError || !currentAnnouncement) {
        res.status(404).json({
          status: 'error',
          message: 'Announcement not found'
        });
        return;
      }

      if (currentAnnouncement.status !== 'draft') {
        res.status(400).json({
          status: 'error',
          message: 'Only draft announcements can be published'
        });
        return;
      }

      // Update status to published
      const { data: announcement, error } = await supabase
        .from('announcements')
        .update({ status: 'published' })
        .eq('id', id)
        .select('id, title, content, priority, status, target_audience, created_at, updated_at')
        .single();

      if (error || !announcement) {
        res.status(500).json({
          status: 'error',
          message: 'Failed to publish announcement'
        });
        return;
      }

      // Send notifications to all users
      try {
        const { data: author } = await supabase
          .from('employees')
          .select('id, full_name, email')
          .eq('id', currentAnnouncement.author_id)
          .single();

        if (author) {
          await this.notifyAllUsers(announcement, author);
        }
      } catch (notifyError) {
        logger.error('Failed to send notifications on publish', { error: notifyError });
        // Don't fail the publish if notifications fail
      }

      res.status(200).json({
        status: 'success',
        message: 'Announcement published successfully',
        data: announcement
      });
    } catch (error) {
      logger.error('❌ [AnnouncementController] Publish announcement error', {
        error: (error as Error).message,
        id: req.params.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to publish announcement'
      });
    }
  }

  /**
   * Archive an announcement
   * POST /api/announcements/:id/archive
   */
  async archiveAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = req.user?.role;

      // Check if user has permission to archive announcements
      if (!['superadmin', 'admin', 'hr'].includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have permission to archive announcements'
        });
        return;
      }

      logger.info('📢 [AnnouncementController] Archiving announcement', {
        id,
        userRole
      });

      const supabase = supabaseConfig.getClient();

      const { data: announcement, error } = await supabase
        .from('announcements')
        .update({ status: 'archived' })
        .eq('id', id)
        .select('id, title, status')
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
        message: 'Announcement archived successfully',
        data: announcement
      });
    } catch (error) {
      logger.error('❌ [AnnouncementController] Archive announcement error', {
        error: (error as Error).message,
        id: req.params.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to archive announcement'
      });
    }
  }

  /**
   * Add or update reaction to announcement
   * POST /api/announcements/:id/reactions
   */
  async addReaction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reactionType } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      if (!reactionType || !['like', 'love', 'laugh', 'wow', 'sad', 'angry'].includes(reactionType)) {
        res.status(400).json({
          status: 'error',
          message: 'Valid reaction type is required (like, love, laugh, wow, sad, angry)'
        });
        return;
      }

      logger.info('👍 [AnnouncementController] Adding reaction', {
        announcementId: id,
        userId,
        reactionType
      });

      const supabase = supabaseConfig.getClient();

      // Check if announcement exists
      const { data: announcement, error: announcementError } = await supabase
        .from('announcements')
        .select('id, title, author_id')
        .eq('id', id)
        .single();

      if (announcementError || !announcement) {
        res.status(404).json({
          status: 'error',
          message: 'Announcement not found'
        });
        return;
      }

      // Upsert reaction (replace existing reaction or create new one)
      const { data: reaction, error: reactionError } = await supabase
        .from('announcement_reactions')
        .upsert({
          announcement_id: id,
          user_id: userId,
          reaction_type: reactionType
        }, {
          onConflict: 'announcement_id,user_id'
        })
        .select()
        .single();

      if (reactionError) {
        throw reactionError;
      }

      // Send notification to announcement author (if not reacting to own announcement)
      if (announcement.author_id !== userId) {
        try {
          await this.notifyAuthorOfReaction(announcement, userId, reactionType);
        } catch (notifyError) {
          logger.error('Failed to notify author of reaction', { error: notifyError });
          // Don't fail the reaction if notification fails
        }
      }

      res.status(200).json({
        status: 'success',
        message: 'Reaction added successfully',
        data: { reaction }
      });
    } catch (error) {
      logger.error('❌ [AnnouncementController] Add reaction error', {
        error: (error as Error).message,
        announcementId: req.params.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to add reaction'
      });
    }
  }

  /**
   * Remove reaction from announcement
   * DELETE /api/announcements/:id/reactions
   */
  async removeReaction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      logger.info('👎 [AnnouncementController] Removing reaction', {
        announcementId: id,
        userId
      });

      const supabase = supabaseConfig.getClient();

      const { data: reaction, error } = await supabase
        .from('announcement_reactions')
        .delete()
        .eq('announcement_id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error || !reaction) {
        res.status(404).json({
          status: 'error',
          message: 'Reaction not found'
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        message: 'Reaction removed successfully'
      });
    } catch (error) {
      logger.error('❌ [AnnouncementController] Remove reaction error', {
        error: (error as Error).message,
        announcementId: req.params.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to remove reaction'
      });
    }
  }

  /**
   * Get reactions for announcement
   * GET /api/announcements/:id/reactions
   */
  async getReactions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      logger.info('📊 [AnnouncementController] Getting reactions', {
        announcementId: id
      });

      const supabase = supabaseConfig.getClient();

      const { data: reactions, error } = await supabase
        .from('announcement_reactions')
        .select(`
          id,
          reaction_type,
          created_at,
          employees!announcement_reactions_user_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('announcement_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Group reactions by type and count them
      const reactionCounts: { [key: string]: number } = {};
      const reactionUsers: { [key: string]: any[] } = {};

      reactions?.forEach((reaction: any) => {
        const type = reaction.reaction_type;
        reactionCounts[type] = (reactionCounts[type] || 0) + 1;
        
        if (!reactionUsers[type]) {
          reactionUsers[type] = [];
        }
        
        reactionUsers[type].push({
          id: reaction.employees?.id,
          name: reaction.employees?.full_name,
          email: reaction.employees?.email
        });
      });

      res.status(200).json({
        status: 'success',
        data: {
          reactions: reactions || [],
          counts: reactionCounts,
          users: reactionUsers,
          totalReactions: reactions?.length || 0
        }
      });
    } catch (error) {
      logger.error('❌ [AnnouncementController] Get reactions error', {
        error: (error as Error).message,
        announcementId: req.params.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to get reactions'
      });
    }
  }

  /**
   * Notify announcement author of reaction
   */
  private async notifyAuthorOfReaction(announcement: any, reactorId: string, reactionType: string): Promise<void> {
    try {
      const supabase = supabaseConfig.getClient();

      // Get reactor info
      const { data: reactor, error: reactorError } = await supabase
        .from('employees')
        .select('full_name, email')
        .eq('id', reactorId)
        .single();

      if (reactorError || !reactor) {
        throw new Error('Reactor not found');
      }

      // Create notification for author
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: announcement.author_id,
          title: `${reactor.full_name} reacted to your announcement`,
          message: `${reactor.full_name} reacted with ${reactionType} to your announcement "${announcement.title}"`,
          type: 'reaction',
          data: {
            announcementId: announcement.id,
            reactionType,
            reactorId,
            reactorName: reactor.full_name
          }
        });

      if (notificationError) {
        throw notificationError;
      }

      logger.info('📢 [AnnouncementController] Author notified of reaction', {
        announcementId: announcement.id,
        authorId: announcement.author_id,
        reactorId,
        reactionType
      });
    } catch (error) {
      logger.error('❌ [AnnouncementController] Failed to notify author of reaction', {
        error: (error as Error).message,
        announcementId: announcement.id
      });
      throw error;
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
