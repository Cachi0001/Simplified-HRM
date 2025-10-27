Build a MVP HR Management System using Supabase database. Focus on core features: user authentication (Google OAuth and email/password), employee CRUD operations, check-in/check-out with location capture (GPS on mobile), and task assignments. Use loose coupling for database interactions (e.g., via repository pattern) despite using Supabase.
Backend: Node.js/Express with TypeScript. Structure: controllers, services (for business logic and DB ops), routes, middleware (auth, validation), utils. Implement Supabase Auth with edge functions for email verification, password updates, and branded emails (use CEO email kayode@go3net.com.ng as from; SMTP: host=smtp.gmail.com, port=587, user=onyemechicaleb4@gmail.com, pass=vapmmsbaootvgtau).
Frontend: React with TypeScript. Structure: components (by feature, e.g., /auth, /dashboard), pages, hooks, contexts. Use CSS Modules (.module.css per component). Include: landing page, auth cards (login/register), admin dashboard (employee management, settings), employee dashboard (check-in/out, tasks). Mobile-responsive design.
Roles: Admin (full access, CRUD employees, assign tasks, settings) and Employee (self-view, check-in/out, view tasks).
Architecture: Modular, scalable, clean code with SOC. Use RESTful APIs. Add error handling, logging, tests. No mock data—integrate Supabase queries.
Proceed step-by-step: Plan architecture, implement auth, then employee CRUD, check-in/out, task assignments. Validate at each stage.

Pioritize UX things like authentication should be easy instead of firstName and lastName use fullName, email and password, department can be set up later by the user after registration
## Step 1: Architecture Plan

### Backend (Node.js/Express + TypeScript)
- **Structure**:
  - `src/controllers/`: Handle HTTP requests, call services.
  - `src/services/`: Business logic; use repository for DB ops.
  - `src/repositories/`: Interface for DB (loose coupling: define abstract repo, implement SupabaseRepo; easy switch to MongoRepo/MySQLRepo).
  - `src/routes/`: RESTful endpoints (e.g., /auth, /employees, /checkin, /tasks).
  - `src/middleware/`: Auth (JWT from Supabase), validation (Joi/Zod), error handling.
  - `src/utils/`: Helpers (logging, email sender via Nodemailer with given SMTP).
  - `src/config/`: Env vars (Supabase URL/key, SMTP details).
- **DB Loose Coupling**: Use repository pattern. Interface: e.g., `IEmployeeRepository { create(employee: Employee): Promise<Employee>; }`. Supabase impl uses @supabase/supabase-js. For dev, mock or use local Mongo/MySQL; deploy with Supabase.
- **Auth**: Supabase Auth for Google OAuth/email-password. Edge functions (Deno) for verify/email/password update; branded emails from kayode@go3net.com.ng via SMTP.
- **Roles**: RBAC via Supabase RLS or JWT claims (admin/employee).
- **Error/Logging/Tests**: Winston for logs, Jest for unit/integration tests.

### Frontend (React + TypeScript)
- **Structure**:
  - `src/components/auth/`: Login/Register cards.
  - `src/components/dashboard/`: Admin (employee CRUD, settings, task assign); Employee (check-in/out, tasks view).
  - `src/pages/`: Landing, Auth, Dashboard (role-based).
  - `src/hooks/`: UseAuth, useEmployees, etc.
  - `src/contexts/`: AuthContext for state.
  - `src/styles/`: CSS Modules (*.module.css) per component; media queries for mobile-responsive.
- **Integration**: @supabase/supabase-js client for queries; no mocks.
- **Design**: Responsive (Tailwind or pure CSS); landing with hero/auth links.

### Overall
- RESTful APIs: e.g., POST /employees, GET /checkin.
- Scalable: Modular, SOC.
- Dev: Use Mongo/MySQL locally via repo switch; deploy Supabase.

## Step 2: Implement Auth

### Backend
- Install: express, typescript, @supabase/supabase-js, nodemailer, jwt, etc.
- Config env: SUPABASE_URL, SUPABASE_KEY, SMTP vars.
- Repository: `IAuthRepository` with signUp, signIn, etc. Impl: SupabaseAuthRepo.
- Service: AuthService calls repo, handles OAuth/email.
- Controller: AuthController with routes /signup, /login, /oauth/google.
- Middleware: AuthMiddleware verifies Supabase JWT.
- Edge Function (Supabase deploy): Deno script for email verify/update; use Nodemailer for branded send.

Code snippet (backend/auth.service.ts):
```typescript
import { IAuthRepository } from '../repositories/IAuthRepository';

export class AuthService {
  constructor(private repo: IAuthRepository) {}

  async signUp(email: string, password: string) {
    return this.repo.signUp(email, password);
  }
  // Similar for signIn, OAuth
}
```

Supabase impl (supabaseAuthRepo.ts):
```typescript
import { createClient } from '@supabase/supabase-js';

export class SupabaseAuthRepo implements IAuthRepository {
  private supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

  async signUp(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }
  // etc.
}
```

Edge function example (verify.ts):
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import nodemailer from 'https://esm.sh/nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: { user: 'onyemechicaleb4@gmail.com', pass: 'vapmmsbaootvgtau' }
});

serve(async (req) => {
  // Handle verify logic, send branded email from 'kayode@go3net.com.ng'
});
```

### Frontend
- Auth components: Login/Register with forms, Google button.
- Use supabase.auth.signInWithOAuth({ provider: 'google' }).
- Context: AuthProvider wraps app, stores user/session.

Code snippet (AuthContext.tsx):
```tsx
import { createContext, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Listen to auth changes, set user
};
```

Validate: Test signup/login, JWT auth, role check.

## Step 3: Employee CRUD

### Backend
- Model: Employee { id, name, email, role, dept, etc. }
- Repo: IEmployeeRepo { create, read, update, delete }
- Service: EmployeeService (admin only via middleware).
- Routes: /employees (GET/POST/PUT/DELETE), auth protected.

Supabase schema: Table 'employees' with RLS for roles.

### Frontend
- Admin dashboard: Table for list, forms for CRUD.
- Hooks: useEmployees fetches via supabase.from('employees').select().

Validate: CRUD ops, role enforcement.

## Step 4: Check-in/Check-out

### Backend
- Model: Attendance { employeeId, timestamp, location: { lat, lng }, type: 'in/out' }
- Repo: IAttendanceRepo
- Service: CheckService (capture GPS from request).
- Routes: /attendance/checkin, /checkout (POST with location).

### Frontend
- Employee dashboard: Buttons for in/out, use navigator.geolocation.
- Mobile: Responsive, GPS prompt.

Validate: Record save, location verify.


## Step 5: Task Assignments

### Backend
- Model: Task { id, title, assigneeId, dueDate, status }
- Repo: ITaskRepo
- Service: TaskService (admin assign, employee view).
- Routes: /tasks (CRUD), filtered by role.

### Frontend
- Admin: Assign form.
- Employee: Task list.

Validate: Assign/view/update.

Final: Full integration, tests, deploy-ready (Supabase cloud). Local dev: Switch repo to Mongo/MySQL impl.

