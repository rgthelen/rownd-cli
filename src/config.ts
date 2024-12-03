export interface RowndConfig {
    token?: string;
    apiUrl: string;
    selectedAccountId?: string;
    selectedAppId?: string;
  }
  
  let config: RowndConfig = {
    apiUrl: 'https://api.rownd.io'
  };
  
  import { writeFileSync, readFileSync, existsSync } from 'fs';
  import { homedir } from 'os';
  import { join } from 'path';
  
  const CONFIG_PATH = join(homedir(), '.rownd-cli-config.json');
  
  // Load config when module is imported
  try {
    if (existsSync(CONFIG_PATH)) {
      const savedConfig = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
      config = { ...config, ...savedConfig };
      console.log('Loaded existing configuration');
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }
  
  function saveConfig() {
    try {
      writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      console.log('Configuration saved');
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }
  
  export function setToken(token: string) {
    config.token = token;
    saveConfig();
  }
  
  export function setSelectedAccount(accountId: string) {
    config.selectedAccountId = accountId;
    saveConfig();
  }
  
  export function setSelectedApp(appId: string) {
    config.selectedAppId = appId;
    saveConfig();
  }
  
  export function getConfig(): RowndConfig {
    return config;
  }