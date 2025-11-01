/**
 * Role Management Routes
 */
import express from 'express';
import RoleManagementController from '../controllers/RoleManagementController';
import { requireRole, validateRoleChange } from '../middleware/roleAuth';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Role management operations (HR and above)
router.put('/update-role', requireRole('hr'), validateRoleChange, RoleManagementController.updateUserRole);
router.get('/managed-users', requireRole('hr'), RoleManagementController.getManagedUsers);
router.get('/hierarchy', requireRole('employee'), RoleManagementController.getRoleHierarchy);

// Team lead assignment (HR and above)
router.post('/assign-teamlead', requireRole('hr'), RoleManagementController.assignToTeamLead);
router.get('/team-members/:teamLeadId', requireRole('teamlead'), RoleManagementController.getTeamMembers);

export default router;