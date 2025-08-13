#!/usr/bin/env tsx

import { DatabaseSeeder } from './src/database/seeder.js';

async function clearDatabase() {
  console.log('🧹 Clearing database...');
  
  const seeder = new DatabaseSeeder();
  
  try {
    await seeder.clearDatabase();
    console.log('✅ Database cleared successfully!');
  } catch (error) {
    console.error('❌ Database clearing failed:', error);
    process.exit(1);
  }
}

clearDatabase();
