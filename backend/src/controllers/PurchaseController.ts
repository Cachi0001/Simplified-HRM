import { Request, Response, NextFunction } from 'express';
import { PurchaseService } from '../services/PurchaseService';
import { ValidationError } from '../middleware/errorHandler';

export class PurchaseController {
  private purchaseService: PurchaseService;

  constructor() {
    this.purchaseService = new PurchaseService();
  }

  createPurchaseRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      const { 
        itemName, 
        description, 
        quantity, 
        unitPrice, 
        vendor, 
        category, 
        urgency, 
        justification, 
        notes, 
        budgetCode, 
        expectedDeliveryDate 
      } = req.body;

      if (!itemName || !unitPrice) {
        throw new ValidationError('Item name and unit price are required');
      }

      if (unitPrice <= 0) {
        throw new ValidationError('Unit price must be greater than 0');
      }

      if (quantity && quantity <= 0) {
        throw new ValidationError('Quantity must be greater than 0');
      }

      const result = await this.purchaseService.createPurchaseRequest(userId, {
        itemName,
        description,
        quantity,
        unitPrice,
        vendor,
        category,
        urgency,
        justification,
        notes,
        budgetCode,
        expectedDeliveryDate
      });

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          purchase_request_id: result.purchase_request_id,
          total_amount: result.total_amount
        }
      });
    } catch (error) {
      next(error);
    }
  };

  getMyPurchaseRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      const { status } = req.query;
      const purchaseRequests = await this.purchaseService.getMyPurchaseRequests(userId, status as string);

      res.json({
        success: true,
        data: purchaseRequests
      });
    } catch (error) {
      next(error);
    }
  };

  getAllPurchaseRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status } = req.query;
      const purchaseRequests = await this.purchaseService.getAllPurchaseRequests(status as string);

      res.json({
        success: true,
        data: purchaseRequests
      });
    } catch (error) {
      next(error);
    }
  };

  getPurchaseRequestById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const purchaseRequest = await this.purchaseService.getPurchaseRequestById(req.params.id);

      res.json({
        success: true,
        data: purchaseRequest
      });
    } catch (error) {
      next(error);
    }
  };

  approvePurchaseRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      const { notes } = req.body;
      const result = await this.purchaseService.approvePurchaseRequest(req.params.id, userId, notes);

      res.json({
        success: true,
        message: result.message,
        data: result.purchaseRequest
      });
    } catch (error) {
      next(error);
    }
  };

  rejectPurchaseRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      const { reason } = req.body;
      if (!reason) {
        throw new ValidationError('Rejection reason is required');
      }

      const result = await this.purchaseService.rejectPurchaseRequest(req.params.id, userId, reason);

      res.json({
        success: true,
        message: result.message,
        data: result.purchaseRequest
      });
    } catch (error) {
      next(error);
    }
  };

  cancelPurchaseRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      const result = await this.purchaseService.cancelPurchaseRequest(req.params.id, userId);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  };

  updatePurchaseStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, notes } = req.body;
      if (!status) {
        throw new ValidationError('Status is required');
      }

      const result = await this.purchaseService.updatePurchaseStatus(req.params.id, status, notes);

      res.json({
        success: true,
        message: result.message,
        data: result.purchaseRequest
      });
    } catch (error) {
      next(error);
    }
  };

  getMyPurchaseStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      const { year } = req.query;
      const stats = await this.purchaseService.getMyPurchaseStatistics(
        userId,
        year ? parseInt(year as string) : undefined
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  };

  getVendors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const vendors = await this.purchaseService.getVendors();

      res.json({
        success: true,
        data: vendors
      });
    } catch (error) {
      next(error);
    }
  };

  deletePurchaseRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ValidationError('User ID not found');
      }

      const result = await this.purchaseService.deletePurchaseRequest(req.params.id, userId);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  };
}
