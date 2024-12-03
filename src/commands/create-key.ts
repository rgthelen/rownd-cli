import { getConfig } from '../config';

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
  const config = getConfig();

  if (!config.token) {
    console.error('Authentication required. Please set your JWT token using:');
    console.error('rownd config set-token <your-jwt-token>');
    process.exit(1);
  }

  try {
    console.log(`\nCreating API key for app ${appId}...`);
    const response = await fetch(`${config.apiUrl}/applications/${appId}/creds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create API key:', errorText);
      return null;
    }

    const apiKey = await response.json();
    console.log('\n✅ Successfully created API key');
    
    // Display the credentials
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
