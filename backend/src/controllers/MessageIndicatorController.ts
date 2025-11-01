/**
 * MessageIndicatorController - Handle message indicator operations
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

class MessageIndicatorController {
  // Create message indicator
  async createIndicator(req: AuthenticatedRequest, res: Response) {
    try {
      const { chatId, indicatorType } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      if (!chatId || !indicatorType) {
        return res.status(400).json({
          status: 'error',
          message: 'Chat ID and indicator type are required'
        });
      }

      if (!['sent', 'received'].includes(indicatorType)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid indicator type. Must be "sent" or "received"'
        });
      }

      // Create indicator with 3-second expiry
      const expiresAt = new Date(Date.now() + 3000); // 3 seconds from now

      const { data: indicator, error } = await supabase
        .from('message_indicators')
        .insert([
          {
            user_id: userId,
            chat_id: chatId,
            indicator_type: indicatorType,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating message indicator:', error);
        return res.status(400).json({
          status: 'error',
          message: 'Failed to create message indicator'
        });
      }

      console.log('✅ Message indicator created:', {
        indicatorId: indicator.id,
        userId,
        chatId,
        indicatorType
      });

      res.status(201).json({
        status: 'success',
        message: 'Message indicator created successfully',
        data: { indicator }
      });
    } catch (error) {
      console.error('❌ Create message indicator error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Get active indicators for users
  async getActiveIndicators(req: AuthenticatedRequest, res: Response) {
    try {
      const { userIds, chatId } = req.query;
      const currentUserId = req.user?.userId;

      if (!currentUserId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      let query = supabase
        .from('message_indicators')
        .select(`
          id,
          user_id,
          chat_id,
          indicator_type,
          expires_at,
          created_at
        `)
        .gt('expires_at', new Date().toISOString()); // Only active indicators

      // Filter by user IDs if provided
      if (userIds) {
        const userIdArray = Array.isArray(userIds) ? userIds : [userIds];
        query = query.in('user_id', userIdArray);
      }

      // Filter by chat ID if provided
      if (chatId) {
        query = query.eq('chat_id', chatId);
      }

      const { data: indicators, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching active indicators:', error);
        return res.status(400).json({
          status: 'error',
          message: 'Failed to fetch active indicators'
        });
      }

      res.json({
        status: 'success',
        data: { 
          indicators,
          count: indicators.length
        }
      });
    } catch (error) {
      console.error('❌ Get active indicators error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Expire indicator manually
  async expireIndicator(req: AuthenticatedRequest, res: Response) {
    try {
      const { indicatorId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      // Delete the indicator (only if it belongs to the user)
      const { error } = await supabase
        .from('message_indicators')
        .delete()
        .eq('id', indicatorId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error expiring indicator:', error);
        return res.status(400).json({
          status: 'error',
          message: 'Failed to expire indicator'
        });
      }

      console.log('✅ Message indicator expired:', { indicatorId, userId });

      res.json({
        status: 'success',
        message: 'Message indicator expired successfully'
      });
    } catch (error) {
      console.error('❌ Expire indicator error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Cleanup expired indicators (maintenance endpoint)
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
        .from('message_indicators')
        .select('id')
        .lt('expires_at', new Date().toISOString());

      if (selectError) {
        console.error('❌ Error selecting expired indicators:', selectError);
        return res.status(400).json({
          status: 'error',
          message: 'Failed to select expired indicators'
        });
      }

      const expiredCount = expiredIndicators.length;

      if (expiredCount > 0) {
        const { error: deleteError } = await supabase
          .from('message_indicators')
          .delete()
          .lt('expires_at', new Date().toISOString());

        if (deleteError) {
          console.error('❌ Error deleting expired indicators:', deleteError);
          return res.status(400).json({
            status: 'error',
            message: 'Failed to delete expired indicators'
          });
        }
      }

      console.log('✅ Expired indicators cleaned up:', { expiredCount });

      res.json({
        status: 'success',
        message: `Cleaned up ${expiredCount} expired indicators`,
        data: { expiredCount }
      });
    } catch (error) {
      console.error('❌ Cleanup expired indicators error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Get indicator statistics
  async getIndicatorStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      // Get total indicators for user
      const { count: totalCount, error: totalError } = await supabase
        .from('message_indicators')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (totalError) {
        console.error('❌ Error getting total indicator count:', totalError);
        return res.status(400).json({
          status: 'error',
          message: 'Failed to get indicator statistics'
        });
      }

      // Get active indicators for user
      const { count: activeCount, error: activeError } = await supabase
        .from('message_indicators')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString());

      if (activeError) {
        console.error('❌ Error getting active indicator count:', activeError);
        return res.status(400).json({
          status: 'error',
          message: 'Failed to get indicator statistics'
        });
      }

      // Get indicators by type
      const { data: typeStats, error: typeError } = await supabase
        .from('message_indicators')
        .select('indicator_type')
        .eq('user_id', userId);

      if (typeError) {
        console.error('❌ Error getting indicator type stats:', typeError);
        return res.status(400).json({
          status: 'error',
          message: 'Failed to get indicator statistics'
        });
      }

      const sentCount = typeStats.filter((i: any) => i.indicator_type === 'sent').length;
      const receivedCount = typeStats.filter((i: any) => i.indicator_type === 'received').length;

      res.json({
        status: 'success',
        data: {
          totalIndicators: totalCount || 0,
          activeIndicators: activeCount || 0,
          expiredIndicators: (totalCount || 0) - (activeCount || 0),
          byType: {
            sent: sentCount,
            received: receivedCount
          }
        }
      });
    } catch (error) {
      console.error('❌ Get indicator stats error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
}

export default new MessageIndicatorController();