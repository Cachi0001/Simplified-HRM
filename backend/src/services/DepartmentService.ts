import { DepartmentRepository, CreateDepartmentData, UpdateDepartmentData, Department } from '../repositories/DepartmentRepository';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { ConflictError, NotFoundError, ValidationError } from '../middleware/errorHandler';

export class DepartmentService {
  private departmentRepo: DepartmentRepository;
  private employeeRepo: EmployeeRepository;

  constructor() {
    this.departmentRepo = new DepartmentRepository();
    this.employeeRepo = new EmployeeRepository();
  }

  async getAllDepartments(): Promise<Department[]> {
    return await this.departmentRepo.getAll();
  }

  async getDepartmentById(id: string): Promise<Department> {
    const department = await this.departmentRepo.getById(id);
    
    if (!department) {
      throw new NotFoundError('Department not found');
    }
    
    return department;
  }

  async createDepartment(data: CreateDepartmentData): Promise<Department> {
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Department name is required');
    }

    const existingDepartment = await this.departmentRepo.getByName(data.name);
    if (existingDepartment) {
      throw new ConflictError('A department with this name already exists');
    }

    if (data.team_lead_id) {
      const teamLead = await this.employeeRepo.findById(data.team_lead_id);
      if (!teamLead) {
        throw new NotFoundError('Team lead not found');
      }
      if (teamLead.status !== 'active') {
        throw new ValidationError('Team lead must be an active employee');
      }
    }

    return await this.departmentRepo.create(data);
  }

  async updateDepartment(id: string, data: UpdateDepartmentData): Promise<Department> {
    const existingDepartment = await this.departmentRepo.getById(id);
    if (!existingDepartment) {
      throw new NotFoundError('Department not found');
    }

    if (data.name) {
      const nameCheck = await this.departmentRepo.getByName(data.name);
      if (nameCheck && nameCheck.id !== id) {
        throw new ConflictError('A department with this name already exists');
      }
    }

    if (data.team_lead_id) {
      const teamLead = await this.employeeRepo.findById(data.team_lead_id);
      if (!teamLead) {
        throw new NotFoundError('Team lead not found');
      }
      if (teamLead.status !== 'active') {
        throw new ValidationError('Team lead must be an active employee');
      }
    }

    return await this.departmentRepo.update(id, data);
  }

  async deleteDepartment(id: string): Promise<{ success: boolean; message: string }> {
    const existingDepartment = await this.departmentRepo.getById(id);
    if (!existingDepartment) {
      throw new NotFoundError('Department not found');
    }

    return await this.departmentRepo.delete(id);
  }
}
