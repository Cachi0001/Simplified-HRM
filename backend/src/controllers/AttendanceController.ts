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

      // Enhanced location validation based on day of week
      const officeLatitude = 6.5244; // Default Lagos coordinates - should be configured
      const officeLongitude = 3.3792;
      
      // Calculate distance from office
      const R = 6371e3; // Earth's radius in meters
      const φ1 = officeLatitude * Math.PI / 180;
      const φ2 = location_latitude * Math.PI / 180;
      const Δφ = (location_latitude - officeLatitude) * Math.PI / 180;
      const Δλ = (location_longitude - officeLongitude) * Math.PI / 180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const calculatedDistance = R * c;

      // Day-specific location restrictions
      let maxAllowedDistance: number;
      let locationDescription: string;

      if (dayOfWeek === 5) { // Friday
        maxAllowedDistance = Infinity; // Can check in from anywhere
        locationDescription = 'anywhere (Friday)';
      } else if (dayOfWeek >= 1 && dayOfWeek <= 4) { // Monday to Thursday
        maxAllowedDistance = 15000; // 15km radius
        locationDescription = '15km of the office (Monday-Thursday)';
      } else { // Saturday (working day but stricter)
        maxAllowedDistance = 100; // 100m radius (office only)
        locationDescription = '100m of the office (Saturday)';
      }

      // Validate location unless it's Friday
      if (dayOfWeek !== 5 && calculatedDistance > maxAllowedDistance) {
        const distanceKm = (calculatedDistance / 1000).toFixed(1);
        const maxDistanceKm = (maxAllowedDistance / 1000).toFixed(1);
        
        res.status(400).json({
          status: 'error',
          message: `You must be within ${locationDescription} to check in. You are currently ${distanceKm}km away from the office.`,
          data: {
            currentDistance: calculatedDistance,
            maxAllowedDistance,
            dayOfWeek,
            locationRestriction: locationDescription
          }
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
          distance_from_office: calculatedDistance,
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

      // Enhanced location validation based on day of week
      const officeLatitude = 6.5244; // Default Lagos coordinates - should be configured
      const officeLongitude = 3.3792;
      
      // Calculate distance from office
      const R = 6371e3; // Earth's radius in meters
      const φ1 = officeLatitude * Math.PI / 180;
      const φ2 = location_latitude * Math.PI / 180;
      const Δφ = (location_latitude - officeLatitude) * Math.PI / 180;
      const Δλ = (location_longitude - officeLongitude) * Math.PI / 180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const calculatedDistance = R * c;

      // Day-specific location restrictions
      let maxAllowedDistance: number;
      let locationDescription: string;

      if (dayOfWeek === 5) { // Friday
        maxAllowedDistance = Infinity; // Can check out from anywhere
        locationDescription = 'anywhere (Friday)';
      } else if (dayOfWeek >= 1 && dayOfWeek <= 4) { // Monday to Thursday
        maxAllowedDistance = 15000; // 15km radius
        locationDescription = '15km of the office (Monday-Thursday)';
      } else { // Saturday (working day but stricter)
        maxAllowedDistance = 100; // 100m radius (office only)
        locationDescription = '100m of the office (Saturday)';
      }

      // Validate location unless it's Friday
      if (dayOfWeek !== 5 && calculatedDistance > maxAllowedDistance) {
        const distanceKm = (calculatedDistance / 1000).toFixed(1);
        const maxDistanceKm = (maxAllowedDistance / 1000).toFixed(1);
        
        res.status(400).json({
          status: 'error',
          message: `You must be within ${locationDescription} to check out. You are currently ${distanceKm}km away from the office.`,
          data: {
            currentDistance: calculatedDistance,
            maxAllowedDistance,
            dayOfWeek,
            locationRestriction: locationDescription
          }
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
          distance_from_office: calculatedDistance,
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

  /**
   * Get attendance report for admin/HR
   * GET /api/attendance/report
   */
  async getAttendanceReport(req: Request, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;
      const { employee_id, start_date, end_date } = req.query;

      // Check permissions
      if (!['hr', 'admin', 'superadmin', 'team_lead'].includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have permission to view attendance reports'
        });
        return;
      }

      logger.info('📊 [AttendanceController] Getting attendance report', {
        userRole,
        employeeId: employee_id,
        startDate: start_date,
        endDate: end_date
      });

      const supabase = supabaseConfig.getClient();

      // Build query
      let query = supabase
        .from('attendance')
        .select(`
          *,
          employees!inner(
            id,
            full_name,
            email,
            department
          )
        `)
        .order('date', { ascending: false })
        .order('check_in_time', { ascending: false });

      // Apply filters
      if (employee_id) {
        query = query.eq('employee_id', employee_id);
      }

      if (start_date) {
        query = query.gte('date', start_date);
      }

      if (end_date) {
        query = query.lte('date', end_date);
      }

      const { data: attendanceRecords, error } = await query;

      if (error) {
        throw error;
      }

      // Transform data for frontend compatibility
      const transformedData = attendanceRecords?.map(record => ({
        _id: {
          employeeId: record.employee_id,
          employeeName: record.employees?.full_name,
          date: record.date
        },
        employeeId: record.employee_id,
        employeeName: record.employees?.full_name,
        employee: {
          fullName: record.employees?.full_name
        },
        date: record.date,
        checkInTime: record.check_in_time,
        checkOutTime: record.check_out_time,
        status: record.status,
        totalHours: record.total_hours,
        is_late: record.is_late,
        minutes_late: record.minutes_late,
        distanceFromOffice: record.distance_from_office,
        locationStatus: record.distance_from_office && record.distance_from_office <= 100 ? 'onsite' : 'remote'
      })) || [];

      res.status(200).json({
        status: 'success',
        data: transformedData
      });
    } catch (error) {
      logger.error('❌ [AttendanceController] Get attendance report error', {
        error: (error as Error).message
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to get attendance report'
      });
    }
  }

  /**
   * Admin check-in for employee
   * POST /api/attendance/admin-check-in
   */
  async adminCheckIn(req: Request, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;
      const {
        employee_id,
        location_latitude,
        location_longitude,
        check_in_location,
        distance_from_office
      } = req.body;

      // Check permissions
      if (!['hr', 'admin', 'superadmin', 'team_lead'].includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have permission to perform admin check-in'
        });
        return;
      }

      if (!employee_id) {
        res.status(400).json({
          status: 'error',
          message: 'Employee ID is required'
        });
        return;
      }

      logger.info('🕐 [AttendanceController] Admin check-in request', {
        userRole,
        employeeId: employee_id,
        location: location_latitude && location_longitude ? { latitude: location_latitude, longitude: location_longitude } : 'No location'
      });

      const supabase = supabaseConfig.getClient();

      // Verify employee exists
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('id', employee_id)
        .single();

      if (employeeError || !employee) {
        res.status(404).json({
          status: 'error',
          message: 'Employee not found'
        });
        return;
      }

      // Check if already checked in today
      const today = new Date();
      const todayDate = today.toISOString().split('T')[0];
      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee_id)
        .eq('date', todayDate)
        .eq('status', 'checked_in')
        .single();

      if (existingAttendance) {
        res.status(400).json({
          status: 'error',
          message: 'Employee has already checked in today'
        });
        return;
      }

      // Calculate timing
      const checkInTime = new Date();
      const expectedCheckInTime = new Date(today);
      expectedCheckInTime.setHours(8, 35, 0, 0);
      
      const isLate = checkInTime > expectedCheckInTime;
      const minutesLate = isLate ? Math.floor((checkInTime.getTime() - expectedCheckInTime.getTime()) / (1000 * 60)) : 0;

      // Insert attendance record
      const attendanceData: any = {
        employee_id,
        status: 'checked_in',
        check_in_time: checkInTime.toISOString(),
        date: todayDate,
        is_late: isLate,
        minutes_late: minutesLate
      };

      if (location_latitude && location_longitude) {
        attendanceData.location_latitude = location_latitude;
        attendanceData.location_longitude = location_longitude;
        attendanceData.check_in_location = check_in_location;
        attendanceData.distance_from_office = distance_from_office;
      }

      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .insert(attendanceData)
        .select()
        .single();

      if (attendanceError) {
        throw attendanceError;
      }

      res.status(201).json({
        status: 'success',
        message: `${employee.full_name} checked in successfully${isLate ? ` (${minutesLate} minutes late)` : ''}`,
        data: {
          attendance,
          isLate,
          minutesLate,
          checkInTime: checkInTime.toISOString()
        }
      });
    } catch (error) {
      logger.error('❌ [AttendanceController] Admin check-in error', {
        error: (error as Error).message
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to perform admin check-in'
      });
    }
  }

  /**
   * Admin check-out for employee
   * POST /api/attendance/admin-check-out
   */
  async adminCheckOut(req: Request, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;
      const {
        employee_id,
        location_latitude,
        location_longitude,
        check_out_location,
        distance_from_office
      } = req.body;

      // Check permissions
      if (!['hr', 'admin', 'superadmin', 'team_lead'].includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have permission to perform admin check-out'
        });
        return;
      }

      if (!employee_id) {
        res.status(400).json({
          status: 'error',
          message: 'Employee ID is required'
        });
        return;
      }

      logger.info('🕐 [AttendanceController] Admin check-out request', {
        userRole,
        employeeId: employee_id
      });

      const supabase = supabaseConfig.getClient();

      // Verify employee exists
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('id', employee_id)
        .single();

      if (employeeError || !employee) {
        res.status(404).json({
          status: 'error',
          message: 'Employee not found'
        });
        return;
      }

      // Find today's check-in record
      const today = new Date();
      const todayDate = today.toISOString().split('T')[0];
      const { data: attendanceRecord, error: findError } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee_id)
        .eq('date', todayDate)
        .eq('status', 'checked_in')
        .single();

      if (findError || !attendanceRecord) {
        res.status(400).json({
          status: 'error',
          message: 'No active check-in found for today'
        });
        return;
      }

      // Calculate total hours
      const checkOutTime = new Date();
      const checkInTime = new Date(attendanceRecord.check_in_time);
      const totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      // Update attendance record
      const updateData: any = {
        status: 'checked_out',
        check_out_time: checkOutTime.toISOString(),
        total_hours: Math.round(totalHours * 100) / 100 // Round to 2 decimal places
      };

      if (location_latitude && location_longitude) {
        updateData.location_latitude = location_latitude;
        updateData.location_longitude = location_longitude;
        updateData.check_out_location = check_out_location;
        updateData.distance_from_office = distance_from_office;
      }

      const { data: updatedAttendance, error: updateError } = await supabase
        .from('attendance')
        .update(updateData)
        .eq('id', attendanceRecord.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      res.status(200).json({
        status: 'success',
        message: `${employee.full_name} checked out successfully`,
        data: {
          attendance: updatedAttendance,
          totalHours: Math.round(totalHours * 100) / 100,
          checkOutTime: checkOutTime.toISOString()
        }
      });
    } catch (error) {
      logger.error('❌ [AttendanceController] Admin check-out error', {
        error: (error as Error).message
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to perform admin check-out'
      });
    }
  }

  /**
   * Send checkout reminder notification
   * POST /api/attendance/checkout-reminder
   */
  async sendCheckoutReminder(req: Request, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;

      // Check permissions
      if (!['hr', 'admin', 'superadmin', 'team_lead'].includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have permission to send checkout reminders'
        });
        return;
      }

      logger.info('🔔 [AttendanceController] Sending checkout reminder', { userRole });

      const supabase = supabaseConfig.getClient();

      // Get all employees who are currently checked in
      const today = new Date().toISOString().split('T')[0];
      const { data: activeAttendance, error } = await supabase
        .from('attendance')
        .select(`
          employee_id,
          employees!inner(
            id,
            full_name,
            email,
            user_id
          )
        `)
        .eq('date', today)
        .eq('status', 'checked_in');

      if (error) {
        throw error;
      }

      if (!activeAttendance || activeAttendance.length === 0) {
        res.status(200).json({
          status: 'success',
          message: 'No active employees to remind',
          data: { remindersSent: 0 }
        });
        return;
      }

      // Create notifications for all active employees
      const notifications = activeAttendance.map(record => {
        const employee = Array.isArray(record.employees) ? record.employees[0] : record.employees;
        return {
          user_id: employee?.user_id,
          title: '🕕 Checkout Reminder',
          message: 'It\'s 6:00 PM! Don\'t forget to check out before leaving the office.',
          type: 'reminder',
          data: JSON.stringify({
            type: 'checkout_reminder',
            time: '18:00'
          })
        };
      });

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        throw notificationError;
      }

      res.status(200).json({
        status: 'success',
        message: `Checkout reminder sent to ${activeAttendance.length} employees`,
        data: { remindersSent: activeAttendance.length }
      });
    } catch (error) {
      logger.error('❌ [AttendanceController] Send checkout reminder error', {
        error: (error as Error).message
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to send checkout reminder'
      });
    }
  }

  /**
   * Trigger scheduled checkout reminder (for testing)
   * POST /api/attendance/trigger-checkout-reminder
   */
  async triggerScheduledCheckoutReminder(req: Request, res: Response): Promise<void> {
    try {
      const userRole = (req as any).user?.role;

      // Check permissions
      if (!['hr', 'admin', 'superadmin'].includes(userRole)) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have permission to trigger scheduled reminders'
        });
        return;
      }

      logger.info('🔔 [AttendanceController] Manually triggering scheduled checkout reminder', { userRole });

      // Import and trigger the scheduler service
      const SchedulerService = (await import('../services/SchedulerService')).default;
      const schedulerService = SchedulerService.getInstance();
      
      await schedulerService.triggerCheckoutReminders();

      res.status(200).json({
        status: 'success',
        message: 'Scheduled checkout reminder triggered successfully'
      });
    } catch (error) {
      logger.error('❌ [AttendanceController] Trigger scheduled checkout reminder error', {
        error: (error as Error).message
      });
      res.status(500).json({
        status: 'error',
        message: 'Failed to trigger scheduled checkout reminder'
      });
    }
  }
}