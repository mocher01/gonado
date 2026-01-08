#!/bin/bash
# Manual test script for goals list and discovery API enhancements
# Run this after starting the backend: docker compose up -d backend

BASE_URL="http://localhost:7902/api/goals"
PASS=0
FAIL=0

echo "========================================="
echo "Testing Goals List and Discovery API"
echo "========================================="
echo ""

# Test 1: Search parameter
echo "Test 1: Search by title (search=france)"
response=$(curl -s "$BASE_URL?search=france")
if echo "$response" | grep -q "France"; then
    echo "✓ PASS: Search parameter works"
    ((PASS++))
else
    echo "✗ FAIL: Search parameter not working"
    ((FAIL++))
fi
echo ""

# Test 2: Search case-insensitive
echo "Test 2: Search case-insensitive (search=FRANCE)"
response=$(curl -s "$BASE_URL?search=FRANCE")
if echo "$response" | grep -q "France"; then
    echo "✓ PASS: Search is case-insensitive"
    ((PASS++))
else
    echo "✗ FAIL: Search not case-insensitive"
    ((FAIL++))
fi
echo ""

# Test 3: Sort by newest (default)
echo "Test 3: Sort by newest (sort=newest)"
response=$(curl -s "$BASE_URL?sort=newest")
if echo "$response" | grep -q '"goals":\['; then
    echo "✓ PASS: Sort newest parameter accepted"
    ((PASS++))
else
    echo "✗ FAIL: Sort newest not working"
    ((FAIL++))
fi
echo ""

# Test 4: Sort by trending
echo "Test 4: Sort by trending (sort=trending)"
response=$(curl -s "$BASE_URL?sort=trending")
if echo "$response" | grep -q '"goals":\['; then
    echo "✓ PASS: Sort trending parameter accepted"
    ((PASS++))
else
    echo "✗ FAIL: Sort trending not working"
    ((FAIL++))
fi
echo ""

# Test 5: Sort by almost_done
echo "Test 5: Sort by almost_done (sort=almost_done)"
response=$(curl -s "$BASE_URL?sort=almost_done")
if echo "$response" | grep -q '"goals":\['; then
    echo "✓ PASS: Sort almost_done parameter accepted"
    ((PASS++))
else
    echo "✗ FAIL: Sort almost_done not working"
    ((FAIL++))
fi
echo ""

# Test 6: Invalid sort parameter
echo "Test 6: Invalid sort parameter (sort=invalid)"
response=$(curl -s "$BASE_URL?sort=invalid")
if echo "$response" | grep -q "pattern"; then
    echo "✓ PASS: Invalid sort parameter rejected with validation error"
    ((PASS++))
else
    echo "✗ FAIL: Invalid sort parameter not validated"
    ((FAIL++))
fi
echo ""

# Test 7: Needs help filter
echo "Test 7: Needs help filter (needs_help=true)"
response=$(curl -s "$BASE_URL?needs_help=true")
if echo "$response" | grep -q '"total"'; then
    echo "✓ PASS: Needs help filter parameter accepted"
    ((PASS++))
else
    echo "✗ FAIL: Needs help filter not working"
    ((FAIL++))
fi
echo ""

# Test 8: Combined filters (search + category)
echo "Test 8: Combined filters (search=salsa&category=personal)"
response=$(curl -s "$BASE_URL?search=salsa&category=personal")
if echo "$response" | grep -q '"total"'; then
    echo "✓ PASS: Combined filters work"
    ((PASS++))
else
    echo "✗ FAIL: Combined filters not working"
    ((FAIL++))
fi
echo ""

# Test 9: Discover endpoint
echo "Test 9: Discover endpoint (GET /api/goals/discover)"
response=$(curl -s "$BASE_URL/discover?limit=2")
if echo "$response" | grep -q '"owner"'; then
    echo "✓ PASS: Discover endpoint returns owner info"
    ((PASS++))
else
    echo "✗ FAIL: Discover endpoint not returning owner info"
    ((FAIL++))
fi
echo ""

# Test 10: Discover with search
echo "Test 10: Discover with search (GET /api/goals/discover?search=france)"
response=$(curl -s "$BASE_URL/discover?search=france")
if echo "$response" | grep -q "France"; then
    echo "✓ PASS: Discover endpoint search works"
    ((PASS++))
else
    echo "✗ FAIL: Discover endpoint search not working"
    ((FAIL++))
fi
echo ""

# Test 11: Discover with trending sort
echo "Test 11: Discover with trending sort (GET /api/goals/discover?sort=trending)"
response=$(curl -s "$BASE_URL/discover?sort=trending")
if echo "$response" | grep -q '"owner"'; then
    echo "✓ PASS: Discover endpoint trending sort works"
    ((PASS++))
else
    echo "✗ FAIL: Discover endpoint trending sort not working"
    ((FAIL++))
fi
echo ""

# Test 12: Discover only returns public goals
echo "Test 12: Discover only returns public goals"
response=$(curl -s "$BASE_URL/discover")
if echo "$response" | grep -q '"visibility":"public"' && ! echo "$response" | grep -q '"visibility":"private"'; then
    echo "✓ PASS: Discover only returns public goals"
    ((PASS++))
else
    echo "✗ FAIL: Discover may be returning private goals"
    ((FAIL++))
fi
echo ""

echo "========================================="
echo "Test Results: $PASS passed, $FAIL failed"
echo "========================================="

if [ $FAIL -eq 0 ]; then
    exit 0
else
    exit 1
fi
