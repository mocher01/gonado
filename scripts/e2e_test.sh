#!/bin/bash
# Gonado E2E Test Script
# Tests the complete user flow through the API

set -e

API_URL="http://localhost:7901"
TIMESTAMP=$(date +%s)
TEST_EMAIL="e2e_test_${TIMESTAMP}@test.com"
TEST_PASSWORD="TestPass123!"
TEST_USERNAME="e2euser${TIMESTAMP}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

log_test() {
    echo -e "\n${YELLOW}TEST: $1${NC}"
}

log_pass() {
    echo -e "${GREEN}✓ PASSED: $1${NC}"
    PASSED=$((PASSED + 1))
}

log_fail() {
    echo -e "${RED}✗ FAILED: $1${NC}"
    echo -e "${RED}  Response: $2${NC}"
    FAILED=$((FAILED + 1))
}

# Test 1: Health Check
log_test "Health Check (via proxy)"
RESPONSE=$(curl -s -w "\n%{http_code}" "${API_URL}/api/auth/login" -X OPTIONS 2>/dev/null || echo "000")
# Just check if the server responds
RESPONSE=$(curl -s "${API_URL}/health" 2>/dev/null || echo "{}")
if echo "$RESPONSE" | grep -q "healthy"; then
    log_pass "Health endpoint returns healthy"
else
    # Try direct backend health
    RESPONSE=$(curl -s "http://localhost:7902/health" 2>/dev/null || echo "{}")
    if echo "$RESPONSE" | grep -q "healthy"; then
        log_pass "Backend health endpoint returns healthy"
    else
        log_fail "Health check" "$RESPONSE"
    fi
fi

# Test 2: Register new user
log_test "User Registration"
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\",\"username\":\"${TEST_USERNAME}\"}" 2>/dev/null)

if echo "$REGISTER_RESPONSE" | grep -q "id"; then
    log_pass "User registration successful"
    USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "  User ID: $USER_ID"
else
    log_fail "User registration" "$REGISTER_RESPONSE"
fi

# Test 3: Login
log_test "User Login"
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}" 2>/dev/null)

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    log_pass "User login successful"
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    echo "  Token: ${ACCESS_TOKEN:0:50}..."
else
    log_fail "User login" "$LOGIN_RESPONSE"
    echo -e "${RED}Cannot continue without authentication${NC}"
    exit 1
fi

# Test 4: Get current user
log_test "Get Current User"
USER_RESPONSE=$(curl -s "${API_URL}/api/users/me" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" 2>/dev/null)

if echo "$USER_RESPONSE" | grep -q "${TEST_EMAIL}"; then
    log_pass "Get current user successful"
else
    log_fail "Get current user" "$USER_RESPONSE"
fi

# Test 5: Create a goal
log_test "Create Goal"
GOAL_RESPONSE=$(curl -s -X POST "${API_URL}/api/goals" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -d '{"title":"E2E Test Goal - Learn Python","description":"Master Python programming in 3 months","category":"education","visibility":"private"}' 2>/dev/null)

if echo "$GOAL_RESPONSE" | grep -q "id"; then
    log_pass "Goal creation successful"
    GOAL_ID=$(echo "$GOAL_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "  Goal ID: $GOAL_ID"
else
    log_fail "Goal creation" "$GOAL_RESPONSE"
    GOAL_ID=""
fi

# Test 5b: Create goal with target date
log_test "Create Goal with Target Date"
GOAL_DATE_RESPONSE=$(curl -s -X POST "${API_URL}/api/goals" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -d '{"title":"E2E Goal with Date","visibility":"private","target_date":"2025-12-31T23:59:59.000Z"}' 2>/dev/null)

if echo "$GOAL_DATE_RESPONSE" | grep -q "id"; then
    log_pass "Goal with date creation successful"
else
    log_fail "Goal with date creation" "$GOAL_DATE_RESPONSE"
fi

# Test 6: Get goals list
log_test "Get Goals List"
GOALS_LIST=$(curl -s "${API_URL}/api/goals" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" 2>/dev/null)

if echo "$GOALS_LIST" | grep -q "goals"; then
    log_pass "Get goals list successful"
    GOAL_COUNT=$(echo "$GOALS_LIST" | grep -o '"id"' | wc -l)
    echo "  Total goals: $GOAL_COUNT"
else
    log_fail "Get goals list" "$GOALS_LIST"
fi

# Test 7: Get single goal
if [ -n "$GOAL_ID" ]; then
    log_test "Get Single Goal"
    SINGLE_GOAL=$(curl -s "${API_URL}/api/goals/${GOAL_ID}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" 2>/dev/null)

    if echo "$SINGLE_GOAL" | grep -q "E2E Test Goal"; then
        log_pass "Get single goal successful"
    else
        log_fail "Get single goal" "$SINGLE_GOAL"
    fi
fi

# Test 8: Update goal
if [ -n "$GOAL_ID" ]; then
    log_test "Update Goal"
    UPDATE_RESPONSE=$(curl -s -X PUT "${API_URL}/api/goals/${GOAL_ID}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -d '{"description":"Updated: Master Python programming with focus on web development"}' 2>/dev/null)

    if echo "$UPDATE_RESPONSE" | grep -q "Updated"; then
        log_pass "Goal update successful"
    else
        log_fail "Goal update" "$UPDATE_RESPONSE"
    fi
fi

# Test 9: Get goal nodes (should be empty initially)
if [ -n "$GOAL_ID" ]; then
    log_test "Get Goal Nodes"
    NODES_RESPONSE=$(curl -s "${API_URL}/api/goals/${GOAL_ID}/nodes" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" 2>/dev/null)

    if [ "$NODES_RESPONSE" = "[]" ] || echo "$NODES_RESPONSE" | grep -q "\["; then
        log_pass "Get goal nodes successful (empty or has nodes)"
    else
        log_fail "Get goal nodes" "$NODES_RESPONSE"
    fi
fi

# Test 9b: Generate AI plan for goal
if [ -n "$GOAL_ID" ]; then
    log_test "Generate AI Plan"
    PLAN_RESPONSE=$(curl -s -X POST "${API_URL}/api/goals/${GOAL_ID}/generate-plan" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" 2>/dev/null)

    if echo "$PLAN_RESPONSE" | grep -q "nodes"; then
        log_pass "AI plan generation successful"
        # Verify nodes were created
        NODES_AFTER=$(curl -s "${API_URL}/api/goals/${GOAL_ID}/nodes" \
            -H "Authorization: Bearer ${ACCESS_TOKEN}" 2>/dev/null)
        NODE_COUNT=$(echo "$NODES_AFTER" | grep -o '"id"' | wc -l)
        echo "  Created $NODE_COUNT nodes"
    else
        log_fail "AI plan generation" "$PLAN_RESPONSE"
    fi
fi

# Test 10: Get notifications
log_test "Get Notifications"
NOTIF_RESPONSE=$(curl -s "${API_URL}/api/notifications" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" 2>/dev/null)

if [ "$NOTIF_RESPONSE" = "[]" ] || echo "$NOTIF_RESPONSE" | grep -q "\["; then
    log_pass "Get notifications successful"
else
    log_fail "Get notifications" "$NOTIF_RESPONSE"
fi

# Test 11: Get leaderboard
log_test "Get Leaderboard"
LEADERBOARD=$(curl -s "${API_URL}/api/gamification/leaderboard" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" 2>/dev/null)

if echo "$LEADERBOARD" | grep -q "\["; then
    log_pass "Get leaderboard successful"
else
    log_fail "Get leaderboard" "$LEADERBOARD"
fi

# Test 12: Get user stats
log_test "Get User Stats"
STATS_RESPONSE=$(curl -s "${API_URL}/api/gamification/stats" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" 2>/dev/null)

if echo "$STATS_RESPONSE" | grep -q "xp"; then
    log_pass "Get user stats successful"
else
    log_fail "Get user stats" "$STATS_RESPONSE"
fi

# Test 13: Frontend pages accessibility
log_test "Frontend Login Page"
LOGIN_PAGE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/login" 2>/dev/null)
if [ "$LOGIN_PAGE" = "200" ]; then
    log_pass "Login page accessible (HTTP 200)"
else
    log_fail "Login page" "HTTP $LOGIN_PAGE"
fi

log_test "Frontend Dashboard Page"
DASHBOARD_PAGE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/dashboard" 2>/dev/null)
if [ "$DASHBOARD_PAGE" = "200" ]; then
    log_pass "Dashboard page accessible (HTTP 200)"
else
    log_fail "Dashboard page" "HTTP $DASHBOARD_PAGE"
fi

log_test "Frontend Goals/New Page"
GOALS_NEW_PAGE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/goals/new" 2>/dev/null)
if [ "$GOALS_NEW_PAGE" = "200" ]; then
    log_pass "Goals/new page accessible (HTTP 200)"
else
    log_fail "Goals/new page" "HTTP $GOALS_NEW_PAGE"
fi

# Test 14: Login with admin account
log_test "Admin Login"
ADMIN_LOGIN=$(curl -s -X POST "${API_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@gonado.app","password":"admin123"}' 2>/dev/null)

if echo "$ADMIN_LOGIN" | grep -q "access_token"; then
    log_pass "Admin login successful"
else
    log_fail "Admin login" "$ADMIN_LOGIN"
fi

# Summary
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}E2E TEST SUMMARY${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}========================================${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed. Please review the output above.${NC}"
    exit 1
fi
