"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setToken = setToken;
exports.getConfig = getConfig;
let config = {
    apiUrl: 'https://api.rownd.io'
};
function setToken(token) {
    config.token = token;
}
function getConfig() {
    return config;
}
