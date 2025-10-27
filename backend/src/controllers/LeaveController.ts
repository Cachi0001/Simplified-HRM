import { Request, Response } from 'express';
import { LeaveService } from '../services/LeaveService';

export class LeaveController {
    constructor(private leaveService: LeaveService) {}

    async createLeaveRequest(req: Request, res: Response) {
        // Implementation here
    }

    async approveLeaveRequest(req: Request, res: Response) {
        // Implementation here
    }

    async getPendingLeaveRequests(req: Request, res: Response) {
        // Implementation here
    }
}