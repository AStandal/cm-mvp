import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import pdfParse from 'pdf-parse';
import {
    ProcessingResult,
    ValidationResult,
    DocumentMetadata
} from '../types/index.js';

export class DocumentProcessor {
    private readonly supportedFormats = ['.pdf'];
    private readonly maxFileSize = 50 * 1024 * 1024; // 50MB

    /**
     * Extract text content from a PDF file
     */
    public async extractTextFromPDF(filePath: string): Promise<string> {
        try {
            // Validate file exists and is readable
            await fs.access(filePath, fs.constants.R_OK);

            // Read the PDF file
            const dataBuffer = await fs.readFile(filePath);

            // Parse PDF and extract text
            const pdfData = await pdfParse(dataBuffer);

            if (!pdfData.text || pdfData.text.trim().length === 0) {
                throw new Error('PDF contains no extractable text');
            }

            return pdfData.text;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
        }
    }

    /**
     * Process all PDF files in a folder
     */
    public async processFolder(folderPath: string): Promise<ProcessingResult[]> {
        const results: ProcessingResult[] = [];

        try {
            // Check if folder exists
            const folderStats = await fs.stat(folderPath);
            if (!folderStats.isDirectory()) {
                throw new Error(`Path is not a directory: ${folderPath}`);
            }

            // Get all files in the folder
            const files = await fs.readdir(folderPath);
            const pdfFiles = files.filter(file =>
                this.supportedFormats.includes(path.extname(file).toLowerCase())
            );

            if (pdfFiles.length === 0) {
                console.warn(`No PDF files found in folder: ${folderPath}`);
                return results;
            }

            // Process each PDF file
            for (const file of pdfFiles) {
                const filePath = path.join(folderPath, file);
                const startTime = Date.now();

                try {
                    // Validate the document first
                    const validation = await this.validateDocument(filePath);
                    if (!validation.isValid) {
                        results.push({
                            documentPath: filePath,
                            success: false,
                            error: `Validation failed: ${validation.errors.join(', ')}`,
                            processingTime: Date.now() - startTime
                        });
                        continue;
                    }

                    // Extract text (this will be used by AIService later)
                    const text = await this.extractTextFromPDF(filePath);

                    // Create document metadata (text parameter not used but kept for future extensibility)
                    await this.createDocumentMetadata(filePath, text);

                    results.push({
                        documentPath: filePath,
                        success: true,
                        processingTime: Date.now() - startTime
                        // Note: zoningPlan will be populated by AIService after LLM processing
                    });

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    results.push({
                        documentPath: filePath,
                        success: false,
                        error: errorMessage,
                        processingTime: Date.now() - startTime
                    });
                }
            }

            return results;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to process folder: ${errorMessage}`);
        }
    }

    /**
     * Validate a document before processing
     */
    public async validateDocument(filePath: string): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Check if file exists
            try {
                await fs.access(filePath, fs.constants.R_OK);
            } catch {
                errors.push('File does not exist or is not readable');
                return { isValid: false, errors, warnings };
            }

            // Check file extension
            const ext = path.extname(filePath).toLowerCase();
            if (!this.supportedFormats.includes(ext)) {
                errors.push(`Unsupported file format: ${ext}. Supported formats: ${this.supportedFormats.join(', ')}`);
            }

            // Check file size
            const stats = await fs.stat(filePath);
            if (stats.size === 0) {
                errors.push('File is empty');
            } else if (stats.size > this.maxFileSize) {
                errors.push(`File size (${Math.round(stats.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(this.maxFileSize / 1024 / 1024)}MB)`);
            }

            // Try to read PDF structure (basic validation)
            if (ext === '.pdf' && errors.length === 0) {
                try {
                    const dataBuffer = await fs.readFile(filePath);

                    // Check PDF header
                    const header = dataBuffer.subarray(0, 5).toString();
                    if (!header.startsWith('%PDF-')) {
                        errors.push('Invalid PDF file format');
                    }

                    // Try to parse PDF to check if it's corrupted
                    await pdfParse(dataBuffer);

                } catch (error) {
                    errors.push(`PDF validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings
            };

        } catch (error) {
            errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return { isValid: false, errors, warnings };
        }
    }

    /**
     * Create document metadata for a file
     */
    public async createDocumentMetadata(filePath: string, _extractedText?: string): Promise<DocumentMetadata> {
        const stats = await fs.stat(filePath);
        const fileName = path.basename(filePath);

        // Calculate document hash
        const documentHash = await this.calculateDocumentHash(filePath);

        // Get page count from PDF
        let pageCount = 0;
        try {
            const dataBuffer = await fs.readFile(filePath);
            const pdfData = await pdfParse(dataBuffer);
            pageCount = pdfData.numpages;
        } catch (error) {
            console.warn(`Could not determine page count for ${filePath}:`, error);
        }

        return {
            fileName,
            filePath,
            fileSize: stats.size,
            pageCount,
            documentHash
        };
    }

    /**
     * Calculate SHA-256 hash of a document for duplicate detection
     */
    private async calculateDocumentHash(filePath: string): Promise<string> {
        try {
            const fileBuffer = await fs.readFile(filePath);
            const hash = crypto.createHash('sha256');
            hash.update(fileBuffer);
            return hash.digest('hex');
        } catch (error) {
            throw new Error(`Failed to calculate document hash: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get the default zoning plan data folder path
     */
    public getZoningPlanDataPath(): string {
        return path.join(process.cwd(), 'zoning-plan-data');
    }

    /**
     * List all PDF files in the zoning plan data folder
     */
    public async listZoningPlanFiles(): Promise<string[]> {
        const folderPath = this.getZoningPlanDataPath();

        try {
            const files = await fs.readdir(folderPath);
            return files
                .filter(file => this.supportedFormats.includes(path.extname(file).toLowerCase()))
                .map(file => path.join(folderPath, file));
        } catch (error) {
            throw new Error(`Failed to list zoning plan files: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}