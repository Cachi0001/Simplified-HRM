import { Request, Response } from 'express';
import supabaseConfig from '../config/supabase';
import logger from '../utils/logger';

export class AttendanceController {
  /**
   * Check in employee
   * POST /api/attendance/check-in
   */
  async checkIn(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const {
        location_latitude,
        location_longitude,
        check_in_location,
        distance_from_office
      } = req.body;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated'
        });
        return;
      }

      // Superadmin cannot check in/out
      if (userRole === 'superadmin') {
        res.status(403).json({
          status: 'error',
          message: 'Superadmin users cannot perform attendance actions'
        });
        return;
      }

      // Validate required location data
      if (!location_latitude || !location_longitude) {
        res.status(400).json({
          status: 'error',
          message: 'Location coordinates are required for check-in'
        });
        return;
      }

      // Check if it's a working day (Monday to Saturday)
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      
      if (dayOfWeek === 0) { // Sunday
        res.status(400).json({
          status: 'error',
          message: 'Check-in is not allowed on Sundays'
        });
        return;
      }

      logger.info('🕐 [AttendanceController] Check-in request', {
        userId,
        userRole,
        location: { latitude: location_latitude, longitude: location_longitude },
        distance: distance_from_office
      });

      const supabase = supabaseConfig.getClient();

      // Get employee record
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, full_name, user_id')
        .eq('user_id', userId)
        .single();

      if (employeeError || !employee) {
        res.status(404).json({
          status: 'error',
          message: 'Employee record not found'
        });
        return;
      }

      // Check if already checked in today
      const todayDate = today.toISOString().split('T')[0];
      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('date', todayDate)
        .eq('status', 'checked_in')
        .single();

      if (existingAttendance) {
        res.status(400).json({
          status: 'error',
          message: 'You have already checked in today'
        });
        return;
      }

      // Calculate if late (after 8:35 AM)
      const checkInTime = new Date();
      const expectedCheckInTime = new Date(today);
      expectedCheckInTime.setHours(8, 35, 0, 0);
      
      const isLate = checkInTime > expectedCheckInTime;
      const minutesLate = isLate ? Math.floor((checkInTime.getTime() - expectedCheckInTime.getTime()) / (1000 * 60)) : 0;

      // Insert attendance record
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .insert({
          employee_id: employee.id,
          status: 'checked_in',
          check_in_time: checkInTime.toISOString(),
          location_latitude,
          location_longitude,
          check_in_location,
          distance_from_office,
          date: todayDate,
          is_late: isLate,
          minutes_late: minutesLate
        })
        .select()
        .single();

      if (attendanceError) {
        throw attendanceError;
      }

      res.status(201).json({
        status: 'success',
        message: isLate 
          ? `Checked in successfully (${minutesLate} minutes late)`
          : 'Checked in successfully',
        data: {
          attendance,
          isLate,
          minutesLate,
          checkInTime: checkInTime.toISOString()
        }
      });
    } catch (error) {
      logger.error('❌ [AttendanceController] Check-in error', {
        error: (error as Error).message,
        userId: req.user?.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to check in'
      });
    }
  }

  /**
   * Check out employee
   * POST /api/attendance/check-out
   */
  async checkOut(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const {
        location_latitude,
        location_longitude,
        check_out_location,
        distance_from_office
      } = req.body;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated'
        });
        return;
      }

      // Superadmin cannot check in/out
      if (userRole === 'superadmin') {
        res.status(403).json({
          status: 'error',
          message: 'Superadmin users cannot perform attendance actions'
        });
        return;
      }

      // Validate required location data
      if (!location_latitude || !location_longitude) {
        res.status(400).json({
          status: 'error',
          message: 'Location coordinates are required for check-out'
        });
        return;
      }

      // Check if it's a working day (Monday to Saturday)
      const today = new Date();
      const dayOfWeek = today.getDay();
      
      if (dayOfWeek === 0) { // Sunday
        res.status(400).json({
          status: 'error',
          message: 'Check-out is not allowed on Sundays'
        });
        return;
      }

      logger.info('🕐 [AttendanceController] Check-out request', {
        userId,
        userRole,
        location: { latitude: location_latitude, longitude: location_longitude },
        distance: distance_from_office
      });

      const supabase = supabaseConfig.getClient();

      // Get employee record
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, full_name, user_id')
        .eq('user_id', userId)
        .single();

      if (employeeError || !employee) {
        res.status(404).json({
          status: 'error',
          message: 'Employee record not found'
        });
        return;
      }

      // Find today's check-in record
      const todayDate = today.toISOString().split('T')[0];
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('date', todayDate)
        .eq('status', 'checked_in')
        .single();

      if (attendanceError || !attendance) {
        res.status(400).json({
          status: 'error',
          message: 'No check-in record found for today. Please check in first.'
        });
        return;
      }

      // Calculate total hours worked
      const checkOutTime = new Date();
      const checkInTime = new Date(attendance.check_in_time);
      const totalHours = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60));

      // Update attendance record
      const { data: updatedAttendance, error: updateError } = await supabase
        .from('attendance')
        .update({
          status: 'checked_out',
          check_out_time: checkOutTime.toISOString(),
          location_latitude,
          location_longitude,
          check_out_location,
          total_hours: totalHours,
          updated_at: new Date().toISOString()
        })
        .eq('id', attendance.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      res.status(200).json({
        status: 'success',
        message: 'Checked out successfully',
        data: {
          attendance: updatedAttendance,
          totalHours,
          checkOutTime: checkOutTime.toISOString()
        }
      });
    } catch (error) {
      logger.error('❌ [AttendanceController] Check-out error', {
        error: (error as Error).message,
        userId: req.user?.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to check out'
      });
    }
  }

  /**
   * Get current attendance status
   * GET /api/attendance/current-status
   */
  async getCurrentStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated'
        });
        return;
      }

      const supabase = supabaseConfig.getClient();

      // Get employee record
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (employeeError || !employee) {
        res.status(404).json({
          status: 'error',
          message: 'Employee record not found'
        });
        return;
      }

      // Get today's attendance record
      const todayDate = new Date().toISOString().split('T')[0];
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('date', todayDate)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      res.status(200).json({
        status: 'success',
        data: attendance
      });
    } catch (error) {
      logger.error('❌ [AttendanceController] Get current status error', {
        error: (error as Error).message,
        userId: req.user?.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to get attendance status'
      });
    }
  }

  /**
   * Get attendance history
   * GET /api/attendance/history
   */
  async getAttendanceHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated'
        });
        return;
      }

      const supabase = supabaseConfig.getClient();

      // Get employee record
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (employeeError || !employee) {
        res.status(404).json({
          status: 'error',
          message: 'Employee record not found'
        });
        return;
      }

      // Build query
      let query = supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .order('date', { ascending: false })
        .limit(limit);

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data: attendance, error } = await query;

      if (error) {
        throw error;
      }

      res.status(200).json({
        status: 'success',
        data: attendance || []
      });
    } catch (error) {
      logger.error('❌ [AttendanceController] Get attendance history error', {
        error: (error as Error).message,
        userId: req.user?.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to get attendance history'
      });
    }
  }

  /**
   * Get attendance statistics
   * GET /api/attendance/stats
   */
  async getAttendanceStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const month = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated'
        });
        return;
      }

      const supabase = supabaseConfig.getClient();

      // Get employee record
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (employeeError || !employee) {
        res.status(404).json({
          status: 'error',
          message: 'Employee record not found'
        });
        return;
      }

      // Get attendance records for the specified month/year
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const { data: attendance, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) {
        throw error;
      }

      // Calculate statistics
      const records = attendance || [];
      const totalDays = records.length;
      const presentDays = records.filter(r => r.status === 'checked_out').length;
      const lateDays = records.filter(r => r.is_late).length;
      const totalHours = records.reduce((sum, r) => sum + (r.total_hours || 0), 0);
      const averageHours = totalDays > 0 ? totalHours / totalDays : 0;
      
      // Calculate working days in month (Monday to Saturday)
      const daysInMonth = new Date(year, month, 0).getDate();
      let workingDays = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 6) { // Monday to Saturday
          workingDays++;
        }
      }

      const attendanceRate = workingDays > 0 ? (presentDays / workingDays) * 100 : 0;

      const stats = {
        totalDays,
        presentDays,
        lateDays,
        averageHours: Math.round(averageHours * 100) / 100,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        workingDays,
        month,
        year
      };

      res.status(200).json({
        status: 'success',
        data: stats
      });
    } catch (error) {
      logger.error('❌ [AttendanceController] Get attendance stats error', {
        error: (error as Error).message,
        userId: req.user?.id
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to get attendance statistics'
      });
    }
  }
}