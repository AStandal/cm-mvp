import { DatabaseConnection } from '../database/connection.js';
import { DataService } from './DataService.js';
import {
    EvaluationDataset,
    EvaluationExample,
    AIOperation,
    DifficultyLevel,
    DatasetSourceType
} from '../types/index.js';
import {
    CreateDatasetRequest,
    AddExampleRequest,
    EvaluationDatasetSchema,
    EvaluationExampleSchema
} from '../types/evaluation.js';
import { randomUUID } from 'crypto';

export class EvaluationService {
    private db: DatabaseConnection;

    constructor(_dataService: DataService) {
        this.db = DatabaseConnection.getInstance();
        // DataService dependency is available for future use
        // Currently not needed for basic dataset operations
    }

    /**
     * Create a new evaluation dataset
     */
    public async createDataset(request: CreateDatasetRequest): Promise<EvaluationDataset> {
        try {
            const datasetId = randomUUID();
            const now = new Date();

            const metadata = {
                createdBy: request.metadata.createdBy,
                createdAt: now,
                updatedAt: now,
                version: 1,
                tags: request.metadata.tags || [],
                difficulty: request.metadata.difficulty || 'medium' as DifficultyLevel,
                sourceType: request.metadata.sourceType || 'manual' as DatasetSourceType
            };

            const statistics = {
                totalExamples: 0,
                averageQuality: 0,
                difficultyDistribution: {}
            };

            const dataset: EvaluationDataset = {
                id: datasetId,
                name: request.name,
                description: request.description || '',
                operation: request.operation,
                examples: [],
                metadata,
                statistics
            };

            // Save to database
            const stmt = this.db.prepare(`
                INSERT INTO evaluation_datasets (
                    id, name, description, operation, metadata, statistics, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                datasetId,
                request.name,
                request.description || '',
                request.operation,
                JSON.stringify(metadata),
                JSON.stringify(statistics),
                now.toISOString(),
                now.toISOString()
            );

            if (result.changes === 0) {
                throw new Error(`Failed to create dataset with ID: ${datasetId}`);
            }

            // Validate and return the dataset structure
            return EvaluationDatasetSchema.parse(dataset) as EvaluationDataset;
        } catch (error) {
            throw new Error(`Failed to create dataset: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get a dataset by ID with all examples
     */
    public async getDataset(datasetId: string): Promise<EvaluationDataset | null> {
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM evaluation_datasets WHERE id = ?
            `);

            const datasetRow = stmt.get(datasetId) as {
                id: string;
                name: string;
                description: string;
                operation: string;
                metadata: string;
                statistics: string;
                created_at: string;
                updated_at: string;
            } | undefined;

            if (!datasetRow) {
                return null;
            }

            // Get examples for this dataset
            const examples = await this.getDatasetExamples(datasetId);

            const metadata = JSON.parse(datasetRow.metadata);
            const dataset: EvaluationDataset = {
                id: datasetRow.id,
                name: datasetRow.name,
                description: datasetRow.description || '',
                operation: datasetRow.operation as AIOperation,
                examples,
                metadata: {
                    ...metadata,
                    createdAt: new Date(metadata.createdAt),
                    updatedAt: new Date(metadata.updatedAt)
                },
                statistics: JSON.parse(datasetRow.statistics || '{}')
            };

            // Validate the dataset structure
            return EvaluationDatasetSchema.parse(dataset) as EvaluationDataset;
        } catch (error) {
            throw new Error(`Failed to get dataset: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * List all datasets with optional filtering
     */
    public async listDatasets(filters?: {
        operation?: AIOperation;
        createdBy?: string;
        tags?: string[];
        limit?: number;
        offset?: number;
    }): Promise<EvaluationDataset[]> {
        try {
            let sql = 'SELECT * FROM evaluation_datasets';
            const params: (string | number)[] = [];
            const conditions: string[] = [];

            if (filters?.operation) {
                conditions.push('operation = ?');
                params.push(filters.operation);
            }

            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }

            sql += ' ORDER BY created_at DESC';

            if (filters?.limit) {
                sql += ' LIMIT ?';
                params.push(filters.limit);
                
                if (filters?.offset) {
                    sql += ' OFFSET ?';
                    params.push(filters.offset);
                }
            }

            const stmt = this.db.prepare(sql);
            const datasetRows = stmt.all(...params) as {
                id: string;
                name: string;
                description: string;
                operation: string;
                metadata: string;
                statistics: string;
                created_at: string;
                updated_at: string;
            }[];

            const datasets: EvaluationDataset[] = [];

            for (const row of datasetRows) {
                const examples = await this.getDatasetExamples(row.id);
                
                const metadata = JSON.parse(row.metadata);
                const dataset: EvaluationDataset = {
                    id: row.id,
                    name: row.name,
                    description: row.description || '',
                    operation: row.operation as AIOperation,
                    examples,
                    metadata: {
                        ...metadata,
                        createdAt: new Date(metadata.createdAt),
                        updatedAt: new Date(metadata.updatedAt)
                    },
                    statistics: JSON.parse(row.statistics || '{}')
                };

                // Apply additional filters that require parsing metadata
                if (filters?.createdBy) {
                    const metadata = JSON.parse(row.metadata);
                    if (metadata.createdBy !== filters.createdBy) {
                        continue;
                    }
                }

                if (filters?.tags && filters.tags.length > 0) {
                    const metadata = JSON.parse(row.metadata);
                    const hasMatchingTag = filters.tags.some(tag => 
                        metadata.tags && metadata.tags.includes(tag)
                    );
                    if (!hasMatchingTag) {
                        continue;
                    }
                }

                datasets.push(EvaluationDatasetSchema.parse(dataset) as EvaluationDataset);
            }

            return datasets;
        } catch (error) {
            throw new Error(`Failed to list datasets: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get examples for a specific dataset
     */
    public async getDatasetExamples(datasetId: string): Promise<EvaluationExample[]> {
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM evaluation_examples 
                WHERE dataset_id = ? 
                ORDER BY created_at DESC
            `);

            const exampleRows = stmt.all(datasetId) as {
                id: string;
                dataset_id: string;
                input_data: string;
                expected_output: string;
                metadata: string;
                created_at: string;
            }[];

            return exampleRows.map(row => {
                const metadata = JSON.parse(row.metadata || '{}');
                const inputData = JSON.parse(row.input_data);
                const expectedOutputData = JSON.parse(row.expected_output);

                // Clean up input to match interface requirements
                const cleanInput = {
                    ...(inputData.caseData && { caseData: inputData.caseData }),
                    ...(inputData.applicationData && { applicationData: inputData.applicationData }),
                    ...(inputData.step && { step: inputData.step }),
                    ...(inputData.context && { context: inputData.context }),
                    ...(inputData.prompt && { prompt: inputData.prompt })
                };

                // Clean up expected output to match interface requirements
                const cleanExpectedOutput = {
                    content: expectedOutputData.content,
                    quality: expectedOutputData.quality,
                    criteria: {
                        faithfulness: expectedOutputData.criteria.faithfulness,
                        completeness: expectedOutputData.criteria.completeness,
                        relevance: expectedOutputData.criteria.relevance,
                        clarity: expectedOutputData.criteria.clarity,
                        ...(expectedOutputData.criteria.taskSpecific && { 
                            taskSpecific: expectedOutputData.criteria.taskSpecific 
                        })
                    }
                };

                // Clean up metadata
                const cleanMetadata = {
                    tags: metadata.tags || [],
                    difficulty: metadata.difficulty || 'medium' as DifficultyLevel,
                    createdAt: new Date(metadata.createdAt),
                    ...(metadata.sourceInteractionId && { sourceInteractionId: metadata.sourceInteractionId }),
                    ...(metadata.notes && { notes: metadata.notes })
                };

                const example: EvaluationExample = {
                    id: row.id,
                    datasetId: row.dataset_id,
                    input: cleanInput,
                    expectedOutput: cleanExpectedOutput,
                    metadata: cleanMetadata
                };

                return EvaluationExampleSchema.parse(example) as EvaluationExample;
            });
        } catch (error) {
            throw new Error(`Failed to get dataset examples: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Add an example to a dataset
     */
    public async addExampleToDataset(datasetId: string, request: AddExampleRequest): Promise<void> {
        try {
            // First verify the dataset exists
            const dataset = await this.getDataset(datasetId);
            if (!dataset) {
                throw new Error(`Dataset with ID ${datasetId} not found`);
            }

            const exampleId = randomUUID();
            const now = new Date();

            const metadata = {
                tags: request.metadata?.tags || [],
                difficulty: request.metadata?.difficulty || 'medium' as DifficultyLevel,
                createdAt: now,
                ...(request.metadata?.sourceInteractionId && { sourceInteractionId: request.metadata.sourceInteractionId }),
                ...(request.metadata?.notes && { notes: request.metadata.notes })
            };

            // Clean up input to match interface requirements
            const cleanInput = {
                ...(request.input.caseData && { caseData: request.input.caseData }),
                ...(request.input.applicationData && { applicationData: request.input.applicationData }),
                ...(request.input.step && { step: request.input.step }),
                ...(request.input.context && { context: request.input.context }),
                ...(request.input.prompt && { prompt: request.input.prompt })
            };

            // Clean up expected output to match interface requirements
            const cleanExpectedOutput = {
                content: request.expectedOutput.content,
                quality: request.expectedOutput.quality,
                criteria: {
                    faithfulness: request.expectedOutput.criteria.faithfulness,
                    completeness: request.expectedOutput.criteria.completeness,
                    relevance: request.expectedOutput.criteria.relevance,
                    clarity: request.expectedOutput.criteria.clarity,
                    ...(request.expectedOutput.criteria.taskSpecific && { 
                        taskSpecific: request.expectedOutput.criteria.taskSpecific 
                    })
                }
            };

            const example: EvaluationExample = {
                id: exampleId,
                datasetId,
                input: cleanInput,
                expectedOutput: cleanExpectedOutput,
                metadata
            };

            // Validate the example structure
            EvaluationExampleSchema.parse(example);

            // Save to database
            const stmt = this.db.prepare(`
                INSERT INTO evaluation_examples (
                    id, dataset_id, input_data, expected_output, metadata, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                exampleId,
                datasetId,
                JSON.stringify(request.input),
                JSON.stringify(request.expectedOutput),
                JSON.stringify(metadata),
                now.toISOString()
            );

            if (result.changes === 0) {
                throw new Error(`Failed to add example to dataset ${datasetId}`);
            }

            // Update dataset statistics
            await this.updateDatasetStatistics(datasetId);
        } catch (error) {
            throw new Error(`Failed to add example to dataset: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update dataset statistics after adding/removing examples
     */
    private async updateDatasetStatistics(datasetId: string): Promise<void> {
        try {
            const examples = await this.getDatasetExamples(datasetId);
            
            const statistics = {
                totalExamples: examples.length,
                averageQuality: examples.length > 0 
                    ? examples.reduce((sum, ex) => sum + ex.expectedOutput.quality, 0) / examples.length 
                    : 0,
                difficultyDistribution: examples.reduce((dist, ex) => {
                    const difficulty = ex.metadata.difficulty;
                    dist[difficulty] = (dist[difficulty] || 0) + 1;
                    return dist;
                }, {} as Record<string, number>)
            };

            const stmt = this.db.prepare(`
                UPDATE evaluation_datasets 
                SET statistics = ?, updated_at = ? 
                WHERE id = ?
            `);

            const result = stmt.run(
                JSON.stringify(statistics),
                new Date().toISOString(),
                datasetId
            );

            if (result.changes === 0) {
                throw new Error(`Failed to update statistics for dataset ${datasetId}`);
            }
        } catch (error) {
            throw new Error(`Failed to update dataset statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Execute operations in a transaction
     */
    public transaction<T>(operations: () => T): T {
        return this.db.transaction(operations);
    }
}