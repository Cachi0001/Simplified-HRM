# 🚀 Database Migration Execution Guide

**Migration**: `002_chat_features.sql`  
**Status**: Ready to execute  
**Impact**: 5 tables, 7 indexes, 1 column addition  
**Time**: 2-3 minutes

---

## ⚡ Quick Start (Recommended)

### Step 1: Get Migration SQL

Open file:
```
c:\Users\DELL\Saas\Go3net Simplified\database\migrations\002_chat_features.sql
```

Copy ALL content (lines 1-65)

### Step 2: Execute in Supabase Console

1. **Go to**: https://app.supabase.com
2. **Select Project**: Go3net HR Management
3. **Navigate**: SQL Editor (left sidebar)
4. **Click**: "New Query"
5. **Paste** the SQL code
6. **Click**: "Run" (or Cmd/Ctrl + Enter)

### Step 3: Verify Success

You should see output like:
```
✅ Table "chat_unread_count" created
✅ Table "notifications" created
✅ Table "typing_status" created
✅ Column "read_at" added to chat_messages
✅ 7 indexes created
```

---

## 📋 What Gets Created

| Item | Type | Purpose |
|------|------|---------|
| `chat_unread_count` | Table | Track unread messages per user per chat |
| `notifications` | Table | Store all notifications with types |
| `typing_status` | Table | Real-time typing indicators with TTL |
| `chat_messages.read_at` | Column | Timestamp when message was read |
| `push_token` | Column (employees) | Store FCM push notification tokens |
| `idx_chat_messages_read_at` | Index | Fast read receipt queries |
| `idx_chat_unread_count_user_chat` | Index | Fast unread count lookups |
| `idx_typing_status_*` | Indexes (3) | Fast typing indicator queries |
| `idx_notifications_*` | Indexes (3) | Fast notification lookups |

---

## ✅ Safety Features Built In

All statements are **idempotent** (safe to run multiple times):

```sql
CREATE TABLE IF NOT EXISTS public.chat_unread_count { ... }
CREATE TABLE IF NOT EXISTS public.notifications { ... }
CREATE INDEX IF NOT EXISTS idx_typing_status_chat_id { ... }
ALTER TABLE IF EXISTS public.chat_messages ADD COLUMN IF NOT EXISTS read_at { ... }
```

✅ **Safe to execute**: Won't error if tables/columns already exist

---

## 🔍 Verify After Execution

### Check Tables Created

```sql
-- Run this in Supabase SQL Editor to verify
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name IN ('chat_unread_count', 'notifications', 'typing_status');
```

Expected result:
```
table_name
─────────────────────────
chat_unread_count
notifications
typing_status
```

### Check Indexes Created

```sql
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';
```

Expected to see:
- `idx_chat_messages_read_at`
- `idx_chat_unread_count_user_chat`
- `idx_typing_status_chat_id`
- `idx_typing_status_expires_at`
- `idx_typing_status_user_id`
- `idx_notifications_user_id`
- `idx_notifications_is_read`
- `idx_notifications_created_at`

### Check Column Added

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'chat_messages' AND column_name = 'read_at';
```

Expected result:
```
column_name | data_type
─────────────┼──────────
read_at     | timestamp with time zone
```

---

## 🔄 Enable Realtime (REQUIRED)

After migration, enable Realtime replication:

1. Go to: **Database** → **Publications** (left sidebar)
2. Find: **supabase_realtime**
3. Click: **Edit**
4. **Check these tables**:
   - ✅ `chat_messages`
   - ✅ `chat_unread_count`
   - ✅ `typing_status`
   - ✅ `notifications`
5. Click: **Save**

Wait 10 seconds for changes to propagate.

---

## 🐛 Troubleshooting

### Error: "Table already exists"

**Cause**: Migration run twice  
**Solution**: This is safe - scripts use IF NOT EXISTS

### Error: "Column read_at already exists"

**Cause**: Previously executed  
**Solution**: This is safe - no harm done

### Error: "Foreign key constraint failed"

**Cause**: Missing `group_chats` or `auth.users` table  
**Solution**: Run migration `001_initial_schema.sql` first

### Error: "Permission denied"

**Cause**: Using anon key instead of service role  
**Solution**: 
1. Go to Project Settings → API
2. Copy **Service Role Key** (not Anon Key)
3. Set in `.env` as `SUPABASE_SERVICE_ROLE_KEY`

### Realtime Not Working

**Check**:
1. Is table in supabase_realtime publication? (Publications page)
2. Is RLS enabled? (Go to Authentication → Policies)
3. Are policies allowing reads?

---

## 🚀 Next Steps After Migration

### 1. Frontend Configuration (5 min)

✅ Already done - file `frontend/.env` has:
```env
VITE_SUPABASE_URL=https://xabdbqfxjxmslmbqujhz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### 2. Test Real-time Connection (10 min)

In browser console:
```javascript
import { supabase, checkSupabaseConnection } from './lib/supabase.ts';

// Test connection
const connected = await checkSupabaseConnection();
console.log('Connected:', connected);

// Check active channels
const channels = supabase.getChannels();
console.log('Channels:', channels);
```

### 3. Integrate Hooks (30 min)

Use the new hooks in your components:
- `useRealtimeChat` → Chat pages
- `useRealtimeTyping` → Message input area
- `useRealtimeNotifications` → Navigation bar

---

## 📚 Files Reference

| File | Purpose |
|------|---------|
| `database/migrations/002_chat_features.sql` | **Main migration SQL** |
| `PHASE_4c_REALTIME_INTEGRATION.md` | Complete guide with examples |
| `frontend/src/hooks/useRealtimeChat.ts` | Real-time messages hook |
| `frontend/src/hooks/useRealtimeTyping.ts` | Typing indicators hook |
| `frontend/src/hooks/useRealtimeNotifications.ts` | Notifications hook |
| `frontend/src/lib/supabase.ts` | Supabase client |

---

## 🎯 Execution Checklist

- [ ] Open Supabase console
- [ ] Create new SQL query
- [ ] Copy migration SQL (all 65 lines)
- [ ] Paste into query editor
- [ ] Click "Run"
- [ ] Verify all 4 tables created
- [ ] Verify all indexes created
- [ ] Enable Realtime for 4 tables
- [ ] Test frontend connection
- [ ] Integrate hooks into app

---

## ⏱️ Timeline

| Task | Time |
|------|------|
| Copy migration SQL | 1 min |
| Execute in console | 1 min |
| Verify tables | 1 min |
| Enable Realtime | 2 min |
| Test connection | 5 min |
| **Total** | **~10 minutes** |

---

## 🎉 Success Indicators

✅ All 4 new tables present in database  
✅ All 7+ indexes created  
✅ Realtime enabled for target tables  
✅ Frontend `supabase` client can connect  
✅ Browser console shows "Connected: true"  

**Ready for Phase 4c hook integration!**