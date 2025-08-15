import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EvaluationService } from '../../services/EvaluationService.js';
import { DataService } from '../../services/DataService.js';
import { DatabaseSchema } from '../../database/schema.js';
import { DatabaseConnection } from '../../database/connection.js';
import { CreateDatasetRequest, AddExampleRequest } from '../../types/evaluation.js';
import { ProcessStep } from '../../types/index.js';

describe('EvaluationService', () => {
    let evaluationService: EvaluationService;
    let dataService: DataService;
    let db: DatabaseConnection;

    beforeEach(async () => {
        // Initialize test database
        db = DatabaseConnection.getInstance(':memory:');
        const schema = new DatabaseSchema();
        schema.initializeSchema();

        // Initialize services
        dataService = new DataService();
        evaluationService = new EvaluationService(dataService);
    });

    afterEach(() => {
        // Clean up database connection
        db.close();
    });

    describe('createDataset', () => {
        it('should create a new evaluation dataset', async () => {
            const request: CreateDatasetRequest = {
                name: 'Test Dataset',
                description: 'A test dataset for case summaries',
                operation: 'generate_summary',
                metadata: {
                    createdBy: 'test-user',
                    tags: ['test', 'summary'],
                    difficulty: 'medium',
                    sourceType: 'manual'
                }
            };

            const dataset = await evaluationService.createDataset(request);

            expect(dataset).toBeDefined();
            expect(dataset.id).toBeDefined();
            expect(dataset.name).toBe('Test Dataset');
            expect(dataset.description).toBe('A test dataset for case summaries');
            expect(dataset.operation).toBe('generate_summary');
            expect(dataset.examples).toEqual([]);
            expect(dataset.metadata.createdBy).toBe('test-user');
            expect(dataset.metadata.tags).toEqual(['test', 'summary']);
            expect(dataset.metadata.difficulty).toBe('medium');
            expect(dataset.metadata.sourceType).toBe('manual');
            expect(dataset.statistics.totalExamples).toBe(0);
            expect(dataset.statistics.averageQuality).toBe(0);
        });

        it('should create dataset with default values when optional fields are missing', async () => {
            const request: CreateDatasetRequest = {
                name: 'Minimal Dataset',
                operation: 'analyze_application',
                metadata: {
                    createdBy: 'test-user'
                }
            };

            const dataset = await evaluationService.createDataset(request);

            expect(dataset.description).toBe('');
            expect(dataset.metadata.tags).toEqual([]);
            expect(dataset.metadata.difficulty).toBe('medium');
            expect(dataset.metadata.sourceType).toBe('manual');
        });
    });

    describe('getDataset', () => {
        it('should retrieve an existing dataset', async () => {
            const request: CreateDatasetRequest = {
                name: 'Test Dataset',
                operation: 'generate_summary',
                metadata: {
                    createdBy: 'test-user'
                }
            };

            const createdDataset = await evaluationService.createDataset(request);
            const retrievedDataset = await evaluationService.getDataset(createdDataset.id);

            expect(retrievedDataset).toBeDefined();
            expect(retrievedDataset!.id).toBe(createdDataset.id);
            expect(retrievedDataset!.name).toBe('Test Dataset');
            expect(retrievedDataset!.operation).toBe('generate_summary');
        });

        it('should return null for non-existent dataset', async () => {
            const result = await evaluationService.getDataset('non-existent-id');
            expect(result).toBeNull();
        });
    });

    describe('listDatasets', () => {
        beforeEach(async () => {
            // Create test datasets
            await evaluationService.createDataset({
                name: 'Summary Dataset',
                operation: 'generate_summary',
                metadata: { createdBy: 'user1', tags: ['summary'] }
            });

            await evaluationService.createDataset({
                name: 'Analysis Dataset',
                operation: 'analyze_application',
                metadata: { createdBy: 'user2', tags: ['analysis'] }
            });

            await evaluationService.createDataset({
                name: 'Another Summary Dataset',
                operation: 'generate_summary',
                metadata: { createdBy: 'user1', tags: ['summary', 'test'] }
            });
        });

        it('should list all datasets when no filters are provided', async () => {
            const datasets = await evaluationService.listDatasets();
            expect(datasets).toHaveLength(3);
        });

        it('should filter datasets by operation', async () => {
            const datasets = await evaluationService.listDatasets({
                operation: 'generate_summary'
            });
            expect(datasets).toHaveLength(2);
            expect(datasets.every(d => d.operation === 'generate_summary')).toBe(true);
        });

        it('should filter datasets by createdBy', async () => {
            const datasets = await evaluationService.listDatasets({
                createdBy: 'user1'
            });
            expect(datasets).toHaveLength(2);
            expect(datasets.every(d => d.metadata.createdBy === 'user1')).toBe(true);
        });

        it('should filter datasets by tags', async () => {
            const datasets = await evaluationService.listDatasets({
                tags: ['test']
            });
            expect(datasets).toHaveLength(1);
            expect(datasets[0].name).toBe('Another Summary Dataset');
        });

        it('should limit results', async () => {
            const datasets = await evaluationService.listDatasets({
                limit: 2
            });
            expect(datasets).toHaveLength(2);
        });
    });

    describe('addExampleToDataset', () => {
        let datasetId: string;

        beforeEach(async () => {
            const dataset = await evaluationService.createDataset({
                name: 'Test Dataset',
                operation: 'generate_summary',
                metadata: { createdBy: 'test-user' }
            });
            datasetId = dataset.id;
        });

        it('should add an example to a dataset', async () => {
            const request: AddExampleRequest = {
                input: {
                    prompt: 'Generate a summary for this case',
                    context: { caseType: 'application' }
                },
                expectedOutput: {
                    content: 'This is a test summary',
                    quality: 8,
                    criteria: {
                        faithfulness: 9,
                        completeness: 8,
                        relevance: 8,
                        clarity: 7
                    }
                },
                metadata: {
                    tags: ['test'],
                    difficulty: 'easy',
                    notes: 'Test example'
                }
            };

            await evaluationService.addExampleToDataset(datasetId, request);

            // Verify the example was added
            const dataset = await evaluationService.getDataset(datasetId);
            expect(dataset!.examples).toHaveLength(1);
            expect(dataset!.examples[0].input.prompt).toBe('Generate a summary for this case');
            expect(dataset!.examples[0].expectedOutput.content).toBe('This is a test summary');
            expect(dataset!.examples[0].expectedOutput.quality).toBe(8);
            expect(dataset!.examples[0].metadata.tags).toEqual(['test']);
            expect(dataset!.examples[0].metadata.difficulty).toBe('easy');
            expect(dataset!.examples[0].metadata.notes).toBe('Test example');

            // Verify statistics were updated
            expect(dataset!.statistics.totalExamples).toBe(1);
            expect(dataset!.statistics.averageQuality).toBe(8);
            expect(dataset!.statistics.difficultyDistribution).toEqual({ easy: 1 });
        });

        it('should add example with default metadata when not provided', async () => {
            const request: AddExampleRequest = {
                input: {
                    prompt: 'Test prompt'
                },
                expectedOutput: {
                    content: 'Test output',
                    quality: 5,
                    criteria: {
                        faithfulness: 5,
                        completeness: 5,
                        relevance: 5,
                        clarity: 5
                    }
                }
            };

            await evaluationService.addExampleToDataset(datasetId, request);

            const dataset = await evaluationService.getDataset(datasetId);
            expect(dataset!.examples[0].metadata.tags).toEqual([]);
            expect(dataset!.examples[0].metadata.difficulty).toBe('medium');
        });

        it('should throw error when adding example to non-existent dataset', async () => {
            const request: AddExampleRequest = {
                input: { prompt: 'Test' },
                expectedOutput: {
                    content: 'Test',
                    quality: 5,
                    criteria: { faithfulness: 5, completeness: 5, relevance: 5, clarity: 5 }
                }
            };

            await expect(
                evaluationService.addExampleToDataset('non-existent-id', request)
            ).rejects.toThrow('Dataset with ID non-existent-id not found');
        });
    });

    describe('getDatasetExamples', () => {
        let datasetId: string;

        beforeEach(async () => {
            const dataset = await evaluationService.createDataset({
                name: 'Test Dataset',
                operation: 'generate_summary',
                metadata: { createdBy: 'test-user' }
            });
            datasetId = dataset.id;

            // Add test examples with a small delay to ensure different timestamps
            await evaluationService.addExampleToDataset(datasetId, {
                input: { prompt: 'First example' },
                expectedOutput: {
                    content: 'First output',
                    quality: 7,
                    criteria: { faithfulness: 7, completeness: 7, relevance: 7, clarity: 7 }
                }
            });

            // Small delay to ensure different timestamp
            await new Promise(resolve => setTimeout(resolve, 10));

            await evaluationService.addExampleToDataset(datasetId, {
                input: { prompt: 'Second example' },
                expectedOutput: {
                    content: 'Second output',
                    quality: 9,
                    criteria: { faithfulness: 9, completeness: 9, relevance: 9, clarity: 9 }
                }
            });
        });

        it('should retrieve all examples for a dataset', async () => {
            const examples = await evaluationService.getDatasetExamples(datasetId);
            
            expect(examples).toHaveLength(2);
            expect(examples[0].input.prompt).toBe('Second example'); // Most recent first
            expect(examples[1].input.prompt).toBe('First example');
        });

        it('should return empty array for dataset with no examples', async () => {
            const emptyDataset = await evaluationService.createDataset({
                name: 'Empty Dataset',
                operation: 'generate_summary',
                metadata: { createdBy: 'test-user' }
            });

            const examples = await evaluationService.getDatasetExamples(emptyDataset.id);
            expect(examples).toEqual([]);
        });
    });
});