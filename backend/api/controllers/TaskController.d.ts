import { Request, Response } from 'express';
import { TaskService } from '../services/TaskService';
export declare class TaskController {
    private taskService;
    constructor(taskService: TaskService);
    createTask(req: Request, res: Response): Promise<void>;
    getAllTasks(req: Request, res: Response): Promise<void>;
    searchTasks(req: Request, res: Response): Promise<void>;
    getTaskById(req: Request, res: Response): Promise<void>;
    getMyTasks(req: Request, res: Response): Promise<void>;
    updateTask(req: Request, res: Response): Promise<void>;
    updateTaskStatus(req: Request, res: Response): Promise<void>;
    deleteTask(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=TaskController.d.ts.map