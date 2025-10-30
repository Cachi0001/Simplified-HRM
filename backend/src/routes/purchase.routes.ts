import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { PurchaseController } from '../controllers/PurchaseController';
import { PurchaseService } from '../services/PurchaseService';

const router = Router();

const purchaseService = new PurchaseService();
const purchaseController = new PurchaseController(purchaseService);

// Protect all routes with authentication
router.use(authenticateToken);

/**
 * Employee Purchase Request Management
 */
router.post('/request', (req, res) => purchaseController.createPurchaseRequest(req, res));
router.get('/my-requests', (req, res) => purchaseController.getMyPurchaseRequests(req, res));
router.get('/stats', (req, res) => purchaseController.getPurchaseStats(req, res));
router.get('/:id', (req, res) => purchaseController.getPurchaseRequest(req, res));
router.put('/:id', (req, res) => purchaseController.updatePurchaseRequest(req, res));
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
