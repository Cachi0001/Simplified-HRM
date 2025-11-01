/**
 * ConversationHistoryController - Handle role-based conversation history access
 */
import { Request, Response } from 'express';
import SupabaseConfig from '../config/supabase';
import { RoleHierarchyService } from '../services/RoleHierarchyService';
import logger from '../utils/logger';

const supabase = SupabaseConfig.getClient();
const roleHierarchyService = new RoleHierarchyService();

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

class ConversationHistoryController {
  /**
   * Get conversation history based on role permissions
   * GET /api/conversation-history?userId=&limit=&offset=
   */
  async getConversationHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId: targetUserId, limit = 50, offset = 0 } = req.query;
      const currentUserId = req.user?.userId;
      const currentUserRole = req.user?.role;

      if (!currentUserId || !currentUserRole) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      // Log access attempt for audit trail
      await this.logConversationAccess(currentUserId, targetUserId as string, 'view');

      // Get accessible user roles based on current user's role
      const accessibleRoles = roleHierarchyService.getAccessibleUserRoles(currentUserRole);

      let query = supabase
        .from('chat_messages')
        .select(`
          id,
          chat_id,
          message,
          timestamp,
          sender_id,
          message_type,
          read_at,
          users!chat_messages_sender_id_fkey (
            id,
            email,
            full_name,
            role
          )
        `)
        .order('timestamp', { ascending: false })
        .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

      // Apply role-based filtering
      if (currentUserRole === 'employee') {
        // Employees can only see their own conversations
        query = query.eq('sender_id', currentUserId);
      } else if (targetUserId) {
        // Specific user requested - check if current user can access it
        const { data: targetUser, error: targetUserError } = await supabase
          .from('users')
          .select('role')
          .eq('id', targetUserId)
          .single();

        if (targetUserError || !targetUser) {
          return res.status(404).json({
            status: 'error',
            message: 'Target user not found'
          });
        }

        if (!accessibleRoles.includes(targetUser.role)) {
          return res.status(403).json({
            status: 'error',
            message: 'Insufficient permissions to access this user\'s conversations'
          });
        }

        query = query.eq('sender_id', targetUserId);
      } else {
        // Filter by accessible roles
        if (accessibleRoles.length > 0) {
          query = query.in('users.role', accessibleRoles);
        }
      }

      const { data: messages, error } = await query;

      if (error) {
        throw error;
      }

      logger.info('📜 [ConversationHistoryController] Conversation history accessed', {
        accessorId: currentUserId,
        accessorRole: currentUserRole,
        targetUserId,
        messageCount: messages?.length || 0
      });

      res.json({
        status: 'success',
        data: {
          messages: messages || [],
          count: messages?.length || 0,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          accessorRole: currentUserRole,
          accessibleRoles
        }
      });
    } catch (error) {
      logger.error('❌ [ConversationHistoryController] Get conversation history error', {
        error: (error as Error).message,
        userId: req.user?.userId
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve conversation history'
      });
    }
  }

  /**
   * Search conversations based on role permissions
   * GET /api/conversation-history/search?query=&userId=&limit=&offset=
   */
  async searchConversations(req: AuthenticatedRequest, res: Response) {
    try {
      const { query: searchQuery, userId: targetUserId, limit = 50, offset = 0 } = req.query;
      const currentUserId = req.user?.userId;
      const currentUserRole = req.user?.role;

      if (!currentUserId || !currentUserRole) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      if (!searchQuery || typeof searchQuery !== 'string') {
        return res.status(400).json({
          status: 'error',
          message: 'Search query is required'
        });
      }

      // Log access attempt for audit trail
      await this.logConversationAccess(currentUserId, targetUserId as string, 'search');

      // Get accessible user roles based on current user's role
      const accessibleRoles = roleHierarchyService.getAccessibleUserRoles(currentUserRole);

      let query = supabase
        .from('chat_messages')
        .select(`
          id,
          chat_id,
          message,
          timestamp,
          sender_id,
          message_type,
          read_at,
          users!chat_messages_sender_id_fkey (
            id,
            email,
            full_name,
            role
          )
        `)
        .ilike('message', `%${searchQuery}%`)
        .order('timestamp', { ascending: false })
        .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

      // Apply role-based filtering
      if (currentUserRole === 'employee') {
        query = query.eq('sender_id', currentUserId);
      } else if (targetUserId) {
        const { data: targetUser, error: targetUserError } = await supabase
          .from('users')
          .select('role')
          .eq('id', targetUserId)
          .single();

        if (targetUserError || !targetUser) {
          return res.status(404).json({
            status: 'error',
            message: 'Target user not found'
          });
        }

        if (!accessibleRoles.includes(targetUser.role)) {
          return res.status(403).json({
            status: 'error',
            message: 'Insufficient permissions to access this user\'s conversations'
          });
        }

        query = query.eq('sender_id', targetUserId);
      } else {
        if (accessibleRoles.length > 0) {
          query = query.in('users.role', accessibleRoles);
        }
      }

      const { data: messages, error } = await query;

      if (error) {
        throw error;
      }

      logger.info('🔍 [ConversationHistoryController] Conversation search performed', {
        accessorId: currentUserId,
        accessorRole: currentUserRole,
        searchQuery,
        targetUserId,
        resultCount: messages?.length || 0
      });

      res.json({
        status: 'success',
        data: {
          messages: messages || [],
          count: messages?.length || 0,
          searchQuery,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error) {
      logger.error('❌ [ConversationHistoryController] Search conversations error', {
        error: (error as Error).message,
        userId: req.user?.userId
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to search conversations'
      });
    }
  }

  /**
   * Export conversation history (JSON/CSV)
   * GET /api/conversation-history/export?format=json&userId=&startDate=&endDate=
   */
  async exportConversations(req: AuthenticatedRequest, res: Response) {
    try {
      const { format = 'json', userId: targetUserId, startDate, endDate } = req.query;
      const currentUserId = req.user?.userId;
      const currentUserRole = req.user?.role;

      if (!currentUserId || !currentUserRole) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      // Only admin and above can export
      if (!roleHierarchyService.hasPermission(currentUserRole, 'admin')) {
        return res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions to export conversations'
        });
      }

      // Log access attempt for audit trail
      await this.logConversationAccess(currentUserId, targetUserId as string, 'export');

      const accessibleRoles = roleHierarchyService.getAccessibleUserRoles(currentUserRole);

      let query = supabase
        .from('chat_messages')
        .select(`
          id,
          chat_id,
          message,
          timestamp,
          sender_id,
          message_type,
          read_at,
          users!chat_messages_sender_id_fkey (
            id,
            email,
            full_name,
            role
          )
        `)
        .order('timestamp', { ascending: true });

      // Apply date filters
      if (startDate) {
        query = query.gte('timestamp', startDate);
      }
      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      // Apply role-based filtering
      if (targetUserId) {
        const { data: targetUser, error: targetUserError } = await supabase
          .from('users')
          .select('role')
          .eq('id', targetUserId)
          .single();

        if (targetUserError || !targetUser) {
          return res.status(404).json({
            status: 'error',
            message: 'Target user not found'
          });
        }

        if (!accessibleRoles.includes(targetUser.role)) {
          return res.status(403).json({
            status: 'error',
            message: 'Insufficient permissions to export this user\'s conversations'
          });
        }

        query = query.eq('sender_id', targetUserId);
      } else {
        if (accessibleRoles.length > 0) {
          query = query.in('users.role', accessibleRoles);
        }
      }

      const { data: messages, error } = await query;

      if (error) {
        throw error;
      }

      logger.info('📤 [ConversationHistoryController] Conversation export performed', {
        accessorId: currentUserId,
        accessorRole: currentUserRole,
        format,
        targetUserId,
        messageCount: messages?.length || 0
      });

      if (format === 'csv') {
        // Convert to CSV
        const csvHeader = 'ID,Chat ID,Message,Timestamp,Sender ID,Sender Name,Sender Email,Message Type,Read At\n';
        const csvRows = messages?.map(msg => {
          const user = (msg as any).users;
          return [
            msg.id,
            msg.chat_id,
            `"${msg.message.replace(/"/g, '""')}"`, // Escape quotes
            msg.timestamp,
            msg.sender_id,
            user?.full_name || '',
            user?.email || '',
            msg.message_type,
            msg.read_at || ''
          ].join(',');
        }).join('\n') || '';

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="conversations_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvHeader + csvRows);
      } else {
        // Return JSON
        res.json({
          status: 'success',
          data: {
            messages: messages || [],
            count: messages?.length || 0,
            exportedAt: new Date().toISOString(),
            exportedBy: currentUserId,
            format
          }
        });
      }
    } catch (error) {
      logger.error('❌ [ConversationHistoryController] Export conversations error', {
        error: (error as Error).message,
        userId: req.user?.userId
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to export conversations'
      });
    }
  }

  /**
   * Get conversation access logs (audit trail)
   * GET /api/conversation-history/access-logs?limit=&offset=
   */
  async getAccessLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const currentUserId = req.user?.userId;
      const currentUserRole = req.user?.role;

      if (!currentUserId || !currentUserRole) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      // Only superadmin and admin can view access logs
      if (!roleHierarchyService.hasPermission(currentUserRole, 'admin')) {
        return res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions to view access logs'
        });
      }

      const { data: logs, error } = await supabase
        .from('conversation_access_logs')
        .select(`
          id,
          accessor_id,
          accessed_user_id,
          chat_id,
          access_type,
          access_reason,
          created_at,
          accessor:users!conversation_access_logs_accessor_id_fkey (
            full_name,
            email,
            role
          ),
          accessed_user:users!conversation_access_logs_accessed_user_id_fkey (
            full_name,
            email,
            role
          )
        `)
        .order('created_at', { ascending: false })
        .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

      if (error) {
        throw error;
      }

      res.json({
        status: 'success',
        data: {
          logs: logs || [],
          count: logs?.length || 0,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error) {
      logger.error('❌ [ConversationHistoryController] Get access logs error', {
        error: (error as Error).message,
        userId: req.user?.userId
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve access logs'
      });
    }
  }

  /**
   * Log conversation access for audit trail
   */
  private async logConversationAccess(
    accessorId: string,
    accessedUserId: string,
    accessType: 'view' | 'search' | 'export',
    accessReason?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversation_access_logs')
        .insert([
          {
            accessor_id: accessorId,
            accessed_user_id: accessedUserId || accessorId, // Default to self if no target
            chat_id: '', // Will be populated if specific chat accessed
            access_type: accessType,
            access_reason: accessReason,
            created_at: new Date().toISOString()
          }
        ]);

      if (error) {
        logger.warn('⚠️ Failed to log conversation access (non-critical)', { error });
      }
    } catch (error) {
      logger.warn('⚠️ Failed to log conversation access (non-critical)', { error });
    }
  }
}

export default new ConversationHistoryController();