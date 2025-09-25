import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as docdb from 'aws-cdk-lib/aws-docdb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';

export interface WhatIfGeneratorStackProps extends cdk.StackProps {
  environment: string;
}

export class WhatIfGeneratorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WhatIfGeneratorStackProps) {
    super(scope, id, props);

    // VPC with 3 tiers (Public, Private, Database)
    const vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: 2,
      natGateways: 2,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // Security Groups
    const webSecurityGroup = new ec2.SecurityGroup(this, 'WebSecurityGroup', {
      vpc,
      description: 'Security group for web servers',
      allowAllOutbound: true,
    });

    webSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'HTTP traffic'
    );
    webSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'HTTPS traffic'
    );
    webSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcpRange(3000, 3005),
      'Application ports'
    );

    const databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for databases',
    });

    databaseSecurityGroup.addIngressRule(
      webSecurityGroup,
      ec2.Port.tcp(5432),
      'PostgreSQL access'
    );
    databaseSecurityGroup.addIngressRule(
      webSecurityGroup,
      ec2.Port.tcp(27017),
      'MongoDB access'
    );
    databaseSecurityGroup.addIngressRule(
      webSecurityGroup,
      ec2.Port.tcp(6379),
      'Redis access'
    );

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'ECSCluster', {
      vpc,
      clusterName: `${props.environment}-what-if-generator`,
      containerInsights: true,
    });

    // CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/ecs/${props.environment}-what-if-generator`,
      retention: logs.RetentionDays.ONE_MONTH,
    });

    // IAM Roles
    const taskExecutionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    taskRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: ['*'],
    }));

    // Secrets Manager
    const databaseSecret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      description: 'Database credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
      },
    });

    const redisSecret = new secretsmanager.Secret(this, 'RedisSecret', {
      description: 'Redis credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'redis' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
      },
    });

    // RDS PostgreSQL Database
    const database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [databaseSecurityGroup],
      credentials: rds.Credentials.fromSecret(databaseSecret),
      databaseName: 'what_if_users',
      allocatedStorage: 20,
      storageType: rds.StorageType.GP2,
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: false,
      deletionProtection: props.environment === 'production',
      multiAz: props.environment === 'production',
      storageEncrypted: true,
    });

    // ElastiCache Redis
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for Redis',
      subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
    });

    const redisCluster = new elasticache.CfnReplicationGroup(this, 'RedisCluster', {
      replicationGroupId: `${props.environment}-what-if-generator-redis`,
      description: 'Redis cluster for caching',
      nodeType: 'cache.t3.micro',
      port: 6379,
      numCacheClusters: 2,
      engine: 'redis',
      engineVersion: '7.0',
      cacheSubnetGroupName: redisSubnetGroup.ref,
      securityGroupIds: [databaseSecurityGroup.securityGroupId],
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
      multiAzEnabled: props.environment === 'production',
    });

    // DocumentDB (MongoDB alternative)
    const documentDBSubnetGroup = new docdb.CfnDBSubnetGroup(this, 'DocumentDBSubnetGroup', {
      dbSubnetGroupDescription: 'Subnet group for DocumentDB',
      subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
    });

    const documentDBSecret = new secretsmanager.Secret(this, 'DocumentDBSecret', {
      description: 'DocumentDB credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
      },
    });

    const documentDBCluster = new docdb.CfnDBCluster(this, 'DocumentDBCluster', {
      dbClusterIdentifier: `${props.environment}-what-if-generator-documentdb`,
      engine: 'docdb',
      masterUsername: 'admin',
      masterUserPassword: documentDBSecret.secretValueFromJson('password').unsafeUnwrap(),
      dbSubnetGroupName: documentDBSubnetGroup.ref,
      vpcSecurityGroupIds: [databaseSecurityGroup.securityGroupId],
      backupRetentionPeriod: 7,
      preferredBackupWindow: '03:00-04:00',
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      storageEncrypted: true,
      deletionProtection: props.environment === 'production',
    });

    // DocumentDB Instances
    new docdb.CfnDBInstance(this, 'DocumentDBInstance1', {
      dbInstanceIdentifier: `${props.environment}-what-if-generator-documentdb-1`,
      dbClusterIdentifier: documentDBCluster.ref,
      dbInstanceClass: 'db.t3.medium',
      engine: 'docdb',
    });

    new docdb.CfnDBInstance(this, 'DocumentDBInstance2', {
      dbInstanceIdentifier: `${props.environment}-what-if-generator-documentdb-2`,
      dbClusterIdentifier: documentDBCluster.ref,
      dbInstanceClass: 'db.t3.medium',
      engine: 'docdb',
    });

    // Service Discovery
    const namespace = new servicediscovery.PrivateDnsNamespace(this, 'ServiceDiscoveryNamespace', {
      name: 'whatifgenerator.local',
      vpc,
    });

    // ECS Task Definitions
    const apiTaskDefinition = new ecs.FargateTaskDefinition(this, 'APITaskDefinition', {
      family: `${props.environment}-what-if-generator-api`,
      cpu: 512,
      memoryLimitMiB: 1024,
      executionRole: taskExecutionRole,
      taskRole: taskRole,
    });

    apiTaskDefinition.addContainer('api-gateway', {
      image: ecs.ContainerImage.fromRegistry('nginx:latest'), // Placeholder
      portMappings: [{ containerPort: 3000 }],
      environment: {
        NODE_ENV: props.environment,
        PORT: '3000',
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'api-gateway',
        logGroup,
      }),
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    const frontendTaskDefinition = new ecs.FargateTaskDefinition(this, 'FrontendTaskDefinition', {
      family: `${props.environment}-what-if-generator-frontend`,
      cpu: 256,
      memoryLimitMiB: 512,
      executionRole: taskExecutionRole,
      taskRole: taskRole,
    });

    frontendTaskDefinition.addContainer('frontend', {
      image: ecs.ContainerImage.fromRegistry('nginx:latest'), // Placeholder
      portMappings: [{ containerPort: 3005 }],
      environment: {
        NODE_ENV: props.environment,
        PORT: '3005',
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'frontend',
        logGroup,
      }),
    });

    // ECS Services
    const apiService = new ecs.FargateService(this, 'APIService', {
      cluster,
      taskDefinition: apiTaskDefinition,
      desiredCount: props.environment === 'production' ? 3 : 1,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [webSecurityGroup],
      serviceName: `${props.environment}-what-if-generator-api`,
    });

    const frontendService = new ecs.FargateService(this, 'FrontendService', {
      cluster,
      taskDefinition: frontendTaskDefinition,
      desiredCount: props.environment === 'production' ? 2 : 1,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [webSecurityGroup],
      serviceName: `${props.environment}-what-if-generator-frontend`,
    });

    // Application Load Balancer
    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc,
      internetFacing: true,
      securityGroup: webSecurityGroup,
    });

    // Target Groups
    const apiTargetGroup = new elbv2.ApplicationTargetGroup(this, 'APITargetGroup', {
      vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/health',
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    const frontendTargetGroup = new elbv2.ApplicationTargetGroup(this, 'FrontendTargetGroup', {
      vpc,
      port: 3005,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/',
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    // Load Balancer Listeners
    const listener = loadBalancer.addListener('Listener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [frontendTargetGroup],
    });

    listener.addTargetGroups('APITargetGroup', {
      targetGroups: [apiTargetGroup],
      conditions: [elbv2.ListenerCondition.pathPatterns(['/api/*'])],
      priority: 1,
    });

    // Attach services to target groups
    apiService.attachToApplicationTargetGroup(apiTargetGroup);
    frontendService.attachToApplicationTargetGroup(frontendTargetGroup);

    // Auto Scaling
    const apiScaling = apiService.autoScaleTaskCount({
      minCapacity: props.environment === 'production' ? 2 : 1,
      maxCapacity: props.environment === 'production' ? 10 : 3,
    });

    apiScaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(300),
      scaleOutCooldown: cdk.Duration.seconds(300),
    });

    // S3 Bucket for static assets
    const staticAssetsBucket = new s3.Bucket(this, 'StaticAssetsBucket', {
      bucketName: `${props.environment}-what-if-generator-static-assets-${this.account}`,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          maxAge: 3600,
        },
      ],
    });

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'CloudFrontDistribution', {
      defaultBehavior: {
        origin: new origins.LoadBalancerV2Origin(loadBalancer),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        forwardedValues: {
          queryString: true,
          cookies: {
            forward: cloudfront.CookieForwarding.ALL,
          },
        },
      },
      additionalBehaviors: {
        '/static/*': {
          origin: new origins.S3Origin(staticAssetsBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
          compress: true,
        },
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: loadBalancer.loadBalancerDnsName,
      description: 'Application Load Balancer DNS name',
    });

    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution URL',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
      description: 'RDS database endpoint',
    });

    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: redisCluster.attrRedisEndpointAddress,
      description: 'Redis cluster endpoint',
    });

    new cdk.CfnOutput(this, 'DocumentDBEndpoint', {
      value: documentDBCluster.attrEndpoint,
      description: 'DocumentDB cluster endpoint',
    });
  }
}