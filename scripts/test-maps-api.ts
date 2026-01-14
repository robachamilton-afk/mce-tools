import { ENV } from '../server/_core/env';

async function testMapsAPI() {
  const baseUrl = ENV.forgeApiUrl?.replace(/\/+$/, '') || '';
  const url = `${baseUrl}/v1/maps/proxy/maps/api/staticmap?center=-19.8397,147.2106&zoom=18&size=640x640&maptype=satellite&key=${ENV.forgeApiKey}`;
  
  console.log('Testing Google Maps Static API URL:');
  console.log(url);
  console.log('');
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ENV.forgeApiKey}`
      }
    });
    
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    const buffer = await response.arrayBuffer();
    console.log('Response size:', buffer.byteLength, 'bytes');
    
    if (response.status === 200 && buffer.byteLength > 1000) {
      console.log('✅ Image retrieved successfully!');
      
      // Save to file for inspection
      const fs = await import('fs/promises');
      await fs.writeFile('/home/ubuntu/test-satellite-image.png', Buffer.from(buffer));
      console.log('Saved to: /home/ubuntu/test-satellite-image.png');
    } else {
      console.log('❌ Failed to retrieve valid image');
      const text = new TextDecoder().decode(buffer);
      console.log('Response:', text.substring(0, 500));
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testMapsAPI();
