"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoEmployeeRepository = void 0;
const Employee_1 = require("../../models/Employee");
const logger_1 = __importDefault(require("../../utils/logger"));
// Helper function to transform MongoDB _id to id for API responses
function transformEmployeeForAPI(emp) {
    // Call toObject with virtuals: true to include the virtual 'id' field
    const obj = emp.toObject ? emp.toObject({ virtuals: true }) : emp;
    // The virtual field should already be in obj.id from the schema configuration
    // But ensure id is always a string representing the ObjectId
    const id = obj.id && typeof obj.id === 'string' ? obj.id : (obj._id ? obj._id.toString() : null);
    // Handle userId - could be an object (populated) or a string
    let userId = obj.userId;
    if (userId && typeof userId === 'object' && userId._id) {
        userId = userId._id.toString();
    }
    else if (userId && typeof userId !== 'string') {
        userId = userId.toString();
    }
    return {
        ...obj,
        id,
        userId,
        _id: obj._id // Keep _id for backward compatibility
    };
}
class MongoEmployeeRepository {
    async create(employeeData, userId) {
        try {
            logger_1.default.info('🔍 [MongoEmployeeRepository] Creating employee', {
                email: employeeData.email,
                fullName: employeeData.fullName,
                userId
            });
            const employee = new Employee_1.Employee({
                ...employeeData,
                userId,
                status: employeeData.role === 'admin' ? 'active' : 'pending',
                emailVerified: false,
            });
            await employee.save();
            await employee.populate('userId');
            logger_1.default.info('✅ [MongoEmployeeRepository] Employee created successfully', {
                employeeId: employee._id,
                userId,
                email: employee.email
            });
            return transformEmployeeForAPI(employee);
        }
        catch (error) {
            logger_1.default.error('❌ [MongoEmployeeRepository] Create employee failed:', error);
            throw error;
        }
    }
    async findAll(query = {}) {
        try {
            logger_1.default.info('🔍 [MongoEmployeeRepository] Finding all employees', { query });
            const page = query.page || 1;
            const limit = query.limit || 10;
            const skip = (page - 1) * limit;
            // Build filter
            const filter = {};
            if (query.search) {
                filter.$or = [
                    { fullName: { $regex: query.search, $options: 'i' } },
                    { email: { $regex: query.search, $options: 'i' } },
                    { department: { $regex: query.search, $options: 'i' } },
                    { position: { $regex: query.search, $options: 'i' } },
                ];
            }
            if (query.department) {
                filter.department = query.department;
            }
            if (query.status) {
                filter.status = query.status;
            }
            if (query.role) {
                filter.role = query.role;
            }
            // Execute query
            const employees = await Employee_1.Employee.find(filter)
                .populate('userId')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);
            const total = await Employee_1.Employee.countDocuments(filter);
            logger_1.default.info('✅ [MongoEmployeeRepository] Found employees', {
                count: employees.length,
                total,
                page,
                limit
            });
            return {
                employees: employees.map(emp => transformEmployeeForAPI(emp)),
                total,
                page,
                limit,
            };
        }
        catch (error) {
            logger_1.default.error('❌ [MongoEmployeeRepository] Find all employees failed:', error);
            throw error;
        }
    }
    async findById(id) {
        try {
            logger_1.default.info('🔍 [MongoEmployeeRepository] Finding employee by ID', { id });
            const employee = await Employee_1.Employee.findById(id).populate('userId');
            if (employee) {
                logger_1.default.info('✅ [MongoEmployeeRepository] Employee found', {
                    employeeId: employee._id,
                    email: employee.email
                });
                return transformEmployeeForAPI(employee);
            }
            else {
                logger_1.default.warn('⚠️ [MongoEmployeeRepository] Employee not found', { id });
                return null;
            }
        }
        catch (error) {
            logger_1.default.error('❌ [MongoEmployeeRepository] Find employee by ID failed:', error);
            throw error;
        }
    }
    async findByUserId(userId) {
        try {
            logger_1.default.info('🔍 [MongoEmployeeRepository] Finding employee by user ID', { userId });
            const employee = await Employee_1.Employee.findOne({ userId }).populate('userId');
            if (employee) {
                logger_1.default.info('✅ [MongoEmployeeRepository] Employee found', {
                    employeeId: employee._id,
                    email: employee.email
                });
                return transformEmployeeForAPI(employee);
            }
            else {
                logger_1.default.warn('⚠️ [MongoEmployeeRepository] Employee not found', { userId });
                return null;
            }
        }
        catch (error) {
            logger_1.default.error('❌ [MongoEmployeeRepository] Find employee by user ID failed:', error);
            throw error;
        }
    }
    async update(id, employeeData) {
        try {
            logger_1.default.info('🔍 [MongoEmployeeRepository] Updating employee', { id, employeeData });
            const employee = await Employee_1.Employee.findByIdAndUpdate(id, { ...employeeData, updatedAt: new Date() }, { new: true, runValidators: true }).populate('userId');
            if (!employee) {
                throw new Error('Employee not found');
            }
            logger_1.default.info('✅ [MongoEmployeeRepository] Employee updated successfully', {
                employeeId: employee._id,
                email: employee.email
            });
            return transformEmployeeForAPI(employee);
        }
        catch (error) {
            logger_1.default.error('❌ [MongoEmployeeRepository] Update employee failed:', error);
            throw error;
        }
    }
    async delete(id) {
        try {
            logger_1.default.info('🔍 [MongoEmployeeRepository] Deleting employee', { id });
            const employee = await Employee_1.Employee.findByIdAndDelete(id);
            if (!employee) {
                throw new Error('Employee not found');
            }
            logger_1.default.info('✅ [MongoEmployeeRepository] Employee deleted successfully', {
                employeeId: id,
                email: employee.email
            });
        }
        catch (error) {
            logger_1.default.error('❌ [MongoEmployeeRepository] Delete employee failed:', error);
            throw error;
        }
    }
    async search(query) {
        try {
            logger_1.default.info('🔍 [MongoEmployeeRepository] Searching employees', { query });
            const employees = await Employee_1.Employee.find({
                $or: [
                    { fullName: { $regex: query, $options: 'i' } },
                    { email: { $regex: query, $options: 'i' } },
                    { department: { $regex: query, $options: 'i' } },
                    { position: { $regex: query, $options: 'i' } },
                ],
            }).populate('userId').limit(20);
            logger_1.default.info('✅ [MongoEmployeeRepository] Search completed', {
                query,
                results: employees.length
            });
            return employees.map(emp => transformEmployeeForAPI(emp));
        }
        catch (error) {
            logger_1.default.error('❌ [MongoEmployeeRepository] Search employees failed:', error);
            throw error;
        }
    }
    async getPendingApprovals() {
        try {
            logger_1.default.info('🔍 [MongoEmployeeRepository] Getting pending approvals');
            const employees = await Employee_1.Employee.find({
                status: 'pending',
                role: 'employee', // Only regular employees need approval, admins are auto-approved
            }).populate('userId').sort({ createdAt: 1 });
            logger_1.default.info('✅ [MongoEmployeeRepository] Found pending approvals', {
                count: employees.length
            });
            return employees.map(emp => transformEmployeeForAPI(emp));
        }
        catch (error) {
            logger_1.default.error('❌ [MongoEmployeeRepository] Get pending approvals failed:', error);
            throw error;
        }
    }
    async approve(id) {
        try {
            logger_1.default.info('🔍 [MongoEmployeeRepository] Approving employee', { id });
            const employee = await Employee_1.Employee.findByIdAndUpdate(id, {
                status: 'active',
                updatedAt: new Date()
            }, { new: true, runValidators: true }).populate('userId');
            if (!employee) {
                throw new Error('Employee not found');
            }
            logger_1.default.info('✅ [MongoEmployeeRepository] Employee approved successfully', {
                employeeId: employee._id,
                email: employee.email
            });
            return transformEmployeeForAPI(employee);
        }
        catch (error) {
            logger_1.default.error('❌ [MongoEmployeeRepository] Approve employee failed:', error);
            throw error;
        }
    }
    async assignDepartment(id, department) {
        try {
            logger_1.default.info('🔍 [MongoEmployeeRepository] Assigning department', { id, department });
            const employee = await Employee_1.Employee.findByIdAndUpdate(id, { department, updatedAt: new Date() }, { new: true, runValidators: true }).populate('userId');
            if (!employee) {
                throw new Error('Employee not found');
            }
            logger_1.default.info('✅ [MongoEmployeeRepository] Department assigned successfully', {
                employeeId: employee._id,
                department
            });
            return transformEmployeeForAPI(employee);
        }
        catch (error) {
            logger_1.default.error('❌ [MongoEmployeeRepository] Assign department failed:', error);
            throw error;
        }
    }
    async getEmployeeStats() {
        try {
            logger_1.default.info('📊 [MongoEmployeeRepository] Getting employee statistics');
            // Count employees by status
            const total = await Employee_1.Employee.countDocuments({ role: 'employee' });
            const active = await Employee_1.Employee.countDocuments({ role: 'employee', status: 'active' });
            const pending = await Employee_1.Employee.countDocuments({ role: 'employee', status: 'pending' });
            const rejected = await Employee_1.Employee.countDocuments({ role: 'employee', status: 'rejected' });
            const stats = { total, active, pending, rejected };
            logger_1.default.info('✅ [MongoEmployeeRepository] Employee statistics calculated', stats);
            return stats;
        }
        catch (error) {
            logger_1.default.error('❌ [MongoEmployeeRepository] Get employee stats failed:', error);
            throw error;
        }
    }
}
exports.MongoEmployeeRepository = MongoEmployeeRepository;
//# sourceMappingURL=MongoEmployeeRepository.js.map