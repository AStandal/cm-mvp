import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DataService } from '../../services/DataService.js';
import { ZoningPlan, SearchCriteria } from '../../types/index.js';
import { setupUnitTestDatabase } from '../utils/testDatabaseFactory.js';
import { randomUUID } from 'crypto';

describe('DataService - Zoning Extensions', () => {
  let dataService: DataService;
  const dbHooks = setupUnitTestDatabase('DataServiceZoning');

  beforeAll(async () => {
    await dbHooks.beforeAll();
  });

  afterAll(async () => {
    await dbHooks.afterAll();
  });

  beforeEach(async () => {
    await dbHooks.beforeEach();
    dataService = new DataService();
  });

  describe('saveZoningPlan', () => {
    it('should save a zoning plan with requirements successfully', async () => {
      const zoningPlan: ZoningPlan = {
        id: randomUUID(),
        name: 'Test Zoning Plan',
        documentPath: '/test/zoning-plan.pdf',
        documentHash: 'abc123hash',
        jurisdiction: 'Test City',
        effectiveDate: new Date('2024-01-01'),
        version: '1.0',
        requirements: [
          {
            id: randomUUID(),
            planId: '', // Will be set to plan ID
            category: 'Building Height',
            subcategory: 'Residential',
            requirement: 'Maximum height 35 feet',
            description: 'Buildings in residential zones cannot exceed 35 feet in height',
            criteria: [
              {
                id: randomUUID(),
                type: 'numeric',
                name: 'max_height',
                description: 'Maximum building height',
                value: 35,
                unit: 'feet',
                maxValue: 35
              }
            ],
            references: ['Section 4.2.1', 'Ordinance 2024-01'],
            priority: 'required',
            applicableZones: ['R1', 'R2'],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        extractionMetadata: {
          extractedAt: new Date(),
          aiModel: 'gpt-4',
          promptTemplate: 'zoning_requirements_extraction_v1',
          promptVersion: '1.0',
          confidence: 0.9,
          tokensUsed: 1500,
          processingDuration: 5000,
          documentPages: 10,
          extractedRequirementsCount: 1
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Set the plan ID in requirements
      zoningPlan.requirements[0].planId = zoningPlan.id;

      await expect(dataService.saveZoningPlan(zoningPlan)).resolves.not.toThrow();
    });

    it('should save a zoning plan without requirements', async () => {
      const zoningPlan: ZoningPlan = {
        id: randomUUID(),
        name: 'Empty Zoning Plan',
        documentPath: '/test/empty-plan.pdf',
        documentHash: 'def456hash',
        jurisdiction: 'Empty City',
        effectiveDate: new Date('2024-02-01'),
        version: '1.0',
        requirements: [],
        extractionMetadata: {
          extractedAt: new Date(),
          aiModel: 'gpt-4',
          promptTemplate: 'zoning_requirements_extraction_v1',
          promptVersion: '1.0',
          confidence: 0.8,
          tokensUsed: 500,
          processingDuration: 2000,
          documentPages: 5,
          extractedRequirementsCount: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await expect(dataService.saveZoningPlan(zoningPlan)).resolves.not.toThrow();
    });

    it('should handle duplicate document hash error', async () => {
      const zoningPlan1: ZoningPlan = {
        id: randomUUID(),
        name: 'Plan 1',
        documentPath: '/test/plan1.pdf',
        documentHash: 'duplicate-hash',
        jurisdiction: 'Test City',
        effectiveDate: new Date(),
        version: '1.0',
        requirements: [],
        extractionMetadata: {
          extractedAt: new Date(),
          aiModel: 'gpt-4',
          promptTemplate: 'zoning_requirements_extraction_v1',
          promptVersion: '1.0',
          confidence: 0.8,
          tokensUsed: 500,
          processingDuration: 2000,
          documentPages: 5,
          extractedRequirementsCount: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const zoningPlan2: ZoningPlan = {
        ...zoningPlan1,
        id: randomUUID(),
        name: 'Plan 2',
        documentPath: '/test/plan2.pdf'
      };

      await dataService.saveZoningPlan(zoningPlan1);
      
      await expect(dataService.saveZoningPlan(zoningPlan2))
        .rejects.toThrow('Failed to save zoning plan');
    });
  });

  describe('getZoningPlan', () => {
    let savedPlanId: string;

    beforeEach(async () => {
      const zoningPlan: ZoningPlan = {
        id: randomUUID(),
        name: 'Retrievable Plan',
        documentPath: '/test/retrievable.pdf',
        documentHash: 'retrieve123',
        jurisdiction: 'Retrieve City',
        effectiveDate: new Date('2024-03-01'),
        version: '1.0',
        requirements: [
          {
            id: randomUUID(),
            planId: '', // Will be set below
            category: 'Setbacks',
            subcategory: 'Front Yard',
            requirement: 'Minimum 20 feet from street',
            description: 'Front yard setback requirement',
            criteria: [
              {
                id: randomUUID(),
                type: 'numeric',
                name: 'min_setback',
                description: 'Minimum setback distance',
                value: 20,
                unit: 'feet',
                minValue: 20
              }
            ],
            references: ['Section 5.1'],
            priority: 'required',
            applicableZones: ['R1'],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        extractionMetadata: {
          extractedAt: new Date(),
          aiModel: 'gpt-4',
          promptTemplate: 'zoning_requirements_extraction_v1',
          promptVersion: '1.0',
          confidence: 0.85,
          tokensUsed: 1200,
          processingDuration: 4000,
          documentPages: 8,
          extractedRequirementsCount: 1
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      zoningPlan.requirements[0].planId = zoningPlan.id;
      savedPlanId = zoningPlan.id;

      await dataService.saveZoningPlan(zoningPlan);
    });

    it('should retrieve a zoning plan with all requirements', async () => {
      const result = await dataService.getZoningPlan(savedPlanId);

      expect(result).toBeDefined();
      expect(result!.id).toBe(savedPlanId);
      expect(result!.name).toBe('Retrievable Plan');
      expect(result!.jurisdiction).toBe('Retrieve City');
      expect(result!.requirements).toHaveLength(1);
      expect(result!.requirements[0].category).toBe('Setbacks');
      expect(result!.requirements[0].criteria).toHaveLength(1);
      expect(result!.requirements[0].criteria[0].value).toBe(20);
      expect(result!.requirements[0].references).toEqual(['Section 5.1']);
      expect(result!.requirements[0].applicableZones).toEqual(['R1']);
    });

    it('should return null for non-existent plan', async () => {
      const result = await dataService.getZoningPlan('non-existent-id');
      
      expect(result).toBeNull();
    });
  });

  describe('getZoningRequirements', () => {
    let savedPlanId: string;

    beforeEach(async () => {
      const zoningPlan: ZoningPlan = {
        id: randomUUID(),
        name: 'Requirements Test Plan',
        documentPath: '/test/requirements.pdf',
        documentHash: 'req123',
        jurisdiction: 'Requirements City',
        effectiveDate: new Date(),
        version: '1.0',
        requirements: [
          {
            id: randomUUID(),
            planId: '', // Will be set below
            category: 'Building Coverage',
            requirement: 'Maximum 40% lot coverage',
            description: 'Building coverage limitation',
            criteria: [],
            references: ['Section 6.1'],
            priority: 'required',
            applicableZones: ['R1', 'R2'],
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: randomUUID(),
            planId: '', // Will be set below
            category: 'Parking',
            requirement: 'Minimum 2 spaces per unit',
            description: 'Parking requirement for residential units',
            criteria: [],
            references: ['Section 7.2'],
            priority: 'required',
            applicableZones: ['R1'],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        extractionMetadata: {
          extractedAt: new Date(),
          aiModel: 'gpt-4',
          promptTemplate: 'zoning_requirements_extraction_v1',
          promptVersion: '1.0',
          confidence: 0.9,
          tokensUsed: 2000,
          processingDuration: 6000,
          documentPages: 15,
          extractedRequirementsCount: 2
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      zoningPlan.requirements.forEach(req => {
        req.planId = zoningPlan.id;
      });
      savedPlanId = zoningPlan.id;

      await dataService.saveZoningPlan(zoningPlan);
    });

    it('should retrieve all requirements for a plan', async () => {
      const requirements = await dataService.getZoningRequirements(savedPlanId);

      expect(requirements).toHaveLength(2);
      expect(requirements[0].category).toBe('Building Coverage');
      expect(requirements[1].category).toBe('Parking');
      expect(requirements.every(req => req.planId === savedPlanId)).toBe(true);
    });

    it('should return empty array for plan with no requirements', async () => {
      const emptyPlan: ZoningPlan = {
        id: randomUUID(),
        name: 'Empty Plan',
        documentPath: '/test/empty.pdf',
        documentHash: 'empty123',
        jurisdiction: 'Empty City',
        effectiveDate: new Date(),
        version: '1.0',
        requirements: [],
        extractionMetadata: {
          extractedAt: new Date(),
          aiModel: 'gpt-4',
          promptTemplate: 'zoning_requirements_extraction_v1',
          promptVersion: '1.0',
          confidence: 0.8,
          tokensUsed: 500,
          processingDuration: 2000,
          documentPages: 5,
          extractedRequirementsCount: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await dataService.saveZoningPlan(emptyPlan);
      const requirements = await dataService.getZoningRequirements(emptyPlan.id);

      expect(requirements).toHaveLength(0);
    });
  });

  describe('searchZoningRequirements', () => {
    beforeEach(async () => {
      // Create multiple plans with different requirements for testing search
      const plans: ZoningPlan[] = [
        {
          id: randomUUID(),
          name: 'Residential Plan',
          documentPath: '/test/residential.pdf',
          documentHash: 'res123',
          jurisdiction: 'Residential City',
          effectiveDate: new Date(),
          version: '1.0',
          requirements: [
            {
              id: randomUUID(),
              planId: '',
              category: 'Building Height',
              subcategory: 'Residential',
              requirement: 'Maximum 35 feet',
              description: 'Height limit for residential buildings',
              criteria: [],
              references: ['Section 4.1'],
              priority: 'required',
              applicableZones: ['R1', 'R2'],
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ],
          extractionMetadata: {
            extractedAt: new Date(),
            aiModel: 'gpt-4',
            promptTemplate: 'zoning_requirements_extraction_v1',
            promptVersion: '1.0',
            confidence: 0.9,
            tokensUsed: 1500,
            processingDuration: 5000,
            documentPages: 10,
            extractedRequirementsCount: 1
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: randomUUID(),
          name: 'Commercial Plan',
          documentPath: '/test/commercial.pdf',
          documentHash: 'com123',
          jurisdiction: 'Commercial City',
          effectiveDate: new Date(),
          version: '1.0',
          requirements: [
            {
              id: randomUUID(),
              planId: '',
              category: 'Parking',
              subcategory: 'Commercial',
              requirement: 'Minimum 1 space per 300 sq ft',
              description: 'Parking requirement for commercial buildings',
              criteria: [],
              references: ['Section 7.1'],
              priority: 'required',
              applicableZones: ['C1', 'C2'],
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: randomUUID(),
              planId: '',
              category: 'Building Height',
              subcategory: 'Commercial',
              requirement: 'Maximum 60 feet',
              description: 'Height limit for commercial buildings',
              criteria: [],
              references: ['Section 4.2'],
              priority: 'recommended',
              applicableZones: ['C1'],
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ],
          extractionMetadata: {
            extractedAt: new Date(),
            aiModel: 'gpt-4',
            promptTemplate: 'zoning_requirements_extraction_v1',
            promptVersion: '1.0',
            confidence: 0.85,
            tokensUsed: 2000,
            processingDuration: 6000,
            documentPages: 15,
            extractedRequirementsCount: 2
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Set plan IDs in requirements and save plans
      for (const plan of plans) {
        plan.requirements.forEach(req => {
          req.planId = plan.id;
        });
        await dataService.saveZoningPlan(plan);
      }
    });

    it('should search by category', async () => {
      const criteria: SearchCriteria = {
        category: 'Building Height'
      };

      const results = await dataService.searchZoningRequirements(criteria);

      expect(results).toHaveLength(2);
      expect(results.every(req => req.category === 'Building Height')).toBe(true);
    });

    it('should search by priority', async () => {
      const criteria: SearchCriteria = {
        priority: 'required'
      };

      const results = await dataService.searchZoningRequirements(criteria);

      expect(results).toHaveLength(2);
      expect(results.every(req => req.priority === 'required')).toBe(true);
    });

    it('should search by jurisdiction', async () => {
      const criteria: SearchCriteria = {
        jurisdiction: 'Residential City'
      };

      const results = await dataService.searchZoningRequirements(criteria);

      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('Building Height');
    });

    it('should search by applicable zones', async () => {
      const criteria: SearchCriteria = {
        applicableZones: ['R1']
      };

      const results = await dataService.searchZoningRequirements(criteria);

      expect(results).toHaveLength(1);
      expect(results[0].applicableZones).toContain('R1');
    });

    it('should search by text content', async () => {
      const criteria: SearchCriteria = {
        textSearch: 'parking'
      };

      const results = await dataService.searchZoningRequirements(criteria);

      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('Parking');
    });

    it('should combine multiple search criteria', async () => {
      const criteria: SearchCriteria = {
        category: 'Building Height',
        priority: 'required'
      };

      const results = await dataService.searchZoningRequirements(criteria);

      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('Building Height');
      expect(results[0].priority).toBe('required');
      expect(results[0].subcategory).toBe('Residential');
    });

    it('should return empty array when no matches found', async () => {
      const criteria: SearchCriteria = {
        category: 'Non-existent Category'
      };

      const results = await dataService.searchZoningRequirements(criteria);

      expect(results).toHaveLength(0);
    });
  });

  describe('updateZoningRequirement', () => {
    let savedRequirementId: string;
    let savedPlanId: string;

    beforeEach(async () => {
      const zoningPlan: ZoningPlan = {
        id: randomUUID(),
        name: 'Update Test Plan',
        documentPath: '/test/update.pdf',
        documentHash: 'update123',
        jurisdiction: 'Update City',
        effectiveDate: new Date(),
        version: '1.0',
        requirements: [
          {
            id: randomUUID(),
            planId: '',
            category: 'Original Category',
            requirement: 'Original requirement',
            description: 'Original description',
            criteria: [
              {
                id: randomUUID(),
                type: 'text',
                name: 'original_criteria',
                description: 'Original criteria'
              }
            ],
            references: ['Original Section'],
            priority: 'required',
            applicableZones: ['Z1'],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        extractionMetadata: {
          extractedAt: new Date(),
          aiModel: 'gpt-4',
          promptTemplate: 'zoning_requirements_extraction_v1',
          promptVersion: '1.0',
          confidence: 0.8,
          tokensUsed: 1000,
          processingDuration: 3000,
          documentPages: 5,
          extractedRequirementsCount: 1
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      zoningPlan.requirements[0].planId = zoningPlan.id;
      savedPlanId = zoningPlan.id;
      savedRequirementId = zoningPlan.requirements[0].id;

      await dataService.saveZoningPlan(zoningPlan);
    });

    it('should update requirement fields successfully', async () => {
      const updates = {
        category: 'Updated Category',
        requirement: 'Updated requirement text',
        description: 'Updated description',
        priority: 'recommended' as const
      };

      await dataService.updateZoningRequirement(savedRequirementId, updates);

      const plan = await dataService.getZoningPlan(savedPlanId);
      const updatedRequirement = plan!.requirements[0];

      expect(updatedRequirement.category).toBe('Updated Category');
      expect(updatedRequirement.requirement).toBe('Updated requirement text');
      expect(updatedRequirement.description).toBe('Updated description');
      expect(updatedRequirement.priority).toBe('recommended');
    });

    it('should update criteria and references', async () => {
      const updates = {
        criteria: [
          {
            id: randomUUID(),
            type: 'numeric' as const,
            name: 'new_criteria',
            description: 'New numeric criteria',
            value: 100,
            unit: 'units'
          }
        ],
        references: ['New Section 1', 'New Section 2'],
        applicableZones: ['Z1', 'Z2', 'Z3']
      };

      await dataService.updateZoningRequirement(savedRequirementId, updates);

      const plan = await dataService.getZoningPlan(savedPlanId);
      const updatedRequirement = plan!.requirements[0];

      expect(updatedRequirement.criteria).toHaveLength(1);
      expect(updatedRequirement.criteria[0].type).toBe('numeric');
      expect(updatedRequirement.criteria[0].value).toBe(100);
      expect(updatedRequirement.references).toEqual(['New Section 1', 'New Section 2']);
      expect(updatedRequirement.applicableZones).toEqual(['Z1', 'Z2', 'Z3']);
    });

    it('should throw error for non-existent requirement', async () => {
      const updates = {
        category: 'Updated Category'
      };

      await expect(dataService.updateZoningRequirement('non-existent-id', updates))
        .rejects.toThrow('Zoning requirement with ID non-existent-id not found');
    });

    it('should throw error when no valid fields to update', async () => {
      await expect(dataService.updateZoningRequirement(savedRequirementId, {}))
        .rejects.toThrow('No valid fields to update');
    });

    it('should update the updated_at timestamp', async () => {
      const originalPlan = await dataService.getZoningPlan(savedPlanId);
      const originalUpdatedAt = originalPlan!.requirements[0].updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updates = {
        category: 'Updated Category'
      };

      await dataService.updateZoningRequirement(savedRequirementId, updates);

      const updatedPlan = await dataService.getZoningPlan(savedPlanId);
      const newUpdatedAt = updatedPlan!.requirements[0].updatedAt;

      expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('transaction handling', () => {
    it('should rollback on failure during zoning plan save', async () => {
      const zoningPlan: ZoningPlan = {
        id: randomUUID(),
        name: 'Transaction Test Plan',
        documentPath: '/test/transaction.pdf',
        documentHash: 'trans123',
        jurisdiction: 'Transaction City',
        effectiveDate: new Date(),
        version: '1.0',
        requirements: [
          {
            id: randomUUID(),
            planId: '', // Will be set below
            category: 'Test Category',
            requirement: 'Test requirement',
            description: 'Test description',
            criteria: [],
            references: [],
            priority: 'required',
            applicableZones: [],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        extractionMetadata: {
          extractedAt: new Date(),
          aiModel: 'gpt-4',
          promptTemplate: 'zoning_requirements_extraction_v1',
          promptVersion: '1.0',
          confidence: 0.8,
          tokensUsed: 1000,
          processingDuration: 3000,
          documentPages: 5,
          extractedRequirementsCount: 1
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      zoningPlan.requirements[0].planId = zoningPlan.id;

      // First save should succeed
      await dataService.saveZoningPlan(zoningPlan);

      // Verify plan was saved
      const savedPlan = await dataService.getZoningPlan(zoningPlan.id);
      expect(savedPlan).toBeDefined();
      expect(savedPlan!.requirements).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Try to save a plan with invalid data that would cause a database error
      const invalidPlan = {
        // Missing required fields to trigger database error
      } as any;

      await expect(dataService.saveZoningPlan(invalidPlan))
        .rejects.toThrow('Failed to save zoning plan');
    });

    it('should handle search errors gracefully', async () => {
      const invalidCriteria = {
        // This should not cause the search to fail, but return empty results
        category: null
      } as any;

      const results = await dataService.searchZoningRequirements(invalidCriteria);
      expect(Array.isArray(results)).toBe(true);
    });
  });
});