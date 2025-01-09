#!/usr/bin/env node

import { Command } from 'commander';
import { createApp } from './commands/create-app';
import { displayApps, selectApp } from './commands/list-apps';
import { displayAccounts, selectAccount } from './commands/list-accounts';
import { setToken, getConfig, setApiUrl, setRefreshToken, saveConfig } from './config';
import { createApiKey } from './commands/create-key';
import { deployConfig } from './commands/deploy';
import { pullConfig } from './commands/pull';
import { createOIDCCommands } from './commands/oidc';
import { cache } from './utils/cache';
import { TokenManager } from './utils/token-manager';
import { deployJsonConfig } from './commands/deploy-json';
import { analyzeWebsite } from './commands/analyze-website';
import { uploadImage } from './commands/upload-image';
import { createDemo } from './commands/create-demo';
import { bootstrapDemo } from './commands/bootstrap-demo';
import { setSchema } from './commands/set-schema';

// Initialize token manager at startup
const tokenManager = TokenManager.getInstance();
tokenManager.init().catch(error => {
  console.error('Failed to initialize token manager:', error);
});

const program = new Command();

program
  .name('rownd')
  .description(`CLI tool for managing Rownd applications

Examples:
  # Create and configure a complete demo
  rownd bootstrap-demo -w https://example.com -n "My Demo App" [--logo]
    -w, --website <url>     Website URL to analyze and create demo from
    -n, --name <name>       Name for the Rownd app
    --logo                  Optional: Detect and upload website logo

  # Analyze a website and configure Rownd
  rownd analyze -w https://example.com -n "My Analysis" [--logo]
    -w, --website <url>     Website URL to analyze
    -n, --name <name>       Name for the analysis configuration
    --logo                  Optional: Upload detected logo to Rownd app

  # Create a demo of existing app
  rownd create-demo -w https://example.com
    -w, --website <url>     Website URL to create demo from
    Requires: ROWND_APP_KEY in .env file or environment

  # Manage accounts and apps
  rownd account list                    List all available accounts
  rownd account select                  Interactive account selection
  rownd app create <name>              Create new app with specified name
  rownd app list                       List all apps in selected account
  rownd app select                     Interactive app selection
  rownd app pull                       Pull app config from Rownd
  rownd app deploy [-j config.json]    Deploy config from rownd.toml or JSON

  # Configure the analyzer
  rownd config set-analyzer-url <url>      Set analyzer API URL
  rownd config set-analyzer-key <key>      Set analyzer API key
  rownd config set-analyzer-secret <key>   Set analyzer API secret
  rownd config show                        Show current configuration

  # Upload logos
  rownd upload-image <path> -t <type>
    <path>                  Local file path or URL to image
    -t, --type <type>      Required: One of: light | dark | email
    Examples:
      rownd upload-image ./logo.png -t light
      rownd upload-image https://example.com/logo.svg -t dark
  `)
  .version('1.0.0');

// Config commands - create a subcommand group
const configCmd = program
  .command('config')
  .description('Configure the CLI tool');

configCmd
  .command('set-api <url>')
  .description('Set the API endpoint URL')
  .action((url: string) => {
    const config = getConfig();
    setApiUrl(url);
    console.log(`API URL set to: ${url}`);
  });

configCmd
  .command('set-analyzer-url <url>')
  .description('Set the website analyzer URL')
  .action(url => {
    const config = getConfig();
    config.analyzerUrl = url;
    saveConfig();
    console.log('Analyzer URL updated');
  });

configCmd
  .command('set-analyzer-key <key>')
  .description('Set the analyzer API key')
  .action(key => {
    const config = getConfig();
    config.analyzerApiKey = key;
    saveConfig();
    console.log('Analyzer API key updated');
  });

configCmd
  .command('set-analyzer-secret <secret>')
  .description('Set the analyzer API secret')
  .action(secret => {
    const config = getConfig();
    config.analyzerApiSecret = secret;
    saveConfig();
    console.log('Analyzer API secret updated');
  });

configCmd
  .command('set-token <token>')
  .description('Set the JWT token for authentication')
  .action((token: string) => {
    setToken(token);
    console.log('Token set successfully');
  });

configCmd
  .command('set-refresh-token <token>')
  .description('Set the refresh token')
  .action((token: string) => {
    setRefreshToken(token);
    // Also store in memory cache
    cache.set('refresh_token', token);
    console.log('Refresh token set successfully');
  });

configCmd
  .command('show')
  .description('Show current configuration')
  .action(() => {
    const currentConfig = getConfig();
    console.log('Current configuration:');
    console.log('API URL:', currentConfig.apiUrl);
    console.log('Token:', currentConfig.token ? '(set)' : '(not set)');
    console.log('Refresh Token:', currentConfig.refreshToken ? '(set)' : '(not set)');
    console.log('Selected App:', currentConfig.selectedAppId || '(none)');
  });

configCmd
  .command('refresh-token')
  .description('Force refresh the access token using the refresh token')
  .action(async () => {
    try {
      const tokenManager = TokenManager.getInstance();
      const newToken = await tokenManager.forceRefreshToken();
      console.log('✅ Token refreshed successfully');
      console.log('New token:', newToken);
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  });

// Account commands
const account = program
  .command('account')
  .description('Manage Rownd accounts');

account
  .command('list')
  .description('List all available accounts')
  .action(async () => {
    await displayAccounts();
  });

account
  .command('select')
  .description('Interactively select an account')
  .action(async () => {
    await selectAccount();
  });

// App commands
const app = program
  .command('app')
  .description('Manage Rownd applications');

app
  .command('create')
  .description('Create a new Rownd app')
  .argument('<name>', 'name of the app')
  .action(async (name) => {
    await createApp(name);
  });

app
  .command('list')
  .description('List all available apps')
  .action(async () => {
    const config = getConfig();
    if (!config.selectedAccountId) {
      console.error('No account selected. Please run: rownd account select');
      process.exit(1);
    }
    await displayApps(config.selectedAccountId);
  });

app
  .command('select')
  .description('Interactively select an app')
  .action(async () => {
    await selectApp();
  });

app
  .command('pull')
  .description('Pull latest configuration from Rownd')
  .action(async () => {
    await pullConfig();
  });

app
  .command('deploy')
  .description('Deploy configuration from rownd.toml or JSON file')
  .option('-j, --json <path>', 'Path to JSON configuration file')
  .action(async (options) => {
    if (options.json) {
      await deployJsonConfig(options.json);
    } else {
      await deployConfig();
    }
  });

app
  .command('analyze-website')
  .description('Analyze a website and configure Rownd')
  .requiredOption('-u, --url <url>', 'Website URL to analyze')
  .requiredOption('-n, --name <name>', 'Name for the configuration')
  .option('--logo', 'Automatically upload detected logo')
  .action(async (options) => {
    try {
      await analyzeWebsite(options.url, options.name, options.logo);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// API Key commands
const key = program
  .command('key')
  .description('Manage API keys');

key
  .command('create')
  .description('Create a new API key for the current app')
  .option('-n, --name <name>', 'Name of the API key', 'CLI generated')
  .action(async (options) => {
    const config = getConfig();
    if (!config.selectedAppId) {
      console.error('No app selected. Please select an app first:');
      console.error('rownd app select');
      process.exit(1);
    }
    const apiKey = await createApiKey(config.selectedAppId, options.name);
    if (!apiKey) {
      process.exit(1);
    }
  });

createOIDCCommands(program);

program
  .command('upload-image <path>')
  .description('Upload an image as app logo (supports local files and URLs)')
  .requiredOption('-t, --type <type>', 'Image type (light, dark, or email)')
  .action(async (path, options) => {
    try {
      const type = options.type as 'light' | 'dark' | 'email';
      if (!['light', 'dark', 'email'].includes(type)) {
        throw new Error('Type must be one of: light, dark, email');
      }
      await uploadImage(path, type);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('create-demo')
  .description('Create a website demo with Rownd integration')
  .requiredOption('-w, --website <url>', 'Website URL to create demo for')
  .action(async (options) => {
    try {
      await createDemo(options.website);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('bootstrap-demo')
  .description('Bootstrap a complete Rownd demo from a website')
  .requiredOption('-w, --website <url>', 'Website URL to create demo for')
  .requiredOption('-n, --name <name>', 'Name for the Rownd app')
  .option('--logo', 'Automatically upload detected logo')
  .action(async (options) => {
    try {
      await bootstrapDemo(options.website, options.name, options.logo);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze a website and configure Rownd app')
  .requiredOption('-w, --website <url>', 'Website URL to analyze')
  .requiredOption('-n, --name <name>', 'Name for the analysis')
  .option('--logo', 'Upload detected logo')
  .action(async (options) => {
    try {
      await analyzeWebsite(options.website, options.name, options.logo);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('set-schema')
  .description('Set default schema for the current app')
  .action(async () => {
    try {
      await setSchema();
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
