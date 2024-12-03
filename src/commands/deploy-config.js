"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployConfig = deployConfig;
const toml_1 = require("@iarna/toml");
const fs_1 = require("fs");
const config_1 = require("../config");
function deployConfig(appId) {
    return __awaiter(this, void 0, void 0, function* () {
        const config = (0, config_1.getConfig)();
        try {
            // Read and parse TOML
            const tomlContent = (0, fs_1.readFileSync)('./rownd.toml', 'utf-8');
            const parsedConfig = (0, toml_1.parse)(tomlContent);
            // Type cast with validation
            const tomlConfig = parsedConfig;
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
                            apple: Object.assign({ enabled: tomlConfig.auth.sign_in_methods.apple }, (tomlConfig.auth.apple && { client_id: tomlConfig.auth.apple.client_id })),
                            google: Object.assign({ enabled: tomlConfig.auth.sign_in_methods.google }, (tomlConfig.auth.google && {
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
                            })),
                            crypto_wallet: { enabled: tomlConfig.auth.sign_in_methods.crypto_wallet },
                            passkeys: Object.assign({ enabled: tomlConfig.auth.sign_in_methods.passkeys }, (tomlConfig.auth.passkeys && {
                                registration_prompt_frequency: tomlConfig.auth.passkeys.registration_prompt_frequency
                            })),
                            anonymous: { enabled: tomlConfig.auth.sign_in_methods.anonymous }
                        }
                    },
                    allowed_web_origins: tomlConfig.domains.trusted.split(',').map(d => d.trim())
                }
            };
            // Update app config via API
            const response = yield fetch(`${config.apiUrl}/applications/${appId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.token}`
                },
                body: JSON.stringify(appConfig)
            });
            if (response.status === 200) {
                console.log('Successfully updated app configuration');
            }
            else {
                console.error('Failed to update app configuration:', yield response.text());
            }
        }
        catch (error) {
            console.error('Failed to deploy config:', error);
        }
    });
}
