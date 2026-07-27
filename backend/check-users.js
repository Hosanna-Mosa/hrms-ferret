const mongoose = require('mongoose');
require('dotenv').config();

const Role = require('./models/Role');
const User = require('./models/User');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  console.log('\n--- ROLES ---');
  const roles = await Role.find().exec();
  for (const r of roles) {
    console.log(`Role ID: ${r._id}, Name: ${r.name}`);
  }

  console.log('\n--- USERS ---');
  const users = await User.find().populate('role_id').exec();
  for (const u of users) {
    console.log(`User ID: ${u._id}, Email: ${u.work_email}, Role Name: ${u.role_id ? u.role_id.name : 'None'}`);
  }

  await mongoose.disconnect();
}
run();
