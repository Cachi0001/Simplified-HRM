#!/bin/bash

##############################################################################
# Phase 3 API Endpoints - Complete Testing Script
# Tests all 21 endpoints with sample requests and error scenarios
##############################################################################

# Configuration
API_BASE_URL="http://localhost:3000/api"
JWT_TOKEN="your-jwt-token-here"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function to print section headers
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Helper function to make authenticated requests
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local url="${API_BASE_URL}${endpoint}"
    
    echo -e "${YELLOW}${method} ${url}${NC}"
    
    if [ -z "$data" ]; then
        curl -X "$method" \
            -H "Authorization: Bearer $JWT_TOKEN" \
            -H "Content-Type: application/json" \
            "$url"
    else
        curl -X "$method" \
            -H "Authorization: Bearer $JWT_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url"
    fi
    
    echo ""
    echo ""
}

##############################################################################
# CHAT ENDPOINTS (9 endpoints)
##############################################################################

print_header "CHAT ENDPOINTS"

# 1. Send Message
echo -e "${GREEN}1. POST /api/chat/send - Send Message${NC}"
make_request "POST" "/chat/send" '{
    "chatId": "chat-123",
    "message": "Hello, this is a test message"
}'

# 2. Mark Message as Read
echo -e "${GREEN}2. PATCH /api/chat/message/:messageId/read - Mark Message as Read${NC}"
make_request "PATCH" "/chat/message/msg-123/read" '{}'

# 3. Mark Chat as Read
echo -e "${GREEN}3. PATCH /api/chat/:chatId/read - Mark Chat as Read${NC}"
make_request "PATCH" "/chat/chat-123/read" '{}'

# 4. Get Chat History
echo -e "${GREEN}4. GET /api/chat/:chatId/history - Get Chat History${NC}"
make_request "GET" "/chat/chat-123/history?limit=20&offset=0" ""

# 5. Get Total Unread Count
echo -e "${GREEN}5. GET /api/chat/unread-count/total - Get Total Unread${NC}"
make_request "GET" "/chat/unread-count/total" ""

# 6. Get All Unread Counts
echo -e "${GREEN}6. GET /api/chat/unread-counts - Get All Unread Counts${NC}"
make_request "GET" "/chat/unread-counts" ""

# 7. Get Chat Unread Count
echo -e "${GREEN}7. GET /api/chat/:chatId/unread-count - Get Chat Unread Count${NC}"
make_request "GET" "/chat/chat-123/unread-count" ""

# 8. Get Message Read Receipt
echo -e "${GREEN}8. GET /api/chat/message/:messageId/read-receipt - Get Read Receipt${NC}"
make_request "GET" "/chat/message/msg-123/read-receipt" ""

# 9. Get Chat Participants
echo -e "${GREEN}9. GET /api/chat/:chatId/participants - Get Chat Participants${NC}"
make_request "GET" "/chat/chat-123/participants" ""

##############################################################################
# NOTIFICATION ENDPOINTS (8 endpoints)
##############################################################################

print_header "NOTIFICATION ENDPOINTS"

# 1. Get Notifications
echo -e "${GREEN}1. GET /api/notifications - Get Notifications${NC}"
make_request "GET" "/notifications?page=1&limit=20" ""

# 2. Get Unread Notifications
echo -e "${GREEN}2. GET /api/notifications/unread - Get Unread Notifications${NC}"
make_request "GET" "/notifications/unread?page=1&limit=20" ""

# 3. Get Unread Count
echo -e "${GREEN}3. GET /api/notifications/unread-count - Get Unread Count${NC}"
make_request "GET" "/notifications/unread-count" ""

# 4. Mark Notification as Read
echo -e "${GREEN}4. PATCH /api/notifications/:notificationId/read - Mark as Read${NC}"
make_request "PATCH" "/notifications/notif-123/read" '{}'

# 5. Mark All as Read
echo -e "${GREEN}5. PATCH /api/notifications/mark-all-read - Mark All as Read${NC}"
make_request "PATCH" "/notifications/mark-all-read" '{}'

# 6. Delete Notification
echo -e "${GREEN}6. DELETE /api/notifications/:notificationId - Delete Notification${NC}"
make_request "DELETE" "/notifications/notif-123" ""

# 7. Save Push Token
echo -e "${GREEN}7. POST /api/notifications/push-token - Save Push Token${NC}"
make_request "POST" "/notifications/push-token" '{
    "token": "fcm-token-abc123xyz",
    "type": "FCM"
}'

# 8. Get Users with Push Tokens
echo -e "${GREEN}8. GET /api/notifications/push-tokens/:type - Get Users with Tokens${NC}"
make_request "GET" "/notifications/push-tokens/FCM" ""

##############################################################################
# TYPING ENDPOINTS (4 endpoints)
##############################################################################

print_header "TYPING ENDPOINTS"

# 1. Start Typing
echo -e "${GREEN}1. POST /api/typing/start - Start Typing${NC}"
make_request "POST" "/typing/start" '{
    "chatId": "chat-123"
}'

# 2. Stop Typing
echo -e "${GREEN}2. POST /api/typing/stop - Stop Typing${NC}"
make_request "POST" "/typing/stop" '{
    "chatId": "chat-123"
}'

# 3. Get Typing Users
echo -e "${GREEN}3. GET /api/typing/:chatId - Get Typing Users${NC}"
make_request "GET" "/typing/chat-123" ""

# 4. Check if User Typing
echo -e "${GREEN}4. GET /api/typing/:chatId/:userId - Check if User Typing${NC}"
make_request "GET" "/typing/chat-123/user-123" ""

##############################################################################
# ERROR SCENARIOS & VALIDATION
##############################################################################

print_header "ERROR SCENARIOS & VALIDATION TESTS"

# Test 1: Missing Authentication
echo -e "${RED}Test 1: Missing Authentication Header${NC}"
echo -e "${YELLOW}GET ${API_BASE_URL}/notifications${NC}"
curl -X "GET" \
    -H "Content-Type: application/json" \
    "${API_BASE_URL}/notifications"
echo ""
echo ""

# Test 2: Invalid JWT Token
echo -e "${RED}Test 2: Invalid JWT Token${NC}"
echo -e "${YELLOW}GET ${API_BASE_URL}/notifications${NC}"
curl -X "GET" \
    -H "Authorization: Bearer invalid-token" \
    -H "Content-Type: application/json" \
    "${API_BASE_URL}/notifications"
echo ""
echo ""

# Test 3: Missing Required Field (Send Message)
echo -e "${RED}Test 3: Missing Required Field (Send Message)${NC}"
echo -e "${YELLOW}POST ${API_BASE_URL}/chat/send${NC}"
curl -X "POST" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"chatId": "chat-123"}' \
    "${API_BASE_URL}/chat/send"
echo ""
echo ""

# Test 4: Empty Message
echo -e "${RED}Test 4: Empty Message${NC}"
echo -e "${YELLOW}POST ${API_BASE_URL}/chat/send${NC}"
curl -X "POST" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"chatId": "chat-123", "message": ""}' \
    "${API_BASE_URL}/chat/send"
echo ""
echo ""

# Test 5: Invalid Pagination (negative limit)
echo -e "${RED}Test 5: Invalid Pagination (negative limit)${NC}"
echo -e "${YELLOW}GET ${API_BASE_URL}/notifications?page=1&limit=-10${NC}"
curl -X "GET" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    "${API_BASE_URL}/notifications?page=1&limit=-10"
echo ""
echo ""

# Test 6: Invalid Pagination (page 0)
echo -e "${RED}Test 6: Invalid Pagination (page 0)${NC}"
echo -e "${YELLOW}GET ${API_BASE_URL}/notifications?page=0&limit=20${NC}"
curl -X "GET" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    "${API_BASE_URL}/notifications?page=0&limit=20"
echo ""
echo ""

# Test 7: Invalid Chat ID Format
echo -e "${RED}Test 7: Invalid Chat ID (empty)${NC}"
echo -e "${YELLOW}PATCH ${API_BASE_URL}/chat//read${NC}"
curl -X "PATCH" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    "${API_BASE_URL}/chat//read"
echo ""
echo ""

# Test 8: Invalid Push Token Type
echo -e "${RED}Test 8: Invalid Push Token${NC}"
echo -e "${YELLOW}POST ${API_BASE_URL}/notifications/push-token${NC}"
curl -X "POST" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"token": "", "type": "FCM"}' \
    "${API_BASE_URL}/notifications/push-token"
echo ""
echo ""

##############################################################################
# PERFORMANCE TESTS
##############################################################################

print_header "PERFORMANCE TESTS"

# Test concurrent requests
echo -e "${YELLOW}Testing concurrent requests (10 requests to notifications endpoint)${NC}"
for i in {1..10}; do
    curl -X "GET" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "Content-Type: application/json" \
        "${API_BASE_URL}/notifications" &
done
wait
echo ""
echo -e "${GREEN}Concurrent requests completed${NC}"
echo ""

##############################################################################
# SUMMARY
##############################################################################

print_header "TESTING SUMMARY"
echo -e "${GREEN}Total Endpoints Tested: 21${NC}"
echo -e "${GREEN}  - Chat: 9 endpoints${NC}"
echo -e "${GREEN}  - Notifications: 8 endpoints${NC}"
echo -e "${GREEN}  - Typing: 4 endpoints${NC}"
echo ""
echo -e "${YELLOW}Error Scenarios Tested: 8${NC}"
echo -e "${YELLOW}  - Missing auth${NC}"
echo -e "${YELLOW}  - Invalid token${NC}"
echo -e "${YELLOW}  - Invalid data${NC}"
echo -e "${YELLOW}  - Pagination errors${NC}"
echo ""
echo -e "${BLUE}Instructions:${NC}"
echo "1. Set JWT_TOKEN to a valid token from your auth endpoint"
echo "2. Ensure backend server is running at http://localhost:3000"
echo "3. Run this script: bash test-all-endpoints.sh"
echo "4. Check responses for success (status: 'success') or errors"
echo ""