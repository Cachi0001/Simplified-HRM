import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { PurchaseController } from '../controllers/PurchaseController';
import { PurchaseService } from '../services/PurchaseService';
import { ApprovalWorkflowService } from '../services/ApprovalWorkflowService';
import { ComprehensiveNotificationService } from '../services/ComprehensiveNotificationService';
import { NotificationService } from '../services/NotificationService';
import { EmailService } from '../services/EmailService';
import db from '../config/database';

const router = Router();

const emailService = new EmailService(db);
const purchaseService = new PurchaseService();
const notificationService = new NotificationService();
const approvalWorkflowService = new ApprovalWorkflowService(db, notificationService, emailService);
const comprehensiveNotificationService = new ComprehensiveNotificationService(db, notificationService, emailService);
const purchaseController = new PurchaseController(purchaseService, approvalWorkflowService, notificationService, emailService);

// Protect all routes with authentication
router.use(authenticateToken);

/**
 * General Purchase Request Management
 */
// Root route - returns all requests based on user role
router.get('/', (req, res) => purchaseController.getAllPurchaseRequests(req, res));
// Root POST route for creating requests
router.post('/', (req, res) => purchaseController.createPurchaseRequest(req, res));

/**
 * Employee Purchase Request Management
 */
router.post('/request', (req, res) => purchaseController.createPurchaseRequest(req, res));
router.get('/my-requests', (req, res) => purchaseController.getMyPurchaseRequests(req, res));
router.get('/stats', (req, res) => purchaseController.getPurchaseStats(req, res));
router.get('/:id', (req, res) => purchaseController.getPurchaseRequest(req, res));
router.put('/:id', (req, res) => purchaseController.updatePurchaseRequest(req, res));
router.delete('/:id', (req, res) => purchaseController.deletePurchaseRequest(req, res));
router.put('/:id/cancel', (req, res) => purchaseController.cancelPurchaseRequest(req, res));

/**
 * Admin/HR Purchase Request Management
 */
router.get('/admin/all', (req, res) => purchaseController.getAllPurchaseRequests(req, res));
router.get('/admin/pending', (req, res) => purchaseController.getPendingPurchaseRequests(req, res));
router.put('/:id/approve', (req, res) => purchaseController.approvePurchaseRequest(req, res));
router.put('/:id/reject', (req, res) => purchaseController.rejectPurchaseRequest(req, res));

// Legacy route for backward compatibility
router.get('/pending', (req, res) => purchaseController.getPendingPurchaseRequests(req, res));

export default router;
