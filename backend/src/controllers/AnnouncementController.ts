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

      // Check if user has permission to create announcements - support both superadmin formats
      const authorizedRoles = ['superadmin', 'super-admin', 'admin', 'hr'];
      if (!authorizedRoles.includes(userRole)) {
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
        .select('id, title, content, priority, status, target_audience, scheduled_for, created_at, author_id')
        .single();

      if (insertError) {
        throw insertError;
      }

      // Use the employee data we already fetched
      const author = employee;

      // Send notifications to all users only if status is published
      if (status === 'published') {
        try {
          const { error: notificationError } = await supabase
            .rpc('create_announcement_notifications', {
              p_announcement_id: announcement.id,
              p_author_id: announcement.author_id,
              p_title: announcement.title,
              p_content: announcement.content
            });
          
          if (notificationError) {
            logger.warn('Failed to send announcement notifications', { error: notificationError.message });
          } else {
            logger.info('Announcement notifications sent successfully', { announcementId: announcement.id });
          }
        } catch (notifyError) {
          logger.warn('Error sending announcement notifications', { error: (notifyError as Error).message });
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
      const userRole = req.user?.role;

      logger.info('📢 [AnnouncementController] Getting announcements', {
        limit,
        offset,
        status,
        priority,
        target_audience,
        userRole
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

      // Role-based filtering: regular users only see published, admins see all
      const canViewAll = ['super-admin', 'superadmin', 'admin', 'hr'].includes(userRole);
      
      if (status) {
        query = query.eq('status', status);
      } else if (!canViewAll) {
        // Regular users can only see published announcements
        query = query.eq('status', 'published');
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
      const { reaction_type } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }

      // Support both emoji and text reaction types
      const validReactions = ['like', 'love', 'laugh', 'wow', 'sad', 'angry', '👍', '❤️', '😂', '😮', '😢', '😡'];
      if (!reaction_type || !validReactions.includes(reaction_type)) {
        res.status(400).json({
          status: 'error',
          message: 'Valid reaction type is required',
          validTypes: validReactions
        });
        return;
      }

      logger.info('👍 [AnnouncementController] Adding reaction', {
        announcementId: id,
        userId,
        reactionType: reaction_type
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

      // Get user's employee record for proper foreign key relationship
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, user_id')
        .eq('user_id', userId)
        .single();

      if (employeeError || !employee) {
        res.status(400).json({
          status: 'error',
          message: 'Employee record not found'
        });
        return;
      }

      // Use toggle function for proper single reaction per user behavior
      const { data: toggleResult, error: reactionError } = await supabase
        .rpc('toggle_announcement_reaction', {
          p_user_id: userId,
          p_announcement_id: id,
          p_reaction_type: reaction_type
        });

      if (reactionError) {
        logger.error('Reaction toggle error', { error: reactionError });
        throw reactionError;
      }

      if (!toggleResult) {
        throw new Error('No data returned from reaction toggle');
      }

      // Parse the JSON result
      const reactionResult = typeof toggleResult === 'string' ? JSON.parse(toggleResult) : toggleResult;

      // Get detailed reaction information
      const { data: detailedReactions, error: detailsError } = await supabase
        .rpc('get_announcement_reactions_detailed', {
          p_announcement_id: id,
          p_requesting_user_id: userId
        });

      if (detailsError) {
        logger.error('Failed to get detailed reactions', { error: detailsError });
      }

      // Parse detailed reactions
      const reactionData = detailedReactions ? 
        (typeof detailedReactions === 'string' ? JSON.parse(detailedReactions) : detailedReactions) :
        { summary: {}, total_reactions: 0, reactions_by_type: {}, user_reaction: { has_reaction: false } };

      // Send notification to announcement author (only when reaction is added, not removed or updated)
      try {
        if (announcement.author_id !== employee.id && reactionResult.action === 'added') {
          const { data: author, error: authorError } = await supabase
            .from('employees')
            .select('id, full_name, email, user_id')
            .eq('id', announcement.author_id)
            .single();

          const { data: reactor, error: reactorError } = await supabase
            .from('employees')
            .select('id, full_name, email')
            .eq('id', employee.id)
            .single();

          if (!authorError && author && !reactorError && reactor) {
            // Create notification for the author
            const reactionEmoji = reaction_type === 'like' ? '👍' : 
                                 reaction_type === 'love' ? '❤️' : 
                                 reaction_type === 'laugh' ? '😂' : 
                                 reaction_type === 'wow' ? '😮' : 
                                 reaction_type === 'sad' ? '😢' : 
                                 reaction_type === 'angry' ? '😡' : reaction_type;

            await supabase
              .from('notifications')
              .insert({
                user_id: author.id,
                title: `${reactionEmoji} Reaction to your announcement`,
                message: `${reactor.full_name} reacted to your announcement "${announcement.title}"`,
                type: 'reaction',
                data: {
                  announcementId: announcement.id,
                  reactionType: reaction_type,
                  reactorId: reactor.id,
                  reactorName: reactor.full_name
                },
                related_id: announcement.id
              });

            logger.info('📢 [AnnouncementController] Reaction notification sent', {
              authorId: author.id,
              reactorId: reactor.id,
              announcementId: announcement.id,
              reactionType: reaction_type
            });

            // Send email notification for reaction
            try {
              const { EmailService } = await import('../services/EmailService');
              const emailService = new EmailService(supabase as any);
              
              await emailService.sendReactionNotification(
                author.email,
                author.full_name,
                reactor.full_name,
                announcement.title,
                reaction_type
              );
              
              logger.info('📧 [AnnouncementController] Reaction email notification sent', {
                authorEmail: author.email,
                reactorName: reactor.full_name,
                reactionType: reaction_type
              });
            } catch (emailError) {
              logger.error('❌ [AnnouncementController] Failed to send reaction email', {
                error: emailError,
                authorId: author.id,
                reactorId: reactor.id
              });
              // Don't fail the reaction if email fails
            }
          }
        }
      } catch (notificationError) {
        logger.error('Failed to send reaction notification', { error: notificationError });
        // Don't fail the reaction if notification fails
      }

      // Create appropriate response message based on action
      const actionMessages = {
        'added': 'Reaction added successfully',
        'updated': 'Reaction updated successfully', 
        'removed': 'Reaction removed successfully'
      };

      res.status(200).json({
        status: 'success',
        message: actionMessages[reactionResult.action as keyof typeof actionMessages] || 'Reaction processed successfully',
        data: {
          action: reactionResult.action,
          reaction_type: reactionResult.reaction_type,
          reactions: reactionData
        }
      });
    } catch (error) {
      logger.error('❌ [AnnouncementController] Add reaction error', {
        error: (error as Error).message,
        announcementId: req.params.id,
        stack: (error as Error).stack
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to add reaction',
        details: (error as Error).message
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
   * Get reactions for announcement (WhatsApp-like format)
   * GET /api/announcements/:id/reactions
   */
  async getReactions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      logger.info('📊 [AnnouncementController] Getting reactions', {
        announcementId: id
      });

      const supabase = supabaseConfig.getClient();

      // Get reaction summary for counts
      const { data: reactionSummary, error: summaryError } = await supabase
        .from('announcement_reaction_summary')
        .select('reaction_type, count')
        .eq('announcement_id', id);

      if (summaryError) {
        throw summaryError;
      }

      // Get detailed reactions with user info
      const { data: reactions, error: reactionsError } = await supabase
        .from('announcement_reactions')
        .select(`
          id,
          reaction_type,
          created_at,
          users!announcement_reactions_user_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('announcement_id', id)
        .order('created_at', { ascending: false });

      if (reactionsError) {
        throw reactionsError;
      }

      // Format data like WhatsApp
      const reactionData = {
        summary: {} as { [key: string]: number },
        users: {} as { [key: string]: any[] },
        totalReactions: 0,
        recentReactions: [] as any[]
      };

      // Build summary from reaction_summary table
      if (reactionSummary) {
        reactionSummary.forEach((item: any) => {
          reactionData.summary[item.reaction_type] = item.count;
          reactionData.totalReactions += item.count;
        });
      }

      // Group users by reaction type
      if (reactions) {
        const groupedUsers: { [key: string]: any[] } = {};
        
        reactions.forEach((reaction: any) => {
          const type = reaction.reaction_type;
          
          if (!groupedUsers[type]) {
            groupedUsers[type] = [];
          }
          
          groupedUsers[type].push({
            id: reaction.users?.id,
            name: reaction.users?.full_name,
            email: reaction.users?.email,
            reacted_at: reaction.created_at
          });
        });
        
        reactionData.users = groupedUsers;
        
        // Get recent reactions for activity feed
        reactionData.recentReactions = reactions.slice(0, 10).map((reaction: any) => ({
          id: reaction.id,
          type: reaction.reaction_type,
          user: {
            id: reaction.users?.id,
            name: reaction.users?.full_name,
            email: reaction.users?.email
          },
          created_at: reaction.created_at
        }));
      }

      // Create WhatsApp-like reaction strings
      const reactionStrings: { [key: string]: string } = {};
      Object.keys(reactionData.users).forEach(reactionType => {
        const users = reactionData.users[reactionType];
        const count = reactionData.summary[reactionType] || 0;
        
        if (count === 1) {
          reactionStrings[reactionType] = `${users[0].name} reacted with ${reactionType}`;
        } else if (count === 2) {
          reactionStrings[reactionType] = `${users[0].name} and ${users[1].name} reacted with ${reactionType}`;
        } else if (count > 2) {
          reactionStrings[reactionType] = `${users[0].name}, ${users[1].name} and ${count - 2} others reacted with ${reactionType}`;
        }
      });

      res.status(200).json({
        status: 'success',
        data: {
          ...reactionData,
          reactionStrings,
          // Legacy format for backward compatibility
          reactions: reactions || [],
          counts: reactionData.summary
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
  private async notifyAuthorOfReaction(announcement: any, reactorUserId: string, reactionType: string): Promise<void> {
    try {
      const supabase = supabaseConfig.getClient();

      // Get reactor info using user_id
      const { data: reactor, error: reactorError } = await supabase
        .from('employees')
        .select('id, full_name, email, user_id')
        .eq('user_id', reactorUserId)
        .single();

      if (reactorError || !reactor) {
        throw new Error('Reactor employee record not found');
      }

      // Don't notify if user is reacting to their own announcement
      if (announcement.author_id === reactor.id) {
        return;
      }

      // Create WhatsApp-like notification message
      let notificationMessage = '';
      switch (reactionType) {
        case 'like':
        case '👍':
          notificationMessage = `${reactor.full_name} liked your announcement "${announcement.title}"`;
          break;
        case 'love':
        case '❤️':
          notificationMessage = `${reactor.full_name} loved your announcement "${announcement.title}"`;
          break;
        case 'laugh':
        case '😂':
          notificationMessage = `${reactor.full_name} found your announcement "${announcement.title}" funny`;
          break;
        case 'wow':
        case '😮':
          notificationMessage = `${reactor.full_name} was amazed by your announcement "${announcement.title}"`;
          break;
        case 'sad':
        case '😢':
          notificationMessage = `${reactor.full_name} reacted sadly to your announcement "${announcement.title}"`;
          break;
        case 'angry':
        case '😡':
          notificationMessage = `${reactor.full_name} reacted angrily to your announcement "${announcement.title}"`;
          break;
        default:
          notificationMessage = `${reactor.full_name} reacted with ${reactionType} to your announcement "${announcement.title}"`;
      }

      // Create notification for author (using employee ID, not user ID)
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: announcement.author_id, // This should be the employee ID
          title: `${reactor.full_name} reacted to your announcement`,
          message: notificationMessage,
          type: 'reaction',
          data: {
            announcementId: announcement.id,
            reactionType,
            reactorId: reactor.id,
            reactorUserId: reactorUserId,
            reactorName: reactor.full_name,
            announcementTitle: announcement.title
          },
          related_id: announcement.id
        });

      if (notificationError) {
        throw notificationError;
      }

      logger.info('📢 [AnnouncementController] Author notified of reaction', {
        announcementId: announcement.id,
        authorId: announcement.author_id,
        reactorId: reactor.id,
        reactorUserId,
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

      // Get all active employees (not users table to avoid foreign key issues)
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, email, full_name, user_id')
        .eq('active', true);

      if (employeesError) {
        logger.error('❌ [AnnouncementController] Failed to get employees', { error: employeesError });
        throw employeesError;
      }

      if (!employees || employees.length === 0) {
        logger.warn('No active employees found for notification');
        return;
      }

      // Filter out employees that don't have valid user records
      const validEmployees = [];
      for (const employee of employees) {
        // Verify the employee has a corresponding user record
        const { data: userExists } = await supabase
          .from('users')
          .select('id')
          .eq('id', employee.user_id)
          .single();
        
        if (userExists) {
          validEmployees.push(employee);
        } else {
          logger.warn('Employee has no corresponding user record', { 
            employeeId: employee.id, 
            userId: employee.user_id 
          });
        }
      }
      
      if (validEmployees.length === 0) {
        logger.warn('No valid employees found for notification');
        return;
      }

      // Insert notifications for all valid employees (using employee IDs)
      const notifications = validEmployees.map((employee: any) => ({
        user_id: employee.id, // Use employee ID, not user ID
        title: `📢 New Announcement: ${announcement.title}`,
        message: `${announcement.content.substring(0, 200)}${announcement.content.length > 200 ? '...' : ''}\n\n- ${author?.full_name || 'Admin'}`,
        type: 'announcement',
        data: {
          announcementId: announcement.id,
          authorId: author?.id,
          authorName: author?.full_name
        },
        related_id: announcement.id
      }));

      // Insert notifications in batches to avoid overwhelming the database
      const batchSize = 100;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(batch);

        if (notificationError) {
          logger.error('❌ [AnnouncementController] Failed to insert notification batch', {
            error: notificationError,
            batchStart: i,
            batchSize: batch.length
          });
          throw notificationError;
        }
      }

      logger.info('📢 [AnnouncementController] Notifications sent to all users', {
        announcementId: announcement.id,
        userCount: validEmployees.length,
        totalEmployees: employees.length
      });

      // Send email notifications
      try {
        const { EmailService } = await import('../services/EmailService');
        const emailService = new EmailService(supabase as any); // Pass supabase as db connection
        
        await emailService.sendAnnouncementNotification(
          announcement,
          author?.full_name || 'Admin',
          validEmployees
        );
        
        logger.info('📧 [AnnouncementController] Email notifications sent', {
          announcementId: announcement.id,
          emailCount: validEmployees.length
        });
      } catch (emailError) {
        logger.error('❌ [AnnouncementController] Failed to send email notifications', {
          error: emailError,
          announcementId: announcement.id
        });
        // Don't fail the notification process if emails fail
      }

    } catch (error) {
      logger.error('❌ [AnnouncementController] Failed to notify users', {
        error: (error as Error).message,
        announcementId: announcement.id
      });
      throw error;
    }
  }

  /**
   * Mark announcement as read
   * POST /api/announcements/:id/read
   */
  async markAsRead(req: Request, res: Response): Promise<void> {
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

      logger.info('✅ [AnnouncementController] Marking announcement as read', {
        announcementId: id,
        userId
      });

      const supabase = supabaseConfig.getClient();

      // Check if announcement exists
      const { data: announcement, error: announcementError } = await supabase
        .from('announcements')
        .select('id, title')
        .eq('id', id)
        .single();

      if (announcementError || !announcement) {
        res.status(404).json({
          status: 'error',
          message: 'Announcement not found'
        });
        return;
      }

      // Create or update read status
      const { data: readStatus, error: readError } = await supabase
        .from('announcement_read_status')
        .upsert({
          announcement_id: id,
          user_id: userId,
          read_at: new Date().toISOString()
        }, {
          onConflict: 'announcement_id,user_id'
        })
        .select()
        .single();

      if (readError) {
        throw readError;
      }

      res.status(200).json({
        status: 'success',
        message: 'Announcement marked as read',
        data: { readStatus }
      });
    } catch (error) {
      logger.error('❌ [AnnouncementController] Mark as read error', {
        error: (error as Error).message,
        announcementId: req.params.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to mark announcement as read'
      });
    }
  }
}
