require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const Chapter = require('./models/Chapter');

// MongoDB Connection Options
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
};

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, mongooseOptions)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Read and import data
async function importData() {
  try {
    // Read the JSON file
    console.log('Reading JSON file...');
    const jsonData = JSON.parse(fs.readFileSync('./all_subjects_chapter_data.json', 'utf8'));
    console.log(`Found ${jsonData.length} records to import`);
    
    // Clear existing data
    console.log('Clearing existing data...');
    await Chapter.deleteMany({});
    console.log('Existing data cleared');

    // Insert new data
    console.log('Importing new data...');
    const result = await Chapter.insertMany(jsonData);
    console.log(`Successfully imported ${result.length} chapters`);

    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  }
}

// Run the import
importData(); 