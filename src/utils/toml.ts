import * as TOML from '@iarna/toml';
import { readFileSync, writeFileSync, existsSync } from 'fs';

interface AppConfig {
  name: string;
  description?: string;
  allowed_web_origins?: string[];
  config: {
    hub: {
      customizations?: {
        rounded_corners?: boolean;
        visual_swoops?: boolean;
        blur_background?: boolean;
        dark_mode?: "auto" | "light" | "dark";
      };
      auth: {
        sign_in_methods: {
          email?: { enabled: boolean };
          phone?: { enabled: boolean };
          apple?: {
            enabled: boolean;
            client_id?: string;
          };
          google?: {
            enabled: boolean;
            client_id?: string;
            client_secret?: string;
            ios_client_id?: string;
            scopes?: string[];
          };
          crypto_wallet?: { enabled: boolean };
          passkeys?: {
            enabled: boolean;
            registration_prompt_frequency?: string;
          };
          anonymous?: { enabled: boolean };
        };
        show_app_icon?: boolean;
      };
    };
    subdomain?: string;
    profile_storage_version?: string;
  };
}

function validateAppConfig(config: unknown): config is AppConfig {
  const c = config as any;
  
  console.debug('Validating config:', JSON.stringify(c, null, 2));
  
  try {
    // Basic structure checks
    if (!c || typeof c !== 'object') {
      console.debug('Failed: Not an object');
      return false;
    }
    
    if (typeof c.name !== 'string') {
      console.debug('Failed: Name is not a string');
      return false;
    }
    
    if (!c.config || !c.config.hub) {
      console.debug('Failed: No config.hub configuration');
      return false;
    }

    // Hub auth is optional in the API response
    if (c.config.hub.auth) {
      if (typeof c.config.hub.auth !== 'object') {
        console.debug('Failed: Hub auth is not an object');
        return false;
      }

      // sign_in_methods is optional
      if (c.config.hub.auth.sign_in_methods && typeof c.config.hub.auth.sign_in_methods !== 'object') {
        console.debug('Failed: Sign in methods is not an object');
        return false;
      }
    }

    return true;
  } catch (error) {
    console.debug('Validation error:', error);
    return false;
  }
}

export async function fetchAppConfig(appId: string, config: any): Promise<AppConfig> {
  const response = await fetch(`${config.apiUrl}/applications/${appId}`, {
    headers: {
      'Authorization': `Bearer ${config.token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch app config: ${errorText}`);
  }

  const appConfig = await response.json();
  console.log('Received app config from server:', JSON.stringify(appConfig, null, 2));

  if (!validateAppConfig(appConfig)) {
    throw new Error('Invalid app configuration received from server. Check the debug logs for details.');
  }

  // Ensure the hub and auth structures exist
  appConfig.config.hub = appConfig.config.hub || {};
  appConfig.config.hub.auth = appConfig.config.hub.auth || { sign_in_methods: {} };
  appConfig.config.hub.auth.sign_in_methods = appConfig.config.hub.auth.sign_in_methods || {};

  return appConfig;
}

export function generateTomlContent(appConfig: AppConfig): string {
  let content = '# Rownd Application Configuration\n\n';
  
  // App section
  content += `# Application name as it appears in the Rownd console\n`;
  content += `[app]\n`;
  content += `name = "${appConfig.name}"\n\n`;
  
  // Allowed Web Origins
  content += `# Allowed Web Origins (comma-separated list of domains)\n`;
  content += `# Uncomment and modify the line below to specify allowed domains\n`;
  content += `# allowed_web_origins = "https://example.com, https://test.example.com"\n\n`;
  
  // Hub customizations
  content += `# Visual customizations for the Rownd hub\n`;
  content += `[hub.customizations]\n`;
  const customizations = appConfig.config.hub.customizations || {};
  
  if (customizations.rounded_corners !== undefined) {
    content += `rounded_corners = ${customizations.rounded_corners}\n`;
  }
  if (customizations.visual_swoops !== undefined) {
    content += `visual_swoops = ${customizations.visual_swoops}\n`;
  }
  if (customizations.blur_background !== undefined) {
    content += `blur_background = ${customizations.blur_background}\n`;
  }
  if (customizations.dark_mode !== undefined) {
    content += `dark_mode = "${customizations.dark_mode}"\n`;
  }

  // Authentication methods
  content += `\n# Authentication configuration\n`;
  content += `[hub.auth]\n`;
  content += `show_app_icon = ${appConfig.config.hub.auth?.show_app_icon || false}\n\n`;
  
  content += `# Sign-in method configuration\n`;
  content += `[hub.auth.sign_in_methods]\n`;
  const methods = appConfig.config.hub.auth?.sign_in_methods || {};
  
  // Email
  content += `\n# Email authentication\n`;
  if (methods.email?.enabled) {
    content += `email.enabled = true\n`;
  } else {
    content += `# email.enabled = false\n`;
  }

  // Anonymous (Guest User)
  content += `\n# Guest user access (no authentication required)\n`;
  if (methods.anonymous?.enabled) {
    content += `anonymous.enabled = true\n`;
  } else {
    content += `# anonymous.enabled = false\n`;
  }

  // Phone
  content += `\n# Phone number authentication\n`;
  if (methods.phone?.enabled) {
    content += `phone.enabled = true\n`;
  } else {
    content += `# phone.enabled = false\n`;
  }

  // Apple
  content += `\n# Apple Sign In\n`;
  if (methods.apple?.enabled) {
    content += `[hub.auth.sign_in_methods.apple]\n`;
    content += `enabled = true\n`;
    content += `client_id = "${methods.apple.client_id || ''}"\n`;
  } else {
    content += `# [hub.auth.sign_in_methods.apple]\n`;
    content += `# enabled = false\n`;
    content += `# client_id = ""\n`;
  }

  // Google
  content += `\n# Google Sign In\n`;
  if (methods.google?.enabled) {
    content += `[hub.auth.sign_in_methods.google]\n`;
    content += `enabled = true\n`;
    content += `client_id = "${methods.google.client_id || ''}"\n`;
    content += `client_secret = "${methods.google.client_secret || ''}"\n`;
    if (methods.google.ios_client_id) {
      content += `ios_client_id = "${methods.google.ios_client_id}"\n`;
    }
    if (methods.google.scopes?.length) {
      content += `scopes = ${JSON.stringify(methods.google.scopes)}\n`;
    }
  } else {
    content += `# [hub.auth.sign_in_methods.google]\n`;
    content += `# enabled = false\n`;
    content += `# client_id = ""\n`;
    content += `# client_secret = ""\n`;
  }

  // Crypto wallet
  content += `\n# Cryptocurrency wallet authentication\n`;
  if (methods.crypto_wallet?.enabled) {
    content += `[hub.auth.sign_in_methods.crypto_wallet]\n`;
    content += `enabled = true\n`;
  } else {
    content += `# [hub.auth.sign_in_methods.crypto_wallet]\n`;
    content += `# enabled = false\n`;
  }

  // Passkeys
  if (methods.passkeys?.enabled) {
    content += `\n[hub.auth.sign_in_methods.passkeys]\n`;
    content += `enabled = true\n`;
    if (methods.passkeys.registration_prompt_frequency) {
      content += `registration_prompt_frequency = "${methods.passkeys.registration_prompt_frequency}"\n`;
    }
  } else {
    content += `\n# [hub.auth.sign_in_methods.passkeys]\n`;
    content += `# enabled = false\n`;
    content += `# registration_prompt_frequency = "14d"\n`;
  }

  return content;
}

export async function createOrUpdateToml(appId: string, config: any) {
  const appConfig = await fetchAppConfig(appId, config);
  const tomlContent = generateTomlContent(appConfig);
  writeFileSync('rownd.toml', tomlContent);
  console.log('✅ Created/updated rownd.toml');
}

interface TomlConfig {
  app?: {
    name?: string;
    description?: string;
    allowed_web_origins?: string[];
  };
  hub?: {
    customizations?: {
      rounded_corners?: boolean;
      visual_swoops?: boolean;
      blur_background?: boolean;
      dark_mode?: "auto" | "light" | "dark";
    };
    auth?: {
      sign_in_methods?: {
        email?: { enabled: boolean };
        phone?: { enabled: boolean };
        apple?: {
          enabled: boolean;
          client_id?: string;
        };
        google?: {
          enabled: boolean;
          client_id?: string;
          client_secret?: string;
          ios_client_id?: string;
          scopes?: string[];
        };
        crypto_wallet?: { enabled: boolean };
        passkeys?: {
          enabled: boolean;
          registration_prompt_frequency?: string;
        };
        anonymous?: { enabled: boolean };
      };
      show_app_icon?: boolean;
    };
  };
}

export function readToml(): AppConfig {
  if (!existsSync('rownd.toml')) {
    throw new Error('rownd.toml not found');
  }

  try {
    const content = readFileSync('rownd.toml', 'utf-8');
    console.log('Reading TOML content:', content);

    const parsed = TOML.parse(content) as TomlConfig;
    console.log('Parsed TOML:', JSON.stringify(parsed, null, 2));

    if (!parsed.app?.name) {
      throw new Error('TOML must contain app.name');
    }

    // Transform the TOML structure to match the API structure
    const transformedConfig = {
      name: parsed.app.name,
      description: parsed.app.description || '',
      allowed_web_origins: typeof parsed.app?.allowed_web_origins === 'string' 
        ? (parsed.app.allowed_web_origins as string).split(',').map((domain: string) => domain.trim())
        : parsed.app?.allowed_web_origins,
      config: {
        hub: {
          customizations: parsed.hub?.customizations || {},
          auth: parsed.hub?.auth || {
            sign_in_methods: {},
            show_app_icon: false
          }
        }
      }
    };

    console.log('Transformed config:', JSON.stringify(transformedConfig, null, 2));

    if (!validateAppConfig(transformedConfig)) {
      console.error('TOML validation failed. Current structure:', JSON.stringify(transformedConfig, null, 2));
      throw new Error('Invalid configuration in rownd.toml - see console for details');
    }

    return transformedConfig as AppConfig;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error reading TOML:', error.message);
      console.error('Stack:', error.stack);
    } else {
      console.error('Unknown error reading TOML:', error);
    }
    throw new Error(`Failed to read rownd.toml: ${error}`);
  }
}
