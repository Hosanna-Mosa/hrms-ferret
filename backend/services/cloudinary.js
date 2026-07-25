const cloudinary = require('cloudinary').v2;
const fs = require('fs');

const isConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name' &&
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_api_key' &&
  process.env.CLOUDINARY_API_SECRET && 
  process.env.CLOUDINARY_API_SECRET !== 'your_cloudinary_api_secret';

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('Cloudinary storage service is configured and active.');
} else {
  console.log('Cloudinary credentials missing or placeholders. Falling back to local disk storage.');
}

/**
 * Uploads a local file to Cloudinary.
 * @param {string} localFilePath - Path to the local file
 * @param {string} folder - Optional folder name in Cloudinary
 * @returns {Promise<{secure_url: string, public_id: string} | null>}
 */
const uploadToCloudinary = async (localFilePath, folder = 'hrms-profile-photos') => {
  if (!isConfigured) {
    return null;
  }
  try {
    const result = await cloudinary.uploader.upload(localFilePath, {
      folder: folder,
      resource_type: 'auto'
    });
    return {
      secure_url: result.secure_url,
      public_id: result.public_id
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  isConfigured,
  uploadToCloudinary
};
