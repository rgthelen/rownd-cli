import { getConfig, setSelectedApp } from '../config';
import * as readline from 'readline';
import { createOrUpdateToml } from '../utils/toml';
import { TokenManager } from '../utils/token-manager';

interface RowndApp {
  id: string;
  name: string;
  created_at: string;
}

interface AppsResponse {
  total_results: number;
  results: RowndApp[];
}

export async function listApps(): Promise<RowndApp[]> {
  const config = getConfig();
  
  if (!config.selectedAccountId) {
    console.error('No account selected. Please run: rownd account select');
    process.exit(1);
  }

  try {
    console.log('Fetching apps for account:', config.selectedAccountId);
    const tokenManager = TokenManager.getInstance();
    await tokenManager.init();
    const token = await tokenManager.getValidToken();

    const response = await fetch(`${config.apiUrl}/accounts/${config.selectedAccountId}/applications`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      console.error('Authentication required. Please set your JWT token using:');
      console.error('rownd config set-token <your-jwt-token>');
      process.exit(1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(`Failed to fetch apps: ${errorData.message || errorText}`);
      } catch (e) {
        throw new Error(`Failed to fetch apps: ${errorText}`);
      }
    }

    const result = await response.json();
    console.log(`Found ${result.total_results} apps`);
    return result.results || [];
  } catch (error) {
    console.error('Failed to list apps:', error);
    return [];
  }
}

export async function selectApp(): Promise<void> {
  const apps = await listApps();
  const config = getConfig();

  if (!apps.length) {
    console.log('No apps found');
    return;
  }

  console.log('\nAvailable Apps:');
  console.log('------------------');
  
  apps.forEach((app, index) => {
    const isSelected = app.id === config.selectedAppId;
    console.log(`${index + 1}. ${isSelected ? '* ' : '  '}${app.name} (${app.id})`);
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('\nSelect an app number: ', async (answer) => {
      const index = parseInt(answer) - 1;
      
      if (index >= 0 && index < apps.length) {
        const selectedApp = apps[index];
        await setSelectedApp(selectedApp.id);
        console.log(`\nSelected app: ${selectedApp.name} (${selectedApp.id})`);
        
        // Create/update rownd.toml
        await createOrUpdateToml(selectedApp.id, config);
      } else {
        console.log('Invalid selection');
      }
      
      rl.close();
      resolve();
    });
  });
}

export async function displayApps(accountId: string) {
  try {
    const tokenManager = TokenManager.getInstance();
    await tokenManager.init();
    const token = await tokenManager.getValidToken();

    const config = getConfig();
    const response = await fetch(`${config.apiUrl}/accounts/${accountId}/applications`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Debug - API URL:', `${config.apiUrl}/accounts/${accountId}/applications`);
    console.log('Debug - Token:', token.substring(0, 20) + '...');
    
    console.log('Debug - Response status:', response.status);
    const responseText = await response.text();
    console.log('Debug - Response body:', responseText);

    if (!response.ok) {
      throw new Error(`Failed to fetch apps: ${responseText}`);
    }

    const result = JSON.parse(responseText);
    console.log(`Found ${result.total_results || 0} apps`);
    
    if (result.results && result.results.length > 0) {
      console.log('\nAvailable Apps:');
      console.log('------------------');
      result.results.forEach((app: any) => {
        console.log(`${app.name} (${app.id})`);
      });
    } else {
      console.log('No apps found');
    }
    
    return result.results;
  } catch (error) {
    console.error('Failed to fetch apps:', error);
    throw error;
  }
}