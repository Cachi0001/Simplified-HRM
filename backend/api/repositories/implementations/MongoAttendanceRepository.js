"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoAttendanceRepository = void 0;
const Attendance_1 = require("../../models/Attendance");
const Employee_1 = require("../../models/Employee");
const logger_1 = __importDefault(require("../../utils/logger"));
class MongoAttendanceRepository {
    async checkIn(employeeId, attendanceData) {
        try {
            logger_1.default.info('🔍 [MongoAttendanceRepository] Employee check-in', {
                employeeId,
                location: attendanceData.location
            });
            // Check if employee is already checked in today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const existingAttendance = await Attendance_1.Attendance.findOne({
                employeeId,
                date: { $gte: today, $lt: tomorrow },
                status: 'checked_in',
            });
            if (existingAttendance) {
                throw new Error('You have already checked in.');
            }
            const attendance = new Attendance_1.Attendance({
                employeeId,
                checkInTime: new Date(),
                status: 'checked_in',
                date: new Date(),
                ...attendanceData,
            });
            await attendance.save();
            await attendance.populate('employeeId');
            logger_1.default.info('✅ [MongoAttendanceRepository] Employee checked in successfully', {
                attendanceId: attendance._id,
                employeeId,
                checkInTime: attendance.checkInTime
            });
            return attendance;
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAttendanceRepository] Check-in failed:', error);
            throw error;
        }
    }
    async checkOut(employeeId, attendanceData) {
        try {
            logger_1.default.info('🔍 [MongoAttendanceRepository] Employee check-out', {
                employeeId,
                location: attendanceData.location
            });
            // Find today's check-in record
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const attendance = await Attendance_1.Attendance.findOne({
                employeeId,
                date: { $gte: today, $lt: tomorrow },
                status: 'checked_in',
            });
            if (!attendance) {
                throw new Error('No active check-in found for today');
            }
            // Update attendance with check-out data
            attendance.checkOutTime = new Date();
            attendance.status = 'checked_out';
            attendance.totalHours = undefined; // Will be calculated by pre-save hook
            if (attendanceData.location) {
                attendance.location = attendanceData.location;
            }
            if (attendanceData.notes) {
                attendance.notes = attendanceData.notes;
            }
            await attendance.save();
            await attendance.populate('employeeId');
            logger_1.default.info('✅ [MongoAttendanceRepository] Employee checked out successfully', {
                attendanceId: attendance._id,
                employeeId,
                checkInTime: attendance.checkInTime,
                checkOutTime: attendance.checkOutTime,
                totalHours: attendance.totalHours
            });
            return attendance;
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAttendanceRepository] Check-out failed:', error);
            throw error;
        }
    }
    async getCurrentStatus(employeeId) {
        try {
            logger_1.default.info('🔍 [MongoAttendanceRepository] Getting current status', { employeeId });
            // Find today's attendance record
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const attendance = await Attendance_1.Attendance.findOne({
                employeeId,
                date: { $gte: today, $lt: tomorrow },
            }).populate('employeeId');
            logger_1.default.info('✅ [MongoAttendanceRepository] Current status retrieved', {
                employeeId,
                status: attendance?.status || 'not_checked_in'
            });
            return attendance;
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAttendanceRepository] Get current status failed:', error);
            throw error;
        }
    }
    async getAttendanceHistory(query) {
        try {
            logger_1.default.info('🔍 [MongoAttendanceRepository] Getting attendance history', { query });
            const page = query.page || 1;
            const limit = query.limit || 10;
            const skip = (page - 1) * limit;
            // Build filter
            const filter = {};
            if (query.employeeId) {
                filter.employeeId = query.employeeId;
            }
            if (query.startDate || query.endDate) {
                filter.date = {};
                if (query.startDate) {
                    filter.date.$gte = query.startDate;
                }
                if (query.endDate) {
                    filter.date.$lte = query.endDate;
                }
            }
            if (query.status) {
                filter.status = query.status;
            }
            // Execute query
            const attendances = await Attendance_1.Attendance.find(filter)
                .populate('employeeId')
                .sort({ date: -1, checkInTime: -1 })
                .skip(skip)
                .limit(limit);
            const total = await Attendance_1.Attendance.countDocuments(filter);
            logger_1.default.info('✅ [MongoAttendanceRepository] Attendance history retrieved', {
                count: attendances.length,
                total,
                page,
                limit
            });
            return {
                attendances,
                total,
                page,
                limit,
            };
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAttendanceRepository] Get attendance history failed:', error);
            throw error;
        }
    }
    async getEmployeeAttendance(employeeId, startDate, endDate) {
        try {
            logger_1.default.info('🔍 [MongoAttendanceRepository] Getting employee attendance', {
                employeeId,
                startDate,
                endDate
            });
            const filter = { employeeId };
            if (startDate || endDate) {
                filter.date = {};
                if (startDate) {
                    filter.date.$gte = startDate;
                }
                if (endDate) {
                    filter.date.$lte = endDate;
                }
            }
            const attendances = await Attendance_1.Attendance.find(filter)
                .populate('employeeId')
                .sort({ date: -1, checkInTime: -1 });
            logger_1.default.info('✅ [MongoAttendanceRepository] Employee attendance retrieved', {
                employeeId,
                count: attendances.length
            });
            return attendances;
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAttendanceRepository] Get employee attendance failed:', error);
            throw error;
        }
    }
    async getAttendanceById(id) {
        try {
            logger_1.default.info('🔍 [MongoAttendanceRepository] Finding attendance by ID', { id });
            const attendance = await Attendance_1.Attendance.findById(id).populate('employeeId');
            if (attendance) {
                logger_1.default.info('✅ [MongoAttendanceRepository] Attendance found', {
                    attendanceId: attendance._id,
                    employeeId: attendance.employeeId
                });
            }
            else {
                logger_1.default.warn('⚠️ [MongoAttendanceRepository] Attendance not found', { id });
            }
            return attendance;
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAttendanceRepository] Find attendance by ID failed:', error);
            throw error;
        }
    }
    async updateAttendance(id, attendanceData) {
        try {
            logger_1.default.info('🔍 [MongoAttendanceRepository] Updating attendance', { id, attendanceData });
            const attendance = await Attendance_1.Attendance.findByIdAndUpdate(id, { ...attendanceData, updatedAt: new Date() }, { new: true, runValidators: true }).populate('employeeId');
            if (!attendance) {
                throw new Error('Attendance not found');
            }
            logger_1.default.info('✅ [MongoAttendanceRepository] Attendance updated successfully', {
                attendanceId: attendance._id,
                employeeId: attendance.employeeId
            });
            return attendance;
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAttendanceRepository] Update attendance failed:', error);
            throw error;
        }
    }
    async deleteAttendance(id) {
        try {
            logger_1.default.info('🔍 [MongoAttendanceRepository] Deleting attendance', { id });
            const attendance = await Attendance_1.Attendance.findByIdAndDelete(id);
            if (!attendance) {
                throw new Error('Attendance not found');
            }
            logger_1.default.info('✅ [MongoAttendanceRepository] Attendance deleted successfully', {
                attendanceId: id,
                employeeId: attendance.employeeId
            });
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAttendanceRepository] Delete attendance failed:', error);
            throw error;
        }
    }
    async getAttendanceReport(employeeId, startDate, endDate) {
        try {
            logger_1.default.info('🔍 [MongoAttendanceRepository] Getting attendance report', {
                employeeId,
                startDate,
                endDate
            });
            const matchFilter = {};
            if (employeeId) {
                matchFilter.employeeId = employeeId;
            }
            if (startDate || endDate) {
                matchFilter.date = {};
                if (startDate) {
                    matchFilter.date.$gte = startDate;
                }
                if (endDate) {
                    matchFilter.date.$lte = endDate;
                }
            }
            const report = await Attendance_1.Attendance.aggregate([
                { $match: matchFilter },
                {
                    $lookup: {
                        from: 'employees',
                        localField: 'employeeId',
                        foreignField: '_id',
                        as: 'employee',
                    },
                },
                {
                    $unwind: '$employee',
                },
                {
                    $group: {
                        _id: {
                            employeeId: '$employeeId',
                            employeeName: '$employee.fullName',
                            date: '$date',
                        },
                        checkInTime: { $min: '$checkInTime' },
                        checkOutTime: { $max: '$checkOutTime' },
                        totalHours: { $sum: '$totalHours' },
                        status: { $first: '$status' },
                    },
                },
                {
                    $sort: {
                        '_id.date': -1,
                        '_id.employeeName': 1,
                    },
                },
            ]);
            logger_1.default.info('✅ [MongoAttendanceRepository] Attendance report generated', {
                count: report.length
            });
            return report;
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAttendanceRepository] Get attendance report failed:', error);
            throw error;
        }
    }
    async getEmployeeIdFromUserId(userId) {
        try {
            logger_1.default.info('🔍 [MongoAttendanceRepository] Getting employee ID from user ID', { userId });
            const employee = await Employee_1.Employee.findOne({ userId }).select('_id');
            if (!employee) {
                throw new Error('Employee not found');
            }
            logger_1.default.info('✅ [MongoAttendanceRepository] Employee ID found', {
                userId,
                employeeId: employee._id
            });
            return employee._id.toString();
        }
        catch (error) {
            logger_1.default.error('❌ [MongoAttendanceRepository] Get employee ID from user ID failed:', error);
            throw error;
        }
    }
}
exports.MongoAttendanceRepository = MongoAttendanceRepository;
//# sourceMappingURL=MongoAttendanceRepository.js.map