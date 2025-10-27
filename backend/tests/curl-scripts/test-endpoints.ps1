# Phase 3 API Endpoints - Complete Testing Script (PowerShell)
# Tests all 21 endpoints with sample requests and error scenarios

# Configuration
$API_BASE_URL = "http://localhost:3000/api"
$JWT_TOKEN = "your-jwt-token-here"

# Helper function to make authenticated requests
function Make-AuthenticatedRequest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Body = $null
    )
    
    $url = "$API_BASE_URL$Endpoint"
    Write-Host "[$Method] $url" -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $JWT_TOKEN"
        "Content-Type" = "application/json"
    }
    
    try {
        if ($Body) {
            $response = Invoke-WebRequest -Uri $url -Method $Method -Headers $headers -Body $Body
        } else {
            $response = Invoke-WebRequest -Uri $url -Method $Method -Headers $headers
        }
        Write-Host $response.Content -ForegroundColor Green
    } catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host $_.Exception.Response.Content -ForegroundColor Red
    }
    Write-Host ""
}

# Helper to print section headers
function Print-Header {
    param([string]$Title)
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host $Title -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host ""
}

##############################################################################
# CHAT ENDPOINTS (9 endpoints)
##############################################################################

Print-Header "CHAT ENDPOINTS"

Write-Host "1. Send Message" -ForegroundColor Green
Make-AuthenticatedRequest -Method "POST" -Endpoint "/chat/send" -Body '{
    "chatId": "chat-123",
    "message": "Hello, this is a test message"
}'

Write-Host "2. Mark Message as Read" -ForegroundColor Green
Make-AuthenticatedRequest -Method "PATCH" -Endpoint "/chat/message/msg-123/read" -Body '{}'

Write-Host "3. Mark Chat as Read" -ForegroundColor Green
Make-AuthenticatedRequest -Method "PATCH" -Endpoint "/chat/chat-123/read" -Body '{}'

Write-Host "4. Get Chat History" -ForegroundColor Green
Make-AuthenticatedRequest -Method "GET" -Endpoint "/chat/chat-123/history?limit=20&offset=0"

Write-Host "5. Get Total Unread Count" -ForegroundColor Green
Make-AuthenticatedRequest -Method "GET" -Endpoint "/chat/unread-count/total"

Write-Host "6. Get All Unread Counts" -ForegroundColor Green
Make-AuthenticatedRequest -Method "GET" -Endpoint "/chat/unread-counts"

Write-Host "7. Get Chat Unread Count" -ForegroundColor Green
Make-AuthenticatedRequest -Method "GET" -Endpoint "/chat/chat-123/unread-count"

Write-Host "8. Get Message Read Receipt" -ForegroundColor Green
Make-AuthenticatedRequest -Method "GET" -Endpoint "/chat/message/msg-123/read-receipt"

Write-Host "9. Get Chat Participants" -ForegroundColor Green
Make-AuthenticatedRequest -Method "GET" -Endpoint "/chat/chat-123/participants"

##############################################################################
# NOTIFICATION ENDPOINTS (8 endpoints)
##############################################################################

Print-Header "NOTIFICATION ENDPOINTS"

Write-Host "1. Get Notifications" -ForegroundColor Green
Make-AuthenticatedRequest -Method "GET" -Endpoint "/notifications?page=1&limit=20"

Write-Host "2. Get Unread Notifications" -ForegroundColor Green
Make-AuthenticatedRequest -Method "GET" -Endpoint "/notifications/unread?page=1&limit=20"

Write-Host "3. Get Unread Count" -ForegroundColor Green
Make-AuthenticatedRequest -Method "GET" -Endpoint "/notifications/unread-count"

Write-Host "4. Mark Notification as Read" -ForegroundColor Green
Make-AuthenticatedRequest -Method "PATCH" -Endpoint "/notifications/notif-123/read" -Body '{}'

Write-Host "5. Mark All as Read" -ForegroundColor Green
Make-AuthenticatedRequest -Method "PATCH" -Endpoint "/notifications/mark-all-read" -Body '{}'

Write-Host "6. Delete Notification" -ForegroundColor Green
Make-AuthenticatedRequest -Method "DELETE" -Endpoint "/notifications/notif-123"

Write-Host "7. Save Push Token" -ForegroundColor Green
Make-AuthenticatedRequest -Method "POST" -Endpoint "/notifications/push-token" -Body '{
    "token": "fcm-token-abc123xyz",
    "type": "FCM"
}'

Write-Host "8. Get Users with Push Tokens" -ForegroundColor Green
Make-AuthenticatedRequest -Method "GET" -Endpoint "/notifications/push-tokens/FCM"

##############################################################################
# TYPING ENDPOINTS (4 endpoints)
##############################################################################

Print-Header "TYPING ENDPOINTS"

Write-Host "1. Start Typing" -ForegroundColor Green
Make-AuthenticatedRequest -Method "POST" -Endpoint "/typing/start" -Body '{
    "chatId": "chat-123"
}'

Write-Host "2. Stop Typing" -ForegroundColor Green
Make-AuthenticatedRequest -Method "POST" -Endpoint "/typing/stop" -Body '{
    "chatId": "chat-123"
}'

Write-Host "3. Get Typing Users" -ForegroundColor Green
Make-AuthenticatedRequest -Method "GET" -Endpoint "/typing/chat-123"

Write-Host "4. Check if User Typing" -ForegroundColor Green
Make-AuthenticatedRequest -Method "GET" -Endpoint "/typing/chat-123/user-123"

##############################################################################
# ERROR SCENARIOS & VALIDATION
##############################################################################

Print-Header "ERROR SCENARIOS & VALIDATION TESTS"

Write-Host "Test 1: Missing Authentication Header" -ForegroundColor Red
try {
    Invoke-WebRequest -Uri "$API_BASE_URL/notifications" -Method "GET"
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

Write-Host "Test 2: Invalid JWT Token" -ForegroundColor Red
try {
    $headers = @{
        "Authorization" = "Bearer invalid-token"
        "Content-Type" = "application/json"
    }
    Invoke-WebRequest -Uri "$API_BASE_URL/notifications" -Method "GET" -Headers $headers
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

Write-Host "Test 3: Missing Required Field (Send Message)" -ForegroundColor Red
try {
    $headers = @{
        "Authorization" = "Bearer $JWT_TOKEN"
        "Content-Type" = "application/json"
    }
    Invoke-WebRequest -Uri "$API_BASE_URL/chat/send" -Method "POST" -Headers $headers -Body '{"chatId": "chat-123"}'
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

Write-Host "Test 4: Empty Message" -ForegroundColor Red
try {
    $headers = @{
        "Authorization" = "Bearer $JWT_TOKEN"
        "Content-Type" = "application/json"
    }
    Invoke-WebRequest -Uri "$API_BASE_URL/chat/send" -Method "POST" -Headers $headers -Body '{"chatId": "chat-123", "message": ""}'
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

##############################################################################
# SUMMARY
##############################################################################

Print-Header "TESTING SUMMARY"
Write-Host "Total Endpoints Tested: 21" -ForegroundColor Green
Write-Host "  - Chat: 9 endpoints" -ForegroundColor Green
Write-Host "  - Notifications: 8 endpoints" -ForegroundColor Green
Write-Host "  - Typing: 4 endpoints" -ForegroundColor Green
Write-Host ""
Write-Host "Error Scenarios Tested: 4" -ForegroundColor Yellow
Write-Host "  - Missing auth" -ForegroundColor Yellow
Write-Host "  - Invalid token" -ForegroundColor Yellow
Write-Host "  - Invalid data" -ForegroundColor Yellow
Write-Host ""
Write-Host "Instructions:" -ForegroundColor Blue
Write-Host "1. Set JWT_TOKEN to a valid token from your auth endpoint"
Write-Host "2. Ensure backend server is running at http://localhost:3000"
Write-Host "3. Run this script: . .\test-endpoints.ps1"
Write-Host "4. Check responses for success (status: 'success') or errors"