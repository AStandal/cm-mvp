import { describe, it, expect } from 'vitest';
import { ProcessStep, CaseStatus, Case, ApplicationData } from './index';

describe('TypeScript Types', () => {
  it('should create a valid Case object', () => {
    const applicationData: ApplicationData = {
      applicantName: 'John Doe',
      applicantEmail: 'john@example.com',
      applicationType: 'permit',
      submissionDate: new Date(),
      documents: [],
      formData: { field1: 'value1' }
    };

    const testCase: Case = {
      id: 'test-case-1',
      applicationData,
      status: CaseStatus.ACTIVE,
      currentStep: ProcessStep.RECEIVED,
      createdAt: new Date(),
      updatedAt: new Date(),
      notes: [],
      aiSummaries: [],
      auditTrail: []
    };

    expect(testCase.id).toBe('test-case-1');
    expect(testCase.status).toBe(CaseStatus.ACTIVE);
    expect(testCase.currentStep).toBe(ProcessStep.RECEIVED);
    expect(testCase.applicationData.applicantName).toBe('John Doe');
  });

  it('should validate enum values', () => {
    expect(ProcessStep.RECEIVED).toBe('received');
    expect(ProcessStep.IN_REVIEW).toBe('in_review');
    expect(CaseStatus.ACTIVE).toBe('active');
    expect(CaseStatus.PENDING).toBe('pending');
  });
});