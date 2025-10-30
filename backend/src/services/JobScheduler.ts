import * as cron from 'node-cron';
import logger from '../utils/logger';
import PerformanceMetricsJob from './PerformanceMetricsJob';
import CheckoutMonitoringService from './CheckoutMonitoringService';

export interface ScheduledJob {
    name: string;
    schedule: string;
    task: () => Promise<void>;
    enabled: boolean;
    lastRun?: Date;
    nextRun?: Date;
}

export class JobScheduler {
    private jobs: Map<string, cron.ScheduledTask> = new Map();
    private jobConfigs: Map<string, ScheduledJob> = new Map();

    constructor() {
        this.initializeJobs();
    }

    /**
     * Initialize all scheduled jobs
     */
    private initializeJobs(): void {
        // Performance metrics calculation - Every Monday at midnight
        this.scheduleJob({
            name: 'performance_metrics_weekly',
            schedule: '0 0 * * 1', // Every Monday at 00:00
            task: async () => {
                logger.info('JobScheduler: Starting weekly performance metrics calculation');
                const result = await PerformanceMetricsJob.executeWeeklyCalculation();
                logger.info('JobScheduler: Weekly performance metrics calculation completed', { result });
            },
            enabled: true
        });

        // Performance metrics daily update - Every day at 11:30 PM
        this.scheduleJob({
            name: 'performance_metrics_daily',
            schedule: '30 23 * * *', // Every day at 23:30
            task: async () => {
                logger.info('JobScheduler: Starting daily performance metrics update');
                const result = await PerformanceMetricsJob.executeDailyUpdate();
                logger.info('JobScheduler: Daily performance metrics update completed', { result });
            },
            enabled: true
        });

        // Checkout monitoring - Every day at 6:00 PM
        this.scheduleJob({
            name: 'checkout_monitoring',
            schedule: '0 18 * * 1-5', // Monday to Friday at 18:00
            task: async () => {
                logger.info('JobScheduler: Starting checkout monitoring');
                await CheckoutMonitoringService.runDailyCheckoutMonitoring();
                logger.info('JobScheduler: Checkout monitoring completed');
            },
            enabled: true
        });

        // Task completion analysis - Every day at 1:00 AM
        this.scheduleJob({
            name: 'task_completion_analysis',
            schedule: '0 1 * * *', // Every day at 01:00
            task: async () => {
                logger.info('JobScheduler: Starting task completion analysis');
                // This could be expanded to analyze overdue tasks, etc.
                logger.info('JobScheduler: Task completion analysis completed');
            },
            enabled: true
        });

        // Attendance pattern analysis - Every Sunday at 2:00 AM
        this.scheduleJob({
            name: 'attendance_pattern_analysis',
            schedule: '0 2 * * 0', // Every Sunday at 02:00
            task: async () => {
                logger.info('JobScheduler: Starting attendance pattern analysis');
                // This could analyze weekly attendance patterns
                logger.info('JobScheduler: Attendance pattern analysis completed');
            },
            enabled: true
        });

        logger.info('JobScheduler: All jobs initialized', {
            totalJobs: this.jobs.size,
            enabledJobs: Array.from(this.jobConfigs.values()).filter(job => job.enabled).length
        });
    }

    /**
     * Schedule a new job
     */
    scheduleJob(jobConfig: ScheduledJob): void {
        try {
            // Stop existing job if it exists
            if (this.jobs.has(jobConfig.name)) {
                this.stopJob(jobConfig.name);
            }

            if (!jobConfig.enabled) {
                logger.info(`JobScheduler: Job ${jobConfig.name} is disabled, skipping scheduling`);
                this.jobConfigs.set(jobConfig.name, jobConfig);
                return;
            }

            // Validate cron expression
            if (!cron.validate(jobConfig.schedule)) {
                throw new Error(`Invalid cron expression: ${jobConfig.schedule}`);
            }

            // Create scheduled task
            const task = cron.schedule(jobConfig.schedule, async () => {
                const startTime = Date.now();
                try {
                    logger.info(`JobScheduler: Executing job ${jobConfig.name}`);
                    
                    // Update last run time
                    jobConfig.lastRun = new Date();
                    this.jobConfigs.set(jobConfig.name, jobConfig);
                    
                    // Execute the job
                    await jobConfig.task();
                    
                    const executionTime = Date.now() - startTime;
                    logger.info(`JobScheduler: Job ${jobConfig.name} completed successfully`, {
                        executionTime: `${executionTime}ms`
                    });
                    
                } catch (error) {
                    const executionTime = Date.now() - startTime;
                    logger.error(`JobScheduler: Job ${jobConfig.name} failed`, {
                        error: (error as Error).message,
                        executionTime: `${executionTime}ms`
                    });
                }
            }, {
                timezone: process.env.TZ || 'UTC'
            });

            // Store the job
            this.jobs.set(jobConfig.name, task);
            this.jobConfigs.set(jobConfig.name, jobConfig);

            logger.info(`JobScheduler: Job ${jobConfig.name} scheduled successfully`, {
                schedule: jobConfig.schedule,
                enabled: jobConfig.enabled
            });

        } catch (error) {
            logger.error(`JobScheduler: Failed to schedule job ${jobConfig.name}`, {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Stop a scheduled job
     */
    stopJob(jobName: string): boolean {
        try {
            const job = this.jobs.get(jobName);
            if (job) {
                job.stop();
                this.jobs.delete(jobName);
                logger.info(`JobScheduler: Job ${jobName} stopped`);
                return true;
            }
            return false;
        } catch (error) {
            logger.error(`JobScheduler: Failed to stop job ${jobName}`, {
                error: (error as Error).message
            });
            return false;
        }
    }

    /**
     * Start a stopped job
     */
    startJob(jobName: string): boolean {
        try {
            const jobConfig = this.jobConfigs.get(jobName);
            if (jobConfig) {
                jobConfig.enabled = true;
                this.scheduleJob(jobConfig);
                return true;
            }
            return false;
        } catch (error) {
            logger.error(`JobScheduler: Failed to start job ${jobName}`, {
                error: (error as Error).message
            });
            return false;
        }
    }

    /**
     * Get job status
     */
    getJobStatus(jobName: string): any {
        const jobConfig = this.jobConfigs.get(jobName);
        const isRunning = this.jobs.has(jobName);
        
        if (!jobConfig) {
            return null;
        }

        return {
            name: jobConfig.name,
            schedule: jobConfig.schedule,
            enabled: jobConfig.enabled,
            isRunning,
            lastRun: jobConfig.lastRun,
            nextRun: isRunning ? this.getNextRunTime(jobConfig.schedule) : null
        };
    }

    /**
     * Get all jobs status
     */
    getAllJobsStatus(): any[] {
        return Array.from(this.jobConfigs.keys()).map(jobName => 
            this.getJobStatus(jobName)
        ).filter(status => status !== null);
    }

    /**
     * Update job configuration
     */
    updateJobConfig(jobName: string, updates: Partial<ScheduledJob>): boolean {
        try {
            const jobConfig = this.jobConfigs.get(jobName);
            if (!jobConfig) {
                return false;
            }

            const updatedConfig = { ...jobConfig, ...updates };
            
            // If schedule changed, reschedule the job
            if (updates.schedule && updates.schedule !== jobConfig.schedule) {
                this.scheduleJob(updatedConfig);
            } else if (updates.enabled !== undefined) {
                if (updates.enabled) {
                    this.startJob(jobName);
                } else {
                    this.stopJob(jobName);
                    this.jobConfigs.set(jobName, updatedConfig);
                }
            }

            return true;
        } catch (error) {
            logger.error(`JobScheduler: Failed to update job config ${jobName}`, {
                error: (error as Error).message
            });
            return false;
        }
    }

    /**
     * Manually trigger a job
     */
    async triggerJob(jobName: string): Promise<boolean> {
        try {
            const jobConfig = this.jobConfigs.get(jobName);
            if (!jobConfig) {
                logger.error(`JobScheduler: Job ${jobName} not found`);
                return false;
            }

            logger.info(`JobScheduler: Manually triggering job ${jobName}`);
            await jobConfig.task();
            
            // Update last run time
            jobConfig.lastRun = new Date();
            this.jobConfigs.set(jobName, jobConfig);
            
            logger.info(`JobScheduler: Job ${jobName} triggered successfully`);
            return true;
        } catch (error) {
            logger.error(`JobScheduler: Failed to trigger job ${jobName}`, {
                error: (error as Error).message
            });
            return false;
        }
    }

    /**
     * Stop all jobs
     */
    stopAllJobs(): void {
        try {
            for (const [jobName, job] of this.jobs) {
                job.stop();
                logger.info(`JobScheduler: Stopped job ${jobName}`);
            }
            this.jobs.clear();
            logger.info('JobScheduler: All jobs stopped');
        } catch (error) {
            logger.error('JobScheduler: Failed to stop all jobs', {
                error: (error as Error).message
            });
        }
    }

    /**
     * Get next run time for a cron expression
     */
    private getNextRunTime(cronExpression: string): Date | null {
        try {
            // This is a simplified implementation
            // In a real application, you might want to use a more sophisticated cron parser
            const now = new Date();
            const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Simplified: next day
            return nextRun;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get scheduler statistics
     */
    getStatistics(): any {
        const allJobs = this.getAllJobsStatus();
        const enabledJobs = allJobs.filter(job => job.enabled);
        const runningJobs = allJobs.filter(job => job.isRunning);

        return {
            totalJobs: allJobs.length,
            enabledJobs: enabledJobs.length,
            runningJobs: runningJobs.length,
            disabledJobs: allJobs.length - enabledJobs.length,
            lastExecutions: allJobs
                .filter(job => job.lastRun)
                .sort((a, b) => new Date(b.lastRun).getTime() - new Date(a.lastRun).getTime())
                .slice(0, 5)
        };
    }
}

export default new JobScheduler();