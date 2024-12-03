#!/usr/bin/env node
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
const commander_1 = require("commander");
const create_app_1 = require("./commands/create-app");
const config_1 = require("./config");
const program = new commander_1.Command();
program
    .name('rownd')
    .description('CLI tool for managing Rownd applications')
    .version('1.0.0');
program
    .command('config')
    .description('Configure the CLI tool')
    .command('set-token')
    .argument('<token>', 'JWT token for authentication')
    .action((token) => {
    (0, config_1.setToken)(token);
    console.log('Token set successfully');
});
program
    .command('create')
    .description('Create a new Rownd app')
    .argument('<name>', 'name of the app')
    .action((name) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, create_app_1.createApp)(name);
}));
program.parse();
