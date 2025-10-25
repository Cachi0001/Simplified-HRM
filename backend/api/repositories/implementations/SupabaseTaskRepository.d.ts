import { ITaskRepository } from '../interfaces/ITaskRepository';
import { Task, CreateTaskRequest, UpdateTaskRequest, TaskQuery } from '../../models/Task';
export declare class SupabaseTaskRepository implements ITaskRepository {
    private supabase;
    constructor(supabase: any);
    create(taskData: CreateTaskRequest, assignedBy: string): Promise<Task>;
    findAll(query?: TaskQuery): Promise<{
        tasks: Task[];
        total: number;
        page: number;
        limit: number;
    }>;
    findById(id: string): Promise<Task | null>;
    findByAssignee(assigneeId: string): Promise<Task[]>;
    update(id: string, taskData: UpdateTaskRequest): Promise<Task>;
    updateStatus(id: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled'): Promise<Task>;
    delete(id: string): Promise<void>;
    search(query: string): Promise<Task[]>;
    private mapSupabaseTaskToTask;
}
//# sourceMappingURL=SupabaseTaskRepository.d.ts.map