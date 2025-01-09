import { readFileSync } from 'fs';
import { getConfig } from '../config';
import { TokenManager } from '../utils/token-manager';
import { extname } from 'path';
import ora = require('ora');
import path = require('path');
import { randomBytes } from 'crypto';

type ImageType = 'light' | 'dark' | 'email';

async function processImageUrl(imageUrl: string): Promise<{ buffer: Buffer, filename: string }> {
  const spinner = ora('Processing image...').start();
  
  try {
    // Generate filename
    const randomString = randomBytes(4).toString('hex');
    const originalExt = path.extname(imageUrl).toLowerCase();
    
    // Determine final extension
    // Keep original extension only for PNG and SVG, convert others to PNG
    const finalExt = ['.png', '.svg'].includes(originalExt) ? originalExt : '.png';
    const filename = `logo-${randomString}${finalExt}`;

    // Process image through converter API
    const config = getConfig();
    const response = await fetch(`${config.analyzerUrl}/api/image/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.analyzerApiKey,
        'x-api-secret': config.analyzerApiSecret
      },
      body: JSON.stringify({
        imageUrl,
        'file-name': filename
      })
    });

    if (!response.ok) {
      throw new Error(`Image processing failed: ${await response.text()}`);
    }

    const processedImage = await response.arrayBuffer();
    spinner.succeed('✅ Image processed successfully');
    return {
      buffer: Buffer.from(processedImage),
      filename
    };
  } catch (error) {
    spinner.fail('Failed to process image');
    throw error;
  }
}

export async function uploadImage(imageUrl: string, type: ImageType): Promise<void> {
  const spinner = ora('Uploading image...').start();
  
  try {
    const config = getConfig();
    if (!config.selectedAppId) {
      throw new Error('No app selected. Please run: rownd app select');
    }

    // Process image first
    const { buffer: imageBuffer, filename } = await processImageUrl(imageUrl);

    // Get token
    const tokenManager = TokenManager.getInstance();
    await tokenManager.init();
    const token = await tokenManager.getValidToken();

    // Determine content type from filename
    const contentType = filename.endsWith('.svg') ? 'image/svg+xml' : 'image/png';

    // Upload image
    const response = await fetch(
      `${config.apiUrl}/applications/${config.selectedAppId}/logo/${type}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': contentType,
          'x-rownd-filename': filename
        },
        body: imageBuffer
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to upload image: ${await response.text()}`);
    }

    spinner.succeed(`✅ Successfully uploaded ${type} logo`);
  } catch (error) {
    spinner.fail('Failed to upload image');
    throw error;
  }
} 