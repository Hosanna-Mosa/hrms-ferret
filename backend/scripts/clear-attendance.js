const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Attendance = require('../models/Attendance');

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  console.log('Initiating Attendance collection reset...');
  
  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in the environment.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    const result = await Attendance.deleteMany({});
    console.log(`Successfully cleared Attendance logs. Deleted ${result.deletedCount} documents.`);

  } catch (err) {
    console.error('Error clearing attendance logs:', err);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

run();
