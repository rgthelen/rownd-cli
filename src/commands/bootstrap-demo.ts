import { createApp } from './create-app';
import { analyzeWebsite } from './analyze-website';
import { createDemo } from './create-demo';
import ora = require('ora');
import { readFileSync } from 'fs';
import * as dotenv from 'dotenv';

export async function bootstrapDemo(website: string, appName: string, uploadLogo: boolean = false): Promise<void> {
  const spinner = ora('Starting Rownd demo bootstrap...').start();
  
  try {
    // Step 1: Create the app
    spinner.text = '🏗️ Creating Rownd app...';
    await createApp(appName);
    
    // Read the newly created .env file to get the app key
    const envConfig = dotenv.parse(readFileSync('.env'));
    if (!envConfig.ROWND_APP_KEY) {
      throw new Error('App creation did not generate an app key');
    }

    // Step 2: Analyze website and configure app
    spinner.text = '🔍 Analyzing website and configuring app...';
    await analyzeWebsite(website, appName, uploadLogo);

    // Step 3: Create the demo
    spinner.text = '🌐 Creating demo website...';
    await createDemo(website);

    spinner.succeed('✅ Demo bootstrap complete!');

  } catch (error) {
    spinner.fail('Failed to bootstrap demo');
    throw error;
  }
} 