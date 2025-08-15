#!/usr/bin/env node

import { Command } from 'commander';
import { EvaluationService } from '../services/EvaluationService.js';
import { DataService } from '../services/DataService.js';
import { DatabaseConnection } from '../database/connection.js';
import { DatabaseSchema } from '../database/schema.js';
import { CreateDatasetRequest, AddExampleRequest } from '../types/evaluation.js';
import { AIOperation, DifficultyLevel, DatasetSourceType } from '../types/index.js';
import fs from 'fs';

const program = new Command();

// Initialize services
let evaluationService: EvaluationService;

async function initializeServices() {
    try {
        // Initialize database
        const db = DatabaseConnection.getInstance();
        const schema = new DatabaseSchema();

        // Check if database needs initialization
        try {
            db.prepare('SELECT COUNT(*) FROM evaluation_datasets').get();
        } catch (error) {
            console.log(error)
            console.log('Initializing database schema...');
            schema.initializeSchema();
        }

        // Initialize services
        const dataService = new DataService();
        evaluationService = new EvaluationService(dataService);

        console.log('✅ Services initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize services:', error);
        process.exit(1);
    }
}

// Helper function to validate AI operation
function validateAIOperation(operation: string): AIOperation {
    const validOperations: AIOperation[] = [
        'generate_summary',
        'generate_recommendation',
        'analyze_application',
        'generate_final_summary',
        'validate_completeness',
        'detect_missing_fields'
    ];

    if (!validOperations.includes(operation as AIOperation)) {
        console.error(`❌ Invalid operation. Valid operations: ${validOperations.join(', ')}`);
        process.exit(1);
    }

    return operation as AIOperation;
}

// Helper function to validate difficulty level
function validateDifficulty(difficulty: string): DifficultyLevel {
    const validDifficulties: DifficultyLevel[] = ['easy', 'medium', 'hard'];

    if (!validDifficulties.includes(difficulty as DifficultyLevel)) {
        console.error(`❌ Invalid difficulty. Valid difficulties: ${validDifficulties.join(', ')}`);
        process.exit(1);
    }

    return difficulty as DifficultyLevel;
}

// Helper function to validate source type
function validateSourceType(sourceType: string): DatasetSourceType {
    const validSourceTypes: DatasetSourceType[] = ['manual', 'captured_interactions', 'synthetic'];

    if (!validSourceTypes.includes(sourceType as DatasetSourceType)) {
        console.error(`❌ Invalid source type. Valid source types: ${validSourceTypes.join(', ')}`);
        process.exit(1);
    }

    return sourceType as DatasetSourceType;
}

// Helper function to format dataset for display
function formatDataset(dataset: any, detailed: boolean = false) {
    console.log(`\n📊 Dataset: ${dataset.name}`);
    console.log(`   ID: ${dataset.id}`);
    console.log(`   Operation: ${dataset.operation}`);
    console.log(`   Description: ${dataset.description || 'No description'}`);
    console.log(`   Created by: ${dataset.metadata.createdBy}`);
    console.log(`   Created at: ${new Date(dataset.metadata.createdAt).toLocaleString()}`);
    console.log(`   Tags: ${dataset.metadata.tags.join(', ') || 'None'}`);
    console.log(`   Difficulty: ${dataset.metadata.difficulty}`);
    console.log(`   Source: ${dataset.metadata.sourceType}`);
    console.log(`   Examples: ${dataset.statistics.totalExamples}`);
    console.log(`   Avg Quality: ${dataset.statistics.averageQuality.toFixed(1)}`);

    if (detailed && dataset.examples.length > 0) {
        console.log('\n   📝 Examples:');
        dataset.examples.forEach((example: any, index: number) => {
            console.log(`      ${index + 1}. ${example.input.prompt || 'No prompt'}`);
            console.log(`         Quality: ${example.expectedOutput.quality}/10`);
            console.log(`         Tags: ${example.metadata.tags.join(', ') || 'None'}`);
        });
    }
}

// Command: Create dataset
program
    .command('create')
    .description('Create a new evaluation dataset')
    .requiredOption('-n, --name <name>', 'Dataset name')
    .requiredOption('-o, --operation <operation>', 'AI operation type')
    .requiredOption('-u, --user <user>', 'Created by user')
    .option('-d, --description <description>', 'Dataset description', '')
    .option('-t, --tags <tags>', 'Comma-separated tags', '')
    .option('--difficulty <difficulty>', 'Difficulty level (easy, medium, hard)', 'medium')
    .option('--source <source>', 'Source type (manual, captured_interactions, synthetic)', 'manual')
    .action(async (options) => {
        await initializeServices();

        try {
            const request: CreateDatasetRequest = {
                name: options.name,
                description: options.description,
                operation: validateAIOperation(options.operation),
                metadata: {
                    createdBy: options.user,
                    tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : [],
                    difficulty: validateDifficulty(options.difficulty),
                    sourceType: validateSourceType(options.source)
                }
            };

            const dataset = await evaluationService.createDataset(request);

            console.log('✅ Dataset created successfully!');
            formatDataset(dataset);

        } catch (error) {
            console.error('❌ Failed to create dataset:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

// Command: List datasets
program
    .command('list')
    .description('List evaluation datasets')
    .option('-o, --operation <operation>', 'Filter by operation')
    .option('-u, --user <user>', 'Filter by created by user')
    .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
    .option('-l, --limit <limit>', 'Limit number of results', '10')
    .option('--detailed', 'Show detailed information including examples')
    .action(async (options) => {
        await initializeServices();

        try {
            const filters: any = {
                limit: parseInt(options.limit)
            };

            if (options.operation) {
                filters.operation = validateAIOperation(options.operation);
            }

            if (options.user) {
                filters.createdBy = options.user;
            }

            if (options.tags) {
                filters.tags = options.tags.split(',').map((t: string) => t.trim());
            }

            const datasets = await evaluationService.listDatasets(filters);

            if (datasets.length === 0) {
                console.log('📭 No datasets found matching the criteria.');
                return;
            }

            console.log(`\n📋 Found ${datasets.length} dataset(s):`);
            datasets.forEach(dataset => formatDataset(dataset, options.detailed));

        } catch (error) {
            console.error('❌ Failed to list datasets:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

// Command: Get dataset details
program
    .command('get <id>')
    .description('Get detailed information about a specific dataset')
    .action(async (id) => {
        await initializeServices();

        try {
            const dataset = await evaluationService.getDataset(id);

            if (!dataset) {
                console.error(`❌ Dataset with ID '${id}' not found.`);
                process.exit(1);
            }

            console.log('📊 Dataset Details:');
            formatDataset(dataset, true);

        } catch (error) {
            console.error('❌ Failed to get dataset:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

// Command: Add example from file
program
    .command('add-example')
    .description('Add an example to a dataset')
    .requiredOption('-d, --dataset <id>', 'Dataset ID')
    .requiredOption('-f, --file <file>', 'JSON file containing example data')
    .action(async (options) => {
        await initializeServices();

        try {
            // Check if file exists
            if (!fs.existsSync(options.file)) {
                console.error(`❌ File '${options.file}' not found.`);
                process.exit(1);
            }

            // Read and parse the example file
            const fileContent = fs.readFileSync(options.file, 'utf-8');
            let exampleData: AddExampleRequest;

            try {
                exampleData = JSON.parse(fileContent);
            } catch (parseError) {
                console.error(`❌ Invalid JSON in file '${options.file}':`, parseError);
                process.exit(1);
            }

            // Add the example
            await evaluationService.addExampleToDataset(options.dataset, exampleData);

            console.log('✅ Example added successfully!');

            // Show updated dataset info
            const dataset = await evaluationService.getDataset(options.dataset);
            if (dataset) {
                console.log(`\n📊 Updated dataset statistics:`);
                console.log(`   Total examples: ${dataset.statistics.totalExamples}`);
                console.log(`   Average quality: ${dataset.statistics.averageQuality.toFixed(1)}`);
            }

        } catch (error) {
            console.error('❌ Failed to add example:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

// Command: Add example interactively
program
    .command('add-example-interactive')
    .description('Add an example to a dataset interactively')
    .requiredOption('-d, --dataset <id>', 'Dataset ID')
    .requiredOption('-p, --prompt <prompt>', 'Input prompt')
    .requiredOption('-c, --content <content>', 'Expected output content')
    .requiredOption('-q, --quality <quality>', 'Quality score (1-10)')
    .option('--faithfulness <score>', 'Faithfulness score (1-10)', '5')
    .option('--completeness <score>', 'Completeness score (1-10)', '5')
    .option('--relevance <score>', 'Relevance score (1-10)', '5')
    .option('--clarity <score>', 'Clarity score (1-10)', '5')
    .option('-t, --tags <tags>', 'Comma-separated tags', '')
    .option('--difficulty <difficulty>', 'Difficulty level (easy, medium, hard)', 'medium')
    .option('-n, --notes <notes>', 'Additional notes', '')
    .action(async (options) => {
        await initializeServices();

        try {
            const quality = parseInt(options.quality);
            if (quality < 1 || quality > 10) {
                console.error('❌ Quality score must be between 1 and 10');
                process.exit(1);
            }

            const exampleData: AddExampleRequest = {
                input: {
                    prompt: options.prompt
                },
                expectedOutput: {
                    content: options.content,
                    quality: quality,
                    criteria: {
                        faithfulness: parseInt(options.faithfulness),
                        completeness: parseInt(options.completeness),
                        relevance: parseInt(options.relevance),
                        clarity: parseInt(options.clarity)
                    }
                },
                metadata: {
                    tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : [],
                    difficulty: validateDifficulty(options.difficulty),
                    ...(options.notes && { notes: options.notes })
                }
            };

            await evaluationService.addExampleToDataset(options.dataset, exampleData);

            console.log('✅ Example added successfully!');

            // Show updated dataset info
            const dataset = await evaluationService.getDataset(options.dataset);
            if (dataset) {
                console.log(`\n📊 Updated dataset statistics:`);
                console.log(`   Total examples: ${dataset.statistics.totalExamples}`);
                console.log(`   Average quality: ${dataset.statistics.averageQuality.toFixed(1)}`);
            }

        } catch (error) {
            console.error('❌ Failed to add example:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

// Command: Generate example template
program
    .command('example-template')
    .description('Generate a template JSON file for adding examples')
    .requiredOption('-o, --output <file>', 'Output file path')
    .action((options) => {
        const template = {
            input: {
                prompt: "Generate a summary for this case",
                context: {
                    caseType: "application",
                    priority: "high"
                }
            },
            expectedOutput: {
                content: "This is the expected output content",
                quality: 8,
                criteria: {
                    faithfulness: 9,
                    completeness: 8,
                    relevance: 8,
                    clarity: 7
                }
            },
            metadata: {
                tags: ["test", "example"],
                difficulty: "medium",
                notes: "This is a template example"
            }
        };

        try {
            fs.writeFileSync(options.output, JSON.stringify(template, null, 2));
            console.log(`✅ Example template created at: ${options.output}`);
            console.log('\n📝 Edit the template file and use it with:');
            console.log(`   npm run eval:add-example -- --dataset <dataset-id> --file ${options.output}`);
        } catch (error) {
            console.error('❌ Failed to create template:', error);
            process.exit(1);
        }
    });

// Set up the program
program
    .name('dataset-cli')
    .description('CLI for managing evaluation datasets')
    .version('1.0.0');

// Parse command line arguments
program.parse();