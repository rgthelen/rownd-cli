import { getConfig, setSelectedApp } from '../config';
import * as readline from 'readline';
import { createOrUpdateToml } from '../utils/toml';

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
    console.error('No account selected. Please select an account first:');
    console.error('rownd account select');
    process.exit(1);
  }

  try {
    console.log('Fetching apps for account:', config.selectedAccountId);
    const response = await fetch(`${config.apiUrl}/accounts/${config.selectedAccountId}/applications`, {
      headers: {
        'Authorization': `Bearer ${config.token}`
      }
    });

    if (response.status === 401) {
      console.error('Authentication required. Please set your JWT token using:');
      console.error('rownd config set-token <your-jwt-token>');
      process.exit(1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Debug info:');
      console.error('Status:', response.status);
      console.error('Status Text:', response.statusText);
      console.error('Response:', errorText);
      console.error('URL:', `${config.apiUrl}/accounts/${config.selectedAccountId}/applications`);
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(`Failed to fetch apps: ${errorData.message || errorText}`);
      } catch (e) {
        throw new Error(`Failed to fetch apps: ${errorText}`);
      }
    }

    const result: AppsResponse = await response.json();
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

export async function displayApps() {
  const apps = await listApps();
  const config = getConfig();
  
  console.log('\nAvailable Apps:');
  console.log('------------------');
  
  if (apps.length > 0) {
    apps.forEach(app => {
      const isSelected = app.id === config.selectedAppId;
      console.log(`${isSelected ? '* ' : '  '}${app.name} (${app.id})`);
    });
    console.log('\n* indicates currently selected app');
  } else {
    console.log('No apps found');
  }
}