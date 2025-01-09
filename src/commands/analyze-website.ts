import { readFileSync, writeFileSync } from 'fs';
import { getConfig } from '../config';
import { TokenManager } from '../utils/token-manager';
import { join } from 'path';
import { deployJsonConfig } from './deploy-json';
import { uploadImage } from './upload-image';

export async function analyzeWebsite(url: string, name: string, uploadLogo: boolean = false): Promise<void> {
  try {
    const config = getConfig();
    if (!config.selectedAppId) {
      throw new Error('No app selected. Please run: rownd app select');
    }

    // Get current app config
    const tokenManager = TokenManager.getInstance();
    await tokenManager.init();
    const token = await tokenManager.getValidToken();

    console.log('Fetching current app configuration...');
    const appResponse = await fetch(`${config.apiUrl}/applications/${config.selectedAppId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!appResponse.ok) {
      throw new Error(`Failed to fetch app config: ${await appResponse.text()}`);
    }

    const currentConfig = await appResponse.json();

    // Call the analyzer API
    console.log('Analyzing website...');
    const analyzerResponse = await fetch(`${config.analyzerUrl}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.analyzerApiKey,
        'x-api-secret': config.analyzerApiSecret
      },
      body: JSON.stringify({
        url,
        name,
        currentConfig: currentConfig
      })
    });

    if (!analyzerResponse.ok) {
      throw new Error(`Analysis failed: ${await analyzerResponse.text()}`);
    }

    // Save full analysis
    const analysisResult = await analyzerResponse.json();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const analysisPath = join(process.cwd(), `analysis-${timestamp}.json`);
    writeFileSync(analysisPath, JSON.stringify(analysisResult, null, 2));
    console.log(`Full analysis saved to: ${analysisPath}`);

    // Extract config and save as JSON
    if (!analysisResult.config) {
      throw new Error('No Rownd configuration found in analysis');
    }

    const configPath = join(process.cwd(), `rownd-config-${timestamp}.json`);
    writeFileSync(configPath, JSON.stringify(analysisResult.config, null, 2));
    console.log(`Configuration extracted to: ${configPath}`);

    // Deploy using the existing deploy-json command
    console.log('Deploying configuration...');
    await deployJsonConfig(configPath);

    // Debug logo detection
    console.log('\n🔍 Looking for logo in analysis:', {
      hasAnalysisResult: !!analysisResult,
      hasAnalysis: !!analysisResult?.analysis,
      hasFeatures: !!analysisResult?.analysis?.features,
      featuresKeys: analysisResult?.analysis?.features ? Object.keys(analysisResult.analysis.features) : [],
      logoData: analysisResult?.analysis?.features?.logo
    });

    // Handle logo upload if found
    if (analysisResult?.analysis?.features?.logo?.url) {
      const logoUrl = analysisResult.analysis.features.logo.url;
      console.log('\n✅ Logo found:', {
        url: logoUrl,
        path: 'analysis.features.logo.url',
        dimensions: analysisResult.analysis.features.logo.dimensions
      });
      
      console.log('\n🖼️ Logo detected, starting uploads...');
      
      const logoTypes = ['light', 'dark', 'email'] as const;
      let uploadedCount = 0;
      
      for (const type of logoTypes) {
        try {
          console.log(`\n📤 Attempting ${type} logo upload...`);
          console.log('Logo URL:', logoUrl);
          console.log('Logo type:', type);
          
          await uploadImage(logoUrl, type);
          uploadedCount++;
          console.log(`✅ ${type} logo uploaded successfully`);
        } catch (error) {
          console.warn(`⚠️ Failed to upload ${type} logo:`, 
            error instanceof Error ? error.message : String(error));
          console.error('Full error:', error);
        }
      }

      console.log(`\n📊 Logo upload summary: ${uploadedCount}/${logoTypes.length} successful`);
    } else {
      console.log('\n⚠️ No logo found in analysis:', {
        hasFeatures: !!analysisResult.features,
        hasLogo: !!analysisResult.features?.logo,
        features: analysisResult.features
      });
    }

  } catch (error) {
    console.error('Failed to analyze website:', error);
    throw error;
  }
} 