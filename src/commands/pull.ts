import { getConfig } from '../config';
import { createOrUpdateToml } from '../utils/toml';

export async function pullConfig() {
  const config = getConfig();
  
  if (!config.selectedAppId) {
    console.error('No app selected. Please select an app first:');
    console.error('rownd app select');
    process.exit(1);
  }

  try {
    console.log('Fetching latest configuration from Rownd...');
    await createOrUpdateToml(config.selectedAppId, config);
    console.log('✅ Local configuration updated successfully');
  } catch (error) {
    console.error('Failed to pull configuration:', error);
    process.exit(1);
  }
} 