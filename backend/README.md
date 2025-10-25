# HR Management System Backend - Supabase Migration

This backend has been migrated from MongoDB to Supabase for data storage while maintaining the same authentication and user management functionality.

## 🚀 Quick Start

### 1. Environment Setup

Copy the environment file and configure your Supabase credentials:

```bash
cp .env.example .env
```

Fill in your Supabase credentials in `.env`:

```env
# Supabase Configuration (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT Configuration (Required)
JWT_SECRET=your_jwt_secret_here_at_least_32_characters
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here_at_least_32_characters

# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com

# Frontend URL (for email redirects and links)
FRONTEND_URL=http://localhost:5173
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

#### Run the Supabase Migration

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase_migration.sql`
4. Run the migration

This will create:
- `users` table with email verification and password reset functionality
- `employees` table with approval workflow
- Database functions for user management
- Row Level Security (RLS) policies

### 4. Start Development Server

```bash
npm run dev
```

The server will be available at `http://localhost:3000`

## 📊 Database Schema

### Users Table
- `id` (UUID) - Primary key
- `email` (VARCHAR) - User email (unique)
- `password_hash` (TEXT) - Hashed password
- `full_name` (VARCHAR) - User's full name
- `role` (VARCHAR) - 'admin' or 'employee'
- `email_verified` (BOOLEAN) - Email verification status
- `email_verification_token` (TEXT) - Verification token
- `email_verification_expires` (TIMESTAMP) - Token expiry
- `password_reset_token` (TEXT) - Password reset token
- `password_reset_expires` (TIMESTAMP) - Reset token expiry
- `refresh_tokens` (TEXT[]) - Array of refresh tokens
- `created_at`, `updated_at` (TIMESTAMP) - Timestamps

### Employees Table
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to users table
- `email` (VARCHAR) - Employee email
- `full_name` (VARCHAR) - Employee full name
- `role` (VARCHAR) - 'admin' or 'employee'
- `department` (VARCHAR) - Department (optional)
- `position` (VARCHAR) - Position (optional)
- `phone` (VARCHAR) - Phone number (optional)
- `address` (TEXT) - Address (optional)
- `date_of_birth` (DATE) - Date of birth (optional)
- `hire_date` (DATE) - Hire date (optional)
- `profile_picture` (TEXT) - Profile picture URL (optional)
- `status` (VARCHAR) - 'active', 'pending', or 'rejected'
- `email_verified` (BOOLEAN) - Email verification status
- `email_verification_token` (TEXT) - Verification token
- `email_verification_expires` (TIMESTAMP) - Token expiry
- `password_reset_token` (TEXT) - Password reset token
- `password_reset_expires` (TIMESTAMP) - Reset token expiry
- `created_at`, `updated_at` (TIMESTAMP) - Timestamps

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/signout` - User logout
- `GET /api/auth/me` - Get current user
- `GET /api/auth/confirm/:token` - Email verification
- `POST /api/auth/resend-confirmation` - Resend verification email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password

### Health & Debug
- `GET /api/health` - Health check with database status
- `GET /api/auth/debug/tokens` - Debug endpoint for verification tokens

## 🔐 Authentication Flow

### 1. User Signup
1. User submits registration form
2. System creates user record with `email_verified: false` and `status: 'pending'`
3. System generates email verification token
4. System sends confirmation email
5. User clicks email link to verify account
6. **Admin approval required** before user can login

### 2. User Login
1. User submits login credentials
2. System validates email and password
3. System checks `email_verified: true`
4. System checks `employee.status: 'active'`
5. System generates JWT tokens
6. User is logged in successfully

### 3. Admin Approval Process
- Admins can view pending users via admin dashboard
- Admins can approve/reject users
- Approved users get `status: 'active'`
- Only active users can login

## 🛠️ Development

### Building for Production

```bash
npm run build
```

This compiles TypeScript to JavaScript and copies files to the `api/` directory for serverless deployment.

### Environment Variables

All environment variables are automatically loaded and available in the application. The system includes:

- **Database**: Supabase connection and health monitoring
- **JWT**: Token generation and validation
- **Email**: SMTP configuration for notifications
- **Security**: CORS, helmet, and rate limiting

## 📝 Migration from MongoDB

This system has been migrated from MongoDB to Supabase while maintaining:

- ✅ Same authentication interface
- ✅ Email verification workflow
- ✅ Admin approval process
- ✅ JWT token management
- ✅ Password reset functionality
- ✅ Employee management

### Key Differences
- **Database**: PostgreSQL instead of MongoDB
- **Schema**: Structured tables instead of flexible documents
- **Queries**: SQL instead of Mongoose queries
- **Functions**: Database functions for complex operations

## 🔍 Troubleshooting

### Database Connection Issues
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Check Supabase project is active
- Ensure Row Level Security policies are properly configured

### Authentication Issues
- Check JWT secrets are properly configured
- Verify user email verification status
- Confirm employee approval status
- Check refresh token validity

### Email Issues
- Verify SMTP credentials
- Check spam/junk folders
- Confirm email templates are working

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
