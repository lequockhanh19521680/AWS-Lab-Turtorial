#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WhatIfGeneratorStack } from '../lib/what-if-generator-stack';

const app = new cdk.App();

// Development Environment
new WhatIfGeneratorStack(app, 'WhatIfGenerator-Dev', {
  environment: 'development',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'What If Generator - Development Environment',
});

// Test Environment
new WhatIfGeneratorStack(app, 'WhatIfGenerator-Test', {
  environment: 'test',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'What If Generator - Test Environment',
});

// Production Environment
new WhatIfGeneratorStack(app, 'WhatIfGenerator-Prod', {
  environment: 'production',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'What If Generator - Production Environment',
});

app.synth();