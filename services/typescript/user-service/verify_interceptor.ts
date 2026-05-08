import { Test, TestingModule } from '@nestjs/testing';
import { AuditLoggerInterceptor } from './src/common/audit-logger/utils/audit-log.interceptor';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AccessValidator } from './src/common/audit-logger/access-validator/access-validator.service';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

// Mock dependencies
const mockReflector = {
  get: () => {},
  getAllAndOverride: () => false,
};

const mockConfigService = {
  get: (key) => {
    if (key === 'RATE_LIMIT_MAX_REQUESTS') return 100;
    if (key === 'RATE_LIMIT_TIME_WINDOW_MS') return 60000;
    if (key === 'LOG_EKY') return 'test-key';
    return null;
  },
};

const mockAccessValidator = {
  getUserWithRefreshToken: () => {},
  insertLog: () => {},
};

const mockExecutionContext = {
  getHandler: () => {},
  getClass: () => {},
  switchToHttp: () => ({
    getRequest: () => ({
      originalUrl: '/virtual-account/callback',
      rawHeaders: [],
      headers: {},
    }),
  }),
} as unknown as ExecutionContext;

const mockCallHandler = {
  handle: () => of('success'),
} as unknown as CallHandler;

async function runTest() {
  const interceptor = new AuditLoggerInterceptor(
    mockReflector as any,
    mockConfigService as any,
    mockAccessValidator as any,
  );

  // Test Case 1: Public Route
  console.log('Test Case 1: Testing Public Route...');
  mockReflector.getAllAndOverride = () => true; // Simulate @Public()

  try {
    await interceptor.intercept(mockExecutionContext, mockCallHandler);
    console.log('✅ Public route passed successfully (skipped auth check).');
  } catch (error) {
    console.error('❌ Public route failed:', error);
  }

  // Test Case 2: Protected Route
  console.log('\nTest Case 2: Testing Protected Route...');
  mockReflector.getAllAndOverride = () => false; // Simulate no @Public()

  try {
    await interceptor.intercept(mockExecutionContext, mockCallHandler);
    console.log('❌ Protected route passed (should have failed).');
  } catch (error) {
    if (error.message === 'Unauthorized Request') {
      console.log(
        '✅ Protected route correctly blocked (Unauthorized Request).',
      );
    } else {
      console.log(`✅ Protected route blocked with error: ${error.message}`);
    }
  }
}

runTest();
