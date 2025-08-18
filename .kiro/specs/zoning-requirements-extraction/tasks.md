# Implementation Plan

- [ ] 1. Create zoning data models and types
  - Create TypeScript interfaces for ZoningPlan, ZoningRequirement, RequirementCriteria, and ExtractionMetadata
  - Add zoning-specific error codes and types
  - Update AIOperation type to include zoning operations
  - _Requirements: 1.4, 3.1, 3.3_

- [ ] 2. Extend database schema for zoning requirements
  - Add zoning_plans and zoning_requirements tables to schema.ts
  - Create database indexes for efficient querying
  - Update ai_interactions table operation enum to include zoning operations
  - _Requirements: 1.5, 3.4_

- [ ] 3. Create DocumentProcessor service
  - Implement functionality to send whole PDF documents as context to LLM
  - Implement folder processing for batch operations
  - Create error handling for various document formats
  - _Requirements: 1.1, 2.1, 2.2, 4.1_

- [ ] 4. Extend AIService with zoning requirements extraction
  - Add extractZoningRequirements method that receives whole document files as context from DocumentProcessor
  - Add batchProcessZoningDocuments method for folder processing
  - Ensure LLM receives complete document files as context for analysis
  - Implement proper error handling and retry logic
  - Add AI interaction logging for zoning operations
  - _Requirements: 1.2, 1.3, 2.2, 3.1, 4.2_

- [ ] 5. Create zoning requirements prompt template
  - Add zoning_requirements_extraction_v1 template to PromptTemplateService
  - Define JSON schema for zoning requirements response validation
  - Include proper template parameters and validation rules
  - _Requirements: 1.3, 3.2_

- [ ] 6. Extend DataService with zoning data operations
  - Add saveZoningPlan, getZoningPlan, and getZoningRequirements methods
  - Implement searchZoningRequirements with filtering capabilities
  - Add updateZoningRequirement method for data modifications
  - Follow existing DataService patterns for error handling and transactions
  - _Requirements: 1.5, 3.4_

- [ ] 7. Update service factory and container
  - Add DocumentProcessor to service container interface
  - Update createServices function to instantiate DocumentProcessor
  - Ensure proper dependency injection for all zoning services
  - _Requirements: 3.1_

- [ ] 8. Create zoning API routes
  - Create /api/zoning router following existing route patterns
  - Implement POST /extract endpoint that uses DocumentProcessor to send whole document to LLM
  - Implement POST /batch-process endpoint for folder processing with whole documents
  - Add GET endpoints for retrieving zoning plans and requirements
  - Include proper input validation using Zod schemas
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 9. Add zoning routes to main application
  - Import zoning router in index.ts
  - Mount /api/zoning routes following existing patterns
  - Ensure proper middleware and error handling integration
  - _Requirements: 5.1_

- [ ] 10. Create comprehensive error handling
  - Implement zoning-specific error codes and messages
  - Add retry logic for LLM processing failures
  - Create validation error handling for malformed responses
  - Add proper HTTP status codes for different error scenarios
  - _Requirements: 4.1, 4.2, 4.3, 5.4_

- [ ] 11. Write unit tests for DocumentProcessor
  - Test sending whole PDF documents as context to LLM
  - Test document validation and error scenarios
  - Test folder processing with mixed success/failure cases
  - Test hash calculation for duplicate detection
  - Test that whole documents are properly formatted for LLM context
  - _Requirements: 1.1, 2.1, 4.1_

- [ ] 12. Write unit tests for AIService extensions
  - Test extractZoningRequirements with whole document context and mock LLM responses
  - Test batch processing functionality with multiple whole document contexts
  - Test error handling and retry logic
  - Test AI interaction logging for zoning operations
  - Test that whole documents are properly included in LLM prompts
  - _Requirements: 1.2, 1.3, 2.2, 4.2_

- [ ] 13. Write unit tests for DataService extensions
  - Test zoning plan CRUD operations
  - Test zoning requirements search and filtering
  - Test database transaction handling
  - Test error scenarios and data validation
  - _Requirements: 1.5, 3.4_

- [ ] 14. Write API integration tests
  - Test zoning extraction endpoints with sample PDFs sent as whole documents to LLM
  - Test batch processing endpoints with multiple whole document files
  - Test error responses and validation
  - Test authentication and authorization
  - Test end-to-end flow from document upload to LLM processing to database storage
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 15. Create sample test data and fixtures
  - Create sample zoning plan PDF documents
  - Create mock LLM responses for testing
  - Create database fixtures for integration tests
  - Add edge case documents for error testing
  - _Requirements: 1.1, 2.1, 4.1_