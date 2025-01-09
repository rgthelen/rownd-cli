import { decode, JwtPayload } from 'jsonwebtoken';
import { getConfig, setToken, setRefreshToken } from '../config';
import { cache } from './cache';

interface RowndTokenPayload extends JwtPayload {
  exp: number;
  refresh_token?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface OAuthConfig {
  issuer: string;
  token_endpoint: string;
  jwks_uri: string;
}

export class TokenManager {
  private static instance: TokenManager;
  private oauthConfig: OAuthConfig | null = null;

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  async init() {
    const config = getConfig();
    const wellKnownUrl = `${config.apiUrl}/hub/auth/.well-known/oauth-authorization-server`;
    
    try {
      const response = await fetch(wellKnownUrl);
      this.oauthConfig = await response.json();
    } catch (error) {
      console.error('Failed to fetch OAuth configuration:', error);
    }
  }

  async getValidToken(): Promise<string> {
    const config = getConfig();
    const currentToken = config.token;
    
    if (!currentToken) {
      throw new Error('No token available. Please set your JWT token using: rownd config set-token <token>');
    }

    try {
      const decoded = decode(currentToken) as RowndTokenPayload;
      if (!decoded || !decoded.exp) {
        throw new Error('Invalid token format');
      }

      // Check if token expires in next 5 minutes
      const expiresIn = decoded.exp * 1000 - Date.now();
      if (expiresIn <= 5 * 60 * 1000) {
        console.log('Token expiring soon, refreshing...');
        return this.forceRefreshToken();
      }

      return currentToken;
    } catch (error) {
      console.log('Token validation failed, attempting refresh...');
      return this.forceRefreshToken();
    }
  }

  private async refreshToken(currentToken: string): Promise<string> {
    if (!this.oauthConfig) {
      await this.init();
    }

    const refreshToken = cache.get('refresh_token') || getConfig().refreshToken;
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(this.oauthConfig!.token_endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh tokens: ${await response.text()}`);
      }

      const tokens: TokenResponse = await response.json();
      await this.saveTokens(tokens);
      
      return tokens.access_token;
    } catch (error) {
      console.error('Failed to refresh tokens:', error);
      throw error;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      console.log('Checking token expiration...');
      const decoded = decode(token) as RowndTokenPayload;
      
      // Debug logging
      console.log('Token payload:', {
        exp: decoded?.exp,
        currentTime: Math.floor(Date.now() / 1000),
        timeLeft: decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 'N/A'
      });

      if (!decoded || !decoded.exp) {
        console.log('Token missing expiration claim');
        return true;
      }

      const isExpired = Date.now() >= decoded.exp * 1000;
      console.log(`Token ${isExpired ? 'is' : 'is not'} expired`);
      return isExpired;
    } catch (error) {
      console.log('Error decoding token:', error);
      return true;
    }
  }

  private async saveTokens(tokens: TokenResponse) {
    // Save new access token
    setToken(tokens.access_token);
    console.log('✅ New access token saved');

    // Save new refresh token if provided
    if (tokens.refresh_token) {
      setRefreshToken(tokens.refresh_token);
      cache.set('refresh_token', tokens.refresh_token);
      console.log('✅ New refresh token saved');
    }
  }

  async forceRefreshToken(): Promise<string> {
    if (!this.oauthConfig) {
      await this.init();
    }

    const config = getConfig();
    const refreshToken = config.refreshToken;
    
    if (!refreshToken) {
      throw new Error('No refresh token available. Please set a refresh token using: rownd config set-refresh-token <token>');
    }

    // Debug the refresh token
    console.log('Refresh token:', refreshToken.substring(0, 10) + '...');

    // Let's try the refresh regardless of expiration
    try {
      console.log('Attempting to refresh tokens...');
      const response = await fetch(this.oauthConfig!.token_endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      // Log the full response for debugging
      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response body:', responseText);

      if (!response.ok) {
        throw new Error(`Server response: ${responseText}`);
      }

      const tokens: TokenResponse = JSON.parse(responseText);
      await this.saveTokens(tokens);
      
      return tokens.access_token;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Token refresh failed: ${error.message}`);
      }
      throw error;
    }
  }
} 