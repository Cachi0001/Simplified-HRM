import { Router } from 'express';
import { PurchaseController } from '../controllers/PurchaseController';
import { authenticate } from '../middleware/auth';

const router = Router();
const purchaseController = new PurchaseController();

router.use(authenticate);

// Vendor routes
router.get('/vendors', purchaseController.getVendors);

// Purchase request routes
router.post('/request', purchaseController.createPurchaseRequest);

router.get('/my-requests', purchaseController.getMyPurchaseRequests);

router.get('/my-statistics', purchaseController.getMyPurchaseStatistics);

router.get('/requests', purchaseController.getAllPurchaseRequests);

router.get('/requests/:id', purchaseController.getPurchaseRequestById);

router.put('/requests/:id/approve', purchaseController.approvePurchaseRequest);

router.put('/requests/:id/reject', purchaseController.rejectPurchaseRequest);

router.put('/requests/:id/cancel', purchaseController.cancelPurchaseRequest);

router.put('/requests/:id/status', purchaseController.updatePurchaseStatus);

router.delete('/requests/:id', purchaseController.deletePurchaseRequest);

export default router;
