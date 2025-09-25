const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');

/**
 * Gateway health check routes
 */
const createHealthRoutes = (healthCheckService) => {
  
  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Gateway health check
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Gateway is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                 version:
   *                   type: string
   *                 uptime:
   *                   type: number
   *                 overallHealth:
   *                   type: object
   */
  router.get('/', (req, res) => {
    const overallHealth = healthCheckService.getOverallHealth();
    
    res.json({
      success: true,
      message: 'API Gateway is healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      overallHealth: {
        status: overallHealth.status,
        healthyServices: overallHealth.healthyServices,
        totalServices: overallHealth.totalServices,
        healthPercentage: overallHealth.healthPercentage
      }
    });
  });

  /**
   * @swagger
   * /health/detailed:
   *   get:
   *     summary: Detailed health check including all services
   *     tags: [Health]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Detailed health information
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     gateway:
   *                       type: object
   *                     services:
   *                       type: object
   *                     metrics:
   *                       type: object
   */
  router.get('/detailed', requireAuth, (req, res) => {
    const overallHealth = healthCheckService.getOverallHealth();
    const metrics = healthCheckService.getServiceMetrics();
    
    res.json({
      success: true,
      data: {
        gateway: {
          status: 'healthy',
          version: '1.0.0',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          nodeVersion: process.version,
          memory: process.memoryUsage(),
          environment: process.env.NODE_ENV
        },
        services: overallHealth.services,
        metrics: metrics,
        overallHealth: {
          status: overallHealth.status,
          healthyServices: overallHealth.healthyServices,
          totalServices: overallHealth.totalServices,
          healthPercentage: overallHealth.healthPercentage
        }
      }
    });
  });

  /**
   * @swagger
   * /health/services:
   *   get:
   *     summary: Get status of all services
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Services status
   */
  router.get('/services', (req, res) => {
    const serviceStatus = healthCheckService.getAllServiceStatus();
    
    res.json({
      success: true,
      data: {
        services: serviceStatus,
        summary: {
          total: Object.keys(serviceStatus).length,
          healthy: healthCheckService.getHealthyServiceCount(),
          unhealthy: healthCheckService.getUnhealthyServices().length
        }
      }
    });
  });

  /**
   * @swagger
   * /health/services/{serviceName}:
   *   get:
   *     summary: Get status of a specific service
   *     tags: [Health]
   *     parameters:
   *       - in: path
   *         name: serviceName
   *         required: true
   *         schema:
   *           type: string
   *         description: Name of the service
   *     responses:
   *       200:
   *         description: Service status
   *       404:
   *         description: Service not found
   */
  router.get('/services/:serviceName', (req, res) => {
    const { serviceName } = req.params;
    const serviceStatus = healthCheckService.getServiceStatus(serviceName);
    
    if (!serviceStatus) {
      return res.status(404).json({
        success: false,
        message: `Service ${serviceName} not found`
      });
    }
    
    res.json({
      success: true,
      data: {
        service: serviceName,
        status: serviceStatus
      }
    });
  });

  /**
   * @swagger
   * /health/check:
   *   post:
   *     summary: Force health check for all services (Admin only)
   *     tags: [Admin - Health]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Health check completed
   */
  router.post('/check', requireAuth, requireAdmin, async (req, res) => {
    try {
      await healthCheckService.forceHealthCheck();
      const serviceStatus = healthCheckService.getAllServiceStatus();
      
      res.json({
        success: true,
        message: 'Health check completed',
        data: {
          services: serviceStatus,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Health check failed',
        error: error.message
      });
    }
  });

  /**
   * @swagger
   * /health/check/{serviceName}:
   *   post:
   *     summary: Force health check for a specific service (Admin only)
   *     tags: [Admin - Health]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: serviceName
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Service health check completed
   *       404:
   *         description: Service not found
   */
  router.post('/check/:serviceName', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { serviceName } = req.params;
      const result = await healthCheckService.forceHealthCheck(serviceName);
      
      res.json({
        success: true,
        message: `Health check completed for ${serviceName}`,
        data: {
          service: serviceName,
          status: result,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Health check failed',
        error: error.message
      });
    }
  });

  /**
   * @swagger
   * /health/metrics:
   *   get:
   *     summary: Get health metrics (Admin only)
   *     tags: [Admin - Health]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Health metrics
   */
  router.get('/metrics', requireAuth, requireAdmin, (req, res) => {
    const metrics = healthCheckService.getServiceMetrics();
    const overallHealth = healthCheckService.getOverallHealth();
    
    res.json({
      success: true,
      data: {
        metrics,
        overallHealth,
        gateway: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          version: process.version
        }
      }
    });
  });

  return router;
};

module.exports = createHealthRoutes;