/**
 * TypingIndicatorController - Handle typing indicator operations
 */
import { Request, Response } from 'express';
import SupabaseConfig from '../config/supabase';

const supabase = SupabaseConfig.getClient();

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

class TypingIndicatorController {
  // Set typing status
  async setTypingStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { chatId, isTyping } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      if (!chatId || typeof isTyping !== 'boolean') {
        return res.status(400).json({
          status: 'error',
          message: 'Chat ID and typing status are required'
        });
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 10000); // 10 seconds from now

      if (isTyping) {
        // Upsert typing indicator
        const { data: indicator, error } = await supabase
          .from('typing_indicators')
          .upsert([
            {
              chat_id: chatId,
              user_id: userId,
              is_typing: true,
              last_activity: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              updated_at: now.toISOString()
            }
          ], {
            onConflict: 'chat_id,user_id'
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Error setting typing status:', error);
          return res.status(400).json({
            status: 'error',
            message: 'Failed to set typing status'
          });
        }

        console.log('✅ Typing status set:', { userId, chatId, isTyping });

        res.json({
          status: 'success',
          message: 'Typing status updated',
          data: { indicator }
        });
      } else {
        // Remove typing indicator
        const { error } = await supabase
          .from('typing_indicators')
          .delete()
          .eq('chat_id', chatId)
          .eq('user_id', userId);

        if (error) {
          console.error('❌ Error removing typing status:', error);
          return res.status(400).json({
            status: 'error',
            message: 'Failed to remove typing status'
          });
        }

        console.log('✅ Typing status removed:', { userId, chatId });

        res.json({
          status: 'success',
          message: 'Typing status removed'
        });
      }
    } catch (error) {
      console.error('❌ Set typing status error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Get typing users for a chat
  async getTypingUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const { chatId } = req.params;
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      if (!chatId) {
        return res.status(400).json({
          status: 'error',
          message: 'Chat ID is required'
        });
      }

      // Get active typing indicators (excluding current user)
      const { data: typingIndicators, error } = await supabase
        .from('typing_indicators')
        .select(`
          user_id,
          is_typing,
          last_activity,
          expires_at,
          users!user_id(id, full_name, email)
        `)
        .eq('chat_id', chatId)
        .eq('is_typing', true)
        .neq('user_id', currentUserId)
        .gt('expires_at', new Date().toISOString())
        .order('last_activity', { ascending: false });

      if (error) {
        console.error('❌ Error fetching typing users:', error);
        return res.status(400).json({
          status: 'error',
          message: 'Failed to fetch typing users'
        });
      }

      const typingUsers = typingIndicators.map((indicator: any) => ({
        userId: indicator.user_id,
        name: indicator.users?.full_name || 'Unknown User',
        email: indicator.users?.email,
        lastActivity: indicator.last_activity,
        expiresAt: indicator.expires_at
      }));

      res.json({
        status: 'success',
        data: { 
          typingUsers,
          count: typingUsers.length
        }
      });
    } catch (error) {
      console.error('❌ Get typing users error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Cleanup expired typing indicators
  async cleanupExpiredIndicators(req: AuthenticatedRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      // Only allow admin and above to run cleanup
      if (!userRole || !['superadmin', 'admin'].includes(userRole)) {
        return res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions'
        });
      }

      const { data: expiredIndicators, error: selectError } = await supabase
        .from('typing_indicators')
        .select('id')
        .lt('expires_at', new Date().toISOString());

      if (selectError) {
        console.error('❌ Error selecting expired typing indicators:', selectError);
        return res.status(400).json({
          status: 'error',
          message: 'Failed to select expired indicators'
        });
      }

      const expiredCount = expiredIndicators.length;

      if (expiredCount > 0) {
        const { error: deleteError } = await supabase
          .from('typing_indicators')
          .delete()
          .lt('expires_at', new Date().toISOString());

        if (deleteError) {
          console.error('❌ Error deleting expired typing indicators:', deleteError);
          return res.status(400).json({
            status: 'error',
            message: 'Failed to delete expired indicators'
          });
        }
      }

      console.log('✅ Expired typing indicators cleaned up:', { expiredCount });

      res.json({
        status: 'success',
        message: `Cleaned up ${expiredCount} expired typing indicators`,
        data: { expiredCount }
      });
    } catch (error) {
      console.error('❌ Cleanup expired typing indicators error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Handle typing timeout (when user stops typing)
  async handleTypingTimeout(req: AuthenticatedRequest, res: Response) {
    try {
      const { chatId } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      if (!chatId) {
        return res.status(400).json({
          status: 'error',
          message: 'Chat ID is required'
        });
      }

      // Remove typing indicator for this user in this chat
      const { error } = await supabase
        .from('typing_indicators')
        .delete()
        .eq('chat_id', chatId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error handling typing timeout:', error);
        return res.status(400).json({
          status: 'error',
          message: 'Failed to handle typing timeout'
        });
      }

      console.log('✅ Typing timeout handled:', { userId, chatId });

      res.json({
        status: 'success',
        message: 'Typing timeout handled successfully'
      });
    } catch (error) {
      console.error('❌ Handle typing timeout error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
}

export default new TypingIndicatorController();