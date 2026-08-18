import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('--------------------------------------------------');
console.log('🔍 Testing Cloudinary Credentials...');
console.log('Cloud Name:', cloudName);
console.log('API Key:', apiKey ? '***' + apiKey.slice(-4) : 'Not set');
console.log('--------------------------------------------------');

if (!cloudName || !apiKey || !apiSecret || cloudName === 'your_cloud_name') {
    console.error('❌ Error: Cloudinary credentials are missing or default placeholder in backend/.env file!');
    process.exit(1);
}

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
});

async function testConnection() {
    try {
        const pingRes = await cloudinary.api.ping();
        console.log('✅ Cloudinary Connection Test Successful! Ping response:', pingRes);

        // Test uploading a sample image to verify write permissions
        console.log('⏳ Attempting sample image upload...');
        const uploadRes = await cloudinary.uploader.upload('https://res.cloudinary.com/demo/image/upload/sample.jpg', {
            folder: 'ecommerce/test'
        });
        console.log('✅ Sample Image Upload Successful!');
        console.log('   Public ID:', uploadRes.public_id);
        console.log('   URL:', uploadRes.secure_url);

        // Clean up test image
        await cloudinary.uploader.destroy(uploadRes.public_id);
        console.log('✅ Test cleanup successful!');
        console.log('🎉 Cloudinary configuration is working perfectly!');
    } catch (error) {
        console.error('❌ Cloudinary Test Failed!');
        console.error('Error Details:', error.message);
    }
}

testConnection();
