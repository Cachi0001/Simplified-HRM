import { Request, Response } from 'express';
import { DepartmentService } from '../services/DepartmentService';
import DepartmentNotificationService from '../services/DepartmentNotificationService';
import logger from '../utils/logger';

export class DepartmentController {
    private departmentNotificationService: typeof DepartmentNotificationService;

    constructor(private departmentService: DepartmentService) {
        this.departmentNotificationService = DepartmentNotificationService;
    }

    /**
     * Create a new department
     * POST /api/departments
     */
    async createDepartment(req: Request, res: Response): Promise<void> {
        try {
            const { name, description, team_lead_id, type } = req.body;
            const createdBy = req.user?.employeeId || req.user?.id;
            const userRole = req.user?.role;

            if (!createdBy || !name) {
                res.status(400).json({
                    status: 'error',
                    message: 'Creator ID and department name are required'
                });
                return;
            }

            // Check if user has permission to create departments
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to create departments'
                });
                return;
            }

            logger.info('🏢 [DepartmentController] Create department', {
                name,
                createdBy,
                userRole
            });

            const department = await this.departmentService.createDepartment({
                name,
                description,
                team_lead_id,
                type,
                created_by: createdBy
            });

            res.status(201).json({
                status: 'success',
                message: 'Department created successfully',
                data: { department }
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Create department error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get all departments
     * GET /api/departments
     */
    async getAllDepartments(req: Request, res: Response): Promise<void> {
        try {
            logger.info('📋 [DepartmentController] Get all departments');

            const departments = await this.departmentService.getAllDepartments();

            res.status(200).json({
                status: 'success',
                data: { departments, count: departments.length }
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Get all departments error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get department by ID
     * GET /api/departments/:id
     */
    async getDepartment(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(400).json({
                    status: 'error',
                    message: 'Department ID is required'
                });
                return;
            }

            const department = await this.departmentService.getDepartmentById(id);

            if (!department) {
                res.status(404).json({
                    status: 'error',
                    message: 'Department not found'
                });
                return;
            }

            res.status(200).json({
                status: 'success',
                data: { department }
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Get department error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Update department
     * PUT /api/departments/:id
     */
    async updateDepartment(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { name, description, team_lead_id, type } = req.body;
            const userRole = req.user?.role;

            if (!id) {
                res.status(400).json({
                    status: 'error',
                    message: 'Department ID is required'
                });
                return;
            }

            // Check if user has permission to update departments
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to update departments'
                });
                return;
            }

            logger.info('📝 [DepartmentController] Update department', { id, userRole });

            const updatedDepartment = await this.departmentService.updateDepartment(id, {
                name,
                description,
                team_lead_id,
                type
            });

            res.status(200).json({
                status: 'success',
                message: 'Department updated successfully',
                data: { department: updatedDepartment }
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Update department error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Delete department
     * DELETE /api/departments/:id
     */
    async deleteDepartment(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userRole = req.user?.role;

            if (!id) {
                res.status(400).json({
                    status: 'error',
                    message: 'Department ID is required'
                });
                return;
            }

            // Check if user has permission to delete departments
            if (!['super-admin', 'admin'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to delete departments'
                });
                return;
            }

            logger.info('🗑️ [DepartmentController] Delete department', { id, userRole });

            await this.departmentService.deleteDepartment(id);

            res.status(200).json({
                status: 'success',
                message: 'Department deleted successfully'
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Delete department error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get department members
     * GET /api/departments/:id/members
     */
    async getDepartmentMembers(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(400).json({
                    status: 'error',
                    message: 'Department ID is required'
                });
                return;
            }

            const members = await this.departmentService.getDepartmentMembers(id);

            res.status(200).json({
                status: 'success',
                data: { members, count: members.length }
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Get department members error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Add member to department
     * POST /api/departments/:id/members
     */
    async addDepartmentMember(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { user_id, role } = req.body;
            const userRole = req.user?.role;

            if (!id || !user_id) {
                res.status(400).json({
                    status: 'error',
                    message: 'Department ID and user ID are required'
                });
                return;
            }

            // Check if user has permission to manage department members
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to manage department members'
                });
                return;
            }

            logger.info('👥 [DepartmentController] Add department member', { 
                departmentId: id, 
                userId: user_id, 
                role: role || 'member' 
            });

            const member = await this.departmentService.addDepartmentMember({
                department_id: id,
                user_id,
                role
            });

            res.status(201).json({
                status: 'success',
                message: 'Member added to department successfully',
                data: { member }
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Add department member error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Remove member from department
     * DELETE /api/departments/:id/members/:userId
     */
    async removeDepartmentMember(req: Request, res: Response): Promise<void> {
        try {
            const { id, userId } = req.params;
            const userRole = req.user?.role;

            if (!id || !userId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Department ID and user ID are required'
                });
                return;
            }

            // Check if user has permission to manage department members
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to manage department members'
                });
                return;
            }

            logger.info('👥 [DepartmentController] Remove department member', { 
                departmentId: id, 
                userId 
            });

            await this.departmentService.removeDepartmentMember(id, userId);

            res.status(200).json({
                status: 'success',
                message: 'Member removed from department successfully'
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Remove department member error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Update department member role
     * PUT /api/departments/:id/members/:userId/role
     */
    async updateMemberRole(req: Request, res: Response): Promise<void> {
        try {
            const { id, userId } = req.params;
            const { role } = req.body;
            const userRole = req.user?.role;

            if (!id || !userId || !role) {
                res.status(400).json({
                    status: 'error',
                    message: 'Department ID, user ID, and role are required'
                });
                return;
            }

            // Check if user has permission to manage department members
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to manage department members'
                });
                return;
            }

            logger.info('👥 [DepartmentController] Update member role', { 
                departmentId: id, 
                userId, 
                newRole: role 
            });

            const updatedMember = await this.departmentService.updateDepartmentMemberRole(id, userId, role);

            res.status(200).json({
                status: 'success',
                message: 'Member role updated successfully',
                data: { member: updatedMember }
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Update member role error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Assign task to department
     * POST /api/departments/:id/assign-task
     */
    async assignTaskToDepartment(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { task_id } = req.body;
            const assignedBy = req.user?.employeeId || req.user?.id;
            const userRole = req.user?.role;

            if (!id || !task_id || !assignedBy) {
                res.status(400).json({
                    status: 'error',
                    message: 'Department ID, task ID, and assigned by are required'
                });
                return;
            }

            // Check if user has permission to assign tasks
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to assign tasks to departments'
                });
                return;
            }

            logger.info('📋 [DepartmentController] Assign task to department', { 
                departmentId: id, 
                taskId: task_id, 
                assignedBy 
            });

            await this.departmentService.assignTaskToDepartment(id, task_id, assignedBy);

            res.status(200).json({
                status: 'success',
                message: 'Task assigned to department successfully'
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Assign task to department error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get department statistics
     * GET /api/departments/:id/stats
     */
    async getDepartmentStats(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userRole = req.user?.role;

            if (!id) {
                res.status(400).json({
                    status: 'error',
                    message: 'Department ID is required'
                });
                return;
            }

            // Check if user has permission to view department stats
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to view department statistics'
                });
                return;
            }

            const stats = await this.departmentService.getDepartmentStats(id);

            res.status(200).json({
                status: 'success',
                data: { stats }
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Get department stats error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Search departments
     * GET /api/departments/search?q=query
     */
    async searchDepartments(req: Request, res: Response): Promise<void> {
        try {
            const { q } = req.query;

            if (!q || typeof q !== 'string') {
                res.status(400).json({
                    status: 'error',
                    message: 'Search query is required'
                });
                return;
            }

            const departments = await this.departmentService.searchDepartments(q);

            res.status(200).json({
                status: 'success',
                data: { departments, count: departments.length }
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Search departments error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get user's departments
     * GET /api/departments/my-departments
     */
    async getMyDepartments(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.employeeId || req.user?.id;

            if (!userId) {
                res.status(400).json({
                    status: 'error',
                    message: 'User ID is required'
                });
                return;
            }

            const departments = await this.departmentService.getUserDepartments(userId);

            res.status(200).json({
                status: 'success',
                data: { departments, count: departments.length }
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Get my departments error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Bulk assign tasks to department
     * POST /api/departments/:id/bulk-assign-tasks
     */
    async bulkAssignTasksToDepartment(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { task_ids, assignment_type, due_date, priority, notes } = req.body;
            const assignedBy = req.user?.employeeId || req.user?.id;
            const userRole = req.user?.role;

            if (!id || !task_ids || !Array.isArray(task_ids) || task_ids.length === 0) {
                res.status(400).json({
                    status: 'error',
                    message: 'Department ID and task IDs array are required'
                });
                return;
            }

            // Check if user has permission to assign tasks
            if (!['super-admin', 'admin', 'hr', 'manager'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to assign tasks to departments'
                });
                return;
            }

            logger.info('📦 [DepartmentController] Bulk assign tasks to department', {
                departmentId: id,
                taskCount: task_ids.length,
                assignedBy,
                assignmentType: assignment_type || 'distribute'
            });

            const result = await this.departmentService.bulkAssignTasksToDepartment(id, {
                task_ids,
                assignment_type: assignment_type || 'distribute', // 'distribute' or 'assign_all'
                assigned_by: assignedBy,
                due_date,
                priority,
                notes
            });

            // Send notification about bulk task assignment
            await this.departmentNotificationService.notifyDepartmentTaskAssignment(
                id,
                task_ids.join(','),
                `${task_ids.length} tasks bulk assigned`,
                assignedBy,
                due_date ? new Date(due_date) : undefined,
                priority
            );

            res.status(200).json({
                status: 'success',
                message: `${result.successful.length} tasks assigned successfully, ${result.failed.length} failed`,
                data: {
                    successful: result.successful,
                    failed: result.failed,
                    summary: {
                        totalTasks: task_ids.length,
                        successfulCount: result.successful.length,
                        failedCount: result.failed.length
                    }
                }
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Bulk assign tasks error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Send notification to department
     * POST /api/departments/:id/notify
     */
    async sendDepartmentNotification(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { 
                title, 
                message, 
                type, 
                priority, 
                recipients, 
                channels, 
                scheduledFor, 
                expiresAt,
                metadata 
            } = req.body;
            const createdBy = req.user?.employeeId || req.user?.id;
            const userRole = req.user?.role;

            if (!id || !title || !message || !createdBy) {
                res.status(400).json({
                    status: 'error',
                    message: 'Department ID, title, message, and creator ID are required'
                });
                return;
            }

            // Check if user has permission to send department notifications
            if (!['super-admin', 'admin', 'hr', 'manager'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to send department notifications'
                });
                return;
            }

            logger.info('📢 [DepartmentController] Send department notification', {
                departmentId: id,
                title,
                type: type || 'announcement',
                createdBy
            });

            const notification = await this.departmentNotificationService.sendDepartmentNotification({
                departmentId: id,
                title,
                message,
                type: type || 'announcement',
                priority: priority || 'medium',
                createdBy,
                recipients: recipients || { all: true },
                channels: channels || { inApp: true, email: false },
                scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
                expiresAt: expiresAt ? new Date(expiresAt) : undefined,
                metadata
            });

            res.status(201).json({
                status: 'success',
                message: 'Department notification sent successfully',
                data: { notification }
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Send department notification error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Broadcast message to department
     * POST /api/departments/:id/broadcast
     */
    async broadcastToDepartment(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { title, content, broadcastType, requiresAcknowledgment } = req.body;
            const createdBy = req.user?.employeeId || req.user?.id;
            const userRole = req.user?.role;

            if (!id || !title || !content || !createdBy) {
                res.status(400).json({
                    status: 'error',
                    message: 'Department ID, title, content, and creator ID are required'
                });
                return;
            }

            // Check if user has permission to broadcast to department
            if (!['super-admin', 'admin', 'hr', 'manager'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to broadcast to department'
                });
                return;
            }

            logger.info('📡 [DepartmentController] Broadcast to department', {
                departmentId: id,
                title,
                broadcastType: broadcastType || 'general',
                createdBy
            });

            const broadcast = await this.departmentNotificationService.broadcastToDepartment({
                departmentId: id,
                title,
                content,
                broadcastType: broadcastType || 'general',
                createdBy,
                requiresAcknowledgment: requiresAcknowledgment || false
            });

            res.status(201).json({
                status: 'success',
                message: 'Department broadcast sent successfully',
                data: { broadcast }
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Broadcast to department error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Get department notification history
     * GET /api/departments/:id/notifications
     */
    async getDepartmentNotifications(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { limit } = req.query;

            if (!id) {
                res.status(400).json({
                    status: 'error',
                    message: 'Department ID is required'
                });
                return;
            }

            logger.info('📜 [DepartmentController] Get department notifications', {
                departmentId: id,
                limit: limit || 50
            });

            const notifications = await this.departmentNotificationService.getDepartmentNotificationHistory(
                id,
                limit ? parseInt(limit as string) : 50
            );

            res.status(200).json({
                status: 'success',
                data: { notifications, count: notifications.length }
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Get department notifications error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Send performance alert to department
     * POST /api/departments/:id/performance-alert
     */
    async sendPerformanceAlert(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { alertType, metric, currentValue, threshold, affectedEmployees } = req.body;
            const createdBy = req.user?.employeeId || req.user?.id;
            const userRole = req.user?.role;

            if (!id || !alertType || !metric || currentValue === undefined || threshold === undefined) {
                res.status(400).json({
                    status: 'error',
                    message: 'Department ID, alert type, metric, current value, and threshold are required'
                });
                return;
            }

            // Check if user has permission to send performance alerts
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to send performance alerts'
                });
                return;
            }

            logger.info('⚠️ [DepartmentController] Send performance alert', {
                departmentId: id,
                alertType,
                metric,
                currentValue,
                threshold
            });

            await this.departmentNotificationService.notifyDepartmentPerformanceAlert(
                id,
                alertType,
                { metric, currentValue, threshold, affectedEmployees },
                createdBy
            );

            res.status(200).json({
                status: 'success',
                message: 'Performance alert sent successfully'
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Send performance alert error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Schedule recurring department notification
     * POST /api/departments/:id/schedule-notification
     */
    async scheduleRecurringNotification(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { notification, schedule } = req.body;
            const createdBy = req.user?.employeeId || req.user?.id;
            const userRole = req.user?.role;

            if (!id || !notification || !schedule) {
                res.status(400).json({
                    status: 'error',
                    message: 'Department ID, notification, and schedule are required'
                });
                return;
            }

            // Check if user has permission to schedule notifications
            if (!['super-admin', 'admin', 'hr'].includes(userRole)) {
                res.status(403).json({
                    status: 'error',
                    message: 'Insufficient permissions to schedule department notifications'
                });
                return;
            }

            logger.info('⏰ [DepartmentController] Schedule recurring notification', {
                departmentId: id,
                frequency: schedule.frequency,
                createdBy
            });

            const scheduleId = await this.departmentNotificationService.scheduleRecurringNotification(
                {
                    ...notification,
                    departmentId: id,
                    createdBy
                },
                schedule
            );

            res.status(201).json({
                status: 'success',
                message: 'Recurring notification scheduled successfully',
                data: { scheduleId }
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Schedule recurring notification error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Mark broadcast as read
     * POST /api/departments/broadcasts/:broadcastId/read
     */
    async markBroadcastAsRead(req: Request, res: Response): Promise<void> {
        try {
            const { broadcastId } = req.params;
            const employeeId = req.user?.employeeId || req.user?.id;

            if (!broadcastId || !employeeId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Broadcast ID and employee ID are required'
                });
                return;
            }

            logger.info('✅ [DepartmentController] Mark broadcast as read', {
                broadcastId,
                employeeId
            });

            await this.departmentNotificationService.markBroadcastAsRead(broadcastId, employeeId);

            res.status(200).json({
                status: 'success',
                message: 'Broadcast marked as read successfully'
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Mark broadcast as read error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }

    /**
     * Acknowledge broadcast
     * POST /api/departments/broadcasts/:broadcastId/acknowledge
     */
    async acknowledgeBroadcast(req: Request, res: Response): Promise<void> {
        try {
            const { broadcastId } = req.params;
            const employeeId = req.user?.employeeId || req.user?.id;

            if (!broadcastId || !employeeId) {
                res.status(400).json({
                    status: 'error',
                    message: 'Broadcast ID and employee ID are required'
                });
                return;
            }

            logger.info('✅ [DepartmentController] Acknowledge broadcast', {
                broadcastId,
                employeeId
            });

            await this.departmentNotificationService.acknowledgeBroadcast(broadcastId, employeeId);

            res.status(200).json({
                status: 'success',
                message: 'Broadcast acknowledged successfully'
            });
        } catch (error) {
            logger.error('❌ [DepartmentController] Acknowledge broadcast error', {
                error: (error as Error).message
            });
            res.status(400).json({
                status: 'error',
                message: (error as Error).message
            });
        }
    }
}