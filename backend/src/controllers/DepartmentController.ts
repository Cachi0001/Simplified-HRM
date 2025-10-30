import { Request, Response } from 'express';
import { DepartmentService } from '../services/DepartmentService';
import logger from '../utils/logger';

export class DepartmentController {
    constructor(private departmentService: DepartmentService) {}

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
}