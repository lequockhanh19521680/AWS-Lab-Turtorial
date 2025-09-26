/**
 * AWS Observability Configuration
 * Integrates CloudWatch, X-Ray, and CloudTrail for comprehensive monitoring
 */

const AWS = require('aws-sdk');
const winston = require('winston');
const CloudWatchLogs = require('winston-cloudwatch');
const AWSXRay = require('aws-xray-sdk-core');
const AWSXRayExpress = require('aws-xray-sdk-express');
const { config } = require('./env');

class ObservabilityConfig {
  constructor() {
    this.env = config.NODE_ENV;
    this.isAWS = this.env === 'test' || this.env === 'production';
    this.serviceName = config.APP_NAME;
  }

  /**
   * Configure AWS X-Ray tracing
   */
  configureXRay() {
    if (!config.XRAY_ENABLED || !this.isAWS) {
      return null;
    }

    // Configure X-Ray
    AWSXRay.setContextMissingStrategy('LOG_ERROR');
    AWSXRay.setLogger({
      error: (message, meta) => console.error(`[X-Ray] ${message}`, meta),
      warn: (message, meta) => console.warn(`[X-Ray] ${message}`, meta),
      info: (message, meta) => console.info(`[X-Ray] ${message}`, meta),
      debug: (message, meta) => console.debug(`[X-Ray] ${message}`, meta)
    });

    // Set sampling configuration
    AWSXRay.middleware.setSamplingRules({
      version: 2,
      default: {
        fixed_target: 1,
        rate: config.XRAY_SAMPLE_RATE || 0.1
      },
      rules: [
        {
          description: 'High priority endpoints',
          service_name: this.serviceName,
          http_method: '*',
          url_path: '/api/health',
          fixed_target: 10,
          rate: 1.0
        },
        {
          description: 'Error endpoints',
          service_name: this.serviceName,
          http_method: '*',
          url_path: '/api/*/error',
          fixed_target: 5,
          rate: 0.5
        }
      ]
    });

    return {
      middleware: AWSXRayExpress.openSegment(this.serviceName),
      closeMiddleware: AWSXRayExpress.closeSegment(),
      captureAWS: AWSXRay.captureAWS,
      captureHTTPsGlobal: AWSXRay.captureHTTPsGlobal,
      capturePromise: AWSXRay.capturePromise,
      captureAsyncFunc: AWSXRay.captureAsyncFunc
    };
  }

  /**
   * Configure CloudWatch Logs
   */
  configureCloudWatchLogs() {
    if (!this.isAWS || !config.CLOUDWATCH_GROUP) {
      return null;
    }

    const cloudWatchConfig = {
      logGroupName: config.CLOUDWATCH_GROUP,
      logStreamName: config.CLOUDWATCH_STREAM || `${this.serviceName}-${this.env}-${Date.now()}`,
      region: config.AWS_REGION,
      awsOptions: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
        region: config.AWS_REGION
      },
      retentionInDays: 14,
      jsonMessage: true,
      messageFormatter: ({ level, message, timestamp, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          message,
          service: this.serviceName,
          environment: this.env,
          ...meta
        });
      }
    };

    return new CloudWatchLogs(cloudWatchConfig);
  }

  /**
   * Configure Winston logger with CloudWatch integration
   */
  configureLogger() {
    const transports = [];

    // Console transport for development
    if (this.env === 'development') {
      transports.push(
        new winston.transports.Console({
          level: config.LOG_LEVEL || 'info',
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
              let msg = `${timestamp} [${level}]: ${message}`;
              if (stack) msg += `\n${stack}`;
              if (Object.keys(meta).length > 0) {
                msg += `\n${JSON.stringify(meta, null, 2)}`;
              }
              return msg;
            })
          )
        })
      );
    }

    // CloudWatch transport for AWS environments
    const cloudWatchTransport = this.configureCloudWatchLogs();
    if (cloudWatchTransport) {
      transports.push(cloudWatchTransport);
    }

    // File transport for all environments (backup)
    transports.push(
      new winston.transports.File({
        filename: `${config.LOG_DIR || './logs'}/error.log`,
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      })
    );

    transports.push(
      new winston.transports.File({
        filename: `${config.LOG_DIR || './logs'}/combined.log`,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      })
    );

    return winston.createLogger({
      level: config.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: this.serviceName,
        environment: this.env
      },
      transports,
      exitOnError: false
    });
  }

  /**
   * Configure CloudWatch Metrics
   */
  configureCloudWatchMetrics() {
    if (!this.isAWS) {
      return null;
    }

    const cloudwatch = new AWS.CloudWatch({
      region: config.AWS_REGION,
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY
    });

    return {
      putMetric: async (metricName, value, unit = 'Count', dimensions = []) => {
        const params = {
          Namespace: `${this.serviceName}/${this.env}`,
          MetricData: [
            {
              MetricName: metricName,
              Value: value,
              Unit: unit,
              Dimensions: dimensions.map(d => ({
                Name: d.name,
                Value: d.value
              })),
              Timestamp: new Date()
            }
          ]
        };

        try {
          await cloudwatch.putMetricData(params).promise();
        } catch (error) {
          console.error('Failed to send CloudWatch metric:', error);
        }
      },

      putCustomMetric: async (metricName, value, unit = 'Count', customDimensions = {}) => {
        const dimensions = [
          { name: 'Service', value: this.serviceName },
          { name: 'Environment', value: this.env },
          ...Object.entries(customDimensions).map(([key, value]) => ({
            name: key,
            value: String(value)
          }))
        ];

        return this.putMetric(metricName, value, unit, dimensions);
      }
    };
  }

  /**
   * Configure CloudTrail for API audit logging
   */
  configureCloudTrail() {
    if (!config.CLOUDTRAIL_ENABLED || !this.isAWS) {
      return null;
    }

    const cloudtrail = new AWS.CloudTrail({
      region: config.AWS_REGION,
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY
    });

    return {
      logAPIEvent: async (eventName, eventSource, requestParameters, responseElements, errorCode = null) => {
        const event = {
          EventTime: new Date(),
          EventName: eventName,
          EventSource: eventSource,
          SourceIPAddress: '127.0.0.1', // Will be replaced with actual IP
          UserAgent: 'WhatIfGenerator/1.0',
          RequestParameters: requestParameters,
          ResponseElements: responseElements,
          ErrorCode: errorCode,
          ServiceEventDetails: {
            ServiceName: this.serviceName,
            Environment: this.env
          }
        };

        try {
          // Note: CloudTrail doesn't have a direct API to log custom events
          // This would typically be done through CloudWatch Events or custom logging
          console.log('CloudTrail Event:', JSON.stringify(event, null, 2));
        } catch (error) {
          console.error('Failed to log CloudTrail event:', error);
        }
      }
    };
  }

  /**
   * Create request middleware for observability
   */
  createRequestMiddleware() {
    const logger = this.configureLogger();
    const xray = this.configureXRay();
    const metrics = this.configureCloudWatchMetrics();
    const cloudtrail = this.configureCloudTrail();

    return {
      // Request logging middleware
      requestLogger: (req, res, next) => {
        const startTime = Date.now();
        
        // Log request
        logger.info('Request received', {
          method: req.method,
          url: req.url,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          userId: req.user?.id
        });

        // Track metrics
        if (metrics) {
          metrics.putCustomMetric('API_Requests_Total', 1, 'Count', {
            Method: req.method,
            Endpoint: req.route?.path || req.path
          });
        }

        // Log CloudTrail event
        if (cloudtrail) {
          cloudtrail.logAPIEvent(
            `${req.method}_${req.route?.path || req.path}`,
            `${this.serviceName}-api`,
            {
              method: req.method,
              path: req.path,
              query: req.query,
              headers: req.headers
            },
            null,
            null
          );
        }

        // Override res.end to log response
        const originalEnd = res.end;
        res.end = function(chunk, encoding) {
          const duration = Date.now() - startTime;
          
          // Log response
          logger.info('Response sent', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: duration,
            userId: req.user?.id
          });

          // Track metrics
          if (metrics) {
            metrics.putCustomMetric('API_Response_Time', duration, 'Milliseconds', {
              Method: req.method,
              StatusCode: res.statusCode.toString(),
              Endpoint: req.route?.path || req.path
            });

            metrics.putCustomMetric('API_Response_Status', 1, 'Count', {
              Method: req.method,
              StatusCode: res.statusCode.toString(),
              Endpoint: req.route?.path || req.path
            });
          }

          originalEnd.call(this, chunk, encoding);
        };

        next();
      },

      // Error logging middleware
      errorLogger: (err, req, res, next) => {
        const duration = Date.now() - (req.startTime || Date.now());
        
        // Log error
        logger.error('Request error', {
          error: err.message,
          stack: err.stack,
          method: req.method,
          url: req.url,
          statusCode: err.status || 500,
          duration: duration,
          userId: req.user?.id
        });

        // Track error metrics
        if (metrics) {
          metrics.putCustomMetric('API_Errors_Total', 1, 'Count', {
            Method: req.method,
            StatusCode: (err.status || 500).toString(),
            Endpoint: req.route?.path || req.path,
            ErrorType: err.name || 'UnknownError'
          });
        }

        // Log CloudTrail error event
        if (cloudtrail) {
          cloudtrail.logAPIEvent(
            `${req.method}_${req.route?.path || req.path}_ERROR`,
            `${this.serviceName}-api`,
            {
              method: req.method,
              path: req.path,
              error: err.message
            },
            null,
            err.status || 500
          );
        }

        next(err);
      },

      // Health check middleware
      healthCheck: (req, res, next) => {
        if (req.path === '/health' || req.path === '/api/health') {
          const healthData = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: this.serviceName,
            environment: this.env,
            version: config.APP_VERSION,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
          };

          // Track health check metrics
          if (metrics) {
            metrics.putCustomMetric('Health_Check', 1, 'Count', {
              Status: 'healthy'
            });
          }

          return res.json(healthData);
        }
        next();
      }
    };
  }

  /**
   * Initialize all observability components
   */
  initialize() {
    const logger = this.configureLogger();
    const xray = this.configureXRay();
    const metrics = this.configureCloudWatchMetrics();
    const cloudtrail = this.configureCloudTrail();
    const middleware = this.createRequestMiddleware();

    return {
      logger,
      xray,
      metrics,
      cloudtrail,
      middleware,
      // Helper methods
      logInfo: (message, meta = {}) => logger.info(message, meta),
      logError: (message, error = null, meta = {}) => {
        if (error) {
          logger.error(message, { error: error.message, stack: error.stack, ...meta });
        } else {
          logger.error(message, meta);
        }
      },
      logWarning: (message, meta = {}) => logger.warn(message, meta),
      logDebug: (message, meta = {}) => logger.debug(message, meta),
      
      // Metric helpers
      trackMetric: (name, value, unit = 'Count', dimensions = {}) => {
        if (metrics) {
          metrics.putCustomMetric(name, value, unit, dimensions);
        }
      },
      
      // Tracing helpers
      trace: (name, fn) => {
        if (xray) {
          return xray.captureAsyncFunc(name, fn);
        }
        return fn();
      }
    };
  }
}

// Create singleton instance
const observabilityConfig = new ObservabilityConfig();

module.exports = {
  observabilityConfig,
  initializeObservability: () => observabilityConfig.initialize(),
  createObservabilityMiddleware: () => observabilityConfig.createRequestMiddleware()
};