import { SupabaseClient } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import logger from '../utils/logger';

export interface LocationCoordinates {
    latitude: number;
    longitude: number;
}

export interface LocationValidationResult {
    isValid: boolean;
    distance: number;
    allowedRadius: number;
    isRemoteWorkDay: boolean;
    dayOfWeek: string;
    message: string;
}

export interface OfficeLocationSettings {
    latitude: number;
    longitude: number;
    address: string;
    radius: number;
}

export class LocationValidationService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = supabase.getClient();
    }

    /**
     * Get office location settings from database
     */
    async getOfficeLocationSettings(): Promise<OfficeLocationSettings> {
        try {
            const { data: locationSetting, error: locationError } = await this.supabase
                .from('system_settings')
                .select('setting_value')
                .eq('setting_key', 'office_location')
                .single();

            const { data: radiusSetting, error: radiusError } = await this.supabase
                .from('system_settings')
                .select('setting_value')
                .eq('setting_key', 'check_in_radius_meters')
                .single();

            if (locationError || radiusError) {
                logger.warn('LocationValidationService: Using fallback office settings from environment');
                return {
                    latitude: parseFloat(process.env.OFFICE_LATITUDE || '0'),
                    longitude: parseFloat(process.env.OFFICE_LONGITUDE || '0'),
                    address: process.env.OFFICE_ADDRESS || 'Office Location',
                    radius: parseFloat(process.env.OFFICE_RADIUS || '15000')
                };
            }

            const locationData = locationSetting.setting_value as any;
            const radiusData = parseInt(radiusSetting.setting_value as string);

            return {
                latitude: locationData.latitude || 0,
                longitude: locationData.longitude || 0,
                address: locationData.address || 'Office Location',
                radius: radiusData || 15000
            };
        } catch (error) {
            logger.error('LocationValidationService: Failed to get office settings', { 
                error: (error as Error).message 
            });
            
            // Fallback to environment variables
            return {
                latitude: parseFloat(process.env.OFFICE_LATITUDE || '0'),
                longitude: parseFloat(process.env.OFFICE_LONGITUDE || '0'),
                address: process.env.OFFICE_ADDRESS || 'Office Location',
                radius: parseFloat(process.env.OFFICE_RADIUS || '15000')
            };
        }
    }

    /**
     * Get remote work days from settings
     */
    async getRemoteWorkDays(): Promise<string[]> {
        try {
            const { data, error } = await this.supabase
                .from('system_settings')
                .select('setting_value')
                .eq('setting_key', 'remote_work_days')
                .single();

            if (error) {
                logger.warn('LocationValidationService: Using default remote work days');
                return ['friday'];
            }

            return data.setting_value as string[] || ['friday'];
        } catch (error) {
            logger.error('LocationValidationService: Failed to get remote work days', { 
                error: (error as Error).message 
            });
            return ['friday'];
        }
    }

    /**
     * Get onsite required days from settings
     */
    async getOnsiteRequiredDays(): Promise<string[]> {
        try {
            const { data, error } = await this.supabase
                .from('system_settings')
                .select('setting_value')
                .eq('setting_key', 'onsite_required_days')
                .single();

            if (error) {
                logger.warn('LocationValidationService: Using default onsite required days');
                return ['monday', 'tuesday', 'wednesday', 'thursday'];
            }

            return data.setting_value as string[] || ['monday', 'tuesday', 'wednesday', 'thursday'];
        } catch (error) {
            logger.error('LocationValidationService: Failed to get onsite required days', { 
                error: (error as Error).message 
            });
            return ['monday', 'tuesday', 'wednesday', 'thursday'];
        }
    }

    /**
     * Calculate distance between two coordinates using Haversine formula
     */
    calculateDistance(
        lat1: number, 
        lon1: number, 
        lat2: number, 
        lon2: number
    ): number {
        const R = 6371000; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    /**
     * Get day of week name from date
     */
    getDayOfWeek(date: Date = new Date()): string {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[date.getDay()];
    }

    /**
     * Validate location for check-in based on day and office proximity
     */
    async validateLocationForCheckIn(
        userLocation: LocationCoordinates,
        checkInDate: Date = new Date()
    ): Promise<LocationValidationResult> {
        try {
            logger.info('LocationValidationService: Validating location for check-in', {
                userLocation,
                checkInDate: checkInDate.toISOString()
            });

            const officeSettings = await this.getOfficeLocationSettings();
            const remoteWorkDays = await this.getRemoteWorkDays();
            const onsiteRequiredDays = await this.getOnsiteRequiredDays();
            
            const dayOfWeek = this.getDayOfWeek(checkInDate);
            const isRemoteWorkDay = remoteWorkDays.includes(dayOfWeek);
            const isOnsiteRequiredDay = onsiteRequiredDays.includes(dayOfWeek);

            // Calculate distance from office
            const distance = this.calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                officeSettings.latitude,
                officeSettings.longitude
            );

            let isValid = true;
            let message = 'Check-in location is valid';

            // Validation logic based on day of week
            if (isOnsiteRequiredDay) {
                // Monday to Thursday: Must be within office radius
                if (distance > officeSettings.radius) {
                    isValid = false;
                    message = `You must be within ${Math.round(officeSettings.radius)}m of the office to check-in on ${dayOfWeek}. You are currently ${Math.round(distance)}m away.`;
                } else {
                    message = `Check-in successful from office location (${Math.round(distance)}m from office)`;
                }
            } else if (isRemoteWorkDay) {
                // Friday: Can check-in from anywhere
                if (distance <= officeSettings.radius) {
                    message = `Check-in successful from office location (${Math.round(distance)}m from office)`;
                } else {
                    message = `Check-in successful from remote location (${Math.round(distance)}m from office)`;
                }
            } else {
                // Weekend or other days - typically not work days
                message = `Check-in on ${dayOfWeek} - location validation bypassed`;
            }

            const result: LocationValidationResult = {
                isValid,
                distance: Math.round(distance),
                allowedRadius: officeSettings.radius,
                isRemoteWorkDay,
                dayOfWeek,
                message
            };

            logger.info('LocationValidationService: Location validation completed', {
                result,
                dayOfWeek,
                isRemoteWorkDay,
                isOnsiteRequiredDay
            });

            return result;
        } catch (error) {
            logger.error('LocationValidationService: Location validation failed', { 
                error: (error as Error).message 
            });
            
            // Return permissive result on error
            return {
                isValid: true,
                distance: 0,
                allowedRadius: 15000,
                isRemoteWorkDay: false,
                dayOfWeek: this.getDayOfWeek(checkInDate),
                message: 'Location validation error - check-in allowed'
            };
        }
    }

    /**
     * Check if current time is within work hours
     */
    async isWithinWorkHours(checkTime: Date = new Date()): Promise<boolean> {
        try {
            const { data: startTimeSetting } = await this.supabase
                .from('system_settings')
                .select('setting_value')
                .eq('setting_key', 'work_start_time')
                .single();

            const { data: endTimeSetting } = await this.supabase
                .from('system_settings')
                .select('setting_value')
                .eq('setting_key', 'work_end_time')
                .single();

            const workStartTime = startTimeSetting?.setting_value || '08:35:00';
            const workEndTime = endTimeSetting?.setting_value || '17:00:00';

            const currentTime = checkTime.toTimeString().split(' ')[0]; // Get HH:MM:SS format

            return currentTime >= workStartTime && currentTime <= workEndTime;
        } catch (error) {
            logger.error('LocationValidationService: Failed to check work hours', { 
                error: (error as Error).message 
            });
            return true; // Default to allowing check-in
        }
    }

    /**
     * Calculate if employee is late for work
     */
    async calculateLateArrival(checkInTime: Date): Promise<{ isLate: boolean; minutesLate: number }> {
        try {
            const { data: startTimeSetting } = await this.supabase
                .from('system_settings')
                .select('setting_value')
                .eq('setting_key', 'work_start_time')
                .single();

            const workStartTime = startTimeSetting?.setting_value || '08:35:00';
            
            // Parse work start time
            const [startHour, startMinute] = workStartTime.split(':').map(Number);
            
            // Create expected start time for today
            const expectedStartTime = new Date(checkInTime);
            expectedStartTime.setHours(startHour, startMinute, 0, 0);

            // Calculate difference in minutes
            const diffMs = checkInTime.getTime() - expectedStartTime.getTime();
            const minutesLate = Math.max(0, Math.floor(diffMs / (1000 * 60)));

            const result = {
                isLate: minutesLate > 0,
                minutesLate
            };

            logger.info('LocationValidationService: Late arrival calculated', {
                checkInTime: checkInTime.toISOString(),
                expectedStartTime: expectedStartTime.toISOString(),
                result
            });

            return result;
        } catch (error) {
            logger.error('LocationValidationService: Failed to calculate late arrival', { 
                error: (error as Error).message 
            });
            return { isLate: false, minutesLate: 0 };
        }
    }

    /**
     * Update office location settings
     */
    async updateOfficeLocationSettings(settings: OfficeLocationSettings): Promise<void> {
        try {
            logger.info('LocationValidationService: Updating office location settings', { settings });

            // Update office location
            await this.supabase
                .from('system_settings')
                .upsert({
                    setting_key: 'office_location',
                    setting_value: {
                        latitude: settings.latitude,
                        longitude: settings.longitude,
                        address: settings.address
                    },
                    description: 'Office location coordinates and address',
                    category: 'location',
                    is_public: false,
                    updated_at: new Date().toISOString()
                });

            // Update check-in radius
            await this.supabase
                .from('system_settings')
                .upsert({
                    setting_key: 'check_in_radius_meters',
                    setting_value: settings.radius.toString(),
                    description: 'Maximum distance from office for check-in (in meters)',
                    category: 'attendance',
                    is_public: false,
                    updated_at: new Date().toISOString()
                });

            logger.info('LocationValidationService: Office location settings updated successfully');
        } catch (error) {
            logger.error('LocationValidationService: Failed to update office location settings', { 
                error: (error as Error).message 
            });
            throw error;
        }
    }

    /**
     * Get location validation summary for admin dashboard
     */
    async getLocationValidationSummary(startDate?: Date, endDate?: Date): Promise<any> {
        try {
            const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const end = endDate || new Date();

            const { data: attendanceRecords, error } = await this.supabase
                .from('attendance')
                .select('employee_id, check_in_location, is_late, minutes_late, date')
                .gte('date', start.toISOString().split('T')[0])
                .lte('date', end.toISOString().split('T')[0]);

            if (error) throw error;

            const officeSettings = await this.getOfficeLocationSettings();
            
            let onsiteCheckIns = 0;
            let remoteCheckIns = 0;
            let unknownLocationCheckIns = 0;
            let totalLateArrivals = 0;
            let totalMinutesLate = 0;

            attendanceRecords?.forEach(record => {
                if (record.check_in_location) {
                    const distance = this.calculateDistance(
                        record.check_in_location.latitude,
                        record.check_in_location.longitude,
                        officeSettings.latitude,
                        officeSettings.longitude
                    );

                    if (distance <= officeSettings.radius) {
                        onsiteCheckIns++;
                    } else {
                        remoteCheckIns++;
                    }
                } else {
                    unknownLocationCheckIns++;
                }

                if (record.is_late) {
                    totalLateArrivals++;
                    totalMinutesLate += record.minutes_late || 0;
                }
            });

            const totalCheckIns = attendanceRecords?.length || 0;
            const averageMinutesLate = totalLateArrivals > 0 ? totalMinutesLate / totalLateArrivals : 0;

            return {
                period: {
                    start: start.toISOString().split('T')[0],
                    end: end.toISOString().split('T')[0]
                },
                checkIns: {
                    total: totalCheckIns,
                    onsite: onsiteCheckIns,
                    remote: remoteCheckIns,
                    unknownLocation: unknownLocationCheckIns,
                    onsitePercentage: totalCheckIns > 0 ? Math.round((onsiteCheckIns / totalCheckIns) * 100) : 0
                },
                lateArrivals: {
                    total: totalLateArrivals,
                    percentage: totalCheckIns > 0 ? Math.round((totalLateArrivals / totalCheckIns) * 100) : 0,
                    averageMinutesLate: Math.round(averageMinutesLate)
                },
                officeSettings
            };
        } catch (error) {
            logger.error('LocationValidationService: Failed to get location validation summary', { 
                error: (error as Error).message 
            });
            throw error;
        }
    }
}

export default new LocationValidationService();