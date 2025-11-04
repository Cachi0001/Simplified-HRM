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
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      // Check if user has permission to create announcements
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

      logger.info('📢 [AnnouncementController] Creating announcement', {
        title,
        userId,
        userRole,
        contentLength: content.length
      });

      const supabase = supabaseConfig.getClient();

      // Get user's employee record
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
        author_id: employee.id,
        priority,
        status,
        target_audience
      };

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

      // Send notifications if published
      if (status === 'published') {
        try {
          await this.notifyAllUsers(announcement, employee);
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
            author_name: employee.full_name,
            author_email: employee.email
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
      const userRole = (req as any).user?.role;

      logger.info('📢 [AnnouncementController] Getting announcements', {
        limit,
        offset,
        status,
        userRole
      });

      const supabase = supabaseConfig.getClient();

      let query = supabase
        .from('announcements')
        .select(`
          id, title, content, priority, status, target_audience, scheduled_for, created_at, updated_at,
          employees!fk_announcements_author (
            full_name,
            email
          )
        `);

      // Role-based filtering
      const canViewAll = ['super-admin', 'superadmin', 'admin', 'hr'].includes(userRole);
      
      if (status) {
        query = query.eq('status', status);
      } else if (!canViewAll) {
        query = query.eq('status', 'published');
      }

      const { data: announcements, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      const formattedData = announcements?.map((announcement: any) => ({
        ...announcement,
        author_name: announcement.employees?.full_name || 'Unknown',
        author_email: announcement.employees?.email || '',
        employees: undefined
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
   * Get announcement templates
   * GET /api/announcements/templates
   */
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const supabase = supabaseConfig.getClient();

      logger.info('📋 [AnnouncementController] Getting announcement templates', {
        userId: (req as any).user?.id
      });

      const { data: templates, error } = await supabase
        .from('announcement_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        throw error;
      }

      res.status(200).json({
        status: 'success',
        data: {
          templates: templates || []
        }
      });
    } catch (error) {
      logger.error('❌ [AnnouncementController] Get templates error', {
        error: (error as Error).message,
        userId: (req as any).user?.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch announcement templates',
        data: {
          templates: []
        }
      });
    }
  }

  /**
   * Create announcement template
   * POST /api/announcements/templates
   */
  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { name, subject_template, html_content, template_type = 'announcement' } = req.body;
      const userRole = (req as any).user?.role;

      // Check permissions
      const authorizedRoles = ['superadmin', 'super-admin', 'admin', 'hr'];
      if (!authorizedRoles.includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have permission to create templates'
        });
        return;
      }

      if (!name || !subject_template || !html_content) {
        res.status(400).json({
          status: 'error',
          message: 'Name, subject template, and HTML content are required'
        });
        return;
      }

      const supabase = supabaseConfig.getClient();

      const { data: template, error } = await supabase
        .from('announcement_templates')
        .insert({
          name,
          template_type,
          subject_template,
          html_content,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.status(201).json({
        status: 'success',
        message: 'Template created successfully',
        data: { template }
      });
    } catch (error) {
      logger.error('❌ [AnnouncementController] Create template error', {
        error: (error as Error).message
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to create template'
      });
    }
  }

  /**
   * Get single announcement
   * GET /api/announcements/:id
   */
  async getAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = (req as any).user?.role;

      const supabase = supabaseConfig.getClient();

      let query = supabase
        .from('announcements')
        .select(`
          id, title, content, priority, status, target_audience, scheduled_for, created_at, updated_at,
          employees!fk_announcements_author (
            full_name,
            email
          )
        `)
        .eq('id', id);

      // Role-based filtering
      const canViewAll = ['super-admin', 'superadmin', 'admin', 'hr'].includes(userRole);
      if (!canViewAll) {
        query = query.eq('status', 'published');
      }

      const { data: announcement, error } = await query.single();

      if (error) {
        throw error;
      }

      const employee = Array.isArray(announcement.employees) ? announcement.employees[0] : announcement.employees;
      const formattedData = {
        ...announcement,
        author_name: employee?.full_name || 'Unknown',
        author_email: employee?.email || '',
        employees: undefined
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
   * Update announcement
   * PUT /api/announcements/:id
   */
  async updateAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, content, priority, status, target_audience, scheduled_for } = req.body;
      const userRole = (req as any).user?.role;

      // Check permissions
      const authorizedRoles = ['superadmin', 'super-admin', 'admin', 'hr'];
      if (!authorizedRoles.includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have permission to update announcements'
        });
        return;
      }

      const supabase = supabaseConfig.getClient();

      const updateData: any = {};
      if (title) updateData.title = title;
      if (content) updateData.content = content;
      if (priority) updateData.priority = priority;
      if (status) updateData.status = status;
      if (target_audience) updateData.target_audience = target_audience;
      if (scheduled_for) updateData.scheduled_for = scheduled_for;

      const { data: announcement, error } = await supabase
        .from('announcements')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.status(200).json({
        status: 'success',
        message: 'Announcement updated successfully',
        data: { announcement }
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
   * Delete announcement
   * DELETE /api/announcements/:id
   */
  async deleteAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = (req as any).user?.role;

      // Check permissions
      const authorizedRoles = ['superadmin', 'super-admin', 'admin'];
      if (!authorizedRoles.includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have permission to delete announcements'
        });
        return;
      }

      const supabase = supabaseConfig.getClient();

      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
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
   * Add reaction to announcement
   * POST /api/announcements/:id/reactions
   */
  async addReaction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reaction_type } = req.body;
      const userId = (req as any).user?.id;

      if (!reaction_type) {
        res.status(400).json({
          status: 'error',
          message: 'Reaction type is required'
        });
        return;
      }

      const supabase = supabaseConfig.getClient();

      // Get user's employee record
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (employeeError || !employee) {
        res.status(400).json({
          status: 'error',
          message: 'User not found'
        });
        return;
      }

      // Insert or update reaction
      const { data: reaction, error } = await supabase
        .from('announcement_reactions')
        .upsert({
          announcement_id: id,
          employee_id: employee.id,
          reaction_type
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.status(200).json({
        status: 'success',
        message: 'Reaction added successfully',
        data: { reaction }
      });
    } catch (error) {
      logger.error('❌ [AnnouncementController] Add reaction error', {
        error: (error as Error).message,
        id: req.params.id
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
      const userId = (req as any).user?.id;

      const supabase = supabaseConfig.getClient();

      // Get user's employee record
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (employeeError || !employee) {
        res.status(400).json({
          status: 'error',
          message: 'User not found'
        });
        return;
      }

      const { error } = await supabase
        .from('announcement_reactions')
        .delete()
        .eq('announcement_id', id)
        .eq('employee_id', employee.id);

      if (error) {
        throw error;
      }

      res.status(200).json({
        status: 'success',
        message: 'Reaction removed successfully'
      });
    } catch (error) {
      logger.error('❌ [AnnouncementController] Remove reaction error', {
        error: (error as Error).message,
        id: req.params.id
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

      const supabase = supabaseConfig.getClient();

      const { data: reactions, error } = await supabase
        .from('announcement_reactions')
        .select(`
          id, reaction_type, created_at,
          employees!fk_announcement_reactions_employee (
            full_name
          )
        `)
        .eq('announcement_id', id);

      if (error) {
        throw error;
      }

      res.status(200).json({
        status: 'success',
        data: reactions || []
      });
    } catch (error) {
      logger.error('❌ [AnnouncementController] Get reactions error', {
        error: (error as Error).message,
        id: req.params.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to get reactions'
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
      const userRole = (req as any).user?.role;

      // Check permissions for non-published announcements
      const canViewAll = ['super-admin', 'superadmin', 'admin', 'hr'].includes(userRole);
      if (status !== 'published' && !canViewAll) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have permission to view these announcements'
        });
        return;
      }

      const supabase = supabaseConfig.getClient();

      const { data: announcements, error } = await supabase
        .from('announcements')
        .select(`
          id, title, content, priority, status, target_audience, scheduled_for, created_at, updated_at,
          employees!fk_announcements_author (
            full_name,
            email
          )
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const formattedData = announcements?.map((announcement: any) => ({
        ...announcement,
        author_name: announcement.employees?.full_name || 'Unknown',
        author_email: announcement.employees?.email || '',
        employees: undefined
      })) || [];

      res.status(200).json({
        status: 'success',
        data: formattedData
      });
    } catch (error) {
      logger.error('❌ [AnnouncementController] Get announcements by status error', {
        error: (error as Error).message,
        status: req.params.status
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to get announcements'
      });
    }
  }

  /**
   * Publish announcement
   * POST /api/announcements/:id/publish
   */
  async publishAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = (req as any).user?.role;

      // Check permissions
      const authorizedRoles = ['superadmin', 'super-admin', 'admin', 'hr'];
      if (!authorizedRoles.includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have permission to publish announcements'
        });
        return;
      }

      const supabase = supabaseConfig.getClient();

      const { data: announcement, error } = await supabase
        .from('announcements')
        .update({ status: 'published' })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Send notifications
      try {
        const { data: author } = await supabase
          .from('employees')
          .select('id, full_name, email')
          .eq('id', announcement.author_id)
          .single();

        if (author) {
          await this.notifyAllUsers(announcement, author);
        }
      } catch (notifyError) {
        logger.warn('Error sending publish notifications', { error: (notifyError as Error).message });
      }

      res.status(200).json({
        status: 'success',
        message: 'Announcement published successfully',
        data: { announcement }
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
   * Archive announcement
   * POST /api/announcements/:id/archive
   */
  async archiveAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = (req as any).user?.role;

      // Check permissions
      const authorizedRoles = ['superadmin', 'super-admin', 'admin', 'hr'];
      if (!authorizedRoles.includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have permission to archive announcements'
        });
        return;
      }

      const supabase = supabaseConfig.getClient();

      const { data: announcement, error } = await supabase
        .from('announcements')
        .update({ status: 'archived' })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.status(200).json({
        status: 'success',
        message: 'Announcement archived successfully',
        data: { announcement }
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
   * Mark announcement as read
   * POST /api/announcements/:id/read
   */
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const supabase = supabaseConfig.getClient();

      // Get user's employee record
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (employeeError || !employee) {
        res.status(400).json({
          status: 'error',
          message: 'User not found'
        });
        return;
      }

      // Insert read status
      const { error } = await supabase
        .from('announcement_reads')
        .upsert({
          announcement_id: id,
          employee_id: employee.id,
          read_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      res.status(200).json({
        status: 'success',
        message: 'Announcement marked as read'
      });
    } catch (error) {
      logger.error('❌ [AnnouncementController] Mark as read error', {
        error: (error as Error).message,
        id: req.params.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to mark announcement as read'
      });
    }
  }

  /**
   * Helper method to notify all users about new announcements
   */
  private async notifyAllUsers(announcement: any, author: any): Promise<void> {
    try {
      const supabase = supabaseConfig.getClient();

      // Use RPC function to create notifications
      const { error: notificationError } = await supabase
        .rpc('create_announcement_notifications', {
          p_announcement_id: announcement.id,
          p_author_id: author.id,
          p_title: announcement.title,
          p_content: announcement.content
        });
      
      if (notificationError) {
        logger.warn('Failed to send announcement notifications', { error: notificationError.message });
      } else {
        logger.info('Announcement notifications sent successfully', { announcementId: announcement.id });
      }

      // Real-time notifications will be handled by the notification system
      logger.info('Real-time announcement notification would be sent here', { 
        announcementId: announcement.id 
      });

      // Send email notifications
      try {
        const { EmailService } = await import('../services/EmailService');
        const emailService = new EmailService(supabase as any);
        
        const { data: allUsers, error: usersError } = await supabase
          .from('employees')
          .select('email, full_name')
          .eq('status', 'active')
          .not('email', 'is', null);

        if (!usersError && allUsers && allUsers.length > 0) {
          await emailService.sendAnnouncementNotification(
            announcement,
            author.full_name || 'System',
            allUsers
          );
          
          logger.info('Announcement email notifications sent', { 
            announcementId: announcement.id,
            emailCount: allUsers.length 
          });
        }
      } catch (emailError) {
        logger.warn('Failed to send announcement email notifications', { 
          error: (emailError as Error).message 
        });
      }
    } catch (error) {
      logger.error('Error in notifyAllUsers', { error: (error as Error).message });
    }
  }
}