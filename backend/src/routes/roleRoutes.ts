import { Router } from 'express';
import { RoleController } from '../controllers/RoleController';
import { authenticateToken } from '../middleware/auth.middleware';
import { 
  requireAdmin, 
  requireRoleManagement, 
  validateRoleChange 
} from '../middleware/auth.middleware';

const router = Router();
const roleController = new RoleController();

// All role routes require authentication
router.use(authenticateToken);

/**
 * @route GET /api/roles/hierarchy
 * @desc Get role hierarchy information
 * @access Private (All authenticated users)
 */
router.get('/hierarchy', roleController.getRoleHierarchy.bind(roleController));

/**
 * @route GET /api/roles/manageable
 * @desc Get roles that current user can manage
 * @access Private (All authenticated users)
 */
router.get('/manageable', roleController.getManageableRoles.bind(roleController));

/**
 * @route PUT /api/roles/update
 * @desc Update user role
 * @access Private (Admin and above)
 */
router.put('/update', requireAdmin, requireRoleManagement, roleController.updateUserRole.bind(roleController));

/**
 * @route GET /api/roles/users/:role
 * @desc Get users by role
 * @access Private (Admin and above)
 */
router.get('/users/:role', requireAdmin, roleController.getUsersByRole.bind(roleController));

/**
 * @route GET /api/roles/permissions/:userId
 * @desc Get user permissions (own or another user's if authorized)
 * @access Private (All authenticated users for own, Admin+ for others)
 */
router.get('/permissions/:userId', roleController.getUserPermissions.bind(roleController));

/**
 * @route GET /api/roles/permissions
 * @desc Get current user's permissions
 * @access Private
 */
router.get('/permissions', roleController.getUserPermissions.bind(roleController));

/**
 * @route POST /api/roles/check-permission
 * @desc Check if user has specific permission
 * @access Private (All authenticated users)
 */
router.post('/check-permission', roleController.checkPermission.bind(roleController));

export default router;