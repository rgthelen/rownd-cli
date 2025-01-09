import { readFileSync } from 'fs';
import { getConfig } from '../config';
import { TokenManager } from '../utils/token-manager';

export async function deployJsonConfig(jsonPath: string): Promise<void> {
  try {
    const config = getConfig();
    if (!config.selectedAppId) {
      console.error('No app selected. Please select an app first:');
      console.error('rownd app select');
      return;
    }

    console.log('Reading JSON configuration...');
    const jsonConfig = JSON.parse(readFileSync(jsonPath, 'utf-8'));

    const tokenManager = TokenManager.getInstance();
    await tokenManager.init();
    const token = await tokenManager.getValidToken();

    console.log('Deploying configuration...');
    const response = await fetch(`${config.apiUrl}/applications/${config.selectedAppId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(jsonConfig)
    });

    if (!response.ok) {
      throw new Error(`Failed to deploy config: ${await response.text()}`);
    }

    console.log('✅ Configuration deployed successfully');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to deploy JSON config:', error.message);
    } else {
      console.error('Failed to deploy JSON config:', error);
    }
  }
} 