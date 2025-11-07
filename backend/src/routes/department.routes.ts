import { Router } from 'express';
import { DepartmentController } from '../controllers/DepartmentController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const departmentController = new DepartmentController();

router.use(authenticate);

router.get('/', departmentController.getAllDepartments);

router.get('/:id', departmentController.getDepartmentById);

router.post('/', 
  authorize('superadmin', 'admin', 'hr'),
  departmentController.createDepartment
);

router.put('/:id',
  authorize('superadmin', 'admin', 'hr'),
  departmentController.updateDepartment
);

router.delete('/:id',
  authorize('superadmin', 'admin', 'hr'),
  departmentController.deleteDepartment
);

export default router;
