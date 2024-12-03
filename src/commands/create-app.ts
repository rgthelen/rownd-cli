import { getConfig } from '../config';
import { writeFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { setSelectedApp } from '../config';
import { createOrUpdateToml } from '../utils/toml';

interface ApplicationResponse {
  id: string;
  name: string;
  app_key?: string;
  app_secret?: string;
  created_at: string;
}

interface ApiKeyResponse {
  name: string;
  client_id: string;
  secret: string;
  application: string;
  app_variant_id: string;
  created_at: string;
  updated_at: string;
}

function generateSubdomain(name: string): string {
  const randomString = randomBytes(3).toString('hex');
  const namePrefix = name.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 20);
  
  return `${namePrefix}-${randomString}`;
}

async function createApiKey(appId: string, config: any): Promise<ApiKeyResponse | null> {
  try {
    console.log('\nCreating API key...');
    const response = await fetch(`${config.apiUrl}/applications/${appId}/creds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'CLI generated'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create API key:', errorText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating API key:', error);
    return null;
  }
}

export async function createApp(name: string) {
  const config = getConfig();
  
  if (!config.selectedAccountId) {
    console.error('No account selected. Please select an account first:');
    console.error('rownd select');
    process.exit(1);
  }

  const subdomain = generateSubdomain(name);
  console.log(`Creating app "${name}" with subdomain "${subdomain}" for account ${config.selectedAccountId}...`);

  const appConfig = {
    name: name,
    account: config.selectedAccountId,
    description: "",
    hub: {
      customizations: {
        rounded_corners: true,
        visual_swoops: true,
        blur_background: true,
        dark_mode: "auto"
      },
      auth: {
        sign_in_methods: {
          email: {
            enabled: true
          },
          phone: {
            enabled: false
          },
          apple: {
            enabled: false,
            client_id: ""
          },
          google: {
            enabled: false,
            client_id: "",
            client_secret: "",
            ios_client_id: "",
            scopes: []
          },
          crypto_wallet: {
            enabled: false
          },
          passkeys: {
            enabled: false,
            registration_prompt_frequency: "14d"
          },
          anonymous: {
            enabled: true
          }
        },
        show_app_icon: false
      }
    },
    subdomain: subdomain,
    profile_storage_version: "v2"
  };

  try {
    console.log('Sending request to create app...');
    const createResponse = await fetch(`${config.apiUrl}/applications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(appConfig)
    });

    console.log(`Response status: ${createResponse.status} ${createResponse.statusText}`);

    if (!createResponse.ok) {
      const responseText = await createResponse.text();
      try {
        const errorData = JSON.parse(responseText);
        console.error('Failed to create app:', errorData.message || responseText);
      } catch {
        console.error('Failed to create app. Response:', responseText);
      }
      process.exit(1);
    }

    const app: ApplicationResponse = await createResponse.json();
    console.log(`\n✅ Successfully created app: ${app.name} (${app.id})`);
    console.log(` Subdomain: ${subdomain}`);

    // Set as selected app
    await setSelectedApp(app.id);
    console.log('✅ Set as current app');

    // Create API key
    const apiKey = await createApiKey(app.id, config);
    
    if (!apiKey) {
      console.error('Failed to create API key');
      process.exit(1);
    }

    // Create .env file with credentials
    const envContent = `
ROWND_APP_ID=${app.id}
ROWND_SUBDOMAIN=${subdomain}
ROWND_APP_KEY=${apiKey.client_id}
ROWND_APP_SECRET=${apiKey.secret}
`.trim();

    writeFileSync('.env', envContent);
    console.log('\n✅ Created .env file with app credentials');
    
    // Display the credentials
    console.log('\nApp Credentials:');
    console.log('----------------');
    console.log(`App ID: ${app.id}`);
    console.log(`Subdomain: ${subdomain}`);
    console.log(`App Key: ${apiKey.client_id}`);
    console.log(`App Secret: ${apiKey.secret}`);

    // Create rownd.toml
    await createOrUpdateToml(app.id, config);

  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to create app:', error.message);
      console.error('Stack trace:', error.stack);
    } else {
      console.error('Failed to create app:', error);
    }
    process.exit(1);
  }
}
