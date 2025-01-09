import { getConfig } from '../config';
import { TokenManager } from '../utils/token-manager';
import ora = require('ora');

export async function setSchema(appId?: string): Promise<void> {
  const spinner = ora('Setting app schema...').start();
  
  try {
    const config = getConfig();
    if (!appId) {
      appId = config.selectedAppId;
    }
    if (!appId) {
      throw new Error('No app selected. Please run: rownd app select');
    }

    const tokenManager = TokenManager.getInstance();
    await tokenManager.init();
    const token = await tokenManager.getValidToken();

    const schema = {
      user_verification_fields: ["email"],
      schema: {
        email: {
          type: "string",
          required: false,
          data_category: "pii_basic",
          display_name: "Email",
          owned_by: "user",
          user_visible: true
        },
        nick_name: {
          type: "string",
          required: false,
          data_category: "pii_basic",
          display_name: "Nick name",
          owned_by: "user",
          user_visible: true
        },
        first_name: {
          type: "string",
          required: false,
          data_category: "pii_basic",
          display_name: "First name",
          owned_by: "user",
          user_visible: true
        },
        last_name: {
          type: "string",
          required: false,
          data_category: "pii_basic",
          display_name: "Last name",
          owned_by: "user",
          user_visible: true
        },
        phone_number: {
          type: "string",
          required: false,
          data_category: "pii_basic",
          display_name: "Phone number",
          owned_by: "user",
          user_visible: true
        },
        zip_code: {
          type: "string",
          required: false,
          data_category: "pii_basic",
          display_name: "Zip code",
          owned_by: "user",
          user_visible: true
        }
      }
    };

    const response = await fetch(`${config.apiUrl}/applications/${appId}/schema`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(schema)
    });

    if (!response.ok) {
      throw new Error(`Failed to set schema: ${await response.text()}`);
    }

    spinner.succeed('Schema set successfully');
  } catch (error) {
    spinner.fail('Failed to set schema');
    throw error;
  }
} 