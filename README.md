## ✨ Features
- Employee Management
- Attendance Tracking
- Task Management
- **Passwordless Authentication** with Magic Links
- Email Confirmations with Toast Notifications
- Admin Dashboard
- Modern UI/UX

## 🚀 Quick Setup

### 1. Environment Variables
**Backend (.env):**
```env
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Frontend (.env.local):**
```env
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_FRONTEND_URL=http://localhost:5173
```

### 2. Supabase Configuration (CRITICAL for Magic Links)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to: **Authentication > Settings**
3. Set **Site URL:** `http://localhost:5173`
4. Add **Redirect URL:** `http://localhost:5173/confirm`
5. Check **Email Templates** to ensure they're using magic links

### 3. Database Setup
1. Run the SQL schema in Supabase SQL Editor
2. Run: `node fix-database.js` (if you have database issues)

### 4. Start Development
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

### 5. Test Magic Links
```bash
# Run the magic link test
node test-magic-link.js
```

## 🔗 Passwordless Magic Link Authentication

**Problem Solved:** No more verification endpoint errors!

**How it works:**
1. **User Signs Up** → Only email and name required (no password)
2. **Supabase Sends Magic Link** → `http://localhost:5173/confirm#access_token=...&type=signup`
3. **User Clicks Link** → Frontend confirms email and creates employee record
4. **Admin Gets Notification** → Email sent to admin for approval
5. **User Can Login** → After admin approval

**Expected URL Format:**
```
✅ http://localhost:5173/confirm#access_token=...&refresh_token=...&type=signup
❌ https://supabase-url/auth/v1/verify?token=...
```

## 📧 Email Confirmation Flow

1. **Signup** → Shows: "Check your inbox – we sent you a confirmation email"
2. **Resend** → Shows: "Check your inbox – we sent you a new confirmation email"
3. **Confirm** → Shows: "🎉 Email confirmed successfully! Your account is now pending admin approval."
4. **Login (Pending)** → Shows: "⚠️ Your account is pending admin approval. You will receive an email notification once activated."

## 🎨 UI/UX Features

- **Toast Notifications:** Blue for success, red for errors, yellow for warnings
- **Passwordless Signup:** No password required - just email and name
- **Responsive Design:** Works on all devices
- **Modern Styling:** Tailwind CSS with custom branding
- **Smooth Animations:** Loading states and transitions
- **Professional Branding:** Go3net colors and logo

## 🛠 Troubleshooting

- **Magic Link Issues:** See `magic-link-fix.md`
- **Database Problems:** Run `fix-database.js`
- **Environment Variables:** Check `.env.example` files
- **Supabase Auth:** Verify dashboard settings

## 📝 Development Notes

- Backend runs on port 3000
- Frontend runs on port 5173
- Uses Supabase for authentication and database
- Toast notifications for all user feedback
- **Passwordless magic link authentication** flow

---

**Need Help?** Check the troubleshooting section or run the test script!
