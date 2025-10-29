# 🧪 Floating Chat Widget v2.0 - Testing Guide

**Quick Test Script for QA/Testing**

---

## 🎯 Pre-Test Checklist

- [ ] Browser DevTools open (F12)
- [ ] Console clear (no errors)
- [ ] Local backend running (or using staging)
- [ ] User logged in
- [ ] Chat widget visible in bottom-right area

---

## 📝 Test Case 1: Viewport Constraint

**Duration**: 2 minutes

### Steps:
1. Click chat bubble to open widget
2. Click and hold widget header (NOT buttons)
3. Drag bubble to **bottom-right corner**
4. Try to drag it further right and down

### Expected Results:
- ✅ Widget stops at screen edge (not off-screen)
- ✅ Close button (X) still visible
- ✅ Can still interact with close button
- ✅ Widget snaps back if dragged past boundary

### Pass/Fail:
- [ ] **PASS** - Widget stayed visible
- [ ] **FAIL** - Widget went off-screen

---

## 📝 Test Case 2: Fullscreen Toggle

**Duration**: 3 minutes

### Steps:
1. Open chat widget (click bubble)
2. Locate maximize icon (🔲) in top-right header
3. Click maximize button
4. Verify fullscreen appearance
5. Click minimize button (↙️)
6. Verify returns to normal

### Expected Results:
- ✅ Widget expands to fill entire screen
- ✅ Header shows "Chat - Full Screen"
- ✅ Semi-transparent black backdrop appears
- ✅ Maximize icon changes to minimize icon
- ✅ Returns to original position/size
- ✅ All tabs and features still work

### Pass/Fail:
- [ ] **PASS** - Fullscreen works correctly
- [ ] **FAIL** - Something unexpected happened

---

## 📝 Test Case 3: ESC Key Support

**Duration**: 2 minutes

### Steps:
1. Open widget and enter fullscreen (Test Case 2)
2. Press **ESC** key on keyboard
3. Verify fullscreen exits

### Expected Results:
- ✅ Pressing ESC closes fullscreen
- ✅ Returns to normal widget view
- ✅ Widget stays open (not closed completely)
- ✅ ESC doesn't work in normal view (only fullscreen)

### Additional Test:
- Open widget in normal mode (not fullscreen)
- Press ESC
- ✅ Should have NO effect (widget stays open)

### Pass/Fail:
- [ ] **PASS** - ESC works correctly in fullscreen only
- [ ] **FAIL** - ESC behavior unexpected

---

## 📝 Test Case 4: Mobile Close Button (X)

**Duration**: 2 minutes

### Steps:
1. Open widget (any mode)
2. Locate X button in top-right (rightmost button)
3. Click X button
4. Verify widget closes

### Expected Results:
- ✅ X button closes widget
- ✅ Chat selection is cleared
- ✅ Fullscreen exits (if active)
- ✅ Button has good touch target (easy to click)

### Mobile-Specific Test:
- On mobile device (< 768px):
- ✅ Button is at least 44px tall (touch-friendly)
- ✅ Easy to tap without accidentally hitting other buttons
- ✅ Works in both portrait and landscape

### Pass/Fail:
- [ ] **PASS** - X button works correctly
- [ ] **FAIL** - Button unclear or hard to tap

---

## 📝 Test Case 5: Role-Based History Filtering

**Duration**: 5 minutes per role

### Prerequisites:
- Multiple test users with different roles
- Test Data: Some shared conversations

### For Employee User:
1. Login as Employee
2. Open chat widget
3. Click **History** tab
4. Verify chat list

**Expected Results**:
- ✅ Only sees their own conversations
- ✅ Doesn't see other employees' chats
- ✅ Can still see DMs with admins
- ✅ Can still access groups they're members of

**Test Data**:
```
Employee1 ↔ Admin        → VISIBLE in Employee1's History
Employee1 ↔ Employee2    → ONLY visible to Employee1 and Employee2
Employee2 ↔ Admin        → NOT visible in Employee1's History
```

### For Admin User:
1. Login as Admin
2. Open chat widget
3. Click **History** tab
4. Verify chat list

**Expected Results**:
- ✅ Sees all conversations
- ✅ EXCEPT those marked "super-admin-personal"
- ✅ Can see employee ↔ employee conversations
- ✅ Can see all admin ↔ other conversations

### For HR User:
Same as Admin (see all except super-admin-personal)

### For Super-Admin User:
1. Login as Super-Admin
2. Open chat widget
3. Click **History** tab
4. Verify chat list

**Expected Results**:
- ✅ Sees **EVERY** conversation
- ✅ No filtering or restrictions
- ✅ Includes super-admin-personal chats
- ✅ Complete audit trail visible

### Pass/Fail:
- [ ] **PASS** - All roles see correct conversations
- [ ] **FAIL** - Role filtering not working

---

## 📝 Test Case 6: Drag + Fullscreen Interaction

**Duration**: 3 minutes

### Steps:
1. Open widget in normal mode
2. Drag to center of screen
3. Click fullscreen button
4. Verify fullscreen (should center regardless)
5. Exit fullscreen
6. Verify widget in dragged position

### Expected Results:
- ✅ Can drag widget around
- ✅ Fullscreen ignores previous position (fills screen)
- ✅ After fullscreen exits, widget returns to dragged position
- ✅ Dragging disabled while in fullscreen

### Pass/Fail:
- [ ] **PASS** - Drag and fullscreen work together
- [ ] **FAIL** - Position/fullscreen interaction broken

---

## 📝 Test Case 7: Dark Mode Toggle

**Duration**: 2 minutes

### Steps:
1. Open widget
2. Note current colors (light or dark)
3. Click moon/sun icon (🌙 or ☀️)
4. Verify colors change
5. Close and reopen widget
6. Verify dark mode persisted

### Expected Results:
- ✅ Colors change immediately when toggled
- ✅ Preference saved to localStorage
- ✅ Persists across page refreshes
- ✅ Independent from dashboard dark mode
- ✅ Light mode: white bg, dark text
- ✅ Dark mode: dark bg, light text

### Pass/Fail:
- [ ] **PASS** - Dark mode works independently
- [ ] **FAIL** - Colors wrong or not persisting

---

## 📝 Test Case 8: Message Sending in Fullscreen

**Duration**: 3 minutes

### Steps:
1. Open widget
2. Enter fullscreen
3. Select a chat
4. Type a message
5. Press Enter (or click Send)
6. Verify message appears

### Expected Results:
- ✅ Can type in fullscreen
- ✅ Send button accessible
- ✅ Message sends successfully
- ✅ Message appears in thread
- ✅ Input clears after send

### Pass/Fail:
- [ ] **PASS** - Messaging works in fullscreen
- [ ] **FAIL** - Can't send or message display broken

---

## 📝 Test Case 9: Tab Switching with Role

**Duration**: 3 minutes

### Steps:
1. Login as Employee
2. Open widget
3. Switch between tabs: DMs → Groups → Announcements → History
4. Verify correct content on each tab
5. Login as Admin (different user)
6. Open widget
7. Repeat tab switches
8. Verify admin sees more/different content

### Expected Results - Employee:
- DMs: ✅ Shows all available users
- Groups: ✅ Shows only groups user is member of
- Announcements: ✅ Shows relevant announcements
- History: ✅ Shows only their conversations

### Expected Results - Admin:
- DMs: ✅ Shows all users
- Groups: ✅ Shows all groups
- Announcements: ✅ Shows all announcements
- History: ✅ Shows all except super-admin-personal

### Pass/Fail:
- [ ] **PASS** - Tab switching works with role filtering
- [ ] **FAIL** - Wrong content on tabs

---

## 📝 Test Case 10: Mobile Responsive Layout

**Duration**: 5 minutes

### Desktop Test (> 1024px):
1. Open widget
2. Verify width: **320px** (w-80)
3. Verify height: **384px** (h-96) or up to 80vh
4. Verify rounded corners: **8px**

### Tablet Test (768px - 1024px):
1. Resize browser to tablet size
2. Open widget
3. Verify width: ~320px
4. Verify height: responsive
5. Verify buttons are easily tappable

### Mobile Test (< 768px):
1. Open on mobile device (or resize to < 768px)
2. Verify width: **320px** (fits screen)
3. Verify buttons are touch-friendly
4. Verify can tap close button easily
5. Verify fullscreen fills mobile screen
6. Open fullscreen → verify no overflow

### Pass/Fail:
- [ ] **PASS** - Responsive design works all sizes
- [ ] **FAIL** - Widget broken or buttons hard to use

---

## 🎬 Smoke Test (Quick 30-Second Test)

Run this to verify nothing is broken:

1. ✅ Load page
2. ✅ Chat bubble visible
3. ✅ Click bubble → widget opens
4. ✅ Can see DMs tab content
5. ✅ Click message → can read it
6. ✅ Click X button → widget closes
7. ✅ No console errors

**Result**: ✅ **PASS** = system working

---

## 🔍 Browser DevTools Checks

### Console (F12 → Console tab)
```
❌ NO red error messages
❌ NO "Cannot read property" errors
❌ NO 404 errors for resources
✅ Only info/warning messages OK
```

### Network (F12 → Network tab)
```
✅ All API calls return 200/201
✅ No 403 Forbidden errors
✅ No CORS errors
✅ Images loading properly
```

### Performance (F12 → Performance tab)
```
✅ Fullscreen toggle < 100ms
✅ Message send < 500ms
✅ No jank or stuttering
✅ Smooth animations
```

---

## 📋 Test Results Template

```
Date: ________________
Tester: _______________
Browser: ______________
OS: __________________

Test Case 1 (Viewport):     [ ] PASS  [ ] FAIL
Test Case 2 (Fullscreen):   [ ] PASS  [ ] FAIL
Test Case 3 (ESC Key):      [ ] PASS  [ ] FAIL
Test Case 4 (Close Button): [ ] PASS  [ ] FAIL
Test Case 5 (Role Filter):  [ ] PASS  [ ] FAIL
Test Case 6 (Drag+Full):    [ ] PASS  [ ] FAIL
Test Case 7 (Dark Mode):    [ ] PASS  [ ] FAIL
Test Case 8 (Msg in Full):  [ ] PASS  [ ] FAIL
Test Case 9 (Tab Switching):[ ] PASS  [ ] FAIL
Test Case 10 (Responsive):  [ ] PASS  [ ] FAIL

Overall Result: [ ] PASS  [ ] FAIL

Notes:
_______________________________________________________
_______________________________________________________
```

---

## 🚀 Deployment Approval Checklist

- [ ] All 10 test cases PASS
- [ ] No console errors
- [ ] Works on Chrome/Firefox/Safari
- [ ] Works on mobile
- [ ] Role-based filtering correct
- [ ] Build succeeds: `npm run build`
- [ ] No new warnings in build
- [ ] Backend ready for production
- [ ] Environment variables set
- [ ] CORS configured
- [ ] Staging tested successfully

**Approval**: ✅ **APPROVED FOR PRODUCTION DEPLOYMENT**

---

## 🐛 If Test Fails

### Check These First:
1. Browser cache cleared (Ctrl+Shift+Del)
2. Hard refresh page (Ctrl+F5)
3. No browser extensions blocking scripts
4. Backend is running and responding
5. User is logged in (check localStorage)
6. Console for specific error messages

### If Still Failing:
1. Check `FLOATING_CHAT_WIDGET_ENHANCEMENTS_v2.md` troubleshooting
2. Review `FLOATING_CHAT_v2_QUICK_REF.md` for common issues
3. Check backend logs for errors
4. Verify user role in database
5. Test with different user/role

---

## 📞 Support Reference

- **Technical Guide**: FLOATING_CHAT_WIDGET_ENHANCEMENTS_v2.md
- **Quick Reference**: FLOATING_CHAT_v2_QUICK_REF.md  
- **Code**: frontend/src/components/chat/FloatingChatWidget.tsx
- **Completion Summary**: SESSION_7_COMPLETION_SUMMARY.md

---

**Testing Version**: v2.0  
**Last Updated**: Session 7  
**Status**: Ready for QA

Good luck testing! 🧪