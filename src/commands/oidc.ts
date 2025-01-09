import { Command } from 'commander';
import * as yaml from 'js-yaml';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { getConfig } from '../config';
import { createApiKey } from './create-key';

interface OIDCConfig {
  name: string;
  description: string;
  config: {
    allowed_origins: string[];
    redirect_uris: string[];
    post_logout_uris: string[];
    logo_uri?: string;
    logo_dark_mode_uri?: string;
  }
}

interface AppCredentials {
  app_key: string;
  app_secret: string;
}

async function makeRequest(endpoint: string, method: string, body?: any) {
  const config = getConfig();
  const credentials = loadCredentials();
  
  if (!credentials) {
    throw new Error('App credentials not found. Please run: rownd oidc key-create');
  }
  
  const response = await fetch(`${config.apiUrl}/${endpoint}`, {
    method,
    headers: {
      'x-rownd-app-key': credentials.app_key,
      'x-rownd-app-secret': credentials.app_secret,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    ...(body && { body: JSON.stringify(body) })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log('Response status:', response.status);
    throw new Error(`Request failed: ${errorText}`);
  }

  return response.json();
}

function loadCredentials(): AppCredentials | null {
  const credPath = '.rownd-credentials.json';
  if (!existsSync(credPath)) {
    return null;
  }
  return JSON.parse(readFileSync(credPath, 'utf8'));
}

function saveCredentials(credentials: AppCredentials) {
  writeFileSync('.rownd-credentials.json', JSON.stringify(credentials, null, 2));
}

function createYamlTemplate(response: any): string {
  // Remove immutable fields and add them as comments
  const template = {
    // Commented metadata
    _metadata: {
      id: response.id,
      app_id: response.app_id,
      created_at: response.created_at,
      credentials: response.credentials?.map((cred: any) => ({
        client_id: cred.client_id,
        secret: cred.secret
      }))
    },
    // Mutable configuration
    name: response.name,
    description: response.description,
    config: response.config
  };

  const yamlContent = yaml.dump(template);
  return `# OIDC Client ID: ${response.id}\n# App ID: ${response.app_id}\n# Created: ${response.created_at}\n${yamlContent}`;
}

export function createOIDCCommands(program: Command) {
  const oidc = program.command('oidc');

  oidc
    .command('create <name>')
    .description('Create a new OIDC configuration YAML file')
    .action(async (name: string) => {
      const template: OIDCConfig = {
        name,
        description: `${name} OIDC Provider`,
        config: {
          allowed_origins: ["https://example.com"],
          redirect_uris: ["https://example.com/callback"],
          post_logout_uris: ["https://example.com/logout"]
        }
      };

      const fileName = `${name.replace(/\s+/g, '_').toLowerCase()}_oidc.yaml`;
      const yamlContent = yaml.dump(template);
      writeFileSync(fileName, yamlContent);
      console.log(`✅ Created OIDC configuration file: ${fileName}`);
    });

  oidc
    .command('push <yamlPath>')
    .description('Push OIDC configuration from YAML file')
    .action(async (yamlPath: string) => {
      const config = getConfig();
      try {
        const fileContent = readFileSync(yamlPath, 'utf8');
        const yamlConfig = yaml.load(fileContent) as any;
        
        // Extract only mutable fields
        const oidcConfig: OIDCConfig = {
          name: yamlConfig.name,
          description: yamlConfig.description,
          config: yamlConfig.config
        };

        // Check if this is an update (has _metadata.id) or new creation
        const isUpdate = yamlConfig._metadata?.id;
        const method = isUpdate ? 'PUT' : 'POST';
        const endpoint = isUpdate 
          ? `applications/${config.selectedAppId}/oidc-clients/${yamlConfig._metadata.id}`
          : `applications/${config.selectedAppId}/oidc-clients`;
        
        console.log(`Making ${method} request to: ${config.apiUrl}/${endpoint}`);
        const response = await makeRequest(endpoint, method, oidcConfig);
        
        // Save updated configuration with metadata
        const updatedYaml = createYamlTemplate(response);
        writeFileSync(yamlPath, updatedYaml);
        
        console.log(`✅ OIDC configuration ${isUpdate ? 'updated' : 'created'} successfully`);
        if (!isUpdate) {
          console.log('Client ID:', response.id);
          console.log('Client Secret:', response.credentials[0]?.secret);
        }
      } catch (error) {
        console.error('Failed to push OIDC configuration:', error);
      }
    });

  oidc
    .command('list')
    .description('List all OIDC configurations')
    .action(async () => {
      const config = getConfig();
      try {
        const response = await makeRequest(
          `applications/${config.selectedAppId}/oidc-clients`,
          'GET'
        );
        console.table(response.results.map((client: any) => ({
          name: client.name,
          id: client.id,
          created: new Date(client.created_at).toLocaleDateString()
        })));
      } catch (error) {
        console.error('Failed to fetch OIDC configurations:', error);
      }
    });

  oidc
    .command('get <clientId>')
    .description('Get OIDC configuration details')
    .action(async (clientId: string) => {
      const config = getConfig();
      try {
        const response = await makeRequest(
          `applications/${config.selectedAppId}/oidc-clients/${clientId}`,
          'GET'
        );
        
        // Save to YAML file
        const fileName = `${response.name}_OIDC.yaml`;
        const yamlContent = yaml.dump(response);
        writeFileSync(fileName, yamlContent);
        
        console.log(`✅ Configuration saved to ${fileName}`);
      } catch (error) {
        console.error('Failed to fetch OIDC configuration:', error);
      }
    });

  oidc
    .command('key-create')
    .description('Create and store app credentials')
    .action(async () => {
      const config = getConfig();
      try {
        const apiKey = await createApiKey(config.selectedAppId!, 'OIDC CLI Key');
        
        if (apiKey) {
          saveCredentials({
            app_key: apiKey.client_id,
            app_secret: apiKey.secret
          });
          console.log('✅ App credentials saved to .rownd-credentials.json');
        }
      } catch (error) {
        console.error('Failed to create app credentials:', error);
      }
    });

  oidc
    .command('endpoints <yamlPath>')
    .description('Fetch OIDC endpoints and add to configuration')
    .action(async (yamlPath: string) => {
      try {
        // Read existing YAML
        const fileContent = readFileSync(yamlPath, 'utf8');
        const yamlConfig = yaml.load(fileContent) as any;
        
        if (!yamlConfig._metadata?.app_id) {
          throw new Error('YAML file must contain app_id in _metadata. Please push configuration first.');
        }

        // Fetch OIDC configuration
        const response = await fetch(
          `${getConfig().apiUrl}/oidc/${yamlConfig._metadata.app_id}/.well-known/openid-configuration`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch OIDC endpoints: ${await response.text()}`);
        }

        const endpoints = await response.json();

        // Add endpoints to YAML
        const updatedYaml = {
          ...yamlConfig,
          _metadata: {
            ...yamlConfig._metadata,
            endpoints: {
              issuer: endpoints.issuer,
              authorization_endpoint: endpoints.authorization_endpoint,
              token_endpoint: endpoints.token_endpoint,
              userinfo_endpoint: endpoints.userinfo_endpoint,
              jwks_uri: endpoints.jwks_uri,
              end_session_endpoint: endpoints.end_session_endpoint,
              registration_endpoint: endpoints.registration_endpoint,
              scopes_supported: endpoints.scopes_supported,
              response_types_supported: endpoints.response_types_supported,
              grant_types_supported: endpoints.grant_types_supported,
              subject_types_supported: endpoints.subject_types_supported,
              id_token_signing_alg_values_supported: endpoints.id_token_signing_alg_values_supported,
              token_endpoint_auth_methods_supported: endpoints.token_endpoint_auth_methods_supported
            }
          }
        };

        // Save updated YAML
        writeFileSync(yamlPath, yaml.dump(updatedYaml));
        console.log('✅ OIDC endpoints added to configuration');
        
        // Display key endpoints
        console.log('\nKey Endpoints:');
        console.log('-------------');
        console.log(`Authorization: ${endpoints.authorization_endpoint}`);
        console.log(`Token: ${endpoints.token_endpoint}`);
        console.log(`UserInfo: ${endpoints.userinfo_endpoint}`);
        console.log(`JWKS: ${endpoints.jwks_uri}`);
        
      } catch (error) {
        console.error('Failed to update OIDC endpoints:', error);
      }
    });
} 