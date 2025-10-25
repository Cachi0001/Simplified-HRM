"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
class AttendanceService {
    attendanceRepository;
    constructor(attendanceRepository) {
        this.attendanceRepository = attendanceRepository;
    }
    async checkIn(userId, attendanceData) {
        try {
            logger_1.default.info('AttendanceService: Check-in request', { userId });
            // Validate location data if provided
            if (attendanceData.location) {
                const { latitude, longitude, accuracy } = attendanceData.location;
                if (typeof latitude !== 'number' || typeof longitude !== 'number') {
                    throw new Error('Invalid location data');
                }
                if (accuracy && typeof accuracy !== 'number') {
                    throw new Error('Invalid location accuracy');
                }
                // Verify office location if required
                if (process.env.REQUIRE_OFFICE_LOCATION === 'true') {
                    const isValidLocation = this.verifyOfficeLocation(latitude, longitude);
                    if (!isValidLocation) {
                        const distance = this.calculateDistanceFromOffice(latitude, longitude);
                        const allowFallback = process.env.ALLOW_LOCATION_FALLBACK === 'true';
                        if (!allowFallback) {
                            throw new Error(`You are ${Math.round(distance)}m from the office. Please move closer to check in.`);
                        }
                        else {
                            logger_1.default.warn('AttendanceService: Check-in from outside office radius, but fallback allowed', {
                                userId,
                                distance: Math.round(distance)
                            });
                        }
                    }
                }
            }
            // Get employee ID from user ID
            const employeeId = await this.getEmployeeIdFromUserId(userId);
            const attendance = await this.attendanceRepository.checkIn(employeeId, attendanceData);
            logger_1.default.info('AttendanceService: Check-in successful', { attendanceId: attendance.id });
            return attendance;
        }
        catch (error) {
            logger_1.default.error('AttendanceService: Check-in failed', { error: error.message });
            throw error;
        }
    }
    async checkOut(userId, attendanceData) {
        try {
            logger_1.default.info('AttendanceService: Check-out request', { userId });
            // Validate location data if provided
            if (attendanceData.location) {
                const { latitude, longitude, accuracy } = attendanceData.location;
                if (typeof latitude !== 'number' || typeof longitude !== 'number') {
                    throw new Error('Invalid location data');
                }
                if (accuracy && typeof accuracy !== 'number') {
                    throw new Error('Invalid location accuracy');
                }
            }
            // Get employee ID from user ID
            const employeeId = await this.getEmployeeIdFromUserId(userId);
            const attendance = await this.attendanceRepository.checkOut(employeeId, attendanceData);
            logger_1.default.info('AttendanceService: Check-out successful', { attendanceId: attendance.id });
            return attendance;
        }
        catch (error) {
            logger_1.default.error('AttendanceService: Check-out failed', { error: error.message });
            throw error;
        }
    }
    async getCurrentStatus(userId) {
        try {
            const employeeId = await this.getEmployeeIdFromUserId(userId);
            return await this.attendanceRepository.getCurrentStatus(employeeId);
        }
        catch (error) {
            logger_1.default.error('AttendanceService: Get current status failed', { error: error.message });
            throw error;
        }
    }
    async getAttendanceHistory(employeeId, startDate, endDate, page, limit) {
        try {
            const query = {
                employeeId,
                startDate,
                endDate,
                page,
                limit
            };
            return await this.attendanceRepository.getAttendanceHistory(query);
        }
        catch (error) {
            logger_1.default.error('AttendanceService: Get attendance history failed', { error: error.message });
            throw error;
        }
    }
    async getMyAttendanceHistory(userId, startDate, endDate, page, limit) {
        try {
            const employeeId = await this.getEmployeeIdFromUserId(userId);
            return await this.getAttendanceHistory(employeeId, startDate, endDate, page, limit);
        }
        catch (error) {
            logger_1.default.error('AttendanceService: Get my attendance history failed', { error: error.message });
            throw error;
        }
    }
    async getEmployeeAttendance(employeeId, startDate, endDate) {
        try {
            return await this.attendanceRepository.getEmployeeAttendance(employeeId, startDate, endDate);
        }
        catch (error) {
            logger_1.default.error('AttendanceService: Get employee attendance failed', { error: error.message });
            throw error;
        }
    }
    async getAttendanceById(id) {
        try {
            return await this.attendanceRepository.getAttendanceById(id);
        }
        catch (error) {
            logger_1.default.error('AttendanceService: Get attendance by ID failed', { error: error.message });
            throw error;
        }
    }
    async updateAttendance(id, attendanceData) {
        try {
            return await this.attendanceRepository.updateAttendance(id, attendanceData);
        }
        catch (error) {
            logger_1.default.error('AttendanceService: Update attendance failed', { error: error.message });
            throw error;
        }
    }
    async deleteAttendance(id) {
        try {
            await this.attendanceRepository.deleteAttendance(id);
        }
        catch (error) {
            logger_1.default.error('AttendanceService: Delete attendance failed', { error: error.message });
            throw error;
        }
    }
    async getAttendanceReport(employeeId, startDate, endDate) {
        try {
            return await this.attendanceRepository.getAttendanceReport(employeeId, startDate, endDate);
        }
        catch (error) {
            logger_1.default.error('AttendanceService: Get attendance report failed', { error: error.message });
            throw error;
        }
    }
    verifyOfficeLocation(latitude, longitude) {
        const officeLatitude = parseFloat(process.env.OFFICE_LATITUDE || '0');
        const officeLongitude = parseFloat(process.env.OFFICE_LONGITUDE || '0');
        const officeRadius = parseFloat(process.env.OFFICE_RADIUS || '100');
        if (officeLatitude === 0 || officeLongitude === 0) {
            // If office location not configured, allow all locations
            return true;
        }
        const distance = this.calculateDistanceFromOffice(latitude, longitude);
        return distance <= officeRadius;
    }
    calculateDistanceFromOffice(latitude, longitude) {
        const officeLatitude = parseFloat(process.env.OFFICE_LATITUDE || '0');
        const officeLongitude = parseFloat(process.env.OFFICE_LONGITUDE || '0');
        const R = 6371e3; // Earth's radius in meters
        const φ1 = latitude * Math.PI / 180;
        const φ2 = officeLatitude * Math.PI / 180;
        const Δφ = (officeLatitude - latitude) * Math.PI / 180;
        const Δλ = (officeLongitude - longitude) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in meters
    }
    async getEmployeeIdFromUserId(userId) {
        try {
            return await this.attendanceRepository.getEmployeeIdFromUserId(userId);
        }
        catch (error) {
            logger_1.default.error('AttendanceService: Get employee ID failed', { error: error.message });
            throw error;
        }
    }
}
exports.AttendanceService = AttendanceService;
//# sourceMappingURL=AttendanceService.js.map