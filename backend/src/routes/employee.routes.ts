import { Router, Request, Response, NextFunction } from 'express';
import { EmployeeRepository } from '../repositories/EmployeeRepository';
import { authenticate } from '../middleware/auth';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

const router = Router();
const employeeRepo = new EmployeeRepository();

// All routes require authentication
router.use(authenticate);

// Get pending employees (for admin approval)
router.get('/pending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employees = await employeeRepo.findPending();
    res.json({
      success: true,
      employees
    });
  } catch (error) {
    next(error);
  }
});

// Get all employees (for management)
router.get('/management', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, department } = req.query;
    const filters: any = {};
    
    if (status) filters.status = status as string;
    if (department) filters.department = department as string;
    
    const employees = await employeeRepo.findAll(filters);
    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    next(error);
  }
});

// Get employees for task assignment
router.get('/for-tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employees = await employeeRepo.findAll({ status: 'active' });
    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    next(error);
  }
});

// Get my profile
router.get('/my-profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      throw new ValidationError('User ID not found');
    }
    
    const employee = await employeeRepo.findByUserId(userId);
    if (!employee) {
      throw new NotFoundError('Employee profile not found');
    }
    
    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    next(error);
  }
});

// Update my profile
router.put('/my-profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      throw new ValidationError('User ID not found');
    }
    
    const employee = await employeeRepo.findByUserId(userId);
    if (!employee) {
      throw new NotFoundError('Employee profile not found');
    }
    
    const updated = await employeeRepo.updateProfile(employee.id, req.body);
    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
});

// Get employee by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await employeeRepo.findById(req.params.id);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    
    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    next(error);
  }
});

// Approve employee
router.post('/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.body;
    const approverId = (req as any).user?.userId;
    
    const employee = await employeeRepo.approve(req.params.id, approverId, role || 'employee');
    res.json({
      success: true,
      message: 'Employee approved successfully',
      data: employee
    });
  } catch (error) {
    next(error);
  }
});

// Reject employee
router.post('/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    const employee = await employeeRepo.reject(req.params.id, reason || 'Application rejected');
    res.json({
      success: true,
      message: 'Employee rejected',
      data: employee
    });
  } catch (error) {
    next(error);
  }
});

// Bulk update employees
router.post('/bulk-update', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { updates } = req.body;
    
    if (!Array.isArray(updates)) {
      throw new ValidationError('Updates must be an array');
    }
    
    const results = await Promise.all(
      updates.map(async (update: any) => {
        try {
          const employee = await employeeRepo.updateProfile(update.id, update.data);
          return { id: update.id, success: true, employee };
        } catch (error: any) {
          return { id: update.id, success: false, error: error.message };
        }
      })
    );
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
});

// Update working days
router.put('/:id/working-days', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workingDays } = req.body;
    
    if (!Array.isArray(workingDays)) {
      throw new ValidationError('Working days must be an array');
    }
    
    const employee = await employeeRepo.updateWorkingDays(req.params.id, workingDays);
    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    next(error);
  }
});

export default router;
