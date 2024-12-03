#!/usr/bin/env node

import { Command } from 'commander';
import { createApp } from './commands/create-app';
import { displayApps, selectApp } from './commands/list-apps';
import { displayAccounts, selectAccount } from './commands/list-accounts';
import { setToken, getConfig } from './config';
import { createApiKey } from './commands/create-key';
import { deployConfig } from './commands/deploy';
import { pullConfig } from './commands/pull';

const program = new Command();

program
  .name('rownd')
  .description('CLI tool for managing Rownd applications')
  .version('1.0.0');

// Config commands
program
  .command('config')
  .description('Configure the CLI tool')
  .command('set-token')
  .argument('<token>', 'JWT token for authentication')
  .action((token) => {
    setToken(token);
    console.log('Token set successfully');
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
    await displayApps();
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
  .description('Deploy configuration from rownd.toml')
  .action(async () => {
    await deployConfig();
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

program.parse();
