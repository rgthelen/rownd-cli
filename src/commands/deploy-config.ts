import { parse } from '@iarna/toml';
import { readFileSync } from 'fs';
import { getConfig } from '../config';

// Define base interfaces for type safety
interface RowndToml {
  auth: {
    allow_unverified_users: boolean;
    show_app_icon: boolean;
    sign_in_methods: {
      email: boolean;
      phone: boolean;
      apple: boolean;
      google: boolean;
      crypto_wallet: boolean;
      passkeys: boolean;
      anonymous: boolean;
    };
    google?: {
      client_id?: string;
      client_secret?: string;
      ios_client_id?: string;
      auto_prompt_browser: boolean;
      auto_prompt_mobile: boolean;
      prompt_delay: number;
    };
    apple?: {
      client_id?: string;
    };
    passkeys?: {
      registration_prompt_frequency: string;
    };
  };
  customizations: {
    rounded_corners: boolean;
    visual_swoops: boolean;
    blur_background: boolean;
    dark_mode: string;
  };
  mobile: {
    ios: {
      enabled: boolean;
      app_store_url: string;
      bundle_ids: string[];
      team_id: string;
      app_ids: string[];
    };
    android: {
      enabled: boolean;
      play_store_url: string;
      package_name: string;
      sha256_cert_fingerprints: string[];
    };
  };
  domains: {
    trusted: string;
  };
}

export async function deployConfig(appId: string) {
  const config = getConfig();
  
  try {
    // Read and parse TOML
    const tomlContent = readFileSync('./rownd.toml', 'utf-8');
    const parsedConfig = parse(tomlContent);
    
    // Type cast with validation
    const tomlConfig = parsedConfig as unknown as RowndToml;
    
    // Validate required fields
    if (!tomlConfig.auth || !tomlConfig.customizations || !tomlConfig.mobile || !tomlConfig.domains) {
      throw new Error('Missing required configuration sections in rownd.toml');
    }

    // Convert TOML to App Config format
    const appConfig = {
      capabilities: {
        ios_app: tomlConfig.mobile.ios,
        android_app: tomlConfig.mobile.android,
      },
      hub: {
        customizations: tomlConfig.customizations,
        auth: {
          allow_unverified_users: tomlConfig.auth.allow_unverified_users,
          show_app_icon: tomlConfig.auth.show_app_icon,
          sign_in_methods: {
            email: { enabled: tomlConfig.auth.sign_in_methods.email },
            phone: { enabled: tomlConfig.auth.sign_in_methods.phone },
            apple: { 
              enabled: tomlConfig.auth.sign_in_methods.apple,
              ...(tomlConfig.auth.apple && { client_id: tomlConfig.auth.apple.client_id })
            },
            google: {
              enabled: tomlConfig.auth.sign_in_methods.google,
              ...(tomlConfig.auth.google && {
                client_id: tomlConfig.auth.google.client_id,
                client_secret: tomlConfig.auth.google.client_secret,
                ios_client_id: tomlConfig.auth.google.ios_client_id,
                one_tap: {
                  browser: {
                    auto_prompt: tomlConfig.auth.google.auto_prompt_browser,
                    delay: tomlConfig.auth.google.prompt_delay
                  },
                  mobile_app: {
                    auto_prompt: tomlConfig.auth.google.auto_prompt_mobile,
                    delay: tomlConfig.auth.google.prompt_delay
                  }
                }
              })
            },
            crypto_wallet: { enabled: tomlConfig.auth.sign_in_methods.crypto_wallet },
            passkeys: {
              enabled: tomlConfig.auth.sign_in_methods.passkeys,
              ...(tomlConfig.auth.passkeys && {
                registration_prompt_frequency: tomlConfig.auth.passkeys.registration_prompt_frequency
              })
            },
            anonymous: { enabled: tomlConfig.auth.sign_in_methods.anonymous }
          }
        },
        allowed_web_origins: tomlConfig.domains.trusted.split(',').map(d => d.trim())
      }
    };

    // Update app config via API
    const response = await fetch(`${config.apiUrl}/applications/${appId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.token}`
      },
      body: JSON.stringify(appConfig)
    });

    if (response.status === 200) {
      console.log('Successfully updated app configuration');
    } else {
      console.error('Failed to update app configuration:', await response.text());
    }
  } catch (error) {
    console.error('Failed to deploy config:', error);
  }
} 