"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseTaskRepository = void 0;
const logger_1 = __importDefault(require("../../utils/logger"));
class SupabaseTaskRepository {
    supabase;
    constructor(supabase) {
        this.supabase = supabase;
    }
    async create(taskData, assignedBy) {
        try {
            logger_1.default.info('Creating task', { title: taskData.title, assignedBy });
            const { data, error } = await this.supabase
                .from('tasks')
                .insert({
                title: taskData.title,
                description: taskData.description,
                assignee_id: taskData.assigneeId,
                assigned_by: assignedBy,
                status: 'pending',
                priority: taskData.priority || 'medium',
                due_date: taskData.dueDate.toISOString().split('T')[0]
            })
                .select()
                .single();
            if (error) {
                logger_1.default.error('Task creation error', { error: error.message });
                throw new Error(error.message);
            }
            return this.mapSupabaseTaskToTask(data);
        }
        catch (error) {
            logger_1.default.error('Task creation failed', { error: error.message });
            throw error;
        }
    }
    async findAll(query) {
        try {
            const page = query?.page || 1;
            const limit = query?.limit || 10;
            const offset = (page - 1) * limit;
            let supabaseQuery = this.supabase.from('tasks').select('*', { count: 'exact' });
            // Apply filters
            if (query?.assigneeId) {
                supabaseQuery = supabaseQuery.eq('assignee_id', query.assigneeId);
            }
            if (query?.assignedBy) {
                supabaseQuery = supabaseQuery.eq('assigned_by', query.assignedBy);
            }
            if (query?.status) {
                supabaseQuery = supabaseQuery.eq('status', query.status);
            }
            if (query?.priority) {
                supabaseQuery = supabaseQuery.eq('priority', query.priority);
            }
            const { data, error, count } = await supabaseQuery
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (error) {
                logger_1.default.error('Find tasks error', { error: error.message });
                throw new Error(error.message);
            }
            return {
                tasks: data.map(this.mapSupabaseTaskToTask),
                total: count || 0,
                page,
                limit
            };
        }
        catch (error) {
            logger_1.default.error('Find tasks failed', { error: error.message });
            throw error;
        }
    }
    async findById(id) {
        try {
            const { data, error } = await this.supabase
                .from('tasks')
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // Not found
                }
                logger_1.default.error('Find task by ID error', { error: error.message });
                throw new Error(error.message);
            }
            return this.mapSupabaseTaskToTask(data);
        }
        catch (error) {
            logger_1.default.error('Find task by ID failed', { error: error.message });
            throw error;
        }
    }
    async findByAssignee(assigneeId) {
        try {
            const { data, error } = await this.supabase
                .from('tasks')
                .select('*')
                .eq('assignee_id', assigneeId)
                .order('created_at', { ascending: false });
            if (error) {
                logger_1.default.error('Find tasks by assignee error', { error: error.message });
                throw new Error(error.message);
            }
            return data.map(this.mapSupabaseTaskToTask);
        }
        catch (error) {
            logger_1.default.error('Find tasks by assignee failed', { error: error.message });
            throw error;
        }
    }
    async update(id, taskData) {
        try {
            logger_1.default.info('Updating task', { id });
            const updateData = {};
            if (taskData.title !== undefined)
                updateData.title = taskData.title;
            if (taskData.description !== undefined)
                updateData.description = taskData.description;
            if (taskData.priority !== undefined)
                updateData.priority = taskData.priority;
            if (taskData.dueDate !== undefined)
                updateData.due_date = taskData.dueDate.toISOString().split('T')[0];
            const { data, error } = await this.supabase
                .from('tasks')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();
            if (error) {
                logger_1.default.error('Task update error', { error: error.message });
                throw new Error(error.message);
            }
            return this.mapSupabaseTaskToTask(data);
        }
        catch (error) {
            logger_1.default.error('Task update failed', { error: error.message });
            throw error;
        }
    }
    async updateStatus(id, status) {
        try {
            logger_1.default.info('Updating task status', { id, status });
            const updateData = { status };
            // Set completed_at if status is completed
            if (status === 'completed') {
                updateData.completed_at = new Date().toISOString();
            }
            const { data, error } = await this.supabase
                .from('tasks')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();
            if (error) {
                logger_1.default.error('Task status update error', { error: error.message });
                throw new Error(error.message);
            }
            return this.mapSupabaseTaskToTask(data);
        }
        catch (error) {
            logger_1.default.error('Task status update failed', { error: error.message });
            throw error;
        }
    }
    async delete(id) {
        try {
            const { error } = await this.supabase
                .from('tasks')
                .delete()
                .eq('id', id);
            if (error) {
                logger_1.default.error('Task deletion error', { error: error.message });
                throw new Error(error.message);
            }
        }
        catch (error) {
            logger_1.default.error('Task deletion failed', { error: error.message });
            throw error;
        }
    }
    async search(query) {
        try {
            logger_1.default.info('Searching tasks', { query });
            const { data, error } = await this.supabase
                .from('tasks')
                .select('*')
                .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
                .order('created_at', { ascending: false });
            if (error) {
                logger_1.default.error('Task search error', { error: error.message });
                throw new Error(error.message);
            }
            return data.map(this.mapSupabaseTaskToTask);
        }
        catch (error) {
            logger_1.default.error('Task search failed', { error: error.message });
            throw error;
        }
    }
    mapSupabaseTaskToTask(data) {
        return {
            id: data.id,
            title: data.title,
            description: data.description,
            assigneeId: data.assignee_id,
            assignedBy: data.assigned_by,
            status: data.status,
            priority: data.priority,
            dueDate: new Date(data.due_date),
            completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    }
}
exports.SupabaseTaskRepository = SupabaseTaskRepository;
//# sourceMappingURL=SupabaseTaskRepository.js.map