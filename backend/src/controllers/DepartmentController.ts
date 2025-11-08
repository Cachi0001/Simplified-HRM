import { Request, Response, NextFunction } from 'express';
import { DepartmentService } from '../services/DepartmentService';

export class DepartmentController {
  private departmentService: DepartmentService;

  constructor() {
    this.departmentService = new DepartmentService();
  }

  getAllDepartments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const departments = await this.departmentService.getAllDepartments();
      res.json({
        success: true,
        data: departments
      });
    } catch (error) {
      next(error);
    }
  };

  getDepartmentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const department = await this.departmentService.getDepartmentById(id);
      res.json({
        success: true,
        data: department
      });
    } catch (error) {
      next(error);
    }
  };

  createDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // For now, don't pass created_by since it requires employee ID lookup
      // The database function has it as optional (DEFAULT NULL)
      const data = {
        ...req.body,
        created_by: null
      };
      
      const department = await this.departmentService.createDepartment(data);
      res.status(201).json({
        success: true,
        message: 'Department created successfully',
        data: department
      });
    } catch (error) {
      next(error);
    }
  };

  updateDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const department = await this.departmentService.updateDepartment(id, req.body);
      res.json({
        success: true,
        message: 'Department updated successfully',
        data: department
      });
    } catch (error) {
      next(error);
    }
  };

  deleteDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.departmentService.deleteDepartment(id);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  };
}
