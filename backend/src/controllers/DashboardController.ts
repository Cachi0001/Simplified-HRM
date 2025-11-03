import { Request, Response } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import supabaseConfig from '../config/supabase';
import logger from '../utils/logger';

export class DashboardController {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = supabaseConfig.getClient();
    }

    /**
     * Get dashboard statistics
     */
    async getStats(req: Request, res: Response): Promise<void> {
        try {
            const { timeRange = '30' } = req.query;
            const days = parseInt(timeRange as string, 10);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            logger.info('📊 [DashboardController] Getting dashboard stats', {
                timeRange: days,
                startDate: startDate.toISOString(),
                userId: req.user?.id
            });

            // Get employee stats
            const { data: employeeStats, error: employeeError } = await this.supabase
                .from('employees')
                .select('status')
                .neq('status', 'deleted');

            if (employeeError) {
                throw new Error(`Failed to fetch employee stats: ${employeeError.message}`);
            }

            const totalEmployees = employeeStats?.length || 0;
            const activeEmployees = employeeStats?.filter(emp => emp.status === 'active').length || 0;
            const pendingEmployees = employeeStats?.filter(emp => emp.status === 'pending').length || 0;

            // Get leave request stats
            const { data: leaveStats, error: leaveError } = await this.supabase
                .from('leave_requests')
                .select('status, created_at')
                .gte('created_at', startDate.toISOString());

            if (leaveError) {
                throw new Error(`Failed to fetch leave stats: ${leaveError.message}`);
            }

            const totalLeaves = leaveStats?.length || 0;
            const pendingLeaves = leaveStats?.filter(leave => leave.status === 'pending').length || 0;
            const approvedLeaves = leaveStats?.filter(leave => leave.status === 'approved').length || 0;
            const rejectedLeaves = leaveStats?.filter(leave => leave.status === 'rejected').length || 0;

            // Get purchase request stats
            const { data: purchaseStats, error: purchaseError } = await this.supabase
                .from('purchase_requests')
                .select('status, created_at')
                .gte('created_at', startDate.toISOString());

            if (purchaseError) {
                throw new Error(`Failed to fetch purchase stats: ${purchaseError.message}`);
            }

            const totalPurchases = purchaseStats?.length || 0;
            const pendingPurchases = purchaseStats?.filter(purchase => purchase.status === 'pending').length || 0;
            const approvedPurchases = purchaseStats?.filter(purchase => purchase.status === 'approved').length || 0;
            const rejectedPurchases = purchaseStats?.filter(purchase => purchase.status === 'rejected').length || 0;

            // Get department count
            const { data: departmentStats, error: departmentError } = await this.supabase
                .from('departments')
                .select('id');

            if (departmentError) {
                throw new Error(`Failed to fetch department stats: ${departmentError.message}`);
            }

            const totalDepartments = departmentStats?.length || 0;

            // Get recent activities
            const recentActivities = await this.getRecentActivities(days);

            const dashboardStats = {
                totalEmployees,
                activeEmployees,
                pendingEmployees,
                pendingLeaves,
                approvedLeaves,
                rejectedLeaves,
                totalLeaves,
                pendingPurchases,
                approvedPurchases,
                rejectedPurchases,
                totalPurchases,
                totalDepartments,
                recentActivities
            };

            logger.info('✅ [DashboardController] Dashboard stats retrieved', {
                totalEmployees,
                totalLeaves,
                totalPurchases,
                totalDepartments,
                activitiesCount: recentActivities.length
            });

            res.status(200).json({
                status: 'success',
                data: dashboardStats
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            logger.error('❌ [DashboardController] Get stats error', {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
                userId: req.user?.id
            });
            res.status(500).json({
                status: 'error',
                message: errorMessage
            });
        }
    }

    /**
     * Get recent activities for dashboard feed
     */
    private async getRecentActivities(days: number): Promise<any[]> {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            // Get recent leave requests
            const { data: recentLeaves } = await this.supabase
                .from('leave_requests')
                .select(`
                    id,
                    type,
                    status,
                    created_at,
                    employees!inner(full_name)
                `)
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false })
                .limit(5);

            // Get recent purchase requests
            const { data: recentPurchases } = await this.supabase
                .from('purchase_requests')
                .select(`
                    id,
                    item_name,
                    status,
                    created_at,
                    employees!inner(full_name)
                `)
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false })
                .limit(5);

            // Get recent announcements
            const { data: recentAnnouncements } = await this.supabase
                .from('announcements')
                .select(`
                    id,
                    title,
                    priority,
                    created_at,
                    employees!fk_announcements_author(full_name)
                `)
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false })
                .limit(3);

            const activities: any[] = [];

            // Add leave activities
            if (recentLeaves) {
                recentLeaves.forEach(leave => {
                    activities.push({
                        id: `leave-${leave.id}`,
                        type: 'leave',
                        title: `${leave.type} Leave Request`,
                        description: `${(leave.employees as any)?.full_name || 'Employee'} submitted a ${leave.type} leave request`,
                        timestamp: leave.created_at,
                        status: leave.status
                    });
                });
            }

            // Add purchase activities
            if (recentPurchases) {
                recentPurchases.forEach(purchase => {
                    activities.push({
                        id: `purchase-${purchase.id}`,
                        type: 'purchase',
                        title: 'Purchase Request',
                        description: `${(purchase.employees as any)?.full_name || 'Employee'} requested ${purchase.item_name}`,
                        timestamp: purchase.created_at,
                        status: purchase.status
                    });
                });
            }

            // Add announcement activities
            if (recentAnnouncements) {
                recentAnnouncements.forEach(announcement => {
                    activities.push({
                        id: `announcement-${announcement.id}`,
                        type: 'announcement',
                        title: 'New Announcement',
                        description: `${(announcement.employees as any)?.full_name || 'HR'} posted: ${announcement.title}`,
                        timestamp: announcement.created_at,
                        status: announcement.priority
                    });
                });
            }

            // Sort by timestamp and return top 10
            return activities
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 10);

        } catch (error) {
            logger.error('❌ [DashboardController] Get recent activities error', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return [];
        }
    }
}

export const dashboardController = new DashboardController();