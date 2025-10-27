# Testing Reference Quick Guide

## 🚀 Quick Commands

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm test:watch
```

### Run Specific Test File
```bash
npm test -- chat.test.ts
npm test -- notifications.test.ts
npm test -- typing.test.ts
```

### Run Specific Test Case
```bash
npm test -- -t "should send a message successfully"
```

### View Coverage Report
```bash
npm test -- --coverage
```

### Run with Verbose Output
```bash
npm test -- --verbose
```

---

## 📋 Test Files Reference

### Chat Tests
**File:** `tests/endpoints/chat.test.ts`
**Endpoints:** 9
**Test Cases:** 50+

```
POST   /api/chat/send
PATCH  /api/chat/message/:messageId/read
PATCH  /api/chat/:chatId/read
GET    /api/chat/:chatId/history
GET    /api/chat/unread-count/total
GET    /api/chat/unread-counts
GET    /api/chat/:chatId/unread-count
GET    /api/chat/message/:messageId/read-receipt
GET    /api/chat/:chatId/participants
```

### Notification Tests
**File:** `tests/endpoints/notifications.test.ts`
**Endpoints:** 8
**Test Cases:** 60+

```
GET    /api/notifications
GET    /api/notifications/unread
GET    /api/notifications/unread-count
PATCH  /api/notifications/:notificationId/read
PATCH  /api/notifications/mark-all-read
DELETE /api/notifications/:notificationId
POST   /api/notifications/push-token
GET    /api/notifications/push-tokens/:type
```

### Typing Tests
**File:** `tests/endpoints/typing.test.ts`
**Endpoints:** 4
**Test Cases:** 40+

```
POST   /api/typing/start
POST   /api/typing/stop
GET    /api/typing/:chatId
GET    /api/typing/:chatId/:userId
```

---

## 🔧 Test Utilities

### Generate Test Token
```typescript
import { generateTestToken } from './utils/testHelpers';

const token = generateTestToken('user-123');
const tokenWithRole = generateTestToken('user-123', 'admin');
```

### Make Authenticated Request
```typescript
import { authenticatedRequest } from './utils/testHelpers';

const req = await authenticatedRequest(app, 'get', '/api/notifications', token);
```

### Assert Success Response
```typescript
import { assertSuccessResponse } from './utils/testHelpers';

assertSuccessResponse(response, 200);  // Checks status and data structure
```

### Assert Error Response
```typescript
import { assertErrorResponse } from './utils/testHelpers';

assertErrorResponse(response, 400, 'validation error');  // Checks status and message
```

### Test Data Factories
```typescript
import { chatTestData, notificationTestData, typingTestData } from './utils/testHelpers';

chatTestData.validSendMessage
notificationTestData.validSavePushToken
typingTestData.validStartTyping
```

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module jest.config.js"
**Solution:**
```bash
npm install --save-dev jest ts-jest @types/jest
npm test
```

### Issue: Tests timeout
**Solution:**
- Increase timeout in jest.config.js: `testTimeout: 30000`
- Check if server is running on port 3000

### Issue: "JWT_SECRET not defined"
**Solution:**
```bash
# Set environment variable
export JWT_SECRET="test-secret-key"  # Linux/Mac
set JWT_SECRET=test-secret-key       # Windows
```

### Issue: Connection refused errors
**Solution:**
```bash
# Start backend server first
npm run dev

# In another terminal, run tests
npm test
```

### Issue: "No tests found"
**Solution:**
- Check test files are in `tests/` directory
- Filenames must end with `.test.ts` or `.spec.ts`
- Verify paths in jest.config.js

---

## 📊 Test Statistics

### Coverage Targets
- **Lines:** >80%
- **Branches:** >75%
- **Functions:** >80%
- **Statements:** >80%

### Current Test Count
- Chat endpoints: 9 endpoints × 5+ tests = 45+ tests
- Notification endpoints: 8 endpoints × 7+ tests = 56+ tests
- Typing endpoints: 4 endpoints × 10+ tests = 40+ tests
- Error scenarios: 8 tests
- **Total: 150+ tests**

---

## 🔐 Security Test Checklist

- [ ] Authentication required on all endpoints
- [ ] Invalid tokens rejected
- [ ] Special characters sanitized
- [ ] SQL injection attempts blocked
- [ ] XSS prevention verified
- [ ] CSRF tokens validated
- [ ] Rate limiting tested
- [ ] Permission checks working

---

## 📈 Performance Test Checklist

- [ ] Send message: <100ms
- [ ] Get unread: <50ms
- [ ] Get typing: <10ms
- [ ] Pagination works with 10,000+ items
- [ ] Concurrent requests handled (10+)
- [ ] Memory usage stable under load
- [ ] No N+1 queries

---

## 🛠️ CURL Testing Examples

### Get Notifications
```bash
curl -X GET \
  -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/notifications?page=1&limit=20
```

### Send Message
```bash
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chatId":"chat-123","message":"Hello"}' \
  http://localhost:3000/api/chat/send
```

### Mark as Read
```bash
curl -X PATCH \
  -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/chat/chat-123/read
```

### Get Typing Users
```bash
curl -X GET \
  -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/typing/chat-123
```

### Save Push Token
```bash
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token":"fcm-xyz","type":"FCM"}' \
  http://localhost:3000/api/notifications/push-token
```

---

## 📝 Writing New Tests

### Template
```typescript
describe('Feature Name', () => {
  it('should do something', async () => {
    // Arrange
    const token = generateTestToken('user-123');
    const payload = { /* test data */ };
    
    // Act
    const response = await authenticatedRequest(app, 'post', '/api/endpoint', token)
      .send(payload);
    
    // Assert
    assertSuccessResponse(response, 200);
    expect(response.body.data).toHaveProperty('id');
  });
});
```

### Test Data Template
```typescript
export const featureTestData = {
  valid: {
    field1: 'value',
    field2: 123,
  },
  invalid: {
    // Missing required fields
  },
};
```

---

## 🎯 Test Scenarios by Type

### Positive Tests (Happy Path)
- Valid data with all required fields
- Successful database operations
- Correct response format
- Proper HTTP status codes

### Negative Tests (Error Cases)
- Missing required fields
- Invalid data types
- Out of range values
- Special characters and XSS

### Edge Cases
- Empty arrays/strings
- Maximum length strings
- Concurrent operations
- Expired sessions
- Resource not found

### Performance Tests
- Response times
- Memory usage
- Concurrent requests
- Large datasets

---

## 🔍 Test Maintenance

### Weekly
- Review test failures
- Update test data as schema changes
- Check coverage reports

### Monthly
- Refactor tests for clarity
- Add tests for new endpoints
- Performance benchmarking
- Security audit

### Before Release
- Run full test suite
- 100% endpoint coverage
- Error scenario validation
- Performance profiling

---

## 📱 Test Scripts (PowerShell)

### Run Tests
```powershell
npm test
```

### Run with Coverage
```powershell
npm test -- --coverage
npm run test:watch
```

### Run CURL Script
```powershell
. .\tests\curl-scripts\test-endpoints.ps1
```

---

## 🏆 Test Quality Metrics

### Ideal Metrics
- **Pass Rate:** 100%
- **Coverage:** >80%
- **Performance:** <200ms average
- **Flakiness:** <1%

### Monitor With
```bash
npm test -- --coverage --detectOpenHandles
```

---

## 📚 Related Documentation

- Phase 3 API Endpoints: `PHASE_3_API_ENDPOINTS_SUMMARY.md`
- API Reference: `PHASE_3_API_REFERENCE.md`
- Testing Guide: `PHASE_4a_TESTING_GUIDE.md`

---

## ✅ Before You Commit

```bash
# Run all tests
npm test

# Check coverage
npm test -- --coverage

# Lint TypeScript
npm run lint

# Build project
npm run build

# Git commit
git add .
git commit -m "feat: add test for new endpoint"
git push
```

---

## 🚀 Continuous Integration

### GitHub Actions Example
```yaml
- run: npm install
- run: npm run lint
- run: npm test -- --coverage
- run: npm run build
```

---

**Happy Testing! 🎉**