#!/usr/bin/env node

import { DatabaseSeeder } from './src/database/seeder.js';

async function seedDatabase() {
  console.log('🌱 Seeding database with sample data...');
  
  const seeder = new DatabaseSeeder();
  
  try {
    await seeder.seedDatabase();
    
    // Show record counts
    const counts = seeder.getRecordCounts();
    console.log('✅ Database seeding completed successfully!');
    console.log('📊 Record counts:');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`  ${table}: ${count} records`);
    });
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase(); 