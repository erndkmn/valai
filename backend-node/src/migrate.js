/**
 * Database migration script.
 * Run this to set up the database schema.
 */
require('dotenv').config();

const { sequelize } = require('./database');

async function migrate() {
  try {
    console.log('Starting database migration...');
    
    // Import models to register them
    require('./models');
    
    // Sync all models (force: true will drop and recreate tables)
    // Use force: false in production to preserve data
    const force = process.argv.includes('--force');
    
    if (force) {
      console.log('WARNING: Running with --force will drop all tables!');
      console.log('Waiting 3 seconds... Press Ctrl+C to cancel.');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    await sequelize.sync({ force });
    
    console.log('Database migration completed successfully.');
    console.log('Tables created:');
    
    const [results] = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
    );
    results.forEach(row => console.log(`  - ${row.name}`));
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
