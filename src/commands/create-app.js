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
exports.createApp = createApp;
const config_1 = require("../config");
const fs_1 = require("fs");
function createApp(name) {
    return __awaiter(this, void 0, void 0, function* () {
        const config = (0, config_1.getConfig)();
        try {
            const response = yield fetch(`${config.apiUrl}/applications`, {
                method: 'POST',
                headers: Object.assign({ 'Content-Type': 'application/json' }, (config.token && { 'Authorization': `Bearer ${config.token}` })),
                body: JSON.stringify({
                    name,
                    hub: {
                        auth: {
                            allow_unverified_users: true,
                            sign_in_methods: {
                                email: { enabled: true },
                                phone: { enabled: true }
                            }
                        }
                    }
                }),
            });
            if (response.status === 401) {
                console.error('Authentication required. Please set your JWT token using:');
                console.error('rownd config set-token <your-jwt-token>');
                process.exit(1);
            }
            if (response.status === 201) {
                const app = yield response.json();
                console.log(`Created app: ${app.id}`);
                // Create .env file with app details
                yield createEnvFile({
                    ROWND_APP_ID: app.id,
                    ROWND_APP_KEY: app.key,
                    ROWND_APP_SECRET: app.secret,
                });
            }
        }
        catch (error) {
            console.error('Failed to create app:', error);
        }
    });
}
function createEnvFile(vars) {
    const content = Object.entries(vars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    (0, fs_1.writeFileSync)('.env', content);
    console.log('Created .env file with app credentials');
}
