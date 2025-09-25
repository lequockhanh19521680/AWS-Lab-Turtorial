const axios = require('axios');
const { getAllServices, getHealthCheckUrls } = require('../config/services');
const logger = require('../config/logger');

class HealthCheckService {
  constructor() {
    this.serviceStatus = {};
    this.lastChecked = {};
    this.checkInterval = parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000; // 30 seconds
    this.timeout = 5000; // 5 second timeout for health checks
    
    this.initializeServiceStatus();
    this.startHealthChecks();
  }

  initializeServiceStatus() {
    const services = getAllServices();
    
    for (const [serviceName, service] of Object.entries(services)) {
      this.serviceStatus[serviceName] = {
        status: 'unknown',
        url: service.url,
        lastChecked: null,
        responseTime: null,
        error: null
      };
    }
  }

  async checkServiceHealth(serviceName, service) {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${service.url}${service.healthPath}`, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'API-Gateway-HealthCheck/1.0'
        }
      });

      const responseTime = Date.now() - startTime;
      
      this.serviceStatus[serviceName] = {
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        url: service.url,
        lastChecked: new Date().toISOString(),
        responseTime,
        error: null
      };

      if (response.status === 200) {
        logger.debug(`Health check passed for ${serviceName}`, { 
          responseTime,
          url: service.url 
        });
      } else {
        logger.warn(`Health check failed for ${serviceName}`, {
          status: response.status,
          url: service.url
        });
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.serviceStatus[serviceName] = {
        status: 'unhealthy',
        url: service.url,
        lastChecked: new Date().toISOString(),
        responseTime,
        error: error.message
      };

      logger.error(`Health check failed for ${serviceName}`, {
        error: error.message,
        url: service.url,
        responseTime
      });
    }
  }

  async checkAllServices() {
    const services = getAllServices();
    const checkPromises = [];

    for (const [serviceName, service] of Object.entries(services)) {
      checkPromises.push(this.checkServiceHealth(serviceName, service));
    }

    await Promise.allSettled(checkPromises);
    
    logger.info('Health check completed for all services', {
      healthyServices: this.getHealthyServiceCount(),
      totalServices: Object.keys(services).length
    });
  }

  startHealthChecks() {
    // Initial health check
    setTimeout(() => {
      this.checkAllServices();
    }, 2000); // Wait 2 seconds after startup

    // Periodic health checks
    setInterval(() => {
      this.checkAllServices();
    }, this.checkInterval);

    logger.info('Health check service started', {
      interval: this.checkInterval,
      timeout: this.timeout
    });
  }

  getServiceStatus(serviceName) {
    return this.serviceStatus[serviceName] || null;
  }

  getAllServiceStatus() {
    return this.serviceStatus;
  }

  getHealthyServiceCount() {
    return Object.values(this.serviceStatus).filter(s => s.status === 'healthy').length;
  }

  getUnhealthyServices() {
    return Object.entries(this.serviceStatus)
      .filter(([_, status]) => status.status === 'unhealthy')
      .map(([name, status]) => ({ name, ...status }));
  }

  isServiceHealthy(serviceName) {
    const status = this.serviceStatus[serviceName];
    return status && status.status === 'healthy';
  }

  getOverallHealth() {
    const services = Object.values(this.serviceStatus);
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const totalCount = services.length;
    
    let overallStatus = 'healthy';
    
    if (healthyCount === 0) {
      overallStatus = 'critical';
    } else if (healthyCount < totalCount) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      healthyServices: healthyCount,
      totalServices: totalCount,
      healthPercentage: Math.round((healthyCount / totalCount) * 100),
      services: this.serviceStatus
    };
  }

  async forceHealthCheck(serviceName = null) {
    if (serviceName) {
      const services = getAllServices();
      const service = services[serviceName];
      
      if (service) {
        await this.checkServiceHealth(serviceName, service);
        return this.serviceStatus[serviceName];
      } else {
        throw new Error(`Service ${serviceName} not found`);
      }
    } else {
      await this.checkAllServices();
      return this.serviceStatus;
    }
  }

  getServiceMetrics() {
    const services = Object.entries(this.serviceStatus);
    
    return {
      totalServices: services.length,
      healthyServices: services.filter(([_, s]) => s.status === 'healthy').length,
      unhealthyServices: services.filter(([_, s]) => s.status === 'unhealthy').length,
      unknownServices: services.filter(([_, s]) => s.status === 'unknown').length,
      averageResponseTime: this.getAverageResponseTime(),
      lastFullCheckTime: Math.max(...services.map(([_, s]) => 
        s.lastChecked ? new Date(s.lastChecked).getTime() : 0
      ))
    };
  }

  getAverageResponseTime() {
    const responseTimes = Object.values(this.serviceStatus)
      .map(s => s.responseTime)
      .filter(rt => rt !== null && rt !== undefined);
    
    if (responseTimes.length === 0) return 0;
    
    return Math.round(responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length);
  }
}

module.exports = HealthCheckService;