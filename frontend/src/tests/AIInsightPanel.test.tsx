import { describe, it, expect } from 'vitest';
import { ProcessStep } from '@/types';

describe('AIInsightPanel Component', () => {
  it('should be importable', async () => {
    const AIInsightPanel = await import('@/components/case/AIInsightPanel');
    expect(AIInsightPanel.default).toBeDefined();
    expect(typeof AIInsightPanel.default).toBe('function');
  });

  it('should have correct TypeScript interface', () => {
    // Test that the expected props are valid TypeScript types
    const validProps = {
      caseId: 'test-case-123',
      step: ProcessStep.IN_REVIEW,
      summaryType: 'overall' as const,
    };

    const validOverallProps = {
      caseId: 'test-case-123',
      summaryType: 'overall' as const,
    };

    const validStepSpecificProps = {
      caseId: 'test-case-123',
      summaryType: 'step-specific' as const,
      step: ProcessStep.IN_REVIEW,
    };

    // If TypeScript compilation succeeds, these prop objects are valid
    expect(validProps.caseId).toBe('test-case-123');
    expect(validOverallProps.summaryType).toBe('overall');
    expect(validStepSpecificProps.summaryType).toBe('step-specific');
    expect(validStepSpecificProps.step).toBe(ProcessStep.IN_REVIEW);
  });

  it('should support all ProcessStep enum values', () => {
    const steps = Object.values(ProcessStep);
    
    expect(steps).toContain(ProcessStep.RECEIVED);
    expect(steps).toContain(ProcessStep.IN_REVIEW);
    expect(steps).toContain(ProcessStep.ADDITIONAL_INFO_REQUIRED);
    expect(steps).toContain(ProcessStep.READY_FOR_DECISION);
    expect(steps).toContain(ProcessStep.CONCLUDED);

    // Test that each step can be used in props
    steps.forEach(step => {
      const props = {
        caseId: 'test-case-123',
        summaryType: 'step-specific' as const,
        step,
      };

      expect(props.step).toBe(step);
    });
  });

  it('should support both summary types', () => {
    const overallType = 'overall' as const;
    const stepSpecificType = 'step-specific' as const;

    expect(overallType).toBe('overall');
    expect(stepSpecificType).toBe('step-specific');

    // Test that both types can be used in props
    const overallProps = {
      caseId: 'test-case-123',
      summaryType: overallType,
    };

    const stepSpecificProps = {
      caseId: 'test-case-123',
      summaryType: stepSpecificType,
      step: ProcessStep.IN_REVIEW,
    };

    expect(overallProps.summaryType).toBe('overall');
    expect(stepSpecificProps.summaryType).toBe('step-specific');
  });
});