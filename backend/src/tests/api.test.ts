/**
 * API Test Runner
 * 
 * This file runs all API tests with proper isolation and setup.
 * It's designed to be run as part of the npm run verify workflow.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase } from './api/setup.js';
import { getTestSuiteSummary } from './api/index.js';

describe('API Test Suite', () => {
    beforeAll(async () => {
        // Set up test environment
        process.env.NODE_ENV = 'test';

        // Try to initialize test database (optional for API tests)
        try {
            await setupTestDatabase();
            console.log('🧪 API Test Suite initialized with database');
        } catch (error) {
            console.log('🧪 API Test Suite initialized without database (expected during development)');
        }

        console.log('📊 Test Suite Summary:', getTestSuiteSummary());
    });

    afterAll(async () => {
        // Clean up test database if it was created
        try {
            await cleanupTestDatabase();
        } catch (error) {
            // Ignore cleanup errors
        }

        console.log('✅ API Test Suite completed');
    });

    it('should have all API test suites available', () => {
        const summary = getTestSuiteSummary();

        expect(summary.totalSuites).toBeGreaterThan(0);
        expect(summary.totalEndpoints).toBeGreaterThan(0);
        expect(summary.totalRequirements).toBeGreaterThan(0);

        // Verify all expected test suites are present
        const expectedSuites = [
            'Health Endpoints',
            'Case Management Endpoints',
            'Model Management Endpoints',
            'Evaluation Endpoints',
            'Authentication Endpoints',
            'Documentation Endpoints'
        ];

        const actualSuites = summary.suites.map(suite => suite.name);

        for (const expectedSuite of expectedSuites) {
            expect(actualSuites).toContain(expectedSuite);
        }
    });

    it('should cover all required API endpoints', () => {
        const summary = getTestSuiteSummary();

        // Verify that we have tests for all major endpoint categories
        const endpointCategories = summary.suites.map(suite => suite.name);

        expect(endpointCategories).toContain('Health Endpoints');
        expect(endpointCategories).toContain('Case Management Endpoints');
        expect(endpointCategories).toContain('Model Management Endpoints');
        expect(endpointCategories).toContain('Evaluation Endpoints');
        expect(endpointCategories).toContain('Authentication Endpoints');
        expect(endpointCategories).toContain('Documentation Endpoints');
    });

    it('should cover all requirements specified in the task', () => {
        const summary = getTestSuiteSummary();

        // Verify that we cover the requirements mentioned in task 5.2
        const allRequirements = summary.suites.flatMap(suite => suite.requirements);

        // Task 5.2 specifically mentions requirements 7.3 and 7.7
        expect(allRequirements).toContain('7.3');
        expect(allRequirements).toContain('7.7');

        // Should also cover other API-related requirements
        expect(allRequirements.length).toBeGreaterThan(10);
    });
});

// Import all API test suites to ensure they run
import './api/index.js';