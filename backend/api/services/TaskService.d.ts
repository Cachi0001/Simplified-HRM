import { ITaskRepository } from '../repositories/interfaces/ITaskRepository';
import { ITask, CreateTaskRequest, UpdateTaskRequest, TaskQuery } from '../models/Task';
export declare class TaskService {
    private taskRepository;
    constructor(taskRepository: ITaskRepository);
    private resolveEmployeeId;
    createTask(taskData: CreateTaskRequest, assignedBy: string, currentUserRole: string): Promise<ITask>;
    getAllTasks(query?: TaskQuery, currentUserRole?: string, currentUserId?: string): Promise<{
        tasks: ITask[];
        total: number;
        page: number;
        limit: number;
    }>;
    getTaskById(id: string, currentUserRole: string, currentUserId?: string): Promise<ITask | null>;
    getMyTasks(userId: string): Promise<ITask[]>;
    updateTask(id: string, taskData: UpdateTaskRequest, currentUserRole: string, currentUserId?: string): Promise<ITask>;
    updateTaskStatus(id: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled', currentUserRole: string, currentUserId?: string): Promise<ITask>;
    deleteTask(id: string, currentUserRole: string, currentUserId?: string): Promise<void>;
    searchTasks(query: string, currentUserRole?: string, currentUserId?: string): Promise<ITask[]>;
}
//# sourceMappingURL=TaskService.d.ts.map