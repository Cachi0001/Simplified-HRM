import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import ApprovalWorkflowController from '../controllers/ApprovalWorkflowController';

const router = Router();

// Protect all routes with authentication
router.use(authenticateToken);

/**
 * Approval Workflow Management
 */
router.get('/pending', (req, res) => ApprovalWorkflowController.getPendingApprovals(req, res));
router.get('/stats', (req, res) => ApprovalWorkflowController.getApprovalStats(req, res));
router.post('/bulk-approve', (req, res) => ApprovalWorkflowController.bulkApprove(req, res));

/**
 * Workflow Configuration
 */
router.post('/config', (req, res) => ApprovalWorkflowController.setWorkflowConfig(req, res));
router.get('/config/:requestType', (req, res) => ApprovalWorkflowController.getWorkflowConfig(req, res));

/**
 * Request-specific Approval Operations
 */
router.get('/:requestType/:requestId', (req, res) => ApprovalWorkflowController.getApprovalWorkflow(req, res));
router.post('/:requestType/:requestId/approve', (req, res) => ApprovalWorkflowController.processApproval(req, res));
router.get('/:requestType/:requestId/history', (req, res) => ApprovalWorkflowController.getApprovalHistory(req, res));
router.post('/:requestType/:requestId/delegate', (req, res) => ApprovalWorkflowController.delegateApproval(req, res));
router.post('/:requestType/:requestId/escalate', (req, res) => ApprovalWorkflowController.escalateApproval(req, res));

export default router;