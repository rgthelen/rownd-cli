import { getConfig } from '../config';
import ora = require('ora');
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

interface DemoResponse {
  demoId: string;
  demoUrl: string;
  expires: number;
  expiresHuman: string;
  website: string;
}

export async function createDemo(website: string): Promise<void> {
  const spinner = ora('Creating website demo...').start();
  
  try {
    const config = getConfig();
    if (!config.selectedAppId) {
      throw new Error('No app selected. Please run: rownd app select');
    }

    // Try to get app key from multiple sources
    let appKey = process.env.ROWND_APP_KEY;
    
    // If not in process.env, try loading from .env file
    if (!appKey) {
      try {
        const envConfig = dotenv.parse(readFileSync('.env'));
        appKey = envConfig.ROWND_APP_KEY;
      } catch (error) {
        console.warn('Could not read .env file');
      }
    }

    if (!appKey) {
      throw new Error('No app key found. Please ensure ROWND_APP_KEY is set in your .env file');
    }

    spinner.text = 'Creating demo with app key: ' + appKey.substring(0, 10) + '...';

    const response = await fetch('https://rownd-website-demo.fly.dev/create-demo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.analyzerApiKey,
        'x-api-secret': config.analyzerApiSecret
      },
      body: JSON.stringify({
        website: website,
        rowndAppKey: appKey
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create demo: ${await response.text()}`);
    }

    const demo: DemoResponse = await response.json();
    spinner.succeed('Demo created successfully!');
    
    console.log('\n🌐 Demo URL:', demo.demoUrl);
    console.log('🆔 Demo ID:', demo.demoId);
    console.log('⏰ Expires:', demo.expiresHuman);
    console.log('🔗 Rownd App:', `https://app.rownd.io/home/${config.selectedAppId}`);

  } catch (error) {
    spinner.fail('Failed to create demo');
    throw error;
  }
} 