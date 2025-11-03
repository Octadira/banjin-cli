import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export function listLocalFiles(targetPath: string) {
    try {
        const resolvedPath = path.resolve(targetPath);
        if (!fs.existsSync(resolvedPath)) {
            console.log(chalk.red(`Path does not exist: ${targetPath}`));
            return;
        }

        const stats = fs.statSync(resolvedPath);
        if (!stats.isDirectory()) {
            console.log(chalk.red(`Path is not a directory: ${targetPath}`));
            return;
        }

        const files = fs.readdirSync(resolvedPath, { withFileTypes: true });
        const output = files.map(dirent => {
            return dirent.isDirectory() ? chalk.blue(dirent.name + '/') : dirent.name;
        }).join('\n');
        console.log(output || chalk.yellow('(empty directory)'));
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.log(chalk.red(`Error listing files: ${errorMessage}`));
    }
}