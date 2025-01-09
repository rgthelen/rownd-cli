import { writeFileSync, readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface Config {
  apiUrl: string;
  selectedAppId?: string;
  selectedAccountId?: string;
  analyzerUrl: string;
  analyzerApiKey: string;
  analyzerApiSecret: string;
  token?: string;
  refreshToken?: string;
}

export function getDefaultConfig(): Config {
  return {
    apiUrl: 'https://api.rownd.io',
    analyzerUrl: process.env.ANALYZER_URL || 'https://website-analyzer.fly.dev',
    analyzerApiKey: process.env.ANALYZER_API_KEY || '',
    analyzerApiSecret: process.env.ANALYZER_API_SECRET || ''
  };
}

const CONFIG_PATH = join(homedir(), '.rownd-cli-config.json');

let config: Config = {
  apiUrl: 'https://api.rownd.io',
  analyzerUrl: process.env.ANALYZER_URL || 'https://website-analyzer.fly.dev',
  analyzerApiKey: process.env.ANALYZER_API_KEY || '',
  analyzerApiSecret: process.env.ANALYZER_API_SECRET || ''
};

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

export function saveConfig() {
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

export function setRefreshToken(token: string) {
  config.refreshToken = token;
  saveConfig();
}

export function getConfig(): Config {
  return config;
}

export function setSelectedAccount(accountId: string) {
  config.selectedAccountId = accountId;
  saveConfig();
}

export function setSelectedApp(appId: string) {
  config.selectedAppId = appId;
  saveConfig();
}

export function setApiUrl(url: string) {
  config.apiUrl = url;
  saveConfig();
}

export function setAnalyzerConfig(url: string, key: string, secret: string) {
  config.analyzerUrl = url;
  config.analyzerApiKey = key;
  config.analyzerApiSecret = secret;
  saveConfig();
}