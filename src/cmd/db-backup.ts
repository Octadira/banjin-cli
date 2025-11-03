import { AppState } from '../config';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export async function handleDbBackup(state: AppState, args: string[]): Promise<boolean> {
    const usage = () => {
        console.log(chalk.yellow(`\n/db-backup
  Usage:
    /db-backup <type> [options]   - Create database backup

  Supported database types:
    mysql       - MySQL/MariaDB backup
    postgresql  - PostgreSQL backup
    mongodb     - MongoDB backup

  MySQL options:
    /db-backup mysql <database> [user] [password] [host]

  PostgreSQL options:
    /db-backup postgresql <database> [user] [host]

  MongoDB options:
    /db-backup mongodb <database> [host] [port]

  Examples:
    /db-backup mysql mydb root mypass localhost
    /db-backup postgresql mydb postgres localhost
    /db-backup mongodb mydb localhost 27017

  Notes:
    - Backups are saved in ~/banjin-backups/ on target system
    - For remote servers, backup is created on the remote server
    - Requires database client tools installed (mysqldump, pg_dump, mongodump)
    - Password prompts may appear for interactive authentication`));
    };

    if (!args.length || ['help','-h','--help'].includes(args[0])) {
        usage();
        return false;
    }

    const dbType = args[0].toLowerCase();
    const dbArgs = args.slice(1);

    if (!['mysql', 'postgresql', 'mongodb'].includes(dbType)) {
        console.log(chalk.red(`Unsupported database type: ${dbType}`));
        console.log(chalk.yellow('Supported types: mysql, postgresql, mongodb'));
        return false;
    }

    let backupCommand: string;
    let filename: string;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    try {
        switch (dbType) {
            case 'mysql': {
                if (dbArgs.length < 1) {
                    console.log(chalk.red('Error: Database name required for MySQL backup.'));
                    return false;
                }
                const [database, user, password, host] = dbArgs;
                const hostOption = host ? `-h ${host}` : '';
                const userOption = user ? `-u ${user}` : '';
                const passOption = password ? `-p${password}` : '';

                filename = `mysql-${database}-${timestamp}.sql`;
                backupCommand = `mysqldump ${hostOption} ${userOption} ${passOption} ${database}`;
                break;
            }

            case 'postgresql': {
                if (dbArgs.length < 1) {
                    console.log(chalk.red('Error: Database name required for PostgreSQL backup.'));
                    return false;
                }
                const [database, user, host] = dbArgs;
                const hostOption = host ? `-h ${host}` : '';
                const userOption = user ? `-U ${user}` : '';

                filename = `postgres-${database}-${timestamp}.sql`;
                backupCommand = `pg_dump ${hostOption} ${userOption} ${database}`;
                break;
            }

            case 'mongodb': {
                const [database, host, port] = dbArgs;
                const dbName = database || 'all';
                const hostOption = host ? `--host ${host}` : '';
                const portOption = port ? `--port ${port}` : '';

                filename = `mongodb-${dbName}-${timestamp}`;
                backupCommand = `mongodump ${hostOption} ${portOption} ${database ? `--db ${database}` : ''} --out /tmp/${filename}`;
                break;
            }

            default:
                return false;
        }

        // Create backup directory
        const backupDir = state.ssh.host_string ? '~/banjin-backups' : path.join(os.homedir(), 'banjin-backups');
        const mkdirCommand = state.ssh.host_string ? `mkdir -p ${backupDir}` : `mkdir -p "${backupDir}"`;

        // Execute mkdir command
        if (state.ssh.host_string) {
            const [user, host] = state.ssh.host_string.split('@');
            await execAsync(`ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${user}@${host} "${mkdirCommand}"`);
        } else {
            await execAsync(mkdirCommand);
        }

        console.log(chalk.cyan(`Creating ${dbType.toUpperCase()} backup...`));

        let finalCommand: string;

        if (dbType === 'mongodb') {
            // MongoDB creates directory structure
            finalCommand = `${backupCommand} && tar -czf ${backupDir}/${filename}.tar.gz -C /tmp ${filename} && rm -rf /tmp/${filename}`;
        } else {
            // MySQL/PostgreSQL create single file
            finalCommand = `${backupCommand} > ${backupDir}/${filename}`;
        }

        if (state.ssh.host_string) {
            // Execute on remote server
            const [user, host] = state.ssh.host_string.split('@');
            const sshCommand = `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${user}@${host} "${finalCommand}"`;
            await execAsync(sshCommand);
        } else {
            // Execute locally
            await execAsync(finalCommand);
        }

        console.log(chalk.green(`✅ Backup completed successfully!`));
        console.log(chalk.cyan(`📁 Location: ${backupDir}/${filename}${dbType === 'mongodb' ? '.tar.gz' : ''}`));

    } catch (error: any) {
        console.log(chalk.red(`❌ Backup failed: ${error.message}`));
        return false;
    }

    return false;
}