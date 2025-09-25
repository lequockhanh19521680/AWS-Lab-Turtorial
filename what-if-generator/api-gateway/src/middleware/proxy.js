const { createProxyMiddleware } = require('http-proxy-middleware');
const { getService, findServiceByPath, findExactRoute } = require('../config/services');
const logger = require('../config/logger');

/**
 * Create proxy middleware for a specific service
 */
const createServiceProxy = (serviceName, options = {}) => {
  const service = getService(serviceName);
  
  if (!service) {
    throw new Error(`Service ${serviceName} not found`);
  }

  const proxyOptions = {
    target: service.url,
    changeOrigin: true,
    timeout: service.timeout || 30000,
    proxyTimeout: service.timeout || 30000,
    secure: false,
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
    
    // Custom path rewriting if needed
    pathRewrite: options.pathRewrite || {},
    
    // Add custom headers
    onProxyReq: (proxyReq, req, res) => {
      // Add service identification header
      proxyReq.setHeader('X-Forwarded-By', 'API-Gateway');
      proxyReq.setHeader('X-Service-Target', serviceName);
      
      // Forward user information if available
      if (req.user) {
        proxyReq.setHeader('X-User-ID', req.user.id);
        proxyReq.setHeader('X-User-Email', req.user.email);
      }
      
      // Forward request ID for tracing
      if (req.requestId) {
        proxyReq.setHeader('X-Request-ID', req.requestId);
      }

      logger.debug('Proxying request', {
        method: req.method,
        originalUrl: req.originalUrl,
        target: service.url,
        service: serviceName,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id
      });
    },
    
    // Handle proxy response
    onProxyRes: (proxyRes, req, res) => {
      // Add response headers
      proxyRes.headers['X-Proxied-By'] = 'API-Gateway';
      proxyRes.headers['X-Service-Source'] = serviceName;
      
      logger.debug('Proxy response received', {
        statusCode: proxyRes.statusCode,
        service: serviceName,
        responseTime: Date.now() - req.startTime
      });
    },
    
    // Handle errors
    onError: (err, req, res) => {
      logger.error('Proxy error', {
        error: err.message,
        service: serviceName,
        url: req.originalUrl,
        method: req.method
      });

      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message: 'Service temporarily unavailable',
          error: process.env.NODE_ENV === 'development' ? err.message : 'Internal error',
          service: serviceName,
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  return createProxyMiddleware(proxyOptions);
};

/**
 * Dynamic proxy router middleware
 */
const dynamicProxyRouter = (req, res, next) => {
  const path = req.path;
  
  // Try exact route match first
  const exactRoute = findExactRoute(path);
  if (exactRoute) {
    const service = getService(exactRoute.service);
    if (service) {
      const proxy = createServiceProxy(exactRoute.service, {
        pathRewrite: { [path]: exactRoute.target }
      });
      return proxy(req, res, next);
    }
  }
  
  // Try pattern matching
  const serviceMatch = findServiceByPath(path);
  if (serviceMatch) {
    const proxy = createServiceProxy(serviceMatch.serviceName, {
      pathRewrite: { [path]: serviceMatch.targetPath }
    });
    return proxy(req, res, next);
  }
  
  // No service found for this path
  logger.warn('No service found for path', { path, method: req.method });
  
  return res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};

/**
 * Request timing middleware
 */
const requestTiming = (req, res, next) => {
  req.startTime = Date.now();
  
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - req.startTime;
    res.set('X-Response-Time', `${duration}ms`);
    
    logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    });
    
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Request ID middleware
 */
const requestId = (req, res, next) => {
  req.requestId = require('crypto').randomUUID();
  res.set('X-Request-ID', req.requestId);
  next();
};

/**
 * Service health check middleware
 */
const serviceHealthCheck = (healthCheckService) => {
  return (req, res, next) => {
    // Skip health check for gateway health endpoint
    if (req.path === '/health' || req.path === '/api/health') {
      return next();
    }

    const path = req.path;
    const exactRoute = findExactRoute(path);
    let serviceName = null;

    if (exactRoute) {
      serviceName = exactRoute.service;
    } else {
      const serviceMatch = findServiceByPath(path);
      if (serviceMatch) {
        serviceName = serviceMatch.serviceName;
      }
    }

    if (serviceName && !healthCheckService.isServiceHealthy(serviceName)) {
      logger.warn('Request to unhealthy service', {
        service: serviceName,
        path,
        method: req.method
      });

      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable',
        service: serviceName,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

module.exports = {
  createServiceProxy,
  dynamicProxyRouter,
  requestTiming,
  requestId,
  serviceHealthCheck
};