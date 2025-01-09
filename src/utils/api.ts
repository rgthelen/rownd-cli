import { TokenManager } from './token-manager';
import { getConfig } from '../config';

export async function makeRequest(endpoint: string, method: string, body?: any) {
  const tokenManager = TokenManager.getInstance();
  
  async function executeRequest(token: string) {
    const response = await fetch(`${getConfig().apiUrl}/${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      ...(body && { body: JSON.stringify(body) })
    });
    return response;
  }

  try {
    let token = await tokenManager.getValidToken();
    let response = await executeRequest(token);

    // If unauthorized, try refreshing token and retry once
    if (response.status === 401) {
      console.log('Token expired, attempting refresh...');
      try {
        token = await tokenManager.forceRefreshToken();
        response = await executeRequest(token);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        throw new Error('Authentication failed. Please re-authenticate using: rownd config set-token <token>');
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Request failed: ${errorText}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Request failed with unknown error');
  }
} 