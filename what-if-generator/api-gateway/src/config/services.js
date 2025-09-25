require('dotenv').config();

/**
 * Service configuration and endpoints
 */
const services = {
  user: {
    name: 'User Service',
    url: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    healthPath: '/health',
    timeout: 10000,
    retries: 3,
    routes: [
      { path: '/auth', target: '/auth' },
      { path: '/users', target: '/users' }
    ]
  },
  
  generation: {
    name: 'Generation Service',
    url: process.env.GENERATION_SERVICE_URL || 'http://localhost:3002',
    healthPath: '/health',
    timeout: 30000, // Longer timeout for AI generation
    retries: 2,
    routes: [
      { path: '/generate', target: '/generate' },
      { path: '/random', target: '/random' },
      { path: '/regenerate', target: '/regenerate' },
      { path: '/batch', target: '/batch' },
      { path: '/generation', target: '/' }
    ]
  },
  
  history: {
    name: 'History Service',
    url: process.env.HISTORY_SERVICE_URL || 'http://localhost:3003',
    healthPath: '/health',
    timeout: 15000,
    retries: 3,
    routes: [
      { path: '/scenarios', target: '/scenarios' },
      { path: '/history', target: '/scenarios' }
    ]
  },
  
  sharing: {
    name: 'Sharing Service',
    url: process.env.SHARING_SERVICE_URL || 'http://localhost:3004',
    healthPath: '/health',
    timeout: 15000,
    retries: 3,
    routes: [
      { path: '/sharing', target: '/sharing' },
      { path: '/reporting', target: '/reporting' },
      { path: '/shared', target: '/sharing/shared' }
    ]
  }
};

/**
 * Get service configuration by name
 */
const getService = (serviceName) => {
  return services[serviceName];
};

/**
 * Get all services
 */
const getAllServices = () => {
  return services;
};

/**
 * Find service by route path
 */
const findServiceByPath = (path) => {
  for (const [serviceName, service] of Object.entries(services)) {
    for (const route of service.routes) {
      if (path.startsWith(route.path)) {
        return {
          serviceName,
          service,
          route,
          targetPath: path.replace(route.path, route.target)
        };
      }
    }
  }
  return null;
};

/**
 * Get service health check URLs
 */
const getHealthCheckUrls = () => {
  const healthChecks = {};
  
  for (const [serviceName, service] of Object.entries(services)) {
    healthChecks[serviceName] = `${service.url}${service.healthPath}`;
  }
  
  return healthChecks;
};

/**
 * Route mapping for easier maintenance
 */
const routeMap = {
  // Authentication routes
  '/api/auth/register': { service: 'user', target: '/auth/register' },
  '/api/auth/login': { service: 'user', target: '/auth/login' },
  '/api/auth/logout': { service: 'user', target: '/auth/logout' },
  '/api/auth/refresh': { service: 'user', target: '/auth/refresh' },
  '/api/auth/forgot-password': { service: 'user', target: '/auth/forgot-password' },
  '/api/auth/reset-password': { service: 'user', target: '/auth/reset-password' },
  '/api/auth/verify-email': { service: 'user', target: '/auth/verify-email' },
  
  // User management routes
  '/api/users/profile': { service: 'user', target: '/users/profile' },
  '/api/users/change-password': { service: 'user', target: '/users/change-password' },
  '/api/users/change-email': { service: 'user', target: '/users/change-email' },
  '/api/users/delete-account': { service: 'user', target: '/users/delete-account' },
  
  // Generation routes
  '/api/generate': { service: 'generation', target: '/generate' },
  '/api/random': { service: 'generation', target: '/random' },
  '/api/regenerate': { service: 'generation', target: '/regenerate' },
  '/api/batch-generate': { service: 'generation', target: '/batch' },
  
  // History routes
  '/api/scenarios/my': { service: 'history', target: '/scenarios/my' },
  '/api/scenarios/search': { service: 'history', target: '/scenarios/search' },
  '/api/scenarios/stats': { service: 'history', target: '/scenarios/stats' },
  '/api/scenarios/bulk': { service: 'history', target: '/scenarios/bulk' },
  
  // Sharing routes
  '/api/share': { service: 'sharing', target: '/sharing' },
  '/api/sharing/my': { service: 'sharing', target: '/sharing/my' },
  '/api/sharing/analytics': { service: 'sharing', target: '/sharing/analytics' },
  
  // Public sharing routes (no /api prefix for clean URLs)
  '/shared': { service: 'sharing', target: '/sharing/shared' },
  '/qr': { service: 'sharing', target: '/sharing/qr' },
  
  // Reporting routes
  '/api/report': { service: 'sharing', target: '/reporting/report' },
  '/api/reporting/options': { service: 'sharing', target: '/reporting/options' },
  
  // Admin routes
  '/api/admin/users': { service: 'user', target: '/users' },
  '/api/admin/reports': { service: 'sharing', target: '/reporting/pending' },
  '/api/admin/stats': { service: 'sharing', target: '/reporting/stats' }
};

/**
 * Get route mapping
 */
const getRouteMap = () => {
  return routeMap;
};

/**
 * Find exact route match
 */
const findExactRoute = (path) => {
  return routeMap[path] || null;
};

module.exports = {
  services,
  getService,
  getAllServices,
  findServiceByPath,
  getHealthCheckUrls,
  getRouteMap,
  findExactRoute
};