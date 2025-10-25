"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const express_1 = require("express");
const AttendanceController_1 = require("../controllers/AttendanceController");
const AttendanceService_1 = require("../services/AttendanceService");
const MongoAttendanceRepository_1 = require("../repositories/implementations/MongoAttendanceRepository");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const attendanceRepository = new MongoAttendanceRepository_1.MongoAttendanceRepository();
const attendanceService = new AttendanceService_1.AttendanceService(attendanceRepository);
const attendanceController = new AttendanceController_1.AttendanceController(attendanceService);
router.use(auth_middleware_1.authenticateToken);
router.post('/checkin', (req, res) => attendanceController.checkIn(req, res));
router.post('/checkout', (req, res) => attendanceController.checkOut(req, res));
router.get('/status', (req, res) => attendanceController.getCurrentStatus(req, res));
router.get('/history', (req, res) => attendanceController.getAttendanceHistory(req, res));
router.get('/employee/:employeeId', (0, auth_middleware_1.requireRole)(['admin']), (req, res) => attendanceController.getEmployeeAttendance(req, res));
router.get('/report', (0, auth_middleware_1.requireRole)(['admin', 'employee']), (req, res) => attendanceController.getAttendanceReport(req, res));
exports.default = router;
//# sourceMappingURL=attendance.routes.js.map