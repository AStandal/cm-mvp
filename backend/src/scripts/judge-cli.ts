#!/usr/bin/env node

import { Command } from 'commander';
import { JudgeEvaluationService } from '../services/JudgeEvaluationService.js';
import { OpenRouterClient } from '../services/OpenRouterClient.js';
import { PromptTemplateService } from '../services/PromptTemplateService.js';
import { DatabaseConnection } from '../database/connection.js';
import { DatabaseSchema } from '../database/schema.js';
import { EvaluateOutputRequest, JudgeEvaluationResult, AvailableEvaluationModel } from '../types/evaluation.js';
import fs from 'fs';
import path from 'path';

const program = new Command();

// Initialize services
let judgeEvaluationService: JudgeEvaluationService;

async function initializeServices() {
    try {
        // Initialize database
        const db = DatabaseConnection.getInstance();
        const schema = new DatabaseSchema();

        // Check if database needs initialization
        try {
            db.prepare('SELECT COUNT(*) FROM judge_evaluations').get();
        } catch {
            console.log('Initializing database schema...');
            schema.initializeSchema();
        }

        // Initialize OpenRouter client
        const openRouterConfig = {
            modelId: process.env.DEFAULT_MODEL || 'openai/gpt-4',
            provider: 'openrouter' as const,
            apiKey: process.env.OPENROUTER_API_KEY || '',
            baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
            timeoutMs: 30000
        };

        if (!openRouterConfig.apiKey) {
            console.warn('⚠️  OPENROUTER_API_KEY environment variable not set. Using test mode.');
            openRouterConfig.apiKey = 'test-key';
        }

        const openRouterClient = new OpenRouterClient(openRouterConfig, process.env.NODE_ENV === 'test' || openRouterConfig.apiKey === 'test-key');
        const promptTemplateService = new PromptTemplateService();
        judgeEvaluationService = new JudgeEvaluationService(openRouterClient, promptTemplateService);

        console.log('✅ Services initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize services:', error);
        process.exit(1);
    }
}

// Helper function to load configuration from file
function loadConfig(configPath?: string): any {
    if (!configPath) {
        return {};
    }

    try {
        if (!fs.existsSync(configPath)) {
            console.error(`❌ Configuration file '${configPath}' not found.`);
            process.exit(1);
        }

        const configContent = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(configContent);
    } catch (error) {
        console.error(`❌ Failed to load configuration file '${configPath}':`, error);
        process.exit(1);
    }
}

// Helper function to format evaluation result for display
function formatEvaluationResult(result: JudgeEvaluationResult, detailed: boolean = false) {
    console.log(`\n🎯 Evaluation Result:`);
    console.log(`   ID: ${result.id}`);
    console.log(`   Interaction ID: ${result.interactionId}`);
    console.log(`   Model: ${result.evaluationModel}`);
    console.log(`   Evaluated at: ${new Date(result.metadata.evaluatedAt).toLocaleString()}`);
    console.log(`   Duration: ${result.metadata.evaluationDuration}ms`);
    console.log(`   Confidence: ${(result.metadata.confidence * 100).toFixed(1)}%`);
    
    if (result.metadata.evaluationCost) {
        console.log(`   Cost: $${result.metadata.evaluationCost.toFixed(4)}`);
    }
    
    if (result.metadata.evaluationTokens) {
        console.log(`   Tokens: ${result.metadata.evaluationTokens}`);
    }

    console.log(`\n📊 Scores:`);
    console.log(`   Overall: ${result.scores.overall}/10`);
    console.log(`   Faithfulness: ${result.scores.faithfulness}/10`);
    console.log(`   Completeness: ${result.scores.completeness}/10`);
    console.log(`   Relevance: ${result.scores.relevance}/10`);
    console.log(`   Clarity: ${result.scores.clarity}/10`);

    if (result.scores.taskSpecific) {
        console.log(`   Task-specific scores:`);
        Object.entries(result.scores.taskSpecific).forEach(([criterion, score]) => {
            console.log(`     ${criterion}: ${score}/10`);
        });
    }

    if (result.metadata.flags && result.metadata.flags.length > 0) {
        console.log(`\n🏷️  Flags: ${result.metadata.flags.join(', ')}`);
    }

    if (detailed) {
        console.log(`\n💭 Reasoning:`);
        console.log(`   Overall: ${result.reasoning.overall}`);
        console.log(`   Faithfulness: ${result.reasoning.faithfulness}`);
        console.log(`   Completeness: ${result.reasoning.completeness}`);
        console.log(`   Relevance: ${result.reasoning.relevance}`);
        console.log(`   Clarity: ${result.reasoning.clarity}`);

        if (result.reasoning.taskSpecific) {
            console.log(`   Task-specific reasoning:`);
            Object.entries(result.reasoning.taskSpecific).forEach(([criterion, reasoning]) => {
                console.log(`     ${criterion}: ${reasoning}`);
            });
        }
    }
}

// Helper function to format model for display
function formatModel(model: AvailableEvaluationModel) {
    console.log(`\n🤖 ${model.name} (${model.id})`);
    console.log(`   Provider: ${model.provider}`);
    console.log(`   Description: ${model.description || 'No description'}`);
    console.log(`   Recommended: ${model.recommended ? '✅' : '❌'}`);
    
    if (model.costPer1kTokens) {
        console.log(`   Cost per 1k tokens: $${model.costPer1kTokens.toFixed(4)}`);
    }
    
    if (model.maxTokens) {
        console.log(`   Max tokens: ${model.maxTokens.toLocaleString()}`);
    }
    
    console.log(`   Supported criteria: ${model.supportedCriteria.join(', ')}`);
}

// Helper function to save result to file
function saveResultToFile(result: JudgeEvaluationResult, outputPath: string) {
    try {
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log(`💾 Result saved to: ${outputPath}`);
    } catch (error) {
        console.error(`❌ Failed to save result to file '${outputPath}':`, error);
    }
}

// Command: Evaluate AI interaction
program
    .command('evaluate')
    .description('Evaluate an AI interaction using LLM-as-a-Judge')
    .requiredOption('-i, --interaction <id>', 'AI interaction ID to evaluate')
    .requiredOption('-m, --model <model>', 'Evaluation model to use')
    .option('-c, --criteria <criteria>', 'Evaluation criteria (comma-separated)', 'faithfulness,completeness,relevance,clarity')
    .option('--custom-criteria <file>', 'JSON file with custom criteria definitions')
    .option('--few-shot <file>', 'JSON file with few-shot examples')
    .option('--config <file>', 'Configuration file path')
    .option('--chain-of-thought', 'Enable chain-of-thought reasoning', true)
    .option('--no-chain-of-thought', 'Disable chain-of-thought reasoning')
    .option('--bias-mitigation', 'Enable bias mitigation', true)
    .option('--no-bias-mitigation', 'Disable bias mitigation')
    .option('--max-retries <retries>', 'Maximum number of retries', '3')
    .option('--timeout <ms>', 'Timeout in milliseconds', '30000')
    .option('-o, --output <file>', 'Save result to JSON file')
    .option('--detailed', 'Show detailed reasoning in output')
    .action(async (options) => {
        await initializeServices();

        try {
            // Load configuration if provided
            const config = loadConfig(options.config);

            // Parse criteria
            const criteria = options.criteria.split(',').map((c: string) => c.trim());
            const validCriteria = ['faithfulness', 'completeness', 'relevance', 'clarity'];
            const invalidCriteria = criteria.filter((c: string) => !validCriteria.includes(c));
            
            if (invalidCriteria.length > 0) {
                console.error(`❌ Invalid criteria: ${invalidCriteria.join(', ')}`);
                console.error(`Valid criteria: ${validCriteria.join(', ')}`);
                process.exit(1);
            }

            // Load custom criteria if provided
            let customCriteria: Record<string, string> | undefined;
            if (options.customCriteria) {
                try {
                    const customCriteriaContent = fs.readFileSync(options.customCriteria, 'utf-8');
                    customCriteria = JSON.parse(customCriteriaContent);
                } catch (error) {
                    console.error(`❌ Failed to load custom criteria from '${options.customCriteria}':`, error);
                    process.exit(1);
                }
            }

            // Load few-shot examples if provided
            let fewShotExamples: any[] | undefined;
            if (options.fewShot) {
                try {
                    const fewShotContent = fs.readFileSync(options.fewShot, 'utf-8');
                    fewShotExamples = JSON.parse(fewShotContent);
                } catch (error) {
                    console.error(`❌ Failed to load few-shot examples from '${options.fewShot}':`, error);
                    process.exit(1);
                }
            }

            // Build evaluation request
            const evaluateRequest: EvaluateOutputRequest = {
                input: {
                    interactionId: options.interaction,
                    evaluationModel: options.model,
                    criteria: criteria as any,
                    ...(customCriteria && { customCriteria }),
                    ...(fewShotExamples && { fewShotExamples })
                },
                options: {
                    includeChainOfThought: options.chainOfThought,
                    includeBiasMitigation: options.biasMitigation,
                    maxRetries: parseInt(options.maxRetries),
                    timeoutMs: parseInt(options.timeout),
                    ...config.options
                }
            };

            console.log(`🔍 Evaluating interaction ${options.interaction} with model ${options.model}...`);
            
            const result = await judgeEvaluationService.evaluateOutput(evaluateRequest);

            formatEvaluationResult(result, options.detailed);

            // Save to file if requested
            if (options.output) {
                saveResultToFile(result, options.output);
            }

        } catch (error) {
            console.error('❌ Failed to evaluate interaction:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

// Command: List available models
program
    .command('models')
    .description('List available evaluation models')
    .option('--recommended-only', 'Show only recommended models')
    .option('--provider <provider>', 'Filter by provider')
    .option('-o, --output <file>', 'Save models list to JSON file')
    .action(async (options) => {
        await initializeServices();

        try {
            console.log('🔍 Fetching available evaluation models...');
            
            let models = await judgeEvaluationService.getAvailableEvaluationModels();

            // Apply filters
            if (options.recommendedOnly) {
                models = models.filter(model => model.recommended);
            }

            if (options.provider) {
                models = models.filter(model => 
                    model.provider.toLowerCase().includes(options.provider.toLowerCase())
                );
            }

            if (models.length === 0) {
                console.log('📭 No models found matching the criteria.');
                return;
            }

            console.log(`\n🤖 Found ${models.length} evaluation model(s):`);
            models.forEach(formatModel);

            // Save to file if requested
            if (options.output) {
                try {
                    const outputDir = path.dirname(options.output);
                    if (!fs.existsSync(outputDir)) {
                        fs.mkdirSync(outputDir, { recursive: true });
                    }

                    fs.writeFileSync(options.output, JSON.stringify(models, null, 2));
                    console.log(`💾 Models list saved to: ${options.output}`);
                } catch (error) {
                    console.error(`❌ Failed to save models to file '${options.output}':`, error);
                }
            }

        } catch (error) {
            console.error('❌ Failed to fetch models:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });

// Command: Generate configuration template
program
    .command('config-template')
    .description('Generate a configuration template file')
    .requiredOption('-o, --output <file>', 'Output file path')
    .action((options) => {
        const template = {
            options: {
                includeChainOfThought: true,
                includeBiasMitigation: true,
                maxRetries: 3,
                timeoutMs: 30000
            },
            defaultModel: "openai/gpt-4",
            defaultCriteria: ["faithfulness", "completeness", "relevance", "clarity"],
            customCriteria: {
                "technical_accuracy": "How technically accurate and correct is the response?",
                "user_friendliness": "How user-friendly and accessible is the response?"
            },
            fewShotExamples: [
                {
                    input: "Generate a summary for this case",
                    output: "This is a well-structured summary that covers all key points.",
                    score: 8,
                    reasoning: "Good coverage and clarity, but could be more concise."
                },
                {
                    input: "Analyze the application completeness",
                    output: "The application is missing required documents X and Y.",
                    score: 9,
                    reasoning: "Accurate identification of missing elements with clear explanation."
                }
            ]
        };

        try {
            const outputDir = path.dirname(options.output);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            fs.writeFileSync(options.output, JSON.stringify(template, null, 2));
            console.log(`✅ Configuration template created at: ${options.output}`);
            console.log('\n📝 Edit the template file and use it with:');
            console.log(`   npm run eval:judge-evaluate -- --config ${options.output} --interaction <id> --model <model>`);
        } catch (error) {
            console.error('❌ Failed to create configuration template:', error);
            process.exit(1);
        }
    });

// Command: Generate custom criteria template
program
    .command('criteria-template')
    .description('Generate a custom criteria template file')
    .requiredOption('-o, --output <file>', 'Output file path')
    .action((options) => {
        const template = {
            "technical_accuracy": "How technically accurate and factually correct is the response?",
            "user_friendliness": "How user-friendly and accessible is the response for the target audience?",
            "actionability": "How actionable and practical are the recommendations provided?",
            "compliance": "How well does the response adhere to relevant regulations and standards?",
            "efficiency": "How efficiently does the response address the core requirements?"
        };

        try {
            const outputDir = path.dirname(options.output);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            fs.writeFileSync(options.output, JSON.stringify(template, null, 2));
            console.log(`✅ Custom criteria template created at: ${options.output}`);
            console.log('\n📝 Edit the template file and use it with:');
            console.log(`   npm run eval:judge-evaluate -- --custom-criteria ${options.output} --interaction <id> --model <model>`);
        } catch (error) {
            console.error('❌ Failed to create criteria template:', error);
            process.exit(1);
        }
    });

// Command: Generate few-shot examples template
program
    .command('few-shot-template')
    .description('Generate a few-shot examples template file')
    .requiredOption('-o, --output <file>', 'Output file path')
    .action((options) => {
        const template = [
            {
                input: "Generate a summary for this case",
                output: "This is a comprehensive summary that covers all the key points of the case, including the applicant information, submission details, and current status. The summary is well-structured and provides clear next steps.",
                score: 9,
                reasoning: "Excellent coverage of all key points with clear structure and actionable next steps. Very high quality response."
            },
            {
                input: "Analyze application completeness",
                output: "The application appears to be missing several required documents including proof of identity and supporting documentation. Please request these from the applicant.",
                score: 8,
                reasoning: "Accurate identification of missing elements with clear action items. Good practical response."
            },
            {
                input: "Provide recommendations for this case",
                output: "Based on the case details, I recommend proceeding with standard processing workflow. The application meets basic requirements.",
                score: 6,
                reasoning: "Provides basic recommendation but lacks detail and specific reasoning. Could be more comprehensive."
            }
        ];

        try {
            const outputDir = path.dirname(options.output);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            fs.writeFileSync(options.output, JSON.stringify(template, null, 2));
            console.log(`✅ Few-shot examples template created at: ${options.output}`);
            console.log('\n📝 Edit the template file and use it with:');
            console.log(`   npm run eval:judge-evaluate -- --few-shot ${options.output} --interaction <id> --model <model>`);
        } catch (error) {
            console.error('❌ Failed to create few-shot template:', error);
            process.exit(1);
        }
    });

// Set up the program
program
    .name('judge-cli')
    .description('CLI for LLM-as-a-Judge evaluation of AI interactions')
    .version('1.0.0');

// Parse command line arguments
program.parse();