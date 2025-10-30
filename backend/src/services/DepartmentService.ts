import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';
import { NotificationService } from './NotificationService';

export interface IDepartment {
    id: string;
    name: string;
    description?: string;
    team_lead_id?: string;
    type?: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface IDepartmentMember {
    id: string;
    department_id: string;
    user_id: string;
    role: string;
    joined_at: string;
}

export interface CreateDepartmentData {
    name: string;
    description?: string;
    team_lead_id?: string;
    type?: string;
    created_by: string;
}

export interface UpdateDepartmentData {
    name?: string;
    description?: string;
    team_lead_id?: string;
    type?: string;
}

export interface AddDepartmentMemberData {
    department_id: string;
    user_id: string;
    role?: string;
}

export class DepartmentService {
    private supabase: SupabaseClient;
    private notificationService: NotificationService;

    constructor() {
        this.supabase = supabase.getClient();
        this.notificationService = new NotificationService();
    }

    /**
     * Create a new department
     */
    async createDepartment(data: CreateDepartmentData): Promise<IDepartment> {
        try {
            logger.info('DepartmentService: Creating department', { 
                name: data.name, 
                createdBy: data.created_by 
            });

            const { data: department, error } = await this.supabase
                .from('departments')
                .insert({
                    name: data.name,
                    description: data.description,
                    team_lead_id: data.team_lead_id,
                    type: data.type,
                    created_by: data.created_by,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                logger.error('DepartmentService: Failed to create department', { error: error.message });
                throw error;
            }

            logger.info('DepartmentService: Department created successfully', { departmentId: department.id });
            return department;
        } catch (error) {
            logger.error('DepartmentService: Create department failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Get department by ID
     */
    async getDepartmentById(id: string): Promise<IDepartment | null> {
        try {
            const { data, error } = await this.supabase
                .from('departments')
                .select(`
                    *,
                    team_lead:employees!departments_team_lead_id_fkey(id, full_name, email),
                    creator:employees!departments_created_by_fkey(id, full_name, email)
                `)
                .eq('id', id)
                .single();

            if (error && error.code !== 'PGRST116') {
                logger.error('DepartmentService: Failed to get department', { error: error.message });
                throw error;
            }

            return data || null;
        } catch (error) {
            logger.error('DepartmentService: Get department failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Get all departments
     */
    async getAllDepartments(): Promise<IDepartment[]> {
        try {
            const { data, error } = await this.supabase
                .from('departments')
                .select(`
                    *,
                    team_lead:employees!departments_team_lead_id_fkey(id, full_name, email),
                    creator:employees!departments_created_by_fkey(id, full_name, email)
                `)
                .order('name', { ascending: true });

            if (error) {
                logger.error('DepartmentService: Failed to get all departments', { error: error.message });
                throw error;
            }

            return data || [];
        } catch (error) {
            logger.error('DepartmentService: Get all departments failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Update a department
     */
    async updateDepartment(departmentId: string, data: UpdateDepartmentData): Promise<IDepartment> {
        try {
            logger.info('DepartmentService: Updating department', { departmentId });

            const updatePayload: any = {
                updated_at: new Date().toISOString()
            };

            if (data.name) updatePayload.name = data.name;
            if (data.description !== undefined) updatePayload.description = data.description;
            if (data.team_lead_id !== undefined) updatePayload.team_lead_id = data.team_lead_id;
            if (data.type !== undefined) updatePayload.type = data.type;

            const { data: updatedDepartment, error } = await this.supabase
                .from('departments')
                .update(updatePayload)
                .eq('id', departmentId)
                .select(`
                    *,
                    team_lead:employees!departments_team_lead_id_fkey(id, full_name, email),
                    creator:employees!departments_created_by_fkey(id, full_name, email)
                `)
                .single();

            if (error) {
                logger.error('DepartmentService: Failed to update department', { error: error.message });
                throw error;
            }

            logger.info('DepartmentService: Department updated successfully', { departmentId });
            return updatedDepartment;
        } catch (error) {
            logger.error('DepartmentService: Update department failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Delete a department
     */
    async deleteDepartment(departmentId: string): Promise<void> {
        try {
            logger.info('DepartmentService: Deleting department', { departmentId });

            // First, remove all members from the department
            await this.supabase
                .from('department_members')
                .delete()
                .eq('department_id', departmentId);

            // Then delete the department
            const { error } = await this.supabase
                .from('departments')
                .delete()
                .eq('id', departmentId);

            if (error) {
                logger.error('DepartmentService: Failed to delete department', { error: error.message });
                throw error;
            }

            logger.info('DepartmentService: Department deleted successfully', { departmentId });
        } catch (error) {
            logger.error('DepartmentService: Delete department failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Add member to department
     */
    async addDepartmentMember(data: AddDepartmentMemberData): Promise<IDepartmentMember> {
        try {
            logger.info('DepartmentService: Adding department member', { 
                departmentId: data.department_id, 
                userId: data.user_id 
            });

            const { data: member, error } = await this.supabase
                .from('department_members')
                .insert({
                    department_id: data.department_id,
                    user_id: data.user_id,
                    role: data.role || 'member',
                    joined_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                logger.error('DepartmentService: Failed to add department member', { error: error.message });
                throw error;
            }

            logger.info('DepartmentService: Department member added successfully', { memberId: member.id });
            return member;
        } catch (error) {
            logger.error('DepartmentService: Add department member failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Remove member from department
     */
    async removeDepartmentMember(departmentId: string, userId: string): Promise<void> {
        try {
            logger.info('DepartmentService: Removing department member', { departmentId, userId });

            const { error } = await this.supabase
                .from('department_members')
                .delete()
                .eq('department_id', departmentId)
                .eq('user_id', userId);

            if (error) {
                logger.error('DepartmentService: Failed to remove department member', { error: error.message });
                throw error;
            }

            logger.info('DepartmentService: Department member removed successfully');
        } catch (error) {
            logger.error('DepartmentService: Remove department member failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Get department members
     */
    async getDepartmentMembers(departmentId: string): Promise<IDepartmentMember[]> {
        try {
            const { data, error } = await this.supabase
                .from('department_members')
                .select(`
                    *,
                    employee:employees!department_members_user_id_fkey(id, full_name, email, role, department)
                `)
                .eq('department_id', departmentId)
                .order('joined_at', { ascending: true });

            if (error) {
                logger.error('DepartmentService: Failed to get department members', { error: error.message });
                throw error;
            }

            return data || [];
        } catch (error) {
            logger.error('DepartmentService: Get department members failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Get user's departments
     */
    async getUserDepartments(userId: string): Promise<any[]> {
        try {
            const { data, error } = await this.supabase
                .from('department_members')
                .select(`
                    department:departments!department_members_department_id_fkey(
                        *,
                        team_lead:employees!departments_team_lead_id_fkey(id, full_name, email)
                    )
                `)
                .eq('user_id', userId);

            if (error) {
                logger.error('DepartmentService: Failed to get user departments', { error: error.message });
                throw error;
            }

            return data?.map(item => item.department) || [];
        } catch (error) {
            logger.error('DepartmentService: Get user departments failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Assign task to entire department
     */
    async assignTaskToDepartment(
        departmentId: string, 
        taskId: string, 
        assignedBy: string
    ): Promise<void> {
        try {
            logger.info('DepartmentService: Assigning task to department', { departmentId, taskId });

            // Get all department members
            const members = await this.getDepartmentMembers(departmentId);
            
            if (members.length === 0) {
                logger.warn('DepartmentService: No members found in department', { departmentId });
                return;
            }

            // Get department and task details for notifications
            const department = await this.getDepartmentById(departmentId);
            const { data: task } = await this.supabase
                .from('tasks')
                .select('title, description, due_date')
                .eq('id', taskId)
                .single();

            if (!department || !task) {
                throw new Error('Department or task not found');
            }

            // Send notifications to all department members
            for (const member of members) {
                await this.notificationService.createNotification({
                    userId: member.user_id,
                    type: 'task',
                    title: 'New Department Task Assigned',
                    message: `A new task "${task.title}" has been assigned to the ${department.name} department.`,
                    relatedId: taskId,
                    actionUrl: `/tasks/${taskId}`
                });
            }

            logger.info('DepartmentService: Task assigned to department successfully', { 
                departmentId, 
                taskId, 
                memberCount: members.length 
            });
        } catch (error) {
            logger.error('DepartmentService: Assign task to department failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Get department statistics
     */
    async getDepartmentStats(departmentId: string): Promise<any> {
        try {
            const members = await this.getDepartmentMembers(departmentId);
            
            // Get task statistics for the department
            const { data: tasks } = await this.supabase
                .from('tasks')
                .select('status, priority, assigned_to')
                .eq('department_id', departmentId);

            // Get attendance statistics for department members
            const memberIds = members.map(m => m.user_id);
            const { data: attendance } = await this.supabase
                .from('attendance')
                .select('employee_id, status, is_late')
                .in('employee_id', memberIds)
                .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

            const stats = {
                memberCount: members.length,
                tasks: {
                    total: tasks?.length || 0,
                    pending: tasks?.filter(t => t.status === 'pending').length || 0,
                    inProgress: tasks?.filter(t => t.status === 'in_progress').length || 0,
                    completed: tasks?.filter(t => t.status === 'completed').length || 0,
                    highPriority: tasks?.filter(t => t.priority === 'high').length || 0
                },
                attendance: {
                    totalRecords: attendance?.length || 0,
                    lateArrivals: attendance?.filter(a => a.is_late).length || 0,
                    onTimePercentage: attendance?.length ? 
                        ((attendance.length - attendance.filter(a => a.is_late).length) / attendance.length * 100).toFixed(1) : 
                        '0'
                }
            };

            return stats;
        } catch (error) {
            logger.error('DepartmentService: Get department stats failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Search departments by name
     */
    async searchDepartments(query: string): Promise<IDepartment[]> {
        try {
            const { data, error } = await this.supabase
                .from('departments')
                .select(`
                    *,
                    team_lead:employees!departments_team_lead_id_fkey(id, full_name, email)
                `)
                .ilike('name', `%${query}%`)
                .order('name', { ascending: true });

            if (error) {
                logger.error('DepartmentService: Failed to search departments', { error: error.message });
                throw error;
            }

            return data || [];
        } catch (error) {
            logger.error('DepartmentService: Search departments failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Update department member role
     */
    async updateDepartmentMemberRole(
        departmentId: string, 
        userId: string, 
        newRole: string
    ): Promise<IDepartmentMember> {
        try {
            logger.info('DepartmentService: Updating department member role', { 
                departmentId, 
                userId, 
                newRole 
            });

            const { data: updatedMember, error } = await this.supabase
                .from('department_members')
                .update({ role: newRole })
                .eq('department_id', departmentId)
                .eq('user_id', userId)
                .select(`
                    *,
                    employee:employees!department_members_user_id_fkey(id, full_name, email)
                `)
                .single();

            if (error) {
                logger.error('DepartmentService: Failed to update member role', { error: error.message });
                throw error;
            }

            logger.info('DepartmentService: Department member role updated successfully');
            return updatedMember;
        } catch (error) {
            logger.error('DepartmentService: Update member role failed', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Bulk assign tasks to department
     */
    async bulkAssignTasksToDepartment(
        departmentId: string,
        options: {
            task_ids: string[];
            assignment_type: 'distribute' | 'assign_all';
            assigned_by: string;
            due_date?: string;
            priority?: string;
            notes?: string;
        }
    ): Promise<{
        successful: Array<{ taskId: string; assignedTo?: string }>;
        failed: Array<{ taskId: string; error: string }>;
    }> {
        try {
            logger.info('DepartmentService: Bulk assigning tasks to department', {
                departmentId,
                taskCount: options.task_ids.length,
                assignmentType: options.assignment_type
            });

            // Get department members
            const members = await this.getDepartmentMembers(departmentId);
            
            if (members.length === 0) {
                throw new Error('No members found in department');
            }

            const successful: Array<{ taskId: string; assignedTo?: string }> = [];
            const failed: Array<{ taskId: string; error: string }> = [];

            // Process each task
            for (let i = 0; i < options.task_ids.length; i++) {
                const taskId = options.task_ids[i];
                
                try {
                    if (options.assignment_type === 'distribute') {
                        // Distribute tasks evenly among department members
                        const assigneeIndex = i % members.length;
                        const assignee = members[assigneeIndex];

                        const { error: updateError } = await this.supabase
                            .from('tasks')
                            .update({
                                assigned_to: assignee.user_id,
                                department_id: departmentId,
                                due_date: options.due_date,
                                priority: options.priority,
                                notes: options.notes,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', taskId);

                        if (updateError) {
                            failed.push({ taskId, error: updateError.message });
                        } else {
                            successful.push({ taskId, assignedTo: assignee.user_id });
                        }
                    } else {
                        // Assign all tasks to all department members (create multiple assignments)
                        for (const member of members) {
                            try {
                                // Create a copy of the task for each member
                                const { data: originalTask, error: fetchError } = await this.supabase
                                    .from('tasks')
                                    .select('*')
                                    .eq('id', taskId)
                                    .single();

                                if (fetchError || !originalTask) {
                                    failed.push({ taskId, error: `Failed to fetch original task: ${fetchError?.message}` });
                                    continue;
                                }

                                // Create new task assignment for each member
                                const { error: insertError } = await this.supabase
                                    .from('tasks')
                                    .insert({
                                        title: originalTask.title,
                                        description: originalTask.description,
                                        assigned_to: member.user_id,
                                        department_id: departmentId,
                                        due_date: options.due_date || originalTask.due_date,
                                        priority: options.priority || originalTask.priority,
                                        status: 'pending',
                                        notes: options.notes,
                                        created_by: options.assigned_by,
                                        created_at: new Date().toISOString()
                                    });

                                if (insertError) {
                                    failed.push({ taskId: `${taskId}-${member.user_id}`, error: insertError.message });
                                } else {
                                    successful.push({ taskId: `${taskId}-${member.user_id}`, assignedTo: member.user_id });
                                }
                            } catch (memberError) {
                                failed.push({ 
                                    taskId: `${taskId}-${member.user_id}`, 
                                    error: (memberError as Error).message 
                                });
                            }
                        }
                    }
                } catch (taskError) {
                    failed.push({ taskId, error: (taskError as Error).message });
                }
            }

            logger.info('DepartmentService: Bulk task assignment completed', {
                departmentId,
                successful: successful.length,
                failed: failed.length
            });

            return { successful, failed };
        } catch (error) {
            logger.error('DepartmentService: Bulk assign tasks failed', { error: (error as Error).message });
            throw error;
        }
    }
}

export default new DepartmentService();