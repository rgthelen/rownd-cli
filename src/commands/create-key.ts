import { getConfig } from '../config';
import { TokenManager } from '../utils/token-manager';

interface ApiKeyResponse {
  name: string;
  client_id: string;
  secret: string;
  application: string;
  app_variant_id: string;
  created_at: string;
  updated_at: string;
}

export async function createApiKey(appId: string, name: string = 'CLI generated'): Promise<ApiKeyResponse | null> {
  try {
    const tokenManager = TokenManager.getInstance();
    await tokenManager.init();
    const token = await tokenManager.getValidToken();

    console.log(`\nCreating API key for app ${appId}...`);
    const response = await fetch(`${getConfig().apiUrl}/applications/${appId}/creds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create API key:', errorText);
      return null;
    }

    const apiKey = await response.json();
    console.log('\n✅ Successfully created API key');
    
    console.log('\nAPI Key Credentials:');
    console.log('-------------------');
    console.log(`App Key: ${apiKey.client_id}`);
    console.log(`App Secret: ${apiKey.secret}`);
    console.log(`Created At: ${apiKey.created_at}`);

    return apiKey;
  } catch (error) {
    console.error('Error creating API key:', error);
    return null;
  }
}
