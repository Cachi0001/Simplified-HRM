import { Request, Response } from 'express';
import { AttendanceService } from '../services/AttendanceService';
import { CreateAttendanceRequest } from '../models/Attendance';
import logger from '../utils/logger';

export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  async checkIn(req: Request, res: Response): Promise<void> {
    try {
      const attendanceData: CreateAttendanceRequest = req.body;
      const userId = req.user?.id;

      logger.info('AttendanceController: Check-in request', { userId });

      const attendance = await this.attendanceService.checkIn(userId, attendanceData);

      res.status(201).json({
        status: 'success',
        message: 'Checked in successfully',
        data: { attendance }
      });
    } catch (error) {
      logger.error('AttendanceController: Check-in error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async checkOut(req: Request, res: Response): Promise<void> {
    try {
      const attendanceData: CreateAttendanceRequest = req.body;
      const userId = req.user?.id;

      logger.info('AttendanceController: Check-out request', { userId });

      const attendance = await this.attendanceService.checkOut(userId, attendanceData);

      res.status(200).json({
        status: 'success',
        message: 'Checked out successfully',
        data: { attendance }
      });
    } catch (error) {
      logger.error('AttendanceController: Check-out error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async getCurrentStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      const attendance = await this.attendanceService.getCurrentStatus(userId);

      res.status(200).json({
        status: 'success',
        data: { attendance }
      });
    } catch (error) {
      logger.error('AttendanceController: Get current status error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async getAttendanceHistory(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, page, limit } = req.query;
      const userId = req.user?.id;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      const pageNum = page ? parseInt(page as string) : undefined;
      const limitNum = limit ? parseInt(limit as string) : undefined;

      const result = await this.attendanceService.getMyAttendanceHistory(userId, start, end, pageNum, limitNum);

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error('AttendanceController: Get attendance history error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async getEmployeeAttendance(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId, startDate, endDate } = req.params;

      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const attendances = await this.attendanceService.getEmployeeAttendance(employeeId, start, end);

      res.status(200).json({
        status: 'success',
        data: { attendances }
      });
    } catch (error) {
      logger.error('AttendanceController: Get employee attendance error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }

  async getAttendanceReport(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId, startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const report = await this.attendanceService.getAttendanceReport(
        employeeId as string,
        start,
        end
      );

      res.status(200).json({
        status: 'success',
        data: { report }
      });
    } catch (error) {
      logger.error('AttendanceController: Get attendance report error', { error: (error as Error).message });
      res.status(400).json({
        status: 'error',
        message: (error as Error).message
      });
    }
  }
}
