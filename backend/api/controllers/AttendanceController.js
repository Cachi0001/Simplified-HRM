"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceController = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
class AttendanceController {
    attendanceService;
    constructor(attendanceService) {
        this.attendanceService = attendanceService;
    }
    async checkIn(req, res) {
        try {
            const attendanceData = req.body;
            const userId = req.user?.id;
            logger_1.default.info('AttendanceController: Check-in request', { userId });
            const attendance = await this.attendanceService.checkIn(userId, attendanceData);
            res.status(201).json({
                status: 'success',
                message: 'Checked in successfully',
                data: { attendance }
            });
        }
        catch (error) {
            logger_1.default.error('AttendanceController: Check-in error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async checkOut(req, res) {
        try {
            const attendanceData = req.body;
            const userId = req.user?.id;
            logger_1.default.info('AttendanceController: Check-out request', { userId });
            const attendance = await this.attendanceService.checkOut(userId, attendanceData);
            res.status(200).json({
                status: 'success',
                message: 'Checked out successfully',
                data: { attendance }
            });
        }
        catch (error) {
            logger_1.default.error('AttendanceController: Check-out error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async getCurrentStatus(req, res) {
        try {
            const userId = req.user?.id;
            const attendance = await this.attendanceService.getCurrentStatus(userId);
            res.status(200).json({
                status: 'success',
                data: { attendance }
            });
        }
        catch (error) {
            logger_1.default.error('AttendanceController: Get current status error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async getAttendanceHistory(req, res) {
        try {
            const { startDate, endDate, page, limit } = req.query;
            const userId = req.user?.id;
            const start = startDate ? new Date(startDate) : undefined;
            const end = endDate ? new Date(endDate) : undefined;
            const pageNum = page ? parseInt(page) : undefined;
            const limitNum = limit ? parseInt(limit) : undefined;
            const result = await this.attendanceService.getMyAttendanceHistory(userId, start, end, pageNum, limitNum);
            res.status(200).json({
                status: 'success',
                data: result
            });
        }
        catch (error) {
            logger_1.default.error('AttendanceController: Get attendance history error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async getEmployeeAttendance(req, res) {
        try {
            const { employeeId, startDate, endDate } = req.params;
            const start = startDate ? new Date(startDate) : undefined;
            const end = endDate ? new Date(endDate) : undefined;
            const attendances = await this.attendanceService.getEmployeeAttendance(employeeId, start, end);
            res.status(200).json({
                status: 'success',
                data: { attendances }
            });
        }
        catch (error) {
            logger_1.default.error('AttendanceController: Get employee attendance error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async getAttendanceReport(req, res) {
        try {
            const { employeeId, startDate, endDate } = req.query;
            const userRole = req.user?.role;
            const userId = req.user?.id;
            // If employee, they can only access their own attendance data
            if (userRole === 'employee') {
                if (employeeId && employeeId !== userId) {
                    res.status(403).json({
                        status: 'error',
                        message: 'You can only access your own attendance data'
                    });
                    return;
                }
                // If no employeeId specified, use the current user's ID
                const targetEmployeeId = employeeId || userId;
                if (!targetEmployeeId) {
                    res.status(400).json({
                        status: 'error',
                        message: 'Employee ID is required'
                    });
                    return;
                }
            }
            const start = startDate ? new Date(startDate) : undefined;
            const end = endDate ? new Date(endDate) : undefined;
            // For employees, use their own user ID as employee ID
            const targetEmployeeId = userRole === 'employee' ? userId : employeeId;
            const report = await this.attendanceService.getAttendanceReport(targetEmployeeId, start, end);
            res.status(200).json({
                status: 'success',
                data: { report }
            });
        }
        catch (error) {
            logger_1.default.error('AttendanceController: Get attendance report error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
}
exports.AttendanceController = AttendanceController;
//# sourceMappingURL=AttendanceController.js.map