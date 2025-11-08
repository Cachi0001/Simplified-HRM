import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { testConnection } from './config/database';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import employeeRoutes from './routes/employee.routes';
import departmentRoutes from './routes/department.routes';
import leaveRoutes from './routes/leave.routes';
import purchaseRoutes from './routes/purchase.routes';
import attendanceRoutes from './routes/attendance.routes';
import taskRoutes from './routes/task.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    process.env.FRONTEND_URL_PROD || '',
    process.env.FRONTEND_URL_CUSTOM || '',
    'https://go3net.com',
    'https://www.go3net.com',
    'https://admin.go3net.com',
    'https://app.go3net.com',
    'https://hr.go3net.com',
    'https://hrm.go3net.com'
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tasks', taskRoutes);

app.use(errorHandler);

testConnection().then((connected) => {
  if (!connected) {
    console.warn('⚠️ Database not connected, but server will start anyway');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

export default app;
