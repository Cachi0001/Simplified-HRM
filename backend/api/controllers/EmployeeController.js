"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeController = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
class EmployeeController {
    employeeService;
    constructor(employeeService) {
        this.employeeService = employeeService;
    }
    async createEmployee(req, res) {
        try {
            const employeeData = req.body;
            const userId = req.user?.id;
            const userRole = req.user?.role;
            logger_1.default.info('EmployeeController: Create employee request', { createdBy: userId });
            const employee = await this.employeeService.createEmployee(employeeData, userId, userRole);
            res.status(201).json({
                status: 'success',
                message: 'Employee created successfully',
                data: { employee }
            });
        }
        catch (error) {
            logger_1.default.error('EmployeeController: Create employee error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async getAllEmployees(req, res) {
        try {
            const query = {
                page: req.query.page ? parseInt(req.query.page) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit) : undefined,
                search: req.query.search,
                department: req.query.department,
                status: req.query.status,
                role: req.query.role
            };
            const userRole = req.user?.role;
            const result = await this.employeeService.getAllEmployees(query, userRole);
            res.status(200).json({
                status: 'success',
                data: result
            });
        }
        catch (error) {
            logger_1.default.error('EmployeeController: Get all employees error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async getEmployeeById(req, res) {
        try {
            const { id } = req.params;
            const userRole = req.user?.role;
            const userId = req.user?.id;
            const employee = await this.employeeService.getEmployeeById(id, userRole, userId);
            if (!employee) {
                res.status(404).json({
                    status: 'error',
                    message: 'Employee not found'
                });
                return;
            }
            res.status(200).json({
                status: 'success',
                data: { employee }
            });
        }
        catch (error) {
            logger_1.default.error('EmployeeController: Get employee by ID error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async getPendingApprovals(req, res) {
        try {
            const pendingEmployees = await this.employeeService.getPendingApprovals();
            res.status(200).json({
                status: 'success',
                employees: pendingEmployees,
                total: pendingEmployees.length
            });
        }
        catch (error) {
            logger_1.default.error('EmployeeController: Get pending approvals error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async getMyProfile(req, res) {
        try {
            const userId = req.user?.id;
            const employee = await this.employeeService.getMyProfile(userId);
            if (!employee) {
                res.status(404).json({
                    status: 'error',
                    message: 'Employee profile not found'
                });
                return;
            }
            res.status(200).json({
                status: 'success',
                data: { employee }
            });
        }
        catch (error) {
            logger_1.default.error('EmployeeController: Get my profile error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async updateEmployee(req, res) {
        try {
            const { id } = req.params;
            const employeeData = req.body;
            const userRole = req.user?.role;
            const userId = req.user?.id;
            const employee = await this.employeeService.updateEmployee(id, employeeData, userRole, userId);
            res.status(200).json({
                status: 'success',
                message: 'Employee updated successfully',
                data: { employee }
            });
        }
        catch (error) {
            logger_1.default.error('EmployeeController: Update employee error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async updateMyProfile(req, res) {
        try {
            const employeeData = req.body;
            const userId = req.user?.id;
            const employee = await this.employeeService.updateMyProfile(employeeData, userId);
            res.status(200).json({
                status: 'success',
                message: 'Profile updated successfully',
                data: { employee }
            });
        }
        catch (error) {
            logger_1.default.error('EmployeeController: Update my profile error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async deleteEmployee(req, res) {
        try {
            const { id } = req.params;
            const userRole = req.user?.role;
            await this.employeeService.deleteEmployee(id, userRole);
            res.status(204).json({
                status: 'success',
                message: 'Employee deleted successfully'
            });
        }
        catch (error) {
            logger_1.default.error('EmployeeController: Delete employee error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async searchEmployees(req, res) {
        try {
            const { q } = req.query;
            if (!q || typeof q !== 'string') {
                res.status(400).json({
                    status: 'error',
                    message: 'Search query is required'
                });
                return;
            }
            const userRole = req.user?.role;
            const employees = await this.employeeService.searchEmployees(q, userRole);
            res.status(200).json({
                status: 'success',
                data: { employees }
            });
        }
        catch (error) {
            logger_1.default.error('EmployeeController: Search employees error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async approveEmployee(req, res) {
        try {
            const { id } = req.params;
            const employee = await this.employeeService.approveEmployee(id);
            res.status(200).json({
                status: 'success',
                message: 'Employee approved successfully',
                data: { employee }
            });
        }
        catch (error) {
            logger_1.default.error('EmployeeController: Approve employee error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async assignDepartment(req, res) {
        try {
            const { id } = req.params;
            const { department } = req.body;
            if (!department) {
                res.status(400).json({
                    status: 'error',
                    message: 'Department is required'
                });
                return;
            }
            const employee = await this.employeeService.assignDepartment(id, department);
            res.status(200).json({
                status: 'success',
                message: 'Department assigned successfully',
                data: { employee }
            });
        }
        catch (error) {
            logger_1.default.error('EmployeeController: Assign department error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async getEmployeeStats(req, res) {
        try {
            const stats = await this.employeeService.getEmployeeStats();
            res.status(200).json({
                status: 'success',
                ...stats
            });
        }
        catch (error) {
            logger_1.default.error('EmployeeController: Get employee stats error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async rejectEmployee(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            await this.employeeService.rejectEmployee(id, reason);
            res.status(200).json({
                status: 'success',
                message: 'Employee registration rejected'
            });
        }
        catch (error) {
            logger_1.default.error('EmployeeController: Reject employee error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
    async approveEmployeeWithRole(req, res) {
        try {
            const { id } = req.params;
            const { role, reason } = req.body;
            const approvedBy = req.user?.id;
            const employee = await this.employeeService.approveEmployeeWithRole(id, role, reason, approvedBy);
            res.status(200).json({
                status: 'success',
                message: 'Employee approved successfully',
                data: { employee }
            });
        }
        catch (error) {
            logger_1.default.error('EmployeeController: Approve employee with role error', { error: error.message });
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }
}
exports.EmployeeController = EmployeeController;
//# sourceMappingURL=EmployeeController.js.map