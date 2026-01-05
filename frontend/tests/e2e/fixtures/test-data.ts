/**
 * Test Data and Fixtures for Gonado E2E Tests
 */

// Known test goal with data
export const TEST_GOALS = {
  franceTripGoal: {
    id: 'e3dc9226-15d7-4421-903a-a4ece38dd586',
    title: 'Epic Solo Road Trip Through France',
    url: '/goals/e3dc9226-15d7-4421-903a-a4ece38dd586',
  },
  salsaGoal: {
    id: '6fba8b84-2e3c-4723-b975-060c7894234b',
    title: 'Salsa Dance Floor Confidence',
    url: '/goals/6fba8b84-2e3c-4723-b975-060c7894234b',
  },
};

// Known test nodes
export const TEST_NODES = {
  preTripPlanning: {
    id: '4a87bd3b-05a7-47a3-8dd7-96c8386e9482',
    title: 'Pre-Trip Planning & Preparation',
    hasComments: true,
  },
  parisExploration: {
    id: '7561ab7d-cb99-4fbf-9bd7-138587a93543',
    title: 'Paris Exploration',
    hasComments: true,
  },
};

// Test user credentials (for authenticated tests)
export const TEST_USERS = {
  testUser: {
    email: 'testuser@example.com',
    password: 'test123456',
  },
};

// Viewport sizes for testing
export const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  laptop: { width: 1024, height: 768 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
  smallMobile: { width: 320, height: 568 },
};

// Expected UI elements
export const UI_ELEMENTS = {
  popup: {
    maxHeightPercent: 85, // 85vh
    maxWidth: 340, // px
    minWidth: 300, // px
  },
  commentsPanel: {
    maxWidth: 400, // px (max-w-md)
  },
  reactions: ['fire', 'water', 'nature', 'lightning', 'magic'],
};
