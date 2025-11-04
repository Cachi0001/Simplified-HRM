// import { Request, Response } from 'express';
// import { WorkingDaysService } from '../services/WorkingDaysService';
// import logger from '../utils/logger';

// export class WorkingDaysController {
//   constructor(private workingDaysService: WorkingDaysService) {}

//   /**
//    * Get current working days configuration for the authenticated user
//    */
//   async getMyWorkingDays(req: Request, res: Response): Promise<void> {
//     try {
//       const userId = req.user?.id;
      
//       if (!userId) {
//         res.status(401).json({
//           status: 'error',
//           message: 'Authentication required'
//         });
//         return;
//       }

//       // Get employee ID from user ID
//       const { EmployeeService } = await import('../services/EmployeeService');
//       const employeeService = new EmployeeService();
//       const employee = await employeeService.getMyProfile(userId);
      
//       if (!employee) {
//         res.status(404).json({
//           status: 'error',
//           message: 'Employee profile not found'
//         });
//         return;
//       }

//       const config = await this.workingDaysService.getWorkingDaysConfig(employee.id);

//       res.status(200).json({
//         status: 'success',
//         data: config
//       });
//     } catch (error) {
//       logger.error('WorkingDaysController: Get my working days error', { 
//         error: (error as Error).message,
//         userId: req.user?.id 
//       });
//       res.status(400).json({
//         status: 'error',
//         message: (error as Error).message
//       });
//     }
//   }

//   /**
//    * Update working days configuration for the authenticated user
//    */
//   async updateMyWorkingDays(req: Request, res: Response): Promise<void> {
//     try {
//       const userId = req.user?.id;
//       const { working_days, working_hours, timezone } = req.body;
      
//       if (!userId) {
//         res.status(401).json({
//           status: 'error',
//           message: 'Authentication required'
//         });
//         return;
//       }

//       // Get employee ID from user ID
//       const { EmployeeService } = await import('../services/EmployeeService');
//       const employeeService = new EmployeeService();
//       const employee = await employeeService.getMyProfile(userId);
      
//       if (!employee) {
//         res.status(404).json({
//           status: 'error',
//           message: 'Employee profile not found'
//         });
//         return;
//       }

//       const config = await this.workingDaysService.updateWorkingDaysConfig(employee.id, {
//         working_days,
//         working_hours,
//         timezone
//       });

//       res.status(200).json({
//         status: 'success',
//         message: 'Working days configuration updated successfully',
//         data: config
//       });
//     } catch (error) {
//       logger.error('WorkingDaysController: Update my working days error', { 
//         error: (error as Error).message,
//         userId: req.user?.id 
//       });
//       res.status(400).json({
//         status: 'error',
//         message: (error as Error).message
//       });
//     }
//   }

//   /**
//    * Get working days configuration for a specific employee (HR/Admin only)
//    */
//   async getEmployeeWorkingDays(req: Request, res: Response): Promise<void> {
//     try {
//       const { employeeId } = req.params;
//       const userRole = req.user?.role;
      
//       // Check permissions
//       if (!['hr', 'admin', 'superadmin'].includes(userRole)) {
//         res.status(403).json({
//           status: 'error',
//           message: 'Insufficient permissions'
//         });
//         return;
//       }

//       const config = await this.workingDaysService.getWorkingDaysConfig(employeeId);

//       res.status(200).json({
//         status: 'success',
//         data: config
//       });
//     } catch (error) {
//       logger.error('WorkingDaysController: Get employee working days error', { 
//         error: (error as Error).message,
//         employeeId: req.params.employeeId 
//       });
//       res.status(400).json({
//         status: 'error',
//         message: (error as Error).message
//       });
//     }
//   }

//   /**
//    * Update working days configuration for a specific employee (HR/Admin only)
//    */
//   async updateEmployeeWorkingDays(req: Request, res: Response): Promise<void> {
//     try {
//       const { employeeId } = req.params;
//       const { working_days, working_hours, timezone } = req.body;
//       const userRole = req.user?.role;
      
//       // Check permissions
//       if (!['hr', 'admin', 'superadmin'].includes(userRole)) {
//         res.status(403).json({
//           status: 'error',
//           message: 'Insufficient permissions'
//         });
//         return;
//       }

//       const config = await this.workingDaysService.updateWorkingDaysConfig(employeeId, {
//         working_days,
//         working_hours,
//         timezone
//       });

//       res.status(200).json({
//         status: 'success',
//         message: 'Working days configuration updated successfully',
//         data: config
//       });
//     } catch (error) {
//       logger.error('WorkingDaysController: Update employee working days error', { 
//         error: (error as Error).message,
//         employeeId: req.params.employeeId 
//       });
//       res.status(400).json({
//         status: 'error',
//         message: (error as Error).message
//       });
//     }
//   }

//   /**
//    * Calculate working days between two dates for an employee
//    */
//   async calculateWorkingDays(req: Request, res: Response): Promise<void> {
//     try {
//       const { employeeId } = req.params;
//       const { start_date, end_date } = req.query;
//       const userRole = req.user?.role;
//       const userId = req.user?.id;
      
//       if (!start_date || !end_date) {
//         res.status(400).json({
//           status: 'error',
//           message: 'start_date and end_date are required'
//         });
//         return;
//       }

//       // Check if user can access this employee's data
//       if (!['hr', 'admin', 'superadmin'].includes(userRole)) {
//         // Regular employees can only access their own data
//         const { EmployeeService } = await import('../services/EmployeeService');
//         const employeeService = new EmployeeService();
//         const employee = await employeeService.getMyProfile(userId);
        
//         if (!employee || employee.id !== employeeId) {
//           res.status(403).json({
//             status: 'error',
//             message: 'Insufficient permissions'
//           });
//           return;
//         }
//       }

//       const workingDays = await this.workingDaysService.calculateWorkingDaysBetween(
//         employeeId,
//         start_date as string,
//         end_date as string
//       );

//       res.status(200).json({
//         status: 'success',
//         data: {
//           employee_id: employeeId,
//           start_date,
//           end_date,
//           working_days: workingDays
//         }
//       });
//     } catch (error) {
//       logger.error('WorkingDaysController: Calculate working days error', { 
//         error: (error as Error).message,
//         employeeId: req.params.employeeId 
//       });
//       res.status(400).json({
//         status: 'error',
//         message: (error as Error).message
//       });
//     }
//   }

//   /**
//    * Get working days statistics for an employee
//    */
//   async getWorkingDaysStats(req: Request, res: Response): Promise<void> {
//     try {
//       const { employeeId } = req.params;
//       const { month } = req.query;
//       const userRole = req.user?.role;
//       const userId = req.user?.id;
      
//       // Check if user can access this employee's data
//       if (!['hr', 'admin', 'superadmin'].includes(userRole)) {
//         // Regular employees can only access their own data
//         const { EmployeeService } = await import('../services/EmployeeService');
//         const employeeService = new EmployeeService();
//         const employee = await employeeService.getMyProfile(userId);
        
//         if (!employee || employee.id !== employeeId) {
//           res.status(403).json({
//             status: 'error',
//             message: 'Insufficient permissions'
//           });
//           return;
//         }
//       }

//       const stats = await this.workingDaysService.getWorkingDaysStats(
//         employeeId,
//         month as string
//       );

//       res.status(200).json({
//         status: 'success',
//         data: stats
//       });
//     } catch (error) {
//       logger.error('WorkingDaysController: Get working days stats error', { 
//         error: (error as Error).message,
//         employeeId: req.params.employeeId 
//       });
//       res.status(400).json({
//         status: 'error'