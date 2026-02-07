/**
 * Database configuration and connection setup using Sequelize.
 */
const { Sequelize } = require('sequelize');
const path = require('path');

// Database path - use absolute path to avoid working directory issues
const dbPath = path.resolve(__dirname, '..', 'valai.db');

// Create Sequelize instance with explicit storage option
const sequelize = process.env.DATABASE_URL 
  ? new Sequelize(process.env.DATABASE_URL, {
      logging: false,
      define: {
        underscored: true,
        timestamps: true,
      },
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: dbPath,
      logging: false,
      define: {
        underscored: true,
        timestamps: true,
      },
    });

/**
 * Initialize the database by syncing all models.
 * Call this on application startup.
 */
async function initDb() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');
    
    // Import models to register them
    require('./models');
    
    // Sync all models
    await sequelize.sync();
    console.log('Database synchronized.');
  } catch (error) {
    console.error('Unable to connect to database:', error);
    throw error;
  }
}

module.exports = {
  sequelize,
  initDb,
};
