import { IAttendanceRepository } from '../interfaces/IAttendanceRepository';
import { Attendance, CreateAttendanceRequest, AttendanceQuery, IAttendance } from '../../models/Attendance';
import { Employee } from '../../models/Employee';
import databaseConfig from '../../config/database';
import logger from '../../utils/logger';

export class MongoAttendanceRepository implements IAttendanceRepository {
  async checkIn(employeeId: string, attendanceData: CreateAttendanceRequest): Promise<IAttendance> {
    try {
      logger.info('🔍 [MongoAttendanceRepository] Employee check-in', {
        employeeId,
        location: attendanceData.location
      });

      // Check if employee is already checked in today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingAttendance = await Attendance.findOne({
        employeeId,
        date: { $gte: today, $lt: tomorrow },
        status: 'checked_in',
      });

      if (existingAttendance) {
        throw new Error('Employee is already checked in today');
      }

      const attendance = new Attendance({
        employeeId,
        checkInTime: new Date(),
        status: 'checked_in',
        date: new Date(),
        ...attendanceData,
      });

      await attendance.save();
      await attendance.populate('employeeId');

      logger.info('✅ [MongoAttendanceRepository] Employee checked in successfully', {
        attendanceId: attendance._id,
        employeeId,
        checkInTime: attendance.checkInTime
      });

      return attendance;

    } catch (error) {
      logger.error('❌ [MongoAttendanceRepository] Check-in failed:', error);
      throw error;
    }
  }

  async checkOut(employeeId: string, attendanceData: CreateAttendanceRequest): Promise<IAttendance> {
    try {
      logger.info('🔍 [MongoAttendanceRepository] Employee check-out', {
        employeeId,
        location: attendanceData.location
      });

      // Find today's check-in record
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const attendance = await Attendance.findOne({
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

      logger.info('✅ [MongoAttendanceRepository] Employee checked out successfully', {
        attendanceId: attendance._id,
        employeeId,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        totalHours: attendance.totalHours
      });

      return attendance;

    } catch (error) {
      logger.error('❌ [MongoAttendanceRepository] Check-out failed:', error);
      throw error;
    }
  }

  async getCurrentStatus(employeeId: string): Promise<IAttendance | null> {
    try {
      logger.info('🔍 [MongoAttendanceRepository] Getting current status', { employeeId });

      // Find today's attendance record
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const attendance = await Attendance.findOne({
        employeeId,
        date: { $gte: today, $lt: tomorrow },
      }).populate('employeeId');

      logger.info('✅ [MongoAttendanceRepository] Current status retrieved', {
        employeeId,
        status: attendance?.status || 'not_checked_in'
      });

      return attendance;

    } catch (error) {
      logger.error('❌ [MongoAttendanceRepository] Get current status failed:', error);
      throw error;
    }
  }

  async getAttendanceHistory(query: AttendanceQuery): Promise<{ attendances: IAttendance[]; total: number; page: number; limit: number }> {
    try {
      logger.info('🔍 [MongoAttendanceRepository] Getting attendance history', { query });

      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = {};

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
      const attendances = await Attendance.find(filter)
        .populate('employeeId')
        .sort({ date: -1, checkInTime: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Attendance.countDocuments(filter);

      logger.info('✅ [MongoAttendanceRepository] Attendance history retrieved', {
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

    } catch (error) {
      logger.error('❌ [MongoAttendanceRepository] Get attendance history failed:', error);
      throw error;
    }
  }

  async getEmployeeAttendance(employeeId: string, startDate?: Date, endDate?: Date): Promise<IAttendance[]> {
    try {
      logger.info('🔍 [MongoAttendanceRepository] Getting employee attendance', {
        employeeId,
        startDate,
        endDate
      });

      const filter: any = { employeeId };

      if (startDate || endDate) {
        filter.date = {};
        if (startDate) {
          filter.date.$gte = startDate;
        }
        if (endDate) {
          filter.date.$lte = endDate;
        }
      }

      const attendances = await Attendance.find(filter)
        .populate('employeeId')
        .sort({ date: -1, checkInTime: -1 });

      logger.info('✅ [MongoAttendanceRepository] Employee attendance retrieved', {
        employeeId,
        count: attendances.length
      });

      return attendances;

    } catch (error) {
      logger.error('❌ [MongoAttendanceRepository] Get employee attendance failed:', error);
      throw error;
    }
  }

  async getAttendanceById(id: string): Promise<IAttendance | null> {
    try {
      logger.info('🔍 [MongoAttendanceRepository] Finding attendance by ID', { id });

      const attendance = await Attendance.findById(id).populate('employeeId');

      if (attendance) {
        logger.info('✅ [MongoAttendanceRepository] Attendance found', {
          attendanceId: attendance._id,
          employeeId: attendance.employeeId
        });
      } else {
        logger.warn('⚠️ [MongoAttendanceRepository] Attendance not found', { id });
      }

      return attendance;

    } catch (error) {
      logger.error('❌ [MongoAttendanceRepository] Find attendance by ID failed:', error);
      throw error;
    }
  }

  async updateAttendance(id: string, attendanceData: Partial<IAttendance>): Promise<IAttendance> {
    try {
      logger.info('🔍 [MongoAttendanceRepository] Updating attendance', { id, attendanceData });

      const attendance = await Attendance.findByIdAndUpdate(
        id,
        { ...attendanceData, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).populate('employeeId');

      if (!attendance) {
        throw new Error('Attendance not found');
      }

      logger.info('✅ [MongoAttendanceRepository] Attendance updated successfully', {
        attendanceId: attendance._id,
        employeeId: attendance.employeeId
      });

      return attendance;

    } catch (error) {
      logger.error('❌ [MongoAttendanceRepository] Update attendance failed:', error);
      throw error;
    }
  }

  async deleteAttendance(id: string): Promise<void> {
    try {
      logger.info('🔍 [MongoAttendanceRepository] Deleting attendance', { id });

      const attendance = await Attendance.findByIdAndDelete(id);

      if (!attendance) {
        throw new Error('Attendance not found');
      }

      logger.info('✅ [MongoAttendanceRepository] Attendance deleted successfully', {
        attendanceId: id,
        employeeId: attendance.employeeId
      });

    } catch (error) {
      logger.error('❌ [MongoAttendanceRepository] Delete attendance failed:', error);
      throw error;
    }
  }

  async getAttendanceReport(employeeId?: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      logger.info('🔍 [MongoAttendanceRepository] Getting attendance report', {
        employeeId,
        startDate,
        endDate
      });

      const matchFilter: any = {};

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

      const report = await Attendance.aggregate([
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

      logger.info('✅ [MongoAttendanceRepository] Attendance report generated', {
        count: report.length
      });

      return report;

    } catch (error) {
      logger.error('❌ [MongoAttendanceRepository] Get attendance report failed:', error);
      throw error;
    }
  }

  async getEmployeeIdFromUserId(userId: string): Promise<string> {
    try {
      logger.info('🔍 [MongoAttendanceRepository] Getting employee ID from user ID', { userId });

      const employee = await Employee.findOne({ userId }).select('_id');

      if (!employee) {
        throw new Error('Employee not found');
      }

      logger.info('✅ [MongoAttendanceRepository] Employee ID found', {
        userId,
        employeeId: employee._id
      });

      return employee._id.toString();

    } catch (error) {
      logger.error('❌ [MongoAttendanceRepository] Get employee ID from user ID failed:', error);
      throw error;
    }
  }
}
