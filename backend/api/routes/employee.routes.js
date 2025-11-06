"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const express_1 = require("express");
const MongoEmployeeRepository_1 = require("../repositories/implementations/MongoEmployeeRepository");
const EmployeeService_1 = require("../services/EmployeeService");
const EmployeeController_1 = require("../controllers/EmployeeController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const employeeRepository = new MongoEmployeeRepository_1.MongoEmployeeRepository();
const employeeService = new EmployeeService_1.EmployeeService(employeeRepository);
const employeeController = new EmployeeController_1.EmployeeController(employeeService);
router.use(auth_middleware_1.authenticateToken);
// Static routes before dynamic routes
router.get('/search', (req, res) => employeeController.searchEmployees(req, res));
router.get('/me', (req, res) => employeeController.getMyProfile(req, res));
router.put('/me', (req, res) => employeeController.updateMyProfile(req, res));
router.get('/me/working-days', (req, res) => employeeController.getMyWorkingDays(req, res));
router.put('/me/working-days', (req, res) => employeeController.updateMyWorkingDays(req, res));
router.get('/pending', (0, auth_middleware_1.requireRole)(['admin']), (req, res) => employeeController.getPendingApprovals(req, res));
router.get('/stats', (0, auth_middleware_1.requireRole)(['admin']), (req, res) => employeeController.getEmployeeStats(req, res));
router.post('/', (0, auth_middleware_1.requireRole)(['admin']), (req, res) => employeeController.createEmployee(req, res));
router.get('/', (req, res) => employeeController.getAllEmployees(req, res));
// Dynamic routes
router.get('/:id', (req, res) => employeeController.getEmployeeById(req, res));
router.put('/:id', (req, res) => employeeController.updateEmployee(req, res));
router.delete('/:id', (0, auth_middleware_1.requireRole)(['admin']), (req, res) => employeeController.deleteEmployee(req, res));
router.post('/:id/approve', (0, auth_middleware_1.requireRole)(['admin']), (req, res) => employeeController.approveEmployee(req, res));
router.post('/:id/reject', (0, auth_middleware_1.requireRole)(['admin']), (req, res) => employeeController.rejectEmployee(req, res));
router.post('/:id/department', (0, auth_middleware_1.requireRole)(['admin']), (req, res) => employeeController.assignDepartment(req, res));
exports.default = router;
//# sourceMappingURL=employee.routes.js.map