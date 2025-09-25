#!/usr/bin/env node

/**
 * Test script for Story Hub MVP complete user flow
 * This script tests the entire flow from prompt to premium conversion
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3005';

// Test data
const testPrompt = "Nếu như loài chó có khả năng nói tiếng người, chuyện gì sẽ xảy ra?";
const testUser = {
  email: 'test@storyhub.com',
  password: 'testpassword123'
};

class StoryHubTester {
  constructor() {
    this.authToken = null;
    this.testResults = [];
  }

  async logTest(testName, success, message, data = null) {
    const result = {
      test: testName,
      success,
      message,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}: ${message}`);
    
    if (data) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${API_BASE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (data) {
        config.data = data;
      }

      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      throw new Error(`Request failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async testHealthChecks() {
    console.log('\n🏥 Testing Health Checks...');
    
    try {
      // Test API Gateway health
      const gatewayHealth = await this.makeRequest('GET', '/health');
      await this.logTest(
        'API Gateway Health',
        gatewayHealth.success,
        'API Gateway is healthy',
        gatewayHealth
      );

      // Test Generation Service health
      const generationHealth = await this.makeRequest('GET', '/api/story-hub/health');
      await this.logTest(
        'Story Hub Health',
        generationHealth.success,
        'Story Hub service is healthy',
        generationHealth
      );

    } catch (error) {
      await this.logTest('Health Checks', false, error.message);
    }
  }

  async testUserRegistration() {
    console.log('\n👤 Testing User Registration...');
    
    try {
      // Register test user
      const registerData = {
        email: testUser.email,
        password: testUser.password,
        name: 'Test User'
      };

      const registerResult = await this.makeRequest('POST', '/api/auth/register', registerData);
      await this.logTest(
        'User Registration',
        registerResult.success,
        'User registered successfully',
        { userId: registerResult.data?.user?.id }
      );

      // Login to get auth token
      const loginData = {
        email: testUser.email,
        password: testUser.password
      };

      const loginResult = await this.makeRequest('POST', '/api/auth/login', loginData);
      this.authToken = loginResult.data?.token;
      
      await this.logTest(
        'User Login',
        loginResult.success && !!this.authToken,
        'User logged in successfully',
        { hasToken: !!this.authToken }
      );

    } catch (error) {
      await this.logTest('User Registration', false, error.message);
    }
  }

  async testScriptGeneration() {
    console.log('\n📝 Testing Script Generation...');
    
    try {
      const scriptData = {
        prompt: testPrompt,
        options: {
          includeActs: true,
          includeDialogue: true,
          maxTokens: 1500
        }
      };

      const scriptResult = await this.makeRequest('POST', '/api/story-hub/generate-script', scriptData);
      
      await this.logTest(
        'Script Generation',
        scriptResult.success && scriptResult.data?.script,
        'Script generated successfully',
        {
          scriptId: scriptResult.data?.id,
          wordCount: scriptResult.data?.script?.split(' ').length,
          creditsRemaining: scriptResult.data?.creditsRemaining
        }
      );

      return scriptResult.data;

    } catch (error) {
      await this.logTest('Script Generation', false, error.message);
      return null;
    }
  }

  async testAudioGeneration(script) {
    console.log('\n🎵 Testing Audio Generation...');
    
    try {
      const audioData = {
        script: script,
        options: {
          voice: 'professional',
          speed: 1.0,
          format: 'mp3'
        }
      };

      const audioResult = await this.makeRequest('POST', '/api/story-hub/generate-audio', audioData);
      
      await this.logTest(
        'Audio Generation',
        audioResult.success && audioResult.data?.audioUrl,
        'Audio generated successfully',
        {
          audioUrl: audioResult.data?.audioUrl,
          duration: audioResult.data?.duration,
          fileSize: audioResult.data?.fileSize
        }
      );

      return audioResult.data;

    } catch (error) {
      await this.logTest('Audio Generation', false, error.message);
      return null;
    }
  }

  async testPremiumUpgrade() {
    console.log('\n💎 Testing Premium Upgrade...');
    
    try {
      // Get pricing plans
      const pricingResult = await this.makeRequest('GET', '/api/story-hub/pricing');
      
      await this.logTest(
        'Get Pricing Plans',
        pricingResult.success && pricingResult.data?.plans?.length > 0,
        'Pricing plans retrieved successfully',
        { planCount: pricingResult.data?.plans?.length }
      );

      // Create upgrade session
      const upgradeData = {
        planName: 'basic'
      };

      const upgradeResult = await this.makeRequest('POST', '/api/story-hub/upgrade', upgradeData);
      
      await this.logTest(
        'Create Upgrade Session',
        upgradeResult.success && upgradeResult.data?.sessionId,
        'Upgrade session created successfully',
        {
          sessionId: upgradeResult.data?.sessionId,
          amount: upgradeResult.data?.amount,
          currency: upgradeResult.data?.currency
        }
      );

      // Simulate payment verification
      const verifyData = {
        sessionId: upgradeResult.data.sessionId,
        paymentToken: `mock_token_${Date.now()}`
      };

      const verifyResult = await this.makeRequest('POST', '/api/story-hub/verify-upgrade', verifyData);
      
      await this.logTest(
        'Verify Upgrade',
        verifyResult.success,
        'Upgrade verified successfully',
        {
          userId: verifyResult.data?.userId,
          planName: verifyResult.data?.planName
        }
      );

      return verifyResult.data;

    } catch (error) {
      await this.logTest('Premium Upgrade', false, error.message);
      return null;
    }
  }

  async testVideoGeneration(script, audioUrl) {
    console.log('\n🎥 Testing Video Generation...');
    
    try {
      const videoData = {
        script: script,
        audioUrl: audioUrl,
        options: {
          quality: 'high',
          style: 'cinematic',
          duration: 'auto'
        }
      };

      const videoResult = await this.makeRequest('POST', '/api/video/generate-story-hub', videoData);
      
      await this.logTest(
        'Video Generation',
        videoResult.success && videoResult.data?.jobId,
        'Video generation started successfully',
        {
          jobId: videoResult.data?.jobId,
          status: videoResult.data?.status,
          estimatedTime: videoResult.data?.estimatedTime
        }
      );

      return videoResult.data;

    } catch (error) {
      await this.logTest('Video Generation', false, error.message);
      return null;
    }
  }

  async testCreditsSystem() {
    console.log('\n💰 Testing Credits System...');
    
    try {
      const creditsResult = await this.makeRequest('GET', '/api/story-hub/credits');
      
      await this.logTest(
        'Get Credits',
        creditsResult.success,
        'Credits retrieved successfully',
        {
          remaining: creditsResult.data?.remaining,
          used: creditsResult.data?.used,
          total: creditsResult.data?.total
        }
      );

      return creditsResult.data;

    } catch (error) {
      await this.logTest('Credits System', false, error.message);
      return null;
    }
  }

  async testPremiumStatus() {
    console.log('\n👑 Testing Premium Status...');
    
    try {
      const statusResult = await this.makeRequest('GET', '/api/story-hub/premium-status');
      
      await this.logTest(
        'Get Premium Status',
        statusResult.success,
        'Premium status retrieved successfully',
        {
          hasPremium: statusResult.data?.hasPremium,
          tier: statusResult.data?.tier,
          credits: statusResult.data?.credits
        }
      );

      return statusResult.data;

    } catch (error) {
      await this.logTest('Premium Status', false, error.message);
      return null;
    }
  }

  async runCompleteFlow() {
    console.log('🚀 Starting Story Hub MVP Complete Flow Test');
    console.log('=' .repeat(60));

    let scriptData = null;
    let audioData = null;
    let videoData = null;

    // Test 1: Health Checks
    await this.testHealthChecks();

    // Test 2: User Registration & Login
    await this.testUserRegistration();

    if (!this.authToken) {
      console.log('\n❌ Cannot continue without authentication token');
      return;
    }

    // Test 3: Credits System
    await this.testCreditsSystem();

    // Test 4: Script Generation
    scriptData = await this.testScriptGeneration();

    if (!scriptData) {
      console.log('\n❌ Cannot continue without script data');
      return;
    }

    // Test 5: Audio Generation
    audioData = await this.testAudioGeneration(scriptData.script);

    // Test 6: Premium Upgrade
    await this.testPremiumUpgrade();

    // Test 7: Premium Status
    await this.testPremiumStatus();

    // Test 8: Video Generation (if audio available)
    if (audioData && audioData.audioUrl) {
      videoData = await this.testVideoGeneration(scriptData.script, audioData.audioUrl);
    }

    // Test Summary
    this.printTestSummary();
  }

  printTestSummary() {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.success)
        .forEach(r => console.log(`   - ${r.test}: ${r.message}`));
    }

    console.log('\n🎯 Story Hub MVP Flow Test Complete!');
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! The Story Hub MVP is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please check the issues above.');
    }
  }
}

// Run the test
if (require.main === module) {
  const tester = new StoryHubTester();
  tester.runCompleteFlow().catch(console.error);
}

module.exports = StoryHubTester;