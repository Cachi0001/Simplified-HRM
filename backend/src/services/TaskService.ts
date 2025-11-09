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
    // Try to find by employee ID first, then by user ID
    let assigneeEmployee = await this.employeeRepo.findById(data.assigneeId);
    if (!assigneeEmployee) {
      assigneeEmployee = await this.employeeRepo.findByUserId(data.assigneeId);
    }
    
    let assignerEmployee = await this.employeeRepo.findById(data.assignedBy);
    if (!assignerEmployee) {
      assignerEmployee = await this.employeeRepo.findByUserId(data.assignedBy);
    }
    
    if (!assigneeEmployee) {
      throw new Error('Assignee employee not found');
    }
    
    if (!assignerEmployee) {
      throw new Error('Assigner employee not found');
    }
    
    // Prevent self-assignment
    if (assigneeEmployee.id === assignerEmployee.id || assigneeEmployee.user_id === assignerEmployee.user_id) {
      throw new Error('Cannot assign task to yourself');
    }
    
    // Use employee IDs
    const taskData = {
      ...data,
      assigneeId: assigneeEmployee.id,
      assignedBy: assignerEmployee.id
    };
    
    const task = await this.taskRepo.create(taskData);
    
    // Send email notification
    try {
      await this.emailService.sendTaskAssignedEmail(
        assigneeEmployee.email,
        assigneeEmployee.full_name,
        data.title,
        data.dueDate?.toISOString()
      );
    } catch (emailError) {
      console.error('Failed to send task email:', emailError);
      // Don't fail task creation if email fails
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
