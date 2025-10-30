import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';

export interface AttendancePattern {
    employeeId: string;
    employeeName: string;
    department?: string;
    period: {
        start: Date;
        end: Date;
    };
    patterns: {
        mostCommonArrivalTime: string;
        mostCommonDepartureTime: string;
        averageWorkHours: number;
        consistencyScore: number;
        preferredWorkDays: string[];
        lateArrivalPattern: {
            frequency: number;
            averageMinutesLate: number;
            mostCommonLateDay: string;
        };
        absenteeismPattern: {
            frequency: number;
            mostCommonAbsentDay: string;
            consecutiveAbsences: number;
        };
    };
    insights: string[];
    recommendations: string[];
}

export interface DepartmentAttendanceAnalytics {
    departmentId: string;
    departmentName: string;
    period: {
        start: Date;
        end: Date;
    };
    metrics: {
        averageAttendanceRate: number;
        averagePunctualityRate: number;
        averageWorkHours: number;
        totalAbsences: number;
        totalLateArrivals: number;
    };
    trends: {
        attendanceTrend: 'improving' | 'declining' | 'stable';
        punctualityTrend: 'improving' | 'declining' | 'stable';
        workHoursTrend: 'increasing' | 'decreasing' | 'stable';
    };
    topPerformers: Array<{
        employeeId: string;
        employeeName: string;
        attendanceRate: number;
    }>;
    concerningPatterns: Array<{
        employeeId: string;
        employeeName: string;
        issues: string[];
    }>;
}

export interface AttendanceReport {
    reportType: 'daily' | 'weekly' | 'monthly' | 'custom';
    period: {
        start: Date;
        end: Date;
    };
    summary: {
        totalEmployees: number;
        presentEmployees: number;
        absentEmployees: number;
        lateEmployees: number;
        averageAttendanceRate: number;
        averagePunctualityRate: number;
    };
    departmentBreakdown: Array<{
        departmentId: string;
        departmentName: string;
        attendanceRate: number;
        punctualityRate: number;
        employeeCount: number;
    }>;
    dailyBreakdown: Array<{
        date: string;
        present: number;
        absent: number;
        late: number;
        attendanceRate: number;
    }>;
    alerts: Array<{
        type: 'chronic_absenteeism' | 'frequent_lateness' | 'pattern_change';
        employeeId: string;
        employeeName: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
    }>;
}

export class AttendanceAnalyticsService {
    private supabase: SupabaseClient;

    // Thresholds for pattern analysis
    private readonly thresholds = {
        chronicAbsenteeism: 0.8,    // Below 80% attendance
        frequentLateness: 0.7,      // Below 70% punctuality
        consistencyScore: 0.75,     // Below 75% consistency
        consecutiveAbsences: 3,     // 3+ consecutive absences
        lateFrequency: 0.3          // More than 30% late arrivals
    };

    constructor() {
        this.supabase = supabase.getClient();
    }

    /**
     * Analyze attendance patterns for an employee
     */
    async analyzeEmployeeAttendancePattern(
        employeeId: string,
        startDate: Date,
        endDate: Date
    ): Promise<AttendancePattern> {
        try {
            logger.info('AttendanceAnalyticsService: Analyzing employee attendance pattern', {
                employeeId,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            });

            // Get employee details
            const { data: employee, error: employeeError } = await this.supabase
                .from('employees')
                .select(`
                    id,
                    full_name,
                    department_id,
                    departments!employees_department_id_fkey(name)
                `)
                .eq('id', employeeId)
                .single();

            if (employeeError || !employee) {
                throw new Error(`Employee not found: ${employeeId}`);
            }

            // Get attendance records
            const { data: attendanceRecords, error: attendanceError } = await this.supabase
                .from('attendance')
                .select('*')
                .eq('employee_id', employeeId)
                .gte('date', startDate.toISOString().split('T')[0])
                .lte('date', endDate.toISOString().split('T')[0])
                .order('date', { ascending: true });

            if (attendanceError) {
                throw attendanceError;
            }

            const records = attendanceRecords || [];

            // Analyze patterns
            const arrivalTimes = this.analyzeArrivalTimes(records);
            const departureTimes = this.analyzeDepartureTimes(records);
            const workHours = this.analyzeWorkHours(records);
            const consistency = this.analyzeConsistency(records);
            const workDayPreferences = this.analyzeWorkDayPreferences(records, startDate, endDate);
            const latePattern = this.analyzeLateArrivalPattern(records);
            const absenteeismPattern = this.analyzeAbsenteeismPattern(records, startDate, endDate);

            // Generate insights and recommendations
            const insights = this.generateAttendanceInsights(records, {
                arrivalTimes,
                departureTimes,
                workHours,
                consistency,
                latePattern,
                absenteeismPattern
            });

            const recommendations = this.generateAttendanceRecommendations({
                consistency,
                latePattern,
                absenteeismPattern,
                workHours
            });

            const pattern: AttendancePattern = {
                employeeId,
                employeeName: employee.full_name,
                department: (employee.departments as any)?.name,
                period: { start: startDate, end: endDate },
                patterns: {
                    mostCommonArrivalTime: arrivalTimes.mostCommon,
                    mostCommonDepartureTime: departureTimes.mostCommon,
                    averageWorkHours: workHours.average,
                    consistencyScore: consistency.score,
                    preferredWorkDays: workDayPreferences,
                    lateArrivalPattern: latePattern,
                    absenteeismPattern: absenteeismPattern
                },
                insights,
                recommendations
            };

            logger.info('AttendanceAnalyticsService: Employee attendance pattern analyzed', {
                employeeId,
                consistencyScore: consistency.score
            });

            return pattern;
        } catch (error) {
            logger.error('AttendanceAnalyticsService: Failed to analyze employee attendance pattern', {
                error: (error as Error).message,
                employeeId
            });
            throw error;
        }
    }

    /**
     * Analyze department attendance analytics
     */
    async analyzeDepartmentAttendance(
        departmentId: string,
        startDate: Date,
        endDate: Date
    ): Promise<DepartmentAttendanceAnalytics> {
        try {
            logger.info('AttendanceAnalyticsService: Analyzing department attendance', {
                departmentId,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            });

            // Get department details and employees
            const { data: department, error: deptError } = await this.supabase
                .from('departments')
                .select(`
                    id,
                    name,
                    employees(id, full_name)
                `)
                .eq('id', departmentId)
                .single();

            if (deptError || !department) {
                throw new Error(`Department not found: ${departmentId}`);
            }

            const employees = department.employees || [];

            // Get attendance data for all employees in department
            const employeeIds = employees.map(emp => emp.id);
            const { data: attendanceRecords, error: attendanceError } = await this.supabase
                .from('attendance')
                .select(`
                    *,
                    employee:employees(id, full_name)
                `)
                .in('employee_id', employeeIds)
                .gte('date', startDate.toISOString().split('T')[0])
                .lte('date', endDate.toISOString().split('T')[0]);

            if (attendanceError) {
                throw attendanceError;
            }

            const records = attendanceRecords || [];

            // Calculate department metrics
            const metrics = this.calculateDepartmentMetrics(records, employees.length, startDate, endDate);

            // Calculate trends
            const trends = await this.calculateDepartmentTrends(departmentId, startDate, endDate);

            // Identify top performers
            const topPerformers = await this.identifyTopPerformers(employeeIds, startDate, endDate);

            // Identify concerning patterns
            const concerningPatterns = await this.identifyConcerningPatterns(employeeIds, startDate, endDate);

            const analytics: DepartmentAttendanceAnalytics = {
                departmentId,
                departmentName: department.name,
                period: { start: startDate, end: endDate },
                metrics,
                trends,
                topPerformers,
                concerningPatterns
            };

            logger.info('AttendanceAnalyticsService: Department attendance analyzed', {
                departmentId,
                averageAttendanceRate: metrics.averageAttendanceRate
            });

            return analytics;
        } catch (error) {
            logger.error('AttendanceAnalyticsService: Failed to analyze department attendance', {
                error: (error as Error).message,
                departmentId
            });
            throw error;
        }
    }

    /**
     * Generate comprehensive attendance report
     */
    async generateAttendanceReport(
        reportType: 'daily' | 'weekly' | 'monthly' | 'custom',
        startDate: Date,
        endDate: Date,
        departmentId?: string
    ): Promise<AttendanceReport> {
        try {
            logger.info('AttendanceAnalyticsService: Generating attendance report', {
                reportType,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                departmentId
            });

            // Get attendance data
            let query = this.supabase
                .from('attendance')
                .select(`
                    *,
                    employee:employees(id, full_name, department:departments(id, name))
                `)
                .gte('date', startDate.toISOString().split('T')[0])
                .lte('date', endDate.toISOString().split('T')[0]);

            if (departmentId) {
                query = query.eq('employee.department.id', departmentId);
            }

            const { data: attendanceRecords, error } = await query;

            if (error) {
                throw error;
            }

            const records = attendanceRecords || [];

            // Calculate summary metrics
            const summary = this.calculateReportSummary(records, startDate, endDate);

            // Calculate department breakdown
            const departmentBreakdown = this.calculateDepartmentBreakdown(records);

            // Calculate daily breakdown
            const dailyBreakdown = this.calculateDailyBreakdown(records, startDate, endDate);

            // Generate alerts
            const alerts = await this.generateAttendanceAlerts(records);

            const report: AttendanceReport = {
                reportType,
                period: { start: startDate, end: endDate },
                summary,
                departmentBreakdown,
                dailyBreakdown,
                alerts
            };

            logger.info('AttendanceAnalyticsService: Attendance report generated', {
                reportType,
                totalEmployees: summary.totalEmployees,
                averageAttendanceRate: summary.averageAttendanceRate
            });

            return report;
        } catch (error) {
            logger.error('AttendanceAnalyticsService: Failed to generate attendance report', {
                error: (error as Error).message,
                reportType
            });
            throw error;
        }
    }

    /**
     * Detect attendance anomalies and patterns
     */
    async detectAttendanceAnomalies(
        startDate: Date,
        endDate: Date,
        departmentId?: string
    ): Promise<Array<{
        type: 'unusual_pattern' | 'sudden_change' | 'concerning_trend';
        employeeId: string;
        employeeName: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
        detectedAt: Date;
        recommendations: string[];
    }>> {
        try {
            logger.info('AttendanceAnalyticsService: Detecting attendance anomalies', {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                departmentId
            });

            const anomalies: any[] = [];

            // Get employees to analyze
            let employeeQuery = this.supabase
                .from('employees')
                .select('id, full_name, department_id')
                .eq('status', 'active');

            if (departmentId) {
                employeeQuery = employeeQuery.eq('department_id', departmentId);
            }

            const { data: employees, error: employeeError } = await employeeQuery;

            if (employeeError) {
                throw employeeError;
            }

            // Analyze each employee for anomalies
            for (const employee of employees || []) {
                try {
                    const employeeAnomalies = await this.detectEmployeeAnomalies(
                        employee.id,
                        employee.full_name,
                        startDate,
                        endDate
                    );
                    anomalies.push(...employeeAnomalies);
                } catch (error) {
                    logger.warn('AttendanceAnalyticsService: Failed to detect anomalies for employee', {
                        employeeId: employee.id,
                        error: (error as Error).message
                    });
                }
            }

            logger.info('AttendanceAnalyticsService: Attendance anomalies detected', {
                count: anomalies.length
            });

            return anomalies;
        } catch (error) {
            logger.error('AttendanceAnalyticsService: Failed to detect attendance anomalies', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Analyze arrival times pattern
     */
    private analyzeArrivalTimes(records: any[]): { mostCommon: string; variance: number } {
        const checkedInRecords = records.filter(r => r.check_in_time);
        
        if (checkedInRecords.length === 0) {
            return { mostCommon: 'N/A', variance: 0 };
        }

        const arrivalTimes = checkedInRecords.map(r => {
            const time = new Date(r.check_in_time);
            return time.getHours() * 60 + time.getMinutes(); // Convert to minutes
        });

        // Find most common arrival time (rounded to 30-minute intervals)
        const timeSlots: { [key: string]: number } = {};
        arrivalTimes.forEach(minutes => {
            const slot = Math.round(minutes / 30) * 30; // Round to nearest 30 minutes
            const timeStr = this.minutesToTimeString(slot);
            timeSlots[timeStr] = (timeSlots[timeStr] || 0) + 1;
        });

        const mostCommon = Object.keys(timeSlots).reduce((a, b) => 
            timeSlots[a] > timeSlots[b] ? a : b
        );

        // Calculate variance
        const average = arrivalTimes.reduce((sum, time) => sum + time, 0) / arrivalTimes.length;
        const variance = arrivalTimes.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / arrivalTimes.length;

        return { mostCommon, variance };
    }

    /**
     * Analyze departure times pattern
     */
    private analyzeDepartureTimes(records: any[]): { mostCommon: string; variance: number } {
        const checkedOutRecords = records.filter(r => r.check_out_time);
        
        if (checkedOutRecords.length === 0) {
            return { mostCommon: 'N/A', variance: 0 };
        }

        const departureTimes = checkedOutRecords.map(r => {
            const time = new Date(r.check_out_time);
            return time.getHours() * 60 + time.getMinutes();
        });

        // Find most common departure time
        const timeSlots: { [key: string]: number } = {};
        departureTimes.forEach(minutes => {
            const slot = Math.round(minutes / 30) * 30;
            const timeStr = this.minutesToTimeString(slot);
            timeSlots[timeStr] = (timeSlots[timeStr] || 0) + 1;
        });

        const mostCommon = Object.keys(timeSlots).reduce((a, b) => 
            timeSlots[a] > timeSlots[b] ? a : b
        );

        const average = departureTimes.reduce((sum, time) => sum + time, 0) / departureTimes.length;
        const variance = departureTimes.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / departureTimes.length;

        return { mostCommon, variance };
    }

    /**
     * Analyze work hours pattern
     */
    private analyzeWorkHours(records: any[]): { average: number; consistency: number } {
        const workHours = records
            .filter(r => r.total_hours && r.total_hours > 0)
            .map(r => r.total_hours);

        if (workHours.length === 0) {
            return { average: 0, consistency: 0 };
        }

        const average = workHours.reduce((sum, hours) => sum + hours, 0) / workHours.length;
        
        // Calculate consistency (inverse of coefficient of variation)
        const variance = workHours.reduce((sum, hours) => sum + Math.pow(hours - average, 2), 0) / workHours.length;
        const standardDeviation = Math.sqrt(variance);
        const coefficientOfVariation = average > 0 ? standardDeviation / average : 1;
        const consistency = Math.max(0, 1 - coefficientOfVariation);

        return { average: Math.round(average * 100) / 100, consistency };
    }

    /**
     * Analyze attendance consistency
     */
    private analyzeConsistency(records: any[]): { score: number; factors: string[] } {
        const factors: string[] = [];
        let score = 1.0;

        // Check attendance regularity
        const totalDays = records.length;
        const presentDays = records.filter(r => r.status !== 'absent').length;
        const attendanceRate = totalDays > 0 ? presentDays / totalDays : 0;

        if (attendanceRate < 0.9) {
            score *= 0.8;
            factors.push('Irregular attendance');
        }

        // Check punctuality consistency
        const lateCount = records.filter(r => r.is_late).length;
        const punctualityRate = totalDays > 0 ? (totalDays - lateCount) / totalDays : 1;

        if (punctualityRate < 0.8) {
            score *= 0.9;
            factors.push('Inconsistent punctuality');
        }

        // Check work hours consistency
        const workHours = this.analyzeWorkHours(records);
        if (workHours.consistency < 0.7) {
            score *= 0.9;
            factors.push('Irregular work hours');
        }

        return { score: Math.round(score * 100) / 100, factors };
    }

    /**
     * Analyze work day preferences
     */
    private analyzeWorkDayPreferences(records: any[], startDate: Date, endDate: Date): string[] {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayAttendance: { [key: string]: { present: number; total: number } } = {};

        // Initialize day counts
        dayNames.forEach(day => {
            dayAttendance[day] = { present: 0, total: 0 };
        });

        // Count attendance by day of week
        const current = new Date(startDate);
        while (current <= endDate) {
            const dayName = dayNames[current.getDay()];
            const dateStr = current.toISOString().split('T')[0];
            
            dayAttendance[dayName].total++;
            
            const record = records.find(r => r.date === dateStr);
            if (record && record.status !== 'absent') {
                dayAttendance[dayName].present++;
            }

            current.setDate(current.getDate() + 1);
        }

        // Find preferred days (attendance rate > 80%)
        const preferredDays = Object.entries(dayAttendance)
            .filter(([day, data]) => data.total > 0 && (data.present / data.total) > 0.8)
            .map(([day]) => day);

        return preferredDays;
    }

    /**
     * Analyze late arrival pattern
     */
    private analyzeLateArrivalPattern(records: any[]): {
        frequency: number;
        averageMinutesLate: number;
        mostCommonLateDay: string;
    } {
        const lateRecords = records.filter(r => r.is_late);
        const totalRecords = records.filter(r => r.status !== 'absent').length;

        const frequency = totalRecords > 0 ? lateRecords.length / totalRecords : 0;

        const totalMinutesLate = lateRecords.reduce((sum, r) => sum + (r.minutes_late || 0), 0);
        const averageMinutesLate = lateRecords.length > 0 ? totalMinutesLate / lateRecords.length : 0;

        // Find most common late day
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const lateDays: { [key: string]: number } = {};

        lateRecords.forEach(record => {
            const date = new Date(record.date);
            const dayName = dayNames[date.getDay()];
            lateDays[dayName] = (lateDays[dayName] || 0) + 1;
        });

        const mostCommonLateDay = Object.keys(lateDays).length > 0 
            ? Object.keys(lateDays).reduce((a, b) => lateDays[a] > lateDays[b] ? a : b)
            : 'N/A';

        return {
            frequency: Math.round(frequency * 100) / 100,
            averageMinutesLate: Math.round(averageMinutesLate),
            mostCommonLateDay
        };
    }

    /**
     * Analyze absenteeism pattern
     */
    private analyzeAbsenteeismPattern(records: any[], startDate: Date, endDate: Date): {
        frequency: number;
        mostCommonAbsentDay: string;
        consecutiveAbsences: number;
    } {
        const totalWorkDays = this.calculateWorkingDays(startDate, endDate);
        const absentRecords = records.filter(r => r.status === 'absent');

        const frequency = totalWorkDays > 0 ? absentRecords.length / totalWorkDays : 0;

        // Find most common absent day
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const absentDays: { [key: string]: number } = {};

        absentRecords.forEach(record => {
            const date = new Date(record.date);
            const dayName = dayNames[date.getDay()];
            absentDays[dayName] = (absentDays[dayName] || 0) + 1;
        });

        const mostCommonAbsentDay = Object.keys(absentDays).length > 0 
            ? Object.keys(absentDays).reduce((a, b) => absentDays[a] > absentDays[b] ? a : b)
            : 'N/A';

        // Calculate maximum consecutive absences
        let maxConsecutive = 0;
        let currentConsecutive = 0;

        const sortedRecords = records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        sortedRecords.forEach(record => {
            if (record.status === 'absent') {
                currentConsecutive++;
                maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
            } else {
                currentConsecutive = 0;
            }
        });

        return {
            frequency: Math.round(frequency * 100) / 100,
            mostCommonAbsentDay,
            consecutiveAbsences: maxConsecutive
        };
    }

    /**
     * Generate attendance insights
     */
    private generateAttendanceInsights(records: any[], patterns: any): string[] {
        const insights: string[] = [];

        // Attendance consistency insights
        if (patterns.consistency.score >= 0.9) {
            insights.push('Highly consistent attendance pattern - very reliable employee');
        } else if (patterns.consistency.score >= 0.7) {
            insights.push('Generally consistent attendance with minor variations');
        } else {
            insights.push('Inconsistent attendance pattern - requires attention');
        }

        // Late arrival insights
        if (patterns.latePattern.frequency > 0.3) {
            insights.push(`Frequent late arrivals (${Math.round(patterns.latePattern.frequency * 100)}% of days)`);
        }

        if (patterns.latePattern.averageMinutesLate > 15) {
            insights.push(`Significant lateness when late (average ${patterns.latePattern.averageMinutesLate} minutes)`);
        }

        // Work hours insights
        if (patterns.workHours.average > 8.5) {
            insights.push('Consistently works longer hours than standard');
        } else if (patterns.workHours.average < 7.5) {
            insights.push('Works fewer hours than standard work day');
        }

        // Absenteeism insights
        if (patterns.absenteeismPattern.frequency > 0.1) {
            insights.push('Higher than average absenteeism rate');
        }

        if (patterns.absenteeismPattern.consecutiveAbsences >= 3) {
            insights.push(`Pattern of consecutive absences (up to ${patterns.absenteeismPattern.consecutiveAbsences} days)`);
        }

        return insights;
    }

    /**
     * Generate attendance recommendations
     */
    private generateAttendanceRecommendations(patterns: any): string[] {
        const recommendations: string[] = [];

        if (patterns.consistency.score < 0.7) {
            recommendations.push('Implement attendance improvement plan');
        }

        if (patterns.latePattern.frequency > 0.2) {
            recommendations.push('Address punctuality issues - consider flexible start times');
        }

        if (patterns.absenteeismPattern.frequency > 0.1) {
            recommendations.push('Investigate causes of frequent absences');
        }

        if (patterns.absenteeismPattern.consecutiveAbsences >= 3) {
            recommendations.push('Review consecutive absence policy and provide support');
        }

        if (patterns.workHours.consistency < 0.7) {
            recommendations.push('Establish more consistent work schedule');
        }

        if (recommendations.length === 0) {
            recommendations.push('Maintain current excellent attendance standards');
        }

        return recommendations;
    }

    /**
     * Calculate department metrics
     */
    private calculateDepartmentMetrics(records: any[], employeeCount: number, startDate: Date, endDate: Date): any {
        const totalWorkDays = this.calculateWorkingDays(startDate, endDate);
        const totalPossibleAttendance = employeeCount * totalWorkDays;

        const presentRecords = records.filter(r => r.status !== 'absent');
        const lateRecords = records.filter(r => r.is_late);
        const absentRecords = records.filter(r => r.status === 'absent');

        const averageAttendanceRate = totalPossibleAttendance > 0 
            ? (presentRecords.length / totalPossibleAttendance) * 100 
            : 0;

        const averagePunctualityRate = presentRecords.length > 0 
            ? ((presentRecords.length - lateRecords.length) / presentRecords.length) * 100 
            : 0;

        const workHours = records
            .filter(r => r.total_hours && r.total_hours > 0)
            .map(r => r.total_hours);

        const averageWorkHours = workHours.length > 0 
            ? workHours.reduce((sum, hours) => sum + hours, 0) / workHours.length 
            : 0;

        return {
            averageAttendanceRate: Math.round(averageAttendanceRate * 100) / 100,
            averagePunctualityRate: Math.round(averagePunctualityRate * 100) / 100,
            averageWorkHours: Math.round(averageWorkHours * 100) / 100,
            totalAbsences: absentRecords.length,
            totalLateArrivals: lateRecords.length
        };
    }

    /**
     * Calculate department trends
     */
    private async calculateDepartmentTrends(
        departmentId: string,
        startDate: Date,
        endDate: Date
    ): Promise<any> {
        // This would compare with previous period
        // For now, returning stable trends
        return {
            attendanceTrend: 'stable',
            punctualityTrend: 'stable',
            workHoursTrend: 'stable'
        };
    }

    /**
     * Identify top performers in attendance
     */
    private async identifyTopPerformers(
        employeeIds: string[],
        startDate: Date,
        endDate: Date
    ): Promise<Array<{ employeeId: string; employeeName: string; attendanceRate: number }>> {
        const performers: Array<{ employeeId: string; employeeName: string; attendanceRate: number }> = [];

        for (const employeeId of employeeIds) {
            try {
                const { data: records } = await this.supabase
                    .from('attendance')
                    .select('status, employee:employees(full_name)')
                    .eq('employee_id', employeeId)
                    .gte('date', startDate.toISOString().split('T')[0])
                    .lte('date', endDate.toISOString().split('T')[0]);

                if (records && records.length > 0) {
                    const presentDays = records.filter(r => r.status !== 'absent').length;
                    const attendanceRate = (presentDays / records.length) * 100;

                    if (attendanceRate >= 95) { // Top performers have 95%+ attendance
                        performers.push({
                            employeeId,
                            employeeName: (records[0].employee as any)?.full_name || 'Unknown',
                            attendanceRate: Math.round(attendanceRate * 100) / 100
                        });
                    }
                }
            } catch (error) {
                logger.warn('AttendanceAnalyticsService: Failed to calculate attendance for employee', {
                    employeeId,
                    error: (error as Error).message
                });
            }
        }

        return performers.sort((a, b) => b.attendanceRate - a.attendanceRate).slice(0, 10);
    }

    /**
     * Identify concerning attendance patterns
     */
    private async identifyConcerningPatterns(
        employeeIds: string[],
        startDate: Date,
        endDate: Date
    ): Promise<Array<{ employeeId: string; employeeName: string; issues: string[] }>> {
        const concerningPatterns: Array<{ employeeId: string; employeeName: string; issues: string[] }> = [];

        for (const employeeId of employeeIds) {
            try {
                const pattern = await this.analyzeEmployeeAttendancePattern(employeeId, startDate, endDate);
                const issues: string[] = [];

                if (pattern.patterns.consistencyScore < this.thresholds.consistencyScore) {
                    issues.push('Low attendance consistency');
                }

                if (pattern.patterns.lateArrivalPattern.frequency > this.thresholds.lateFrequency) {
                    issues.push('Frequent late arrivals');
                }

                if (pattern.patterns.absenteeismPattern.consecutiveAbsences >= this.thresholds.consecutiveAbsences) {
                    issues.push('Consecutive absences pattern');
                }

                if (issues.length > 0) {
                    concerningPatterns.push({
                        employeeId,
                        employeeName: pattern.employeeName,
                        issues
                    });
                }
            } catch (error) {
                logger.warn('AttendanceAnalyticsService: Failed to analyze pattern for employee', {
                    employeeId,
                    error: (error as Error).message
                });
            }
        }

        return concerningPatterns;
    }

    /**
     * Calculate report summary
     */
    private calculateReportSummary(records: any[], startDate: Date, endDate: Date): any {
        const uniqueEmployees = new Set(records.map(r => r.employee_id));
        const totalEmployees = uniqueEmployees.size;

        const presentRecords = records.filter(r => r.status !== 'absent');
        const absentRecords = records.filter(r => r.status === 'absent');
        const lateRecords = records.filter(r => r.is_late);

        const uniquePresentEmployees = new Set(presentRecords.map(r => r.employee_id));
        const uniqueAbsentEmployees = new Set(absentRecords.map(r => r.employee_id));
        const uniqueLateEmployees = new Set(lateRecords.map(r => r.employee_id));

        const totalWorkDays = this.calculateWorkingDays(startDate, endDate);
        const totalPossibleAttendance = totalEmployees * totalWorkDays;

        const averageAttendanceRate = totalPossibleAttendance > 0 
            ? (presentRecords.length / totalPossibleAttendance) * 100 
            : 0;

        const averagePunctualityRate = presentRecords.length > 0 
            ? ((presentRecords.length - lateRecords.length) / presentRecords.length) * 100 
            : 0;

        return {
            totalEmployees,
            presentEmployees: uniquePresentEmployees.size,
            absentEmployees: uniqueAbsentEmployees.size,
            lateEmployees: uniqueLateEmployees.size,
            averageAttendanceRate: Math.round(averageAttendanceRate * 100) / 100,
            averagePunctualityRate: Math.round(averagePunctualityRate * 100) / 100
        };
    }

    /**
     * Calculate department breakdown
     */
    private calculateDepartmentBreakdown(records: any[]): any[] {
        const departmentData: { [key: string]: any } = {};

        records.forEach(record => {
            const deptId = record.employee?.department?.id;
            const deptName = record.employee?.department?.name || 'Unknown';

            if (!departmentData[deptId]) {
                departmentData[deptId] = {
                    departmentId: deptId,
                    departmentName: deptName,
                    totalRecords: 0,
                    presentRecords: 0,
                    lateRecords: 0,
                    employees: new Set()
                };
            }

            departmentData[deptId].totalRecords++;
            departmentData[deptId].employees.add(record.employee_id);

            if (record.status !== 'absent') {
                departmentData[deptId].presentRecords++;
            }

            if (record.is_late) {
                departmentData[deptId].lateRecords++;
            }
        });

        return Object.values(departmentData).map((dept: any) => ({
            departmentId: dept.departmentId,
            departmentName: dept.departmentName,
            attendanceRate: dept.totalRecords > 0 ? (dept.presentRecords / dept.totalRecords) * 100 : 0,
            punctualityRate: dept.presentRecords > 0 ? ((dept.presentRecords - dept.lateRecords) / dept.presentRecords) * 100 : 0,
            employeeCount: dept.employees.size
        }));
    }

    /**
     * Calculate daily breakdown
     */
    private calculateDailyBreakdown(records: any[], startDate: Date, endDate: Date): any[] {
        const dailyData: { [key: string]: any } = {};

        // Initialize all dates
        const current = new Date(startDate);
        while (current <= endDate) {
            const dateStr = current.toISOString().split('T')[0];
            dailyData[dateStr] = {
                date: dateStr,
                present: 0,
                absent: 0,
                late: 0,
                total: 0
            };
            current.setDate(current.getDate() + 1);
        }

        // Count records by date
        records.forEach(record => {
            const dateStr = record.date;
            if (dailyData[dateStr]) {
                dailyData[dateStr].total++;

                if (record.status === 'absent') {
                    dailyData[dateStr].absent++;
                } else {
                    dailyData[dateStr].present++;
                    if (record.is_late) {
                        dailyData[dateStr].late++;
                    }
                }
            }
        });

        return Object.values(dailyData).map((day: any) => ({
            ...day,
            attendanceRate: day.total > 0 ? (day.present / day.total) * 100 : 0
        }));
    }

    /**
     * Generate attendance alerts
     */
    private async generateAttendanceAlerts(records: any[]): Promise<any[]> {
        const alerts: any[] = [];
        const employeeData: { [key: string]: any } = {};

        // Group records by employee
        records.forEach(record => {
            if (!employeeData[record.employee_id]) {
                employeeData[record.employee_id] = {
                    employeeId: record.employee_id,
                    employeeName: record.employee?.full_name || 'Unknown',
                    records: []
                };
            }
            employeeData[record.employee_id].records.push(record);
        });

        // Analyze each employee for alerts
        Object.values(employeeData).forEach((employee: any) => {
            const empRecords = employee.records;
            const presentRecords = empRecords.filter((r: any) => r.status !== 'absent');
            const lateRecords = empRecords.filter((r: any) => r.is_late);

            const attendanceRate = empRecords.length > 0 ? (presentRecords.length / empRecords.length) : 1;
            const punctualityRate = presentRecords.length > 0 ? ((presentRecords.length - lateRecords.length) / presentRecords.length) : 1;

            // Chronic absenteeism alert
            if (attendanceRate < this.thresholds.chronicAbsenteeism) {
                alerts.push({
                    type: 'chronic_absenteeism',
                    employeeId: employee.employeeId,
                    employeeName: employee.employeeName,
                    description: `Attendance rate below threshold: ${Math.round(attendanceRate * 100)}%`,
                    severity: attendanceRate < 0.6 ? 'high' : 'medium'
                });
            }

            // Frequent lateness alert
            if (punctualityRate < this.thresholds.frequentLateness) {
                alerts.push({
                    type: 'frequent_lateness',
                    employeeId: employee.employeeId,
                    employeeName: employee.employeeName,
                    description: `Punctuality rate below threshold: ${Math.round(punctualityRate * 100)}%`,
                    severity: punctualityRate < 0.5 ? 'high' : 'medium'
                });
            }
        });

        return alerts;
    }

    /**
     * Detect employee-specific anomalies
     */
    private async detectEmployeeAnomalies(
        employeeId: string,
        employeeName: string,
        startDate: Date,
        endDate: Date
    ): Promise<any[]> {
        const anomalies: any[] = [];

        try {
            const pattern = await this.analyzeEmployeeAttendancePattern(employeeId, startDate, endDate);

            // Check for concerning patterns
            if (pattern.patterns.consistencyScore < 0.5) {
                anomalies.push({
                    type: 'concerning_trend',
                    employeeId,
                    employeeName,
                    description: 'Significant decline in attendance consistency',
                    severity: 'high',
                    detectedAt: new Date(),
                    recommendations: ['Schedule performance review', 'Investigate underlying issues']
                });
            }

            if (pattern.patterns.lateArrivalPattern.frequency > 0.5) {
                anomalies.push({
                    type: 'unusual_pattern',
                    employeeId,
                    employeeName,
                    description: 'Unusually high frequency of late arrivals',
                    severity: 'medium',
                    detectedAt: new Date(),
                    recommendations: ['Discuss schedule flexibility', 'Review commute challenges']
                });
            }

            if (pattern.patterns.absenteeismPattern.consecutiveAbsences >= 5) {
                anomalies.push({
                    type: 'concerning_trend',
                    employeeId,
                    employeeName,
                    description: 'Extended consecutive absences detected',
                    severity: 'high',
                    detectedAt: new Date(),
                    recommendations: ['Immediate HR intervention', 'Check employee wellbeing']
                });
            }
        } catch (error) {
            // Skip this employee if analysis fails
        }

        return anomalies;
    }

    /**
     * Convert minutes to time string
     */
    private minutesToTimeString(minutes: number): string {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    /**
     * Calculate working days between two dates
     */
    private calculateWorkingDays(startDate: Date, endDate: Date): number {
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
}

export default new AttendanceAnalyticsService();