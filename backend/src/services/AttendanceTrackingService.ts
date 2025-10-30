import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';
import { LocationValidationService, LocationCoordinates } from './LocationValidationService';
import { AttendanceNotificationService } from './AttendanceNotificationService';

export interface CheckInData {
    employeeId: string;
    location?: LocationCoordinates;
    checkInTime?: Date;
    notes?: string;
}

export interface CheckOutData {
    attendanceId: string;
    location?: LocationCoordinates;
    checkOutTime?: Date;
    notes?: string;
}

export interface AttendanceRecord {
    id: string;
    employeeId: string;
    date: string;
    checkInTime: Date;
    checkOutTime?: Date;
    status: 'checked_in' | 'checked_out' | 'absent';
    isLate: boolean;
    minutesLate: number;
    checkInLocation?: LocationCoordinates;
    checkOutLocation?: LocationCoordinates;
    notes?: string;
    totalHours?: number;
}

export interface AttendanceStats {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    averageHours: number;
    totalMinutesLate: number;
    attendanceRate: number;
}

export class AttendanceTrackingService {
    private supabase: SupabaseClient;
    private locationService: LocationValidationService;
    private notificationService: AttendanceNotificationService;

    constructor() {
        this.supabase = supabase.getClient();
        this.locationService = new LocationValidationService();
        this.notificationService = new AttendanceNotificationService();
    }

    /**
     * Process employee check-in with location validation
     */
    async checkIn(checkInData: CheckInData): Promise<{ success: boolean; attendanceId?: string; message: string; isLate?: boolean; minutesLate?: number }> {
        try {
            const { employeeId, location, checkInTime = new Date(), notes } = checkInData;
            const today = checkInTime.toISOString().split('T')[0];

            logger.info('AttendanceTrackingService: Processing check-in', {
                employeeId,
                date: today,
                checkInTime: checkInTime.toISOString()
            });

            // Check if employee already checked in today
            const { data: existingRecord } = await this.supabase
                .from('attendance')
                .select('id, status')
                .eq('employee_id', employeeId)
                .eq('date', today)
                .single();

            if (existingRecord) {
                return {
                    success: false,
                    message: 'You have already checked in today'
                };
            }

            // Validate location if provided
            let locationValidation = null;
            if (location) {
                locationValidation = await this.locationService.validateLocationForCheckIn(location, checkInTime);
                
                if (!locationValidation.isValid) {
                    return {
                        success: false,
                        message: locationValidation.message
                    };
                }
            }

            // Calculate late arrival
            const lateArrival = await this.locationService.calculateLateArrival(checkInTime);

            // Create attendance record
            const attendanceRecord = {
                employee_id: employeeId,
                date: today,
                check_in_time: checkInTime.toISOString(),
                status: 'checked_in',
                is_late: lateArrival.isLate,
                minutes_late: lateArrival.minutesLate,
                check_in_location: location || null,
                notes: notes || null,
                checkout_reminder_sent: false,
                created_at: new Date().toISOString()
            };

            const { data: newRecord, error } = await this.supabase
                .from('attendance')
                .insert(attendanceRecord)
                .select('id')
                .single();

            if (error) {
                logger.error('AttendanceTrackingService: Failed to create attendance record', {
                    error: error.message,
                    employeeId
                });
                throw error;
            }

            // Send late arrival notification if applicable
            if (lateArrival.isLate) {
                try {
                    await this.notificationService.sendLateArrivalNotification(
                        employeeId,
                        lateArrival.minutesLate,
                        checkInTime
                    );
                } catch (notificationError) {
                    logger.warn('AttendanceTrackingService: Failed to send late arrival notification', {
                        error: (notificationError as Error).message,
                        employeeId
                    });
                }
            }

            const message = locationValidation 
                ? locationValidation.message 
                : lateArrival.isLate 
                    ? `Check-in successful. You are ${lateArrival.minutesLate} minutes late.`
                    : 'Check-in successful';

            logger.info('AttendanceTrackingService: Check-in completed successfully', {
                attendanceId: newRecord.id,
                employeeId,
                isLate: lateArrival.isLate,
                minutesLate: lateArrival.minutesLate
            });

            return {
                success: true,
                attendanceId: newRecord.id,
                message,
                isLate: lateArrival.isLate,
                minutesLate: lateArrival.minutesLate
            };
        } catch (error) {
            logger.error('AttendanceTrackingService: Check-in failed', {
                error: (error as Error).message,
                employeeId: checkInData.employeeId
            });
            
            return {
                success: false,
                message: 'Check-in failed. Please try again.'
            };
        }
    }

    /**
     * Process employee check-out
     */
    async checkOut(checkOutData: CheckOutData): Promise<{ success: boolean; message: string; totalHours?: number }> {
        try {
            const { attendanceId, location, checkOutTime = new Date(), notes } = checkOutData;

            logger.info('AttendanceTrackingService: Processing check-out', {
                attendanceId,
                checkOutTime: checkOutTime.toISOString()
            });

            // Get existing attendance record
            const { data: attendanceRecord, error: fetchError } = await this.supabase
                .from('attendance')
                .select('*')
                .eq('id', attendanceId)
                .single();

            if (fetchError || !attendanceRecord) {
                return {
                    success: false,
                    message: 'Attendance record not found'
                };
            }

            if (attendanceRecord.status === 'checked_out') {
                return {
                    success: false,
                    message: 'You have already checked out today'
                };
            }

            // Calculate total hours worked
            const checkInTime = new Date(attendanceRecord.check_in_time);
            const totalMs = checkOutTime.getTime() - checkInTime.getTime();
            const totalHours = Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;

            // Update attendance record
            const updateData = {
                check_out_time: checkOutTime.toISOString(),
                status: 'checked_out',
                check_out_location: location || null,
                total_hours: totalHours,
                notes: notes ? `${attendanceRecord.notes || ''}\nCheckout: ${notes}`.trim() : attendanceRecord.notes,
                updated_at: new Date().toISOString()
            };

            const { error: updateError } = await this.supabase
                .from('attendance')
                .update(updateData)
                .eq('id', attendanceId);

            if (updateError) {
                logger.error('AttendanceTrackingService: Failed to update attendance record', {
                    error: updateError.message,
                    attendanceId
                });
                throw updateError;
            }

            logger.info('AttendanceTrackingService: Check-out completed successfully', {
                attendanceId,
                totalHours
            });

            return {
                success: true,
                message: `Check-out successful. Total hours worked: ${totalHours}`,
                totalHours
            };
        } catch (error) {
            logger.error('AttendanceTrackingService: Check-out failed', {
                error: (error as Error).message,
                attendanceId: checkOutData.attendanceId
            });
            
            return {
                success: false,
                message: 'Check-out failed. Please try again.'
            };
        }
    }

    /**
     * Get employee's current attendance status for today
     */
    async getTodayAttendanceStatus(employeeId: string): Promise<AttendanceRecord | null> {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data: record, error } = await this.supabase
                .from('attendance')
                .select('*')
                .eq('employee_id', employeeId)
                .eq('date', today)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                logger.error('AttendanceTrackingService: Failed to get today attendance status', {
                    error: error.message,
                    employeeId
                });
                throw error;
            }

            return record || null;
        } catch (error) {
            logger.error('AttendanceTrackingService: Failed to get today attendance status', {
                error: (error as Error).message,
                employeeId
            });
            return null;
        }
    }

    /**
     * Get employee attendance history
     */
    async getAttendanceHistory(
        employeeId: string,
        startDate?: Date,
        endDate?: Date,
        limit: number = 30
    ): Promise<AttendanceRecord[]> {
        try {
            const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const end = endDate || new Date();

            const { data: records, error } = await this.supabase
                .from('attendance')
                .select('*')
                .eq('employee_id', employeeId)
                .gte('date', start.toISOString().split('T')[0])
                .lte('date', end.toISOString().split('T')[0])
                .order('date', { ascending: false })
                .limit(limit);

            if (error) {
                logger.error('AttendanceTrackingService: Failed to get attendance history', {
                    error: error.message,
                    employeeId
                });
                throw error;
            }

            return records || [];
        } catch (error) {
            logger.error('AttendanceTrackingService: Failed to get attendance history', {
                error: (error as Error).message,
                employeeId
            });
            return [];
        }
    }

    /**
     * Calculate attendance statistics for an employee
     */
    async getAttendanceStats(
        employeeId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<AttendanceStats> {
        try {
            const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const end = endDate || new Date();

            const records = await this.getAttendanceHistory(employeeId, start, end, 1000);

            // Calculate business days in the period
            const businessDays = this.calculateBusinessDays(start, end);
            
            const presentDays = records.length;
            const absentDays = businessDays - presentDays;
            const lateDays = records.filter(r => r.isLate).length;
            
            const totalHours = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);
            const averageHours = presentDays > 0 ? totalHours / presentDays : 0;
            
            const totalMinutesLate = records.reduce((sum, r) => sum + (r.minutesLate || 0), 0);
            const attendanceRate = businessDays > 0 ? (presentDays / businessDays) * 100 : 0;

            return {
                totalDays: businessDays,
                presentDays,
                absentDays,
                lateDays,
                averageHours: Math.round(averageHours * 100) / 100,
                totalMinutesLate,
                attendanceRate: Math.round(attendanceRate * 100) / 100
            };
        } catch (error) {
            logger.error('AttendanceTrackingService: Failed to calculate attendance stats', {
                error: (error as Error).message,
                employeeId
            });
            
            return {
                totalDays: 0,
                presentDays: 0,
                absentDays: 0,
                lateDays: 0,
                averageHours: 0,
                totalMinutesLate: 0,
                attendanceRate: 0
            };
        }
    }

    /**
     * Get all employees' attendance for a specific date
     */
    async getDailyAttendanceReport(date: Date = new Date()): Promise<any[]> {
        try {
            const dateStr = date.toISOString().split('T')[0];

            const { data: records, error } = await this.supabase
                .from('attendance')
                .select(`
                    *,
                    employee:employees!attendance_employee_id_fkey(
                        id,
                        full_name,
                        email,
                        department_id,
                        department:departments!employees_department_id_fkey(
                            name
                        )
                    )
                `)
                .eq('date', dateStr)
                .order('check_in_time', { ascending: true });

            if (error) {
                logger.error('AttendanceTrackingService: Failed to get daily attendance report', {
                    error: error.message,
                    date: dateStr
                });
                throw error;
            }

            return records || [];
        } catch (error) {
            logger.error('AttendanceTrackingService: Failed to get daily attendance report', {
                error: (error as Error).message,
                date: date.toISOString()
            });
            return [];
        }
    }

    /**
     * Mark employees as absent for a specific date
     */
    async markAbsentEmployees(date: Date = new Date()): Promise<{ markedAbsent: number; errors: string[] }> {
        try {
            const dateStr = date.toISOString().split('T')[0];
            const errors: string[] = [];
            let markedAbsent = 0;

            logger.info('AttendanceTrackingService: Marking absent employees', { date: dateStr });

            // Get all active employees
            const { data: employees, error: employeeError } = await this.supabase
                .from('employees')
                .select('id, full_name, email')
                .eq('status', 'active');

            if (employeeError) {
                throw employeeError;
            }

            // Get employees who already have attendance records for today
            const { data: existingRecords, error: recordError } = await this.supabase
                .from('attendance')
                .select('employee_id')
                .eq('date', dateStr);

            if (recordError) {
                throw recordError;
            }

            const presentEmployeeIds = new Set(existingRecords?.map(r => r.employee_id) || []);

            // Mark absent employees
            for (const employee of employees || []) {
                if (!presentEmployeeIds.has(employee.id)) {
                    try {
                        await this.supabase
                            .from('attendance')
                            .insert({
                                employee_id: employee.id,
                                date: dateStr,
                                status: 'absent',
                                is_late: false,
                                minutes_late: 0,
                                created_at: new Date().toISOString()
                            });

                        markedAbsent++;
                        
                        // Send absence notification
                        try {
                            await this.notificationService.sendAbsenceNotification(employee.id, date);
                        } catch (notificationError) {
                            logger.warn('AttendanceTrackingService: Failed to send absence notification', {
                                employeeId: employee.id,
                                error: (notificationError as Error).message
                            });
                        }
                    } catch (insertError) {
                        const errorMessage = `Failed to mark ${employee.full_name} as absent: ${(insertError as Error).message}`;
                        errors.push(errorMessage);
                        logger.error('AttendanceTrackingService: Failed to mark employee as absent', {
                            employeeId: employee.id,
                            error: errorMessage
                        });
                    }
                }
            }

            logger.info('AttendanceTrackingService: Absent employees marked', {
                markedAbsent,
                errorsCount: errors.length
            });

            return { markedAbsent, errors };
        } catch (error) {
            logger.error('AttendanceTrackingService: Failed to mark absent employees', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Calculate business days between two dates (excluding weekends)
     */
    private calculateBusinessDays(startDate: Date, endDate: Date): number {
        let count = 0;
        const current = new Date(startDate);
        
        while (current <= endDate) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
                count++;
            }
            current.setDate(current.getDate() + 1);
        }
        
        return count;
    }

    /**
     * Get attendance summary for admin dashboard
     */
    async getAttendanceSummary(startDate?: Date, endDate?: Date): Promise<any> {
        try {
            const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const end = endDate || new Date();

            const { data: records, error } = await this.supabase
                .from('attendance')
                .select('status, is_late, minutes_late, total_hours')
                .gte('date', start.toISOString().split('T')[0])
                .lte('date', end.toISOString().split('T')[0]);

            if (error) throw error;

            const totalRecords = records?.length || 0;
            const presentRecords = records?.filter(r => r.status !== 'absent') || [];
            const absentRecords = records?.filter(r => r.status === 'absent') || [];
            const lateRecords = records?.filter(r => r.is_late) || [];

            const totalHours = presentRecords.reduce((sum, r) => sum + (r.total_hours || 0), 0);
            const totalMinutesLate = lateRecords.reduce((sum, r) => sum + (r.minutes_late || 0), 0);

            return {
                period: {
                    start: start.toISOString().split('T')[0],
                    end: end.toISOString().split('T')[0]
                },
                summary: {
                    totalRecords,
                    presentDays: presentRecords.length,
                    absentDays: absentRecords.length,
                    lateDays: lateRecords.length,
                    attendanceRate: totalRecords > 0 ? Math.round((presentRecords.length / totalRecords) * 100) : 0,
                    lateRate: totalRecords > 0 ? Math.round((lateRecords.length / totalRecords) * 100) : 0
                },
                hours: {
                    totalHours: Math.round(totalHours * 100) / 100,
                    averageHoursPerDay: presentRecords.length > 0 ? Math.round((totalHours / presentRecords.length) * 100) / 100 : 0
                },
                lateness: {
                    totalMinutesLate,
                    averageMinutesLate: lateRecords.length > 0 ? Math.round(totalMinutesLate / lateRecords.length) : 0
                }
            };
        } catch (error) {
            logger.error('AttendanceTrackingService: Failed to get attendance summary', {
                error: (error as Error).message
            });
            throw error;
        }
    }
}

export default new AttendanceTrackingService();