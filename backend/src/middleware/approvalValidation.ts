import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export interface ApprovalValidationRequest extends Request {
    approvalContext?: {
        canApprove: boolean;
        requesterRole: string;
        approverRole: string;
        approvalLevel: string;
        reason?: string;
    };
}

/**
 * Hierarchical approval validation middleware
 * Validates if the current user can approve requests based on role hierarchy
 */
export const validateApprovalPermissions = (requestType: 'leave' | 'purchase') => {
    return async (req: ApprovalValidationRequest, res: Response, next: NextFunction) => {
        try {
            const approverRole = req.user?.role;
            const approverId = req.user?.employeeId || req.user?.id;

            if (!approverRole || !approverId) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Authentication required'
                });
            }

            // Get the request to determine requester role
            const requestId = req.params.id;
            if (!requestId) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Request ID is required'
                });
            }

            // This will be populated by the service layer
            // For now, we'll validate based on approver role only
            const approvalValidation = validateHierarchicalApproval(approverRole);

            req.approvalContext = {
                canApprove: approvalValidation.canApprove,
                requesterRole: 'unknown', // Will be determined by service
                approverRole,
                approvalLevel: approvalValidation.approvalLevel,
                reason: approvalValidation.reason
            };

            if (!approvalValidation.canApprove) {
                return res.status(403).json({
                    status: 'error',
                    message: approvalValidation.reason || 'Insufficient permissions for approval'
                });
            }

            next();
        } catch (error) {
            logger.error('❌ [ApprovalValidation] Validation error', {
                error: (error as Error).message,
                requestType
            });
            res.status(500).json({
                status: 'error',
                message: 'Internal server error during approval validation'
            });
        }
    };
};

/**
 * Validates hierarchical approval based on role
 */
function validateHierarchicalApproval(approverRole: string): {
    canApprove: boolean;
    approvalLevel: string;
    reason?: string;
} {
    switch (approverRole) {
        case 'superadmin':
            return {
                canApprove: true,
                approvalLevel: 'superadmin_only'
            };
        
        case 'admin':
        case 'hr':
            return {
                canApprove: true,
                approvalLevel: 'hr_admin'
            };
        
        case 'teamlead':
        case 'employee':
        default:
            return {
                canApprove: false,
                approvalLevel: 'none',
                reason: 'Only HR, Admin, and Superadmin can approve requests'
            };
    }
}

/**
 * Validates if approver can approve specific requester's request
 */
export function canApproveRequest(approverRole: string, requesterRole: string): {
    canApprove: boolean;
    reason?: string;
} {
    // Superadmin can approve everything
    if (approverRole === 'superadmin') {
        return { canApprove: true };
    }

    // HR and Admin can approve employee and teamlead requests
    if (['hr', 'admin'].includes(approverRole)) {
        if (['employee', 'teamlead'].includes(requesterRole)) {
            return { canApprove: true };
        }
        
        if (['hr', 'admin'].includes(requesterRole)) {
            return {
                canApprove: false,
                reason: 'Only Superadmin can approve HR and Admin requests'
            };
        }
        
        if (requesterRole === 'superadmin') {
            return {
                canApprove: false,
                reason: 'Superadmin requests cannot be approved by anyone'
            };
        }
    }

    // Teamlead and employee cannot approve any requests
    if (['teamlead', 'employee'].includes(approverRole)) {
        return {
            canApprove: false,
            reason: 'Insufficient role permissions for approval'
        };
    }

    return {
        canApprove: false,
        reason: 'Invalid role combination for approval'
    };
}

/**
 * Determines approval level based on requester role
 */
export function determineApprovalLevel(requesterRole: string): string {
    switch (requesterRole) {
        case 'employee':
        case 'teamlead':
            return 'hr_admin';
        case 'hr':
        case 'admin':
            return 'superadmin_only';
        case 'superadmin':
            return 'auto_approved';
        default:
            return 'hr_admin';
    }
}

/**
 * Middleware to validate specific approval action
 */
export const validateSpecificApproval = (requestType: 'leave' | 'purchase') => {
    return async (req: ApprovalValidationRequest, res: Response, next: NextFunction) => {
        try {
            const approverRole = req.user?.role;
            const { requesterRole } = req.body; // This should be provided by the service

            if (!approverRole) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Authentication required'
                });
            }

            if (!requesterRole) {
                // If requester role is not provided, continue and let service handle it
                return next();
            }

            const validation = canApproveRequest(approverRole, requesterRole);

            if (!validation.canApprove) {
                return res.status(403).json({
                    status: 'error',
                    message: validation.reason || 'Cannot approve this request'
                });
            }

            // Add validation context to request
            req.approvalContext = {
                ...req.approvalContext,
                canApprove: true,
                requesterRole,
                approverRole,
                approvalLevel: req.approvalContext?.approvalLevel || 'hr_admin'
            };

            next();
        } catch (error) {
            logger.error('❌ [SpecificApprovalValidation] Validation error', {
                error: (error as Error).message,
                requestType
            });
            res.status(500).json({
                status: 'error',
                message: 'Internal server error during approval validation'
            });
        }
    };
};