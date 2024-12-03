import { getConfig } from '../config';
import { readToml, fetchAppConfig } from '../utils/toml';

interface BaseAuthMethod {
  enabled: boolean;
}

interface EmailAuthMethod extends BaseAuthMethod {}
interface PhoneAuthMethod extends BaseAuthMethod {}
interface AppleAuthMethod extends BaseAuthMethod {
  client_id: string;
}
interface GoogleAuthMethod extends BaseAuthMethod {
  client_id: string;
  client_secret: string;
  ios_client_id: string;
  scopes: string[];
}
interface CryptoWalletAuthMethod extends BaseAuthMethod {}
interface PasskeysAuthMethod extends BaseAuthMethod {
  registration_prompt_frequency: string;
}
interface AnonymousAuthMethod extends BaseAuthMethod {}

interface SignInMethods {
  email?: EmailAuthMethod;
  phone?: PhoneAuthMethod;
  apple?: AppleAuthMethod;
  google?: GoogleAuthMethod;
  crypto_wallet?: CryptoWalletAuthMethod;
  passkeys?: PasskeysAuthMethod;
  anonymous?: AnonymousAuthMethod;
}

interface UpdatePayload {
  name: string;
  description: string;
  config: {
    hub: {
      auth: {
        sign_in_methods: SignInMethods;
        show_app_icon: boolean;
        extensions: Record<string, any>;
      };
      customizations?: Record<string, any>;
    };
    subdomain: string;
    profile_storage_version: string;
  };
}

function getDefaultAuthMethod(type: keyof SignInMethods): BaseAuthMethod {
  const base = { enabled: false };
  
  switch (type) {
    case 'apple':
      return { ...base } as AppleAuthMethod;
    case 'google':
      return { 
        ...base, 
        client_id: '',
        client_secret: '',
        ios_client_id: '',
        scopes: []
      } as GoogleAuthMethod;
    case 'passkeys':
      return { 
        ...base, 
        registration_prompt_frequency: '14d' 
      } as PasskeysAuthMethod;
    default:
      return base;
  }
}

function mergeSignInMethods(current: SignInMethods, updates: SignInMethods): SignInMethods {
  // Start with a complete set of default methods
  const merged: SignInMethods = {
    email: { enabled: false },
    phone: { enabled: false },
    apple: { enabled: false, client_id: '' },
    google: { 
      enabled: false,
      client_id: '',
      client_secret: '',
      ios_client_id: '',
      scopes: []
    },
    crypto_wallet: { enabled: false },
    passkeys: { 
      enabled: false,
      registration_prompt_frequency: '14d'
    },
    anonymous: { enabled: false }
  };

  // Merge current configuration
  Object.entries(current).forEach(([method, value]) => {
    if (method in merged) {
      merged[method as keyof SignInMethods] = {
        ...merged[method as keyof SignInMethods],
        ...value
      };
    }
  });

  // Merge updates
  Object.entries(updates).forEach(([method, value]) => {
    if (method in merged) {
      merged[method as keyof SignInMethods] = {
        ...merged[method as keyof SignInMethods],
        ...value
      };
    }
  });

  return merged;
}

function mergeConfigs(serverConfig: any, localConfig: any): any {
  // Start with a deep copy of the server config
  const mergedConfig = JSON.parse(JSON.stringify(serverConfig));

  // Update basic properties
  if (localConfig.name) {
    mergedConfig.name = localConfig.name;
  }
  
  // Place allowed_web_origins under config.hub
  if (localConfig.allowed_web_origins) {
    if (!mergedConfig.config.hub) {
      mergedConfig.config.hub = {};
    }
    mergedConfig.config.hub.allowed_web_origins = localConfig.allowed_web_origins;
  }

  // Update sign-in methods
  if (localConfig.config?.hub?.auth?.sign_in_methods) {
    const localMethods = localConfig.config.hub.auth.sign_in_methods;
    Object.keys(localMethods).forEach(method => {
      if (localMethods[method]?.enabled !== undefined) {
        mergedConfig.config.hub.auth.sign_in_methods[method] = {
          ...mergedConfig.config.hub.auth.sign_in_methods[method],
          enabled: localMethods[method].enabled
        };
      }
    });
  }

  return mergedConfig;
}

export async function deployConfig() {
  const config = getConfig();
  
  if (!config.selectedAppId) {
    console.error('No app selected. Please select an app first:');
    console.error('rownd app select');
    process.exit(1);
  }

  try {
    console.log('Fetching current app configuration...');
    const serverConfig = await fetchAppConfig(config.selectedAppId, config);
    console.log('Server config:', JSON.stringify(serverConfig, null, 2));

    console.log('Reading local changes from rownd.toml...');
    const localChanges = readToml();
    console.log('Local changes:', JSON.stringify(localChanges, null, 2));

    const mergedConfig = mergeConfigs(serverConfig, localChanges);
    console.log('Merged configuration:', JSON.stringify(mergedConfig, null, 2));

    // Check for changes in name, allowed_web_origins, and auth methods
    const hasNameChange = serverConfig.name !== localChanges.name;
    const hasOriginChanges = JSON.stringify(serverConfig.allowed_web_origins) !== 
                            JSON.stringify(localChanges.allowed_web_origins);
    
    // Existing auth method comparison
    const serverMethods = serverConfig.config.hub.auth.sign_in_methods;
    const mergedMethods = mergedConfig.config.hub.auth.sign_in_methods;
    
    const hasAuthChanges = Object.keys({...serverMethods, ...mergedMethods}).some(method => {
      const serverEnabled = serverMethods[method as keyof SignInMethods]?.enabled;
      const mergedEnabled = mergedMethods[method as keyof SignInMethods]?.enabled;
      return serverEnabled !== mergedEnabled;
    });

    console.log('Changes detected:', {
      name: hasNameChange,
      origins: hasOriginChanges,
      auth: hasAuthChanges
    });

    if (!hasNameChange && !hasOriginChanges && !hasAuthChanges) {
      console.log('No changes detected in configuration');
      return;
    }

    console.log('Changes detected, deploying configuration...');
    console.log('Sending configuration to server:', JSON.stringify(mergedConfig, null, 2));
    
    const response = await fetch(`${config.apiUrl}/applications/${config.selectedAppId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mergedConfig)
    });

    const responseData = await response.text();
    console.log('Server response status:', response.status);
    console.log('Server response:', responseData);

    if (!response.ok) {
      throw new Error(`Failed to deploy config: ${responseData}`);
    }

    console.log('✅ Configuration deployed successfully');
  } catch (error) {
    console.error('Failed to deploy configuration:', error);
    process.exit(1);
  }
}
