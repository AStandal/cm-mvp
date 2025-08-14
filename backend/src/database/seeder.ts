import { DatabaseConnection } from './connection.js';
import { CaseStatus, ProcessStep, ApplicationData } from '../types/database.js';
import { v4 as uuidv4 } from 'uuid';

export class DatabaseSeeder {
  private db: DatabaseConnection;
  private recordCount: number;

  constructor(recordCount: number = 20) {
    this.db = DatabaseConnection.getInstance();
    this.recordCount = recordCount;
  }

  /**
   * Create a minimal seeder for tests with only a few records
   */
  static createTestSeeder(): DatabaseSeeder {
    return new DatabaseSeeder(5);
  }

  /**
   * Create a seeder for development with moderate amount of data
   */
  static createDevSeeder(): DatabaseSeeder {
    return new DatabaseSeeder(100);
  }

  /**
   * Create a seeder for production with full dataset
   */
  static createProductionSeeder(): DatabaseSeeder {
    return new DatabaseSeeder(1000);
  }

  public async seedDatabase(): Promise<void> {
    console.log(`Seeding database with ${this.recordCount} sample records...`);

    try {
      // Use a single transaction for all seeding operations
      this.db.transaction(() => {
        // Insert data in order to satisfy foreign key constraints
        // 1. First insert cases (no dependencies)
        this.seedCases();
        
        // 2. Then insert dependent tables (all reference cases.id)
        this.seedAISummaries();
        this.seedCaseNotes();
        this.seedAuditTrail();
        this.seedAIInteractions();
      });
      
      console.log('Database seeding completed successfully');
    } catch (error) {
      console.error('Database seeding failed:', error);
      throw error;
    }
  }

  private seedCases(): void {
    const cases = [];
    
    // Realistic application types with proper categorization
    const applicationTypes = [
      'Business License',
      'Building Permit', 
      'Zoning Variance',
      'Environmental Assessment',
      'Special Event Permit',
      'Food Service License',
      'Liquor License',
      'Sign Permit',
      'Demolition Permit',
      'Renovation Permit'
    ];
    
    // Realistic business types
    const businessTypes = [
      'LLC', 'Corporation', 'Partnership', 'Sole Proprietorship', 'Non-Profit',
      'S-Corporation', 'Limited Partnership', 'Professional Corporation'
    ];
    
    // Realistic project types
    const projectTypes = [
      'Residential', 'Commercial', 'Industrial', 'Mixed-Use', 'Agricultural',
      'Healthcare', 'Educational', 'Recreational', 'Religious', 'Government'
    ];
    
    // Realistic business names
    const businessNamePrefixes = [
      'Nordic', 'Viking', 'Fjord', 'Berg', 'Hav', 'Skog', 'Stav', 'Tron', 'Oslo', 'Bergen',
      'Trondheim', 'Stavanger', 'Kristiansand', 'Tromsø', 'Drammen', 'Fredrikstad', 'Moss', 'Haugesund',
      'Sandnes', 'Bodø', 'Ålesund', 'Tønsberg', 'Hamar', 'Lillehammer', 'Molde', 'Kristiansund',
      'Alta', 'Vardø', 'Honningsvåg', 'Longyearbyen', 'Kirkenes', 'Narvik', 'Mo i Rana', 'Mosjøen'
    ];
    
    const businessNameSuffixes = [
      'Gruppe', 'Konsern', 'Holding', 'Partner', 'Selskap', 'Bedrift', 'Verksted', 'Service',
      'Industri', 'Korporasjon', 'A/S', 'AS', 'Ltd.', 'AB', 'Oy', 'Kommune', 'Fylkeskommune'
    ];
    
    // Realistic street names
    const streetNames = [
      'Kongens Gate', 'Dronningens Gate', 'Karl Johans Gate', 'Storgata', 'Kirkegata', 'Torggata',
      'Markveien', 'Thorvald Meyers Gate', 'Grünerløkka', 'Frognerveien', 'Bygdøy Allé', 'Solli Plass',
      'Aker Brygge', 'Tjuvholmen', 'Vulkan', 'Mathallen', 'Bislett', 'Majorstuen', 'Rikshospitalet',
      'Pilestredet', 'Ullevålsveien', 'Sognsveien', 'Blindernveien', 'Gaustadveien', 'Vinderen',
      'Røa', 'Holmenkollen', 'Tryvann', 'Kolsås', 'Slependen', 'Drammen', 'Hønefoss', 'Kongsberg'
    ];
    
    // Realistic cities and regions
    const cities = [
      'Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Kristiansand', 'Tromsø', 'Drammen', 'Fredrikstad',
      'Moss', 'Haugesund', 'Sandnes', 'Bodø', 'Ålesund', 'Tønsberg', 'Moss', 'Hamar', 'Lillehammer',
      'Molde', 'Kristiansund', 'Alta', 'Vardø', 'Honningsvåg', 'Longyearbyen', 'Kirkenes', 'Narvik',
      'Mo i Rana', 'Mosjøen', 'Mo', 'Fauske', 'Svolvær', 'Leknes', 'Sortland', 'Harstad', 'Finnsnes'
    ];
    
    const states = ['Oslo', 'Viken', 'Vestland', 'Trøndelag', 'Nordland', 'Troms og Finnmark', 'Agder', 'Innlandet'];
    
    // Realistic Norwegian applicant names
    const firstNames = [
      'Erik', 'Mari', 'Johan', 'Ingrid', 'Anders', 'Hanna', 'Mikkel', 'Line', 'Ole', 'Elise',
      'Per', 'Anne', 'Lars', 'Berit', 'Knut', 'Siri', 'Magnus', 'Kari', 'Bjørn', 'Nina',
      'Tor', 'Liv', 'Einar', 'Astrid', 'Gustav', 'Marte', 'Henrik', 'Silje', 'Kristian', 'Ida',
      'Mads', 'Sofie', 'Emil', 'Emma', 'Jakob', 'Nora', 'Lucas', 'Sara', 'Alexander', 'Mia',
      'Daniel', 'Ella', 'William', 'Sofia', 'Oliver', 'Isabella', 'Noah', 'Ava', 'Benjamin', 'Chloe'
    ];
    
    const lastNames = [
      'Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen', 'Nilsen', 'Kristiansen',
      'Jensen', 'Karlsen', 'Eriksen', 'Berg', 'Haugen', 'Hagen', 'Johannessen', 'Andreassen',
      'Jacobsen', 'Dahl', 'Jørgensen', 'Halvorsen', 'Henriksen', 'Lund', 'Sørensen', 'Jakobsen',
      'Moen', 'Solberg', 'Strand', 'Bakke', 'Knutsen', 'Rasmussen', 'Svendsen', 'Torgersen',
      'Gundersen', 'Ødegård', 'Haugland', 'Sandvik', 'Bakken', 'Holm', 'Vik', 'Haug', 'Berglund'
    ];
    
    for (let i = 1; i <= this.recordCount; i++) {
      const caseNum = i.toString().padStart(4, '0');
      const applicationType = applicationTypes[i % applicationTypes.length];
      const isBusinessLicense = applicationType === 'Business License';
      
      // Generate realistic names
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[(i + 5) % lastNames.length];
      const applicantName = `${firstName} ${lastName}`;
      
      // Generate realistic business names
      const businessPrefix = businessNamePrefixes[i % businessNamePrefixes.length];
      const businessSuffix = businessNameSuffixes[i % businessNameSuffixes.length];
      const businessName = `${businessPrefix} ${businessSuffix}`;
      
      // Generate realistic Norwegian addresses
      const streetNumber = 1 + (i % 100) + (Math.floor(Math.random() * 50));
      const streetName = streetNames[i % streetNames.length];
      const city = cities[i % cities.length];
      const region = states[i % states.length];
      // Norwegian postal codes are 4 digits
      const postalCode = 1000 + (i * 10) + (Math.floor(Math.random() * 999));
      const address = `${streetNumber} ${streetName}, ${postalCode} ${city}, ${region}`;
      
      // Generate realistic project names
      const projectName = `${city} ${applicationType.replace(' Permit', '').replace(' License', '')} Project`;
      
      // Generate realistic document names
      const documentTypes = {
        'Business License': ['business_plan', 'financial_statements', 'tax_returns'],
        'Building Permit': ['architectural_plans', 'structural_engineering', 'site_survey'],
        'Zoning Variance': ['zoning_analysis', 'site_plan', 'justification_letter'],
        'Environmental Assessment': ['environmental_study', 'impact_analysis', 'mitigation_plan'],
        'Special Event Permit': ['event_plan', 'security_plan', 'insurance_certificate'],
        'Food Service License': ['kitchen_layout', 'health_inspection', 'menu_plan'],
        'Liquor License': ['business_plan', 'background_check', 'compliance_plan'],
        'Sign Permit': ['sign_design', 'location_plan', 'structural_analysis'],
        'Demolition Permit': ['demolition_plan', 'safety_plan', 'waste_disposal'],
        'Renovation Permit': ['renovation_plans', 'contractor_licenses', 'material_specs']
      };
      
      const docType = (documentTypes as Record<string, string[]>)[applicationType] || ['application_form', 'supporting_docs'];
      const documentName = `${docType[0]}_${caseNum}.pdf`;
      
      const caseData = {
        id: `case-${caseNum}`,
        application_data: JSON.stringify({
          applicantName: applicantName,
          applicantEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
          applicationType: applicationType,
          submissionDate: new Date(2024, 0, 15 + (i % 350), 9 + (i % 8), (i * 15) % 60).toISOString(),
          documents: [
            {
              id: `doc-${caseNum}`,
              filename: documentName,
              path: `/uploads/${documentName}`,
              size: 1024000 + (i * 25000) + (Math.floor(Math.random() * 500000)),
              mimeType: 'application/pdf',
              uploadedAt: new Date(2024, 0, 15 + (i % 350), 9 + (i % 8), (i * 15) % 60).toISOString()
            }
          ],
          formData: isBusinessLicense ? {
            businessName: businessName,
            businessType: businessTypes[i % businessTypes.length],
            address: address,
            phoneNumber: `+47 ${(400 + (i % 100)).toString().padStart(2, '0')} ${(10000 + (i % 10000)).toString().padStart(5, '0')}`,
            website: `www.${businessName.toLowerCase().replace(' ', '').replace('.', '')}.no`,
            industry: ['Teknologi', 'Helse', 'Finans', 'Industri', 'Handel', 'Restaurant', 'Bygg og Anlegg', 'Konsulent'][i % 8]
          } : {
            projectName: projectName,
            projectType: projectTypes[i % projectTypes.length],
            address: address,
            estimatedCost: (50000 + (i * 25000) + (Math.floor(Math.random() * 100000))).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
            estimatedDuration: `${3 + (i % 6)} months`,
            contractor: `${businessName} Bygg og Anlegg`,
            projectManager: applicantName
          }
        } as ApplicationData),
        status: [CaseStatus.ACTIVE, CaseStatus.PENDING, CaseStatus.APPROVED, CaseStatus.ACTIVE][i % 4],
        current_step: [ProcessStep.IN_REVIEW, ProcessStep.ADDITIONAL_INFO_REQUIRED, ProcessStep.READY_FOR_DECISION, ProcessStep.RECEIVED][i % 4],
        created_at: new Date(2024, 0, 15 + (i % 350), 9 + (i % 8), (i * 15) % 60).toISOString(),
        updated_at: new Date(2024, 0, 16 + (i % 350), 14 + (i % 6), (i * 20) % 60).toISOString(),
        assigned_to: `user-${(i % 5 + 1).toString().padStart(3, '0')}`
      };
      
      cases.push(caseData);
    }

    // Use a single prepared statement for all inserts
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO cases (id, application_data, status, current_step, created_at, updated_at, assigned_to)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Execute all inserts in a batch
    for (const caseData of cases) {
      stmt.run(
        caseData.id,
        caseData.application_data,
        caseData.status,
        caseData.current_step,
        caseData.created_at,
        caseData.updated_at,
        caseData.assigned_to
      );
    }

    console.log(`Seeded cases table with ${cases.length} records`);
  }

  private seedAISummaries(): void {
    const summaries = [];
    
    // Realistic AI summary content templates
    const overallSummaryTemplates = [
      'Comprehensive analysis of {caseType} application for {businessName}. Application demonstrates {compliance} compliance with regulatory requirements. All necessary documentation has been submitted and reviewed thoroughly.',
      'Detailed review of {caseType} submission by {businessName}. The application shows {compliance} adherence to local ordinances and building codes. Required permits and certifications are properly documented.',
      'Thorough assessment of {caseType} request from {businessName}. Application exhibits {compliance} understanding of zoning regulations and environmental considerations. Supporting materials are comprehensive and well-organized.',
      'Complete evaluation of {caseType} application submitted by {businessName}. The proposal demonstrates {compliance} knowledge of municipal requirements and industry best practices. Documentation package is thorough and professional.'
    ];
    
    const stepSpecificTemplates = [
      'Step-specific analysis indicates {caseType} application is {progress}. Current documentation meets {step} requirements. {nextSteps}',
      'Process evaluation shows {caseType} application {progress} at {step} stage. Required materials are {completeness}. {nextSteps}',
      'Workflow assessment reveals {caseType} application {progress} through {step} phase. Documentation compliance is {completeness}. {nextSteps}',
      'Progress review indicates {caseType} application {progress} within {step} requirements. Current status shows {completeness}. {nextSteps}'
    ];
    
    const complianceLevels = ['strong', 'moderate', 'adequate', 'excellent', 'satisfactory'];
    const progressIndicators = ['making good progress', 'advancing appropriately', 'moving forward steadily', 'proceeding as expected'];
    const completenessLevels = ['complete', 'substantially complete', 'mostly complete', 'adequately complete'];
    const nextSteps = [
      'Ready to proceed to next phase of review.',
      'Additional documentation may be required for final approval.',
      'Minor adjustments needed before advancing to next step.',
      'Application ready for detailed technical review.',
      'Environmental impact assessment may be necessary.',
      'Zoning compliance verification required.',
      'Building code review in progress.',
      'Safety inspection scheduling recommended.'
    ];
    
    for (let i = 1; i <= this.recordCount; i++) {
      const caseNum = i.toString().padStart(4, '0');
      const caseId = `case-${caseNum}`;
      
      // Get case details for context
      const applicationType = ['Business License', 'Building Permit', 'Zoning Variance', 'Environmental Assessment', 'Special Event Permit', 'Food Service License', 'Liquor License', 'Sign Permit', 'Demolition Permit', 'Renovation Permit'][i % 10];
      const businessName = ['Nordic Gruppe', 'Viking Konsern', 'Fjord Holding', 'Berg Partner', 'Hav Service', 'Skog Industri', 'Stav Verksted', 'Tron Selskap'][i % 8];
      const compliance = complianceLevels[i % complianceLevels.length];
      const progress = progressIndicators[i % progressIndicators.length];
      const completeness = completenessLevels[i % completenessLevels.length];
      const nextStep = nextSteps[i % nextSteps.length];
      
      // Overall summary for each case
      const overallTemplate = overallSummaryTemplates[i % overallSummaryTemplates.length];
      const overallContent = overallTemplate
        .replace('{caseType}', applicationType)
        .replace('{businessName}', businessName)
        .replace('{compliance}', compliance);
      
      summaries.push({
        id: uuidv4(),
        case_id: caseId,
        type: 'overall',
        step: null,
        content: overallContent,
        recommendations: JSON.stringify([
          `Review ${applicationType.toLowerCase()} for completeness and accuracy`,
          `Verify compliance with local regulations and ordinances`,
          `Schedule site inspection if required for ${applicationType.toLowerCase()}`,
          `Confirm all required documentation has been submitted`,
          `Assess environmental impact considerations`
        ]),
        confidence: 0.75 + (i * 0.01) + (Math.random() * 0.15),
        generated_at: new Date(2024, 0, 15 + (i % 350), 10 + (i % 8), 30 + (i * 5) % 30).toISOString(),
        version: 1
      });
      
      // Step-specific summary for each case
      const stepTemplate = stepSpecificTemplates[i % stepSpecificTemplates.length];
      const stepContent = stepTemplate
        .replace('{caseType}', applicationType)
        .replace('{businessName}', businessName)
        .replace('{progress}', progress)
        .replace('{step}', ['in_review', 'additional_info_required', 'ready_for_decision', 'received'][i % 4])
        .replace('{completeness}', completeness)
        .replace('{nextSteps}', nextStep);
      
      summaries.push({
        id: uuidv4(),
        case_id: caseId,
        type: 'step-specific',
        step: [ProcessStep.IN_REVIEW, ProcessStep.ADDITIONAL_INFO_REQUIRED, ProcessStep.READY_FOR_DECISION, ProcessStep.RECEIVED][i % 4],
        content: stepContent,
        recommendations: JSON.stringify([
          `Complete ${['in_review', 'additional_info_required', 'ready_for_decision', 'received'][i % 4].replace(/_/g, ' ')} requirements`,
          `Address any pending items for case ${caseNum}`,
          `Prepare for next phase of processing`,
          `Ensure all documentation meets current standards`,
          `Schedule follow-up review if necessary`
        ]),
        confidence: 0.80 + (i * 0.005) + (Math.random() * 0.10),
        generated_at: new Date(2024, 0, 16 + (i % 350), 9 + (i % 6), 15 + (i * 3) % 45).toISOString(),
        version: 1
      });
    }

    // Use a single prepared statement for all inserts
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO ai_summaries (id, case_id, type, step, content, recommendations, confidence, generated_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Execute all inserts in a batch
    for (const summary of summaries) {
      stmt.run(
        summary.id,
        summary.case_id,
        summary.type,
        summary.step,
        summary.content,
        summary.recommendations,
        summary.confidence,
        summary.generated_at,
        summary.version
      );
    }

    console.log(`Seeded ai_summaries table with ${summaries.length} records`);
  }

  private seedCaseNotes(): void {
    const notes = [];
    
    // Realistic case note content templates
    const initialReviewTemplates = [
      'Initial review completed for {caseType} application. Application {completeness} and {quality} quality. {specifics}',
      'First review of {caseType} submission completed. Documentation {completeness} and demonstrates {quality} preparation. {specifics}',
      'Preliminary assessment of {caseType} request finished. Application package {completeness} with {quality} attention to detail. {specifics}',
      'Opening review of {caseType} application concluded. Materials {completeness} and show {quality} workmanship. {specifics}'
    ];
    
    const followUpTemplates = [
      'Follow-up review for {caseType} application. {status} {nextActions}',
      'Secondary assessment of {caseType} submission completed. {status} {nextActions}',
      'Additional review of {caseType} request finished. {status} {nextActions}',
      'Subsequent evaluation of {caseType} application concluded. {status} {nextActions}'
    ];
    
    const completenessLevels = ['appears comprehensive', 'looks complete', 'seems thorough', 'appears well-prepared', 'looks comprehensive'];
    const qualityLevels = ['excellent', 'good', 'satisfactory', 'professional', 'thorough'];
    const statusLevels = [
      'All requirements have been met satisfactorily.',
      'Minor adjustments are needed before approval.',
      'Additional documentation has been requested.',
      'Application is ready for next phase review.',
      'Some clarifications are required.',
      'Environmental considerations need addressing.',
      'Zoning compliance verification is pending.',
      'Building code review is in progress.'
    ];
    
    const nextActionLevels = [
      'Ready to proceed with approval process.',
      'Contact applicant for additional information.',
      'Schedule site inspection for verification.',
      'Forward to technical review committee.',
      'Request additional supporting documentation.',
      'Coordinate with environmental department.',
      'Verify compliance with local ordinances.',
      'Prepare recommendation for approval.'
    ];
    
    const specificDetails = [
      'Business plan shows strong financial projections and market analysis.',
      'Architectural drawings meet all building code requirements.',
      'Environmental impact assessment is comprehensive and well-researched.',
      'Zoning variance request includes proper justification and supporting evidence.',
      'Special event planning demonstrates attention to safety and logistics.',
      'Food service application includes complete kitchen specifications.',
      'Liquor license request includes proper background documentation.',
      'Sign permit application shows compliance with size and placement regulations.',
      'Demolition plan includes proper safety protocols and waste disposal.',
      'Renovation plans demonstrate understanding of historical preservation requirements.'
    ];
    
    for (let i = 1; i <= this.recordCount; i++) {
      const caseNum = i.toString().padStart(4, '0');
      const caseId = `case-${caseNum}`;
      
      // Get case details for context
      const applicationType = ['Business License', 'Building Permit', 'Zoning Variance', 'Environmental Assessment', 'Special Event Permit', 'Food Service License', 'Liquor License', 'Sign Permit', 'Demolition Permit', 'Renovation Permit'][i % 10];
      const completeness = completenessLevels[i % completenessLevels.length];
      const quality = qualityLevels[i % qualityLevels.length];
      const specifics = specificDetails[i % specificDetails.length];
      const status = statusLevels[i % statusLevels.length];
      const nextActions = nextActionLevels[i % nextActionLevels.length];
      
      // Primary note for each case
      const initialTemplate = initialReviewTemplates[i % initialReviewTemplates.length];
      const initialContent = initialTemplate
        .replace('{caseType}', applicationType)
        .replace('{completeness}', completeness)
        .replace('{quality}', quality)
        .replace('{specifics}', specifics);
      
      notes.push({
        id: uuidv4(),
        case_id: caseId,
        content: initialContent,
        created_by: `user-${(i % 5 + 1).toString().padStart(3, '0')}`,
        created_at: new Date(2024, 0, 16 + (i % 350), 11 + (i % 4), (i * 5) % 60).toISOString()
      });
      
      // Secondary note for each case
      const followUpTemplate = followUpTemplates[i % followUpTemplates.length];
      const followUpContent = followUpTemplate
        .replace('{caseType}', applicationType)
        .replace('{status}', status)
        .replace('{nextActions}', nextActions);
      
      notes.push({
        id: uuidv4(),
        case_id: caseId,
        content: followUpContent,
        created_by: `user-${(i % 5 + 1).toString().padStart(3, '0')}`,
        created_at: new Date(2024, 0, 17 + (i % 350), 15 + (i % 4), (i * 3) % 60).toISOString()
      });
    }

    // Use a single prepared statement for all inserts
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO case_notes (id, case_id, content, created_by, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Execute all inserts in a batch
    for (const note of notes) {
      stmt.run(note.id, note.case_id, note.content, note.created_by, note.created_at);
    }

    console.log(`Seeded case_notes table with ${notes.length} records`);
  }

  private seedAuditTrail(): void {
    const auditEntries = [];
    
    for (let i = 1; i <= this.recordCount; i++) {
      const caseNum = i.toString().padStart(4, '0');
      const caseId = `case-${caseNum}`;
      
      // Case creation entry
      auditEntries.push({
        id: uuidv4(),
        case_id: caseId,
        action: 'case_created',
        details: JSON.stringify({ 
          status: [CaseStatus.ACTIVE, CaseStatus.PENDING, CaseStatus.APPROVED, CaseStatus.ACTIVE][i % 4], 
          step: ProcessStep.RECEIVED 
        }),
        user_id: 'system',
        timestamp: new Date(2024, 0, 15 + (i % 350), 8 + (i % 4), i * 2).toISOString()
      });
      
      // Status change entry
      auditEntries.push({
        id: uuidv4(),
        case_id: caseId,
        action: 'status_changed',
        details: JSON.stringify({ 
          from: ProcessStep.RECEIVED, 
          to: [ProcessStep.IN_REVIEW, ProcessStep.ADDITIONAL_INFO_REQUIRED, ProcessStep.READY_FOR_DECISION, ProcessStep.RECEIVED][i % 4] 
        }),
        user_id: `user-${(i % 5 + 1).toString().padStart(3, '0')}`,
        timestamp: new Date(2024, 0, 16 + (i % 350), 9 + (i % 4), i * 3).toISOString()
      });
      
      // Additional action entry
      auditEntries.push({
        id: uuidv4(),
        case_id: caseId,
        action: i % 2 === 0 ? 'document_uploaded' : 'review_completed',
        details: JSON.stringify({ 
          action_type: i % 2 === 0 ? 'document_upload' : 'review_completion',
          timestamp: new Date(2024, 0, 17 + (i % 350), 14 + (i % 4), i * 5).toISOString()
        }),
        user_id: `user-${(i % 5 + 1).toString().padStart(3, '0')}`,
        timestamp: new Date(2024, 0, 17 + (i % 350), 14 + (i % 4), i * 5).toISOString()
      });
    }

    // Use a single prepared statement for all inserts
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO audit_trail (id, case_id, action, details, user_id, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Execute all inserts in a batch
    for (const entry of auditEntries) {
      stmt.run(entry.id, entry.case_id, entry.action, entry.details, entry.user_id, entry.timestamp);
    }

    console.log(`Seeded audit_trail table with ${auditEntries.length} records`);
  }

  private seedAIInteractions(): void {
    const interactions = [];
    const operations = ['generate_summary', 'generate_recommendation', 'analyze_application', 'validate_compliance', 'assess_risk'];
    const models = ['grok-beta', 'claude-3-opus', 'gpt-4', 'llama-3', 'gemini-pro'];
    
    for (let i = 1; i <= this.recordCount; i++) {
      const caseNum = i.toString().padStart(4, '0');
      const caseId = `case-${caseNum}`;
      
      // Primary interaction for each case
      interactions.push({
        id: uuidv4(),
        case_id: caseId,
        operation: operations[i % operations.length],
        prompt: `Generate analysis for case ${caseNum} with application type ${i % 2 === 0 ? 'business' : 'permit'}...`,
        response: `Analysis completed for case ${caseNum}. ${i % 2 === 0 ? 'Business application shows strong potential' : 'Permit application requires additional review'}.`,
        model: models[i % models.length],
        tokens_used: 150 + (i * 10),
        cost: 0.0015 + (i * 0.0001),
        duration: 2500 + (i * 100),
        success: true,
        error: null,
        timestamp: new Date(2024, 0, 15 + (i % 350), 10 + (i % 8), 30).toISOString()
      });
      
      // Secondary interaction for each case
      interactions.push({
        id: uuidv4(),
        case_id: caseId,
        operation: operations[(i + 1) % operations.length],
        prompt: `Provide recommendations for case ${caseNum} based on current status...`,
        response: `Recommendations generated for case ${caseNum}. ${i % 3 === 0 ? 'Proceed with approval' : i % 3 === 1 ? 'Request additional information' : 'Schedule follow-up review'}.`,
        model: models[(i + 1) % models.length],
        tokens_used: 120 + (i * 8),
        cost: 0.0012 + (i * 0.00008),
        duration: 2200 + (i * 80),
        success: true,
        error: null,
        timestamp: new Date(2024, 0, 16 + (i % 350), 9 + (i % 6), 15).toISOString()
      });
      
      // Third interaction for each case
      interactions.push({
        id: uuidv4(),
        case_id: caseId,
        operation: operations[(i + 2) % operations.length],
        prompt: `Validate compliance requirements for case ${caseNum}...`,
        response: `Compliance validation completed for case ${caseNum}. ${i % 2 === 0 ? 'All requirements met' : 'Minor adjustments needed'}.`,
        model: models[(i + 2) % models.length],
        tokens_used: 180 + (i * 12),
        cost: 0.0018 + (i * 0.00012),
        duration: 3000 + (i * 120),
        success: true,
        error: null,
        timestamp: new Date(2024, 0, 17 + (i % 350), 14 + (i % 6), 20).toISOString()
      });
    }

    // Use a single prepared statement for all inserts
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO ai_interactions (id, case_id, operation, prompt, response, model, tokens_used, cost, duration, success, error, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Execute all inserts in a batch
    for (const interaction of interactions) {
      stmt.run(
        interaction.id,
        interaction.case_id,
        interaction.operation,
        interaction.prompt,
        interaction.response,
        interaction.model,
        interaction.tokens_used,
        interaction.cost,
        interaction.duration,
        interaction.success ? 1 : 0,
        interaction.error,
        interaction.timestamp
      );
    }

    console.log(`Seeded ai_interactions table with ${interactions.length} records`);
  }

  public async clearDatabase(): Promise<void> {
    console.log('Clearing database...');

    const tables = ['ai_interactions', 'audit_trail', 'case_notes', 'ai_summaries', 'cases'];
    const existingTables = this.getExistingTables();
    
    this.db.transaction(() => {
      tables.forEach(table => {
        if (existingTables.includes(table)) {
          try {
            this.db.exec(`DELETE FROM ${table}`);
          } catch (error) {
            console.warn(`Failed to clear table ${table}:`, error);
          }
        }
      });
    });

    console.log('Database cleared');
  }

  public getRecordCounts(): Record<string, number> {
    const tables = ['cases', 'ai_summaries', 'case_notes', 'audit_trail', 'ai_interactions'];
    const counts: Record<string, number> = {};

    // Get list of existing tables first
    const existingTables = this.getExistingTables();

    tables.forEach(table => {
      if (existingTables.includes(table)) {
        try {
          const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`);
          const result = stmt.get() as { count: number };
          counts[table] = result.count;
        } catch (error) {
          console.warn(`Failed to get count for table ${table}:`, error);
          counts[table] = 0;
        }
      } else {
        counts[table] = 0;
      }
    });

    return counts;
  }

  private getExistingTables(): string[] {
    try {
      const stmt = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      const tables = stmt.all() as { name: string }[];
      return tables.map(t => t.name);
    } catch (error) {
      console.warn('Failed to get existing tables:', error);
      return [];
    }
  }
}