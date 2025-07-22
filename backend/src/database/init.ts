#!/usr/bin/env node

import { DatabaseManager } from './index.js';

async function initializeDatabase() {
  console.log('🚀 Initializing AI Case Management Database...');
  
  const databaseManager = new DatabaseManager();
  
  try {
    // Initialize database with schema and migrations
    await databaseManager.initialize({
      runMigrations: true,
      seedData: false, // Don't seed by default
      dropExisting: false
    });
    
    // Get database status
    const status = databaseManager.getStatus();
    
    console.log('✅ Database initialization completed successfully!');
    console.log(`📍 Database location: ${status.databasePath}`);
    console.log(`🏥 Health status: ${status.isHealthy ? 'Healthy' : 'Unhealthy'}`);
    console.log(`📊 Tables created: ${status.tables.join(', ')}`);
    
    // Show record counts
    const totalRecords = Object.values(status.recordCounts).reduce((sum, count) => sum + count, 0);
    console.log(`📈 Total records: ${totalRecords}`);
    
    if (totalRecords === 0) {
      console.log('💡 Database is empty. You can seed it with sample data using the seeder.');
    }
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    databaseManager.close();
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].includes('init.ts')) {
  initializeDatabase();
}

export { initializeDatabase };