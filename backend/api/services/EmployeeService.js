"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeService = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
class EmployeeService {
    employeeRepository;
    constructor(employeeRepository) {
        this.employeeRepository = employeeRepository;
    }
    async createEmployee(employeeData, userId, currentUserRole) {
        try {
            if (currentUserRole !== 'admin') {
                throw new Error('Only administrators can create employees');
            }
            logger_1.default.info('EmployeeService: Creating employee', { email: employeeData.email, createdBy: userId });
            if (!employeeData.email || !employeeData.fullName || !employeeData.role) {
                throw new Error('Email, full name, and role are required');
            }
            const employee = await this.employeeRepository.create(employeeData, userId);
            logger_1.default.info('EmployeeService: Employee created successfully', { employeeId: employee.id });
            return employee;
        }
        catch (error) {
            logger_1.default.error('EmployeeService: Create employee failed', { error: error.message });
            throw error;
        }
    }
    async getAllEmployees(query, currentUserRole) {
        try {
            logger_1.default.info('EmployeeService: Getting all employees', { role: currentUserRole });
            // Non-admin users can only see active employees
            if (currentUserRole !== 'admin') {
                query = { ...query, status: 'active' };
            }
            return await this.employeeRepository.findAll(query);
        }
        catch (error) {
            logger_1.default.error('EmployeeService: Get all employees failed', { error: error.message });
            throw error;
        }
    }
    async searchEmployees(query, currentUserRole) {
        try {
            logger_1.default.info('EmployeeService: Searching employees', { query, role: currentUserRole });
            // Non-admin users can only search active employees (already handled in repository)
            // For admins, search all employees
            if (currentUserRole === 'admin') {
                // For admins, we need to modify the query to search all statuses
                // Since the repository filters for active only, we'll need to modify the query
                query = query; // Keep as is, repository will handle the filtering
            }
            return await this.employeeRepository.search(query);
        }
        catch (error) {
            logger_1.default.error('EmployeeService: Search employees failed', { error: error.message });
            throw error;
        }
    }
    async getEmployeeById(id, currentUserRole, currentUserId) {
        try {
            const employee = await this.employeeRepository.findById(id);
            if (!employee) {
                return null;
            }
            // Check permissions
            if (currentUserRole !== 'admin' && employee.userId.toString() !== currentUserId) {
                throw new Error('Access denied');
            }
            return employee;
        }
        catch (error) {
            logger_1.default.error('EmployeeService: Get employee by ID failed', { error: error.message });
            throw error;
        }
    }
    async getMyProfile(userId) {
        try {
            return await this.employeeRepository.findByUserId(userId);
        }
        catch (error) {
            logger_1.default.error('EmployeeService: Get my profile failed', { error: error.message });
            throw error;
        }
    }
    async updateEmployee(id, employeeData, currentUserRole, currentUserId) {
        try {
            // Check if employee exists
            const existingEmployee = await this.employeeRepository.findById(id);
            if (!existingEmployee) {
                throw new Error('Employee not found');
            }
            // Check permissions
            if (currentUserRole !== 'admin' && existingEmployee.userId.toString() !== currentUserId) {
                throw new Error('Access denied');
            }
            // Non-admin users can only update specific fields
            if (currentUserRole !== 'admin') {
                const allowedFields = ['fullName', 'department', 'position', 'phone', 'address', 'dateOfBirth', 'hireDate', 'profilePicture', 'status'];
                const filteredData = {};
                allowedFields.forEach(field => {
                    if (employeeData[field] !== undefined) {
                        filteredData[field] = employeeData[field];
                    }
                });
                employeeData = filteredData;
            }
            const updatedEmployee = await this.employeeRepository.update(id, employeeData);
            logger_1.default.info('EmployeeService: Employee updated successfully', { employeeId: id });
            return updatedEmployee;
        }
        catch (error) {
            logger_1.default.error('EmployeeService: Update employee failed', { error: error.message });
            throw error;
        }
    }
    async updateMyProfile(employeeData, userId) {
        try {
            const employee = await this.employeeRepository.findByUserId(userId);
            if (!employee) {
                throw new Error('Employee profile not found');
            }
            const employeeId = employee.id || employee._id.toString();
            return await this.updateEmployee(employeeId, employeeData, 'employee', userId);
        }
        catch (error) {
            logger_1.default.error('EmployeeService: Update my profile failed', { error: error.message });
            throw error;
        }
    }
    async deleteEmployee(id, currentUserRole) {
        try {
            // Only admins can delete employees
            if (currentUserRole !== 'admin') {
                throw new Error('Only administrators can delete employees');
            }
            // Check if employee exists
            const employee = await this.employeeRepository.findById(id);
            if (!employee) {
                throw new Error('Employee not found');
            }
            await this.employeeRepository.delete(id);
            logger_1.default.info('EmployeeService: Employee deleted successfully', { employeeId: id });
        }
        catch (error) {
            logger_1.default.error('EmployeeService: Delete employee failed', { error: error.message });
            throw error;
        }
    }
    async getPendingApprovals() {
        try {
            return await this.employeeRepository.getPendingApprovals();
        }
        catch (error) {
            logger_1.default.error('Get pending approvals failed', { error: error.message });
            throw error;
        }
    }
    async approveEmployee(id) {
        try {
            // First, get the employee to find the associated user ID
            const employee = await this.employeeRepository.findById(id);
            if (!employee) {
                throw new Error('Employee not found');
            }
            // Update the employee status to 'active'
            const updatedEmployee = await this.employeeRepository.approve(id);
            // CRITICAL: Also mark the user's email as verified so they can login
            try {
                const User = (await Promise.resolve().then(() => __importStar(require('../models/User')))).User;
                const updatedUser = await User.findByIdAndUpdate(employee.userId, { emailVerified: true }, { new: true });
                if (!updatedUser) {
                    logger_1.default.warn('⚠️ User not found when updating emailVerified during approval', {
                        userId: employee.userId,
                        employeeId: id
                    });
                }
                else {
                    logger_1.default.info('✅ User emailVerified set to true after approval', {
                        userId: employee.userId,
                        employeeId: id
                    });
                }
            }
            catch (userUpdateError) {
                logger_1.default.error('❌ Failed to update user emailVerified during approval', {
                    error: userUpdateError.message,
                    employeeId: id
                });
                throw new Error('Failed to complete approval process');
            }
            // Send email
            try {
                const emailService = new (await Promise.resolve().then(() => __importStar(require('../services/EmailService')))).EmailService();
                await emailService.sendApprovalConfirmation(updatedEmployee.email, updatedEmployee.fullName);
                logger_1.default.info('Approval email sent', { email: updatedEmployee.email });
            }
            catch (emailError) {
                logger_1.default.warn('Approval email failed (non-critical)', { error: emailError.message });
            }
            return updatedEmployee;
        }
        catch (error) {
            logger_1.default.error('Approve employee failed', { error: error.message });
            throw error;
        }
    }
    async rejectEmployee(id) {
        try {
            // Delete the employee record (reject registration)
            await this.employeeRepository.delete(id);
            logger_1.default.info('Employee rejected successfully', { employeeId: id });
        }
        catch (error) {
            logger_1.default.error('Reject employee failed', { error: error.message });
            throw error;
        }
    }
    async assignDepartment(id, department) {
        try {
            logger_1.default.info('EmployeeService: Assigning department', { employeeId: id, department });
            const updatedEmployee = await this.employeeRepository.update(id, { department });
            // Send notification email to employee
            try {
                const emailService = new (await Promise.resolve().then(() => __importStar(require('../services/EmailService')))).EmailService();
                await emailService.sendDepartmentAssignmentNotification(updatedEmployee.email, updatedEmployee.fullName, department);
                logger_1.default.info('Department assignment email sent', { employeeId: id, department });
            }
            catch (emailError) {
                logger_1.default.warn('Department assignment email failed (non-critical)', { error: emailError.message });
            }
            logger_1.default.info('EmployeeService: Department assigned successfully', { employeeId: id, department });
            return updatedEmployee;
        }
        catch (error) {
            logger_1.default.error('EmployeeService: Assign department failed', { error: error.message });
            throw error;
        }
    }
    async getEmployeeStats() {
        try {
            return await this.employeeRepository.getEmployeeStats();
        }
        catch (error) {
            logger_1.default.error('EmployeeService: Get employee stats failed', { error: error.message });
            throw error;
        }
    }
}
exports.EmployeeService = EmployeeService;
//# sourceMappingURL=EmployeeService.js.map