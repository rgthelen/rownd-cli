import { getConfig } from '../config';
import { setSelectedAccount } from '../config';
import * as readline from 'readline';

interface RowndAccount {
  id: string;
  name: string;
  description: string;
  team_id: string;
}

interface AccountsResponse {
  total_results: number;
  results: RowndAccount[];
}

export async function listAccounts(): Promise<RowndAccount[]> {
  const config = getConfig();
  
  try {
    const response = await fetch(`${config.apiUrl}/accounts`, {
      headers: {
        'Authorization': `Bearer ${config.token}`
      }
    });

    if (response.status === 401) {
      console.error('Authentication required. Please set your JWT token using:');
      console.error('rownd config set-token <your-jwt-token>');
      process.exit(1);
    }

    if (response.ok) {
      const result: AccountsResponse = await response.json();
      return result.results || [];
    }

    throw new Error(`Failed to fetch accounts: ${await response.text()}`);
  } catch (error) {
    console.error('Failed to list accounts:', error);
    return [];
  }
}

export async function selectAccount(): Promise<void> {
  const accounts = await listAccounts();
  const config = getConfig();

  if (!accounts.length) {
    console.log('No accounts found');
    return;
  }

  console.log('\nAvailable Accounts:');
  console.log('------------------');
  
  accounts.forEach((account, index) => {
    const isSelected = account.id === config.selectedAccountId;
    console.log(`${index + 1}. ${isSelected ? '* ' : '  '}${account.name} (${account.id})`);
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('\nSelect an account number: ', async (answer) => {
      const index = parseInt(answer) - 1;
      
      if (index >= 0 && index < accounts.length) {
        const selectedAccount = accounts[index];
        await setSelectedAccount(selectedAccount.id);
        console.log(`\nSelected account: ${selectedAccount.name} (${selectedAccount.id})`);
      } else {
        console.log('Invalid selection');
      }
      
      rl.close();
      resolve();
    });
  });
}

export async function displayAccounts() {
  const accounts = await listAccounts();
  const config = getConfig();
  
  console.log('\nAvailable Accounts:');
  console.log('------------------');
  
  if (accounts.length > 0) {
    accounts.forEach(account => {
      const isSelected = account.id === config.selectedAccountId;
      console.log(`${isSelected ? '* ' : '  '}${account.name} (${account.id})`);
    });
  } else {
    console.log('No accounts found');
  }
  
  console.log('\n* indicates currently selected account');
}
