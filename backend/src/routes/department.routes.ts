import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { DepartmentController } from '../controllers/DepartmentController';
import { DepartmentService } from '../services/DepartmentService';

const router = Router();

const departmentService = new DepartmentService();
const departmentController = new DepartmentController(departmentService);

// Protect all routes with authentication
router.use(authenticateToken);

/**
 * Department Management
 */
router.post('/', (req, res) => departmentController.createDepartment(req, res));
router.get('/', (req, res) => departmentController.getAllDepartments(req, res));
router.get('/search', (req, res) => departmentController.searchDepartments(req, res));
router.get('/my-departments', (req, res) => departmentController.getMyDepartments(req, res));
router.get('/:id', (req, res) => departmentController.getDepartment(req, res));
router.put('/:id', (req, res) => departmentController.updateDepartment(req, res));
router.delete('/:id', (req, res) => departmentController.deleteDepartment(req, res));

/**
 * Department Member Management
 */
router.get('/:id/members', (req, res) => departmentController.getDepartmentMembers(req, res));
router.post('/:id/members', (req, res) => departmentController.addDepartmentMember(req, res));
router.delete('/:id/members/:userId', (req, res) => departmentController.removeDepartmentMember(req, res));
router.put('/:id/members/:userId/role', (req, res) => departmentController.updateMemberRole(req, res));

/**
 * Department Task Assignment
 */
router.post('/:id/assign-task', (req, res) => departmentController.assignTaskToDepartment(req, res));

/**
 * Department Statistics
 */
router.get('/:id/stats', (req, res) => departmentController.getDepartmentStats(req, res));

export default router;