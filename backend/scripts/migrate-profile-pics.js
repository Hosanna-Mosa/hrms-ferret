const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const https = require('https');
const Employee = require('../models/Employee');
const { isConfigured, uploadToCloudinary } = require('../services/cloudinary');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected for profile picture generation...'))
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get avatar: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

const runMigration = async () => {
  try {
    const employees = await Employee.find({}).exec();
    console.log(`Found ${employees.length} total employees.`);

    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    for (const emp of employees) {
      if (emp.profile_pic) {
        console.log(`Skipping ${emp.full_name} (already has profile photo: ${emp.profile_pic})`);
        continue;
      }

      console.log(`Generating avatar for ${emp.full_name}...`);
      
      // Use RoboHash / Dicebear to generate a beautiful initial/avatar image
      // Dicebear initials style avatar in PNG format
      const seed = encodeURIComponent(emp.full_name);
      const avatarUrl = `https://api.dicebear.com/7.x/initials/png?seed=${seed}&backgroundColor=0064d2,f83600,14885d,e42335`;
      const filename = `avatar-${emp._id}-${Date.now()}.png`;
      const localPath = path.join(uploadDir, filename);

      try {
        await downloadFile(avatarUrl, localPath);
        console.log(`Downloaded avatar to ${localPath}`);

        let finalUrl = `/uploads/${filename}`;

        if (isConfigured) {
          console.log(`Uploading avatar to Cloudinary...`);
          const cloudResult = await uploadToCloudinary(localPath);
          if (cloudResult && cloudResult.secure_url) {
            finalUrl = cloudResult.secure_url;
            console.log(`Uploaded to Cloudinary: ${finalUrl}`);
            // Remove local file
            fs.unlinkSync(localPath);
          }
        }

        emp.profile_pic = finalUrl;
        await emp.save();
        console.log(`Successfully updated profile image for ${emp.full_name}\n`);
      } catch (err) {
        console.error(`Failed to generate profile pic for ${emp.full_name}:`, err.message);
      }
    }

    console.log('Profile picture migration completed successfully.');
    mongoose.disconnect();
  } catch (error) {
    console.error('Migration failed:', error);
    mongoose.disconnect();
  }
};

// Run after a short delay to ensure db is fully linked
setTimeout(runMigration, 1000);
