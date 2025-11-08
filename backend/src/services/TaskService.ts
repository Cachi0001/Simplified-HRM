import { TaskRepository, Task, CreateTaskData } from '../repositories/TaskRepository';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { EmailService } from './EmailService';

export class TaskService {
  private taskRepo: TaskRepository;
  private employeeRepo: EmployeeRepository;
  private emailService: EmailService;

  constructor() {
    this.taskRepo = new TaskRepository();
    this.employeeRepo = new EmployeeRepository();
    this.emailService = new EmailService();
  }

  async createTask(data: CreateTaskData): Promise<Task> {
    const task = await this.taskRepo.create(data);
    
    const assignee = await this.employeeRepo.findByUserId(data.assigneeId);
    const assigner = await this.employeeRepo.findByUserId(data.assignedBy);
    
    if (assignee && assigner) {
      await this.emailService.sendTaskAssignedEmail(
        assignee.email,
        assignee.full_name,
        data.title,
        data.dueDate?.toISOString()
      );
    }
    
    return task;
  }

  async getTasksByUserId(userId: string, status?: string): Promise<Task[]> {
    return await this.taskRepo.findByUserId(userId, status);
  }

  async getTaskById(id: string): Promise<Task | null> {
    return await this.taskRepo.findById(id);
  }

  async updateTaskStatus(taskId: string, userId: string, newStatus: string): Promise<Task> {
    const task = await this.taskRepo.updateStatus(taskId, userId, newStatus);
    
    return task;
  }

  async getAllTasks(filters?: { status?: string; assigneeId?: string; assignedBy?: string }): Promise<Task[]> {
    return await this.taskRepo.findAll(filters);
  }
}
