import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import JobScheduler from '../services/JobScheduler';
import logger from '../utils/logger';

const router = Router();

/**
 * Get all jobs status
 */
router.get('/', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
        const jobsStatus = JobScheduler.getAllJobsStatus();
        const statistics = JobScheduler.getStatistics();

        res.json({
            success: true,
            data: {
                jobs: jobsStatus,
                statistics
            }
        });
    } catch (error) {
        logger.error('Jobs API: Failed to get jobs status', {
            error: (error as Error).message
        });
        res.status(500).json({
            success: false,
            message: 'Failed to get jobs status',
            error: (error as Error).message
        });
    }
});

/**
 * Get specific job status
 */
router.get('/:jobName', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
        const { jobName } = req.params;
        const jobStatus = JobScheduler.getJobStatus(jobName);

        if (!jobStatus) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        res.json({
            success: true,
            data: jobStatus
        });
    } catch (error) {
        logger.error('Jobs API: Failed to get job status', {
            error: (error as Error).message,
            jobName: req.params.jobName
        });
        res.status(500).json({
            success: false,
            message: 'Failed to get job status',
            error: (error as Error).message
        });
    }
});

/**
 * Trigger a job manually
 */
router.post('/:jobName/trigger', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
        const { jobName } = req.params;
        const success = await JobScheduler.triggerJob(jobName);

        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Job not found or failed to trigger'
            });
        }

        logger.info('Jobs API: Job triggered manually', {
            jobName,
            triggeredBy: req.user?.id
        });

        res.json({
            success: true,
            message: 'Job triggered successfully'
        });
    } catch (error) {
        logger.error('Jobs API: Failed to trigger job', {
            error: (error as Error).message,
            jobName: req.params.jobName,
            triggeredBy: req.user?.id
        });
        res.status(500).json({
            success: false,
            message: 'Failed to trigger job',
            error: (error as Error).message
        });
    }
});

/**
 * Enable/disable a job
 */
router.patch('/:jobName/toggle', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
        const { jobName } = req.params;
        const { enabled } = req.body;

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'enabled field must be a boolean'
            });
        }

        const success = JobScheduler.updateJobConfig(jobName, { enabled });

        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        logger.info('Jobs API: Job toggled', {
            jobName,
            enabled,
            toggledBy: req.user?.id
        });

        res.json({
            success: true,
            message: `Job ${enabled ? 'enabled' : 'disabled'} successfully`
        });
    } catch (error) {
        logger.error('Jobs API: Failed to toggle job', {
            error: (error as Error).message,
            jobName: req.params.jobName,
            toggledBy: req.user?.id
        });
        res.status(500).json({
            success: false,
            message: 'Failed to toggle job',
            error: (error as Error).message
        });
    }
});

/**
 * Update job configuration
 */
router.patch('/:jobName/config', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
        const { jobName } = req.params;
        const updates = req.body;

        // Validate updates
        const allowedFields = ['enabled', 'schedule'];
        const validUpdates: any = {};
        
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                validUpdates[field] = updates[field];
            }
        }

        if (Object.keys(validUpdates).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        const success = JobScheduler.updateJobConfig(jobName, validUpdates);

        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        logger.info('Jobs API: Job config updated', {
            jobName,
            updates: validUpdates,
            updatedBy: req.user?.id
        });

        res.json({
            success: true,
            message: 'Job configuration updated successfully'
        });
    } catch (error) {
        logger.error('Jobs API: Failed to update job config', {
            error: (error as Error).message,
            jobName: req.params.jobName,
            updatedBy: req.user?.id
        });
        res.status(500).json({
            success: false,
            message: 'Failed to update job configuration',
            error: (error as Error).message
        });
    }
});

/**
 * Start a job
 */
router.post('/:jobName/start', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
        const { jobName } = req.params;
        const success = JobScheduler.startJob(jobName);

        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        logger.info('Jobs API: Job started', {
            jobName,
            startedBy: req.user?.id
        });

        res.json({
            success: true,
            message: 'Job started successfully'
        });
    } catch (error) {
        logger.error('Jobs API: Failed to start job', {
            error: (error as Error).message,
            jobName: req.params.jobName,
            startedBy: req.user?.id
        });
        res.status(500).json({
            success: false,
            message: 'Failed to start job',
            error: (error as Error).message
        });
    }
});

/**
 * Stop a job
 */
router.post('/:jobName/stop', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
        const { jobName } = req.params;
        const success = JobScheduler.stopJob(jobName);

        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        logger.info('Jobs API: Job stopped', {
            jobName,
            stoppedBy: req.user?.id
        });

        res.json({
            success: true,
            message: 'Job stopped successfully'
        });
    } catch (error) {
        logger.error('Jobs API: Failed to stop job', {
            error: (error as Error).message,
            jobName: req.params.jobName,
            stoppedBy: req.user?.id
        });
        res.status(500).json({
            success: false,
            message: 'Failed to stop job',
            error: (error as Error).message
        });
    }
});

/**
 * Get job execution history
 */
router.get('/:jobName/history', authenticateToken, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
        const { jobName } = req.params;
        const { limit = 10, offset = 0 } = req.query;

        // This would typically fetch from a job_executions table
        // For now, return a placeholder response
        res.json({
            success: true,
            data: {
                executions: [],
                total: 0,
                limit: Number(limit),
                offset: Number(offset)
            },
            message: 'Job execution history feature coming soon'
        });
    } catch (error) {
        logger.error('Jobs API: Failed to get job history', {
            error: (error as Error).message,
            jobName: req.params.jobName
        });
        res.status(500).json({
            success: false,
            message: 'Failed to get job history',
            error: (error as Error).message
        });
    }
});

export default router;