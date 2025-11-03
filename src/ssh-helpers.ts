import { AppState } from './config';
import { Client } from 'ssh2';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import chalk from 'chalk';
import * as readlineSync from 'readline-sync';

const getPassword = (prompt: string): string => {
    try {
        return readlineSync.question(prompt, { hideEchoBack: true });
    } catch (error) {
        console.error(chalk.red('Error reading password input'));
        return '';
    }
}

export async function connectSsh(state: AppState, args: string[]) {
    const hostString = args[0];
    // This check is now handled by the caller, but we keep it as a fallback.
    if (!hostString.includes('@')) {
        console.log(chalk.red('Invalid host string. Format should be user@hostname'));
        return;
    }

    let keyFilename: string | undefined;
    const iIndex = args.indexOf('-i');
    const pIndex = args.indexOf('-p');

    if (iIndex !== -1 && args.length > iIndex + 1) {
        keyFilename = path.resolve(os.homedir(), args[iIndex + 1]);
    } else if (pIndex !== -1 && args.length > pIndex + 1) {
        keyFilename = path.resolve(os.homedir(), args[pIndex + 1]);
    }

    console.log(chalk.dim(`Connecting to ${hostString}...`));
    const [username, host] = hostString.split('@');
    const conn = new Client();

    conn.on('ready', () => {
        state.ssh.client = conn;
        state.ssh.host_string = hostString;
        console.log(chalk.green(`Successfully connected to ${hostString}`));
    }).on('error', (err) => {
        console.log(chalk.red(`Connection error: ${err.message}`));
    }).on('end', () => {
        if (state.ssh.client) {
            state.ssh.client.end();
            state.ssh.client = null;
            state.ssh.host_string = null;
            state.ssh.ssh_alias = null;
            console.log(chalk.yellow(`Connection to ${hostString} ended.`));
        }
    }).on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
        if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
            const password = getPassword(prompts[0].prompt);
            finish([password]);
        } else {
            finish([]);
        }
    });

    let privateKey: Buffer | undefined;
    if (keyFilename) {
        if (fs.existsSync(keyFilename)) {
            privateKey = fs.readFileSync(keyFilename);
        } else {
            console.log(chalk.red(`Error: Key file not found at ${keyFilename}`));
            return;
        }
    } else {
        const defaultKeys = [path.join(os.homedir(), '.ssh', 'id_rsa'), path.join(os.homedir(), '.ssh', 'id_ed25519')];
        const foundKeyPath = defaultKeys.find(p => fs.existsSync(p));
        if (foundKeyPath) {
            privateKey = fs.readFileSync(foundKeyPath);
        }
    }

    const connectionOptions: any = {
        host: host,
        port: 22,
        username: username,
    };

    if (privateKey) {
        connectionOptions.privateKey = privateKey;
    } else {
        connectionOptions.password = getPassword(`Password for ${hostString}: `);
    }

    try {
        conn.connect(connectionOptions);
    } catch (e: any) {
        console.log(chalk.red(`Connection setup error: ${e.message}`));
    }
}