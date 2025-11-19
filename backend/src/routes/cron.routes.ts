import { Router, Request, Response } from 'express';
import notificationService from '../services/NotificationService';

const router = Router();

// Vercel Cron endpoint for checkout reminders
// Runs Monday-Friday at 6:00 PM (18:00)
router.get('/checkout-reminders', async (req: Request, res: Response) => {
  try {
    // Optional: Verify Vercel Cron secret for security
    // If CRON_SECRET is set in environment variables, verify it
    const authHeader = req.headers.authorization;    // Otherwise, allow the request (Vercel Cron is already secure)

    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('⚠️  Unauthorized cron request - invalid CRON_SECRET');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('🔔 Vercel Cron: Running checkout reminder job...');
    
    // Check if it's a weekday
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log('ℹ️  Weekend - skipping checkout reminders');
      return res.json({ 
        success: true, 
        count: 0, 
        message: 'Weekend - no reminders sent' 
      });
    }
    
    const count = await notificationService.sendCheckoutReminders();
    
    console.log(`✅ Sent checkout reminders to ${count} employees`);
    
    res.json({ 
      success: true, 
      count, 
      message: `Sent checkout reminders to ${count} employees`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Error in checkout reminder cron:', error);
    res.status(500).json({ 
      error: 'Failed to send checkout reminders',
      message: error.message 
    });
  }
});

// Auto-clockout at midnight - runs daily at 12:01 AM
router.get('/auto-clockout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('⚠️  Unauthorized auto-clockout request');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('🌙 Vercel Cron: Running auto-clockout job...');
    
    // Import pool here to avoid circular dependencies
    const { pool } = require('../config/database');
    
    // Run the auto-clockout function
    const result = await pool.query('SELECT * FROM auto_clockout_users()');
    
    const count = result.rows.length;
    console.log(`✅ Auto-clocked out ${count} employees`);
    
    res.json({ 
      success: true, 
      count,
      employees: result.rows.map((row: any) => ({
        name: row.employee_name,
        hoursWorked: parseFloat(row.hours_worked).toFixed(2)
      })),
      message: `Auto-clocked out ${count} employees who forgot to clock out`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Error in auto-clockout cron:', error);
    res.status(500).json({ 
      error: 'Failed to run auto-clockout',
      message: error.message 
    });
  }
});

// Health check for cron jobs
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    crons: ['checkout-reminders', 'auto-clockout']
  });
});

export default router;
