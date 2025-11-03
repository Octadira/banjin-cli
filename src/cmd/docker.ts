import { AppState } from '../config';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function handleDocker(state: AppState, args: string[]): Promise<boolean> {
    const usage = () => {
        console.log(chalk.yellow(`\n/docker
  Usage:
    /docker <command> [args...]   - Execute Docker commands

  Available commands:
    ps              - List running containers
    images          - List Docker images
    logs <container> - Show container logs
    exec <container> <cmd> - Execute command in running container
    start <container> - Start a stopped container
    stop <container> - Stop a running container
    restart <container> - Restart a container
    rm <container> - Remove a stopped container
    rmi <image> - Remove a Docker image
    pull <image> - Pull a Docker image
    build <path> [tag] - Build Docker image from Dockerfile

  Examples:
    /docker ps
    /docker logs myapp
    /docker exec myapp "ls -la"
    /docker start nginx
    /docker stop nginx
    /docker pull nginx:latest
    /docker build . myapp:v1.0

  Notes:
    - Works on both local and remote servers
    - Requires Docker to be installed on target system
    - For remote servers, requires active SSH connection`));
    };

    if (!args.length || ['help','-h','--help'].includes(args[0])) {
        usage();
        return false;
    }

    const subCommand = args[0];
    const subArgs = args.slice(1);

    let dockerCommand: string;

    switch (subCommand) {
        case 'ps':
            dockerCommand = 'docker ps -a --format "table {{.Names}}\\t{{.Image}}\\t{{.Status}}\\t{{.Ports}}"';
            break;

        case 'images':
            dockerCommand = 'docker images --format "table {{.Repository}}\\t{{.Tag}}\\t{{.Size}}"';
            break;

        case 'logs':
            if (!subArgs[0]) {
                console.log(chalk.red('Error: Container name required for logs command.'));
                return false;
            }
            dockerCommand = `docker logs ${subArgs[0]}`;
            break;

        case 'exec':
            if (subArgs.length < 2) {
                console.log(chalk.red('Error: Container name and command required for exec.'));
                return false;
            }
            const container = subArgs[0];
            const execCmd = subArgs.slice(1).join(' ');
            dockerCommand = `docker exec ${container} ${execCmd}`;
            break;

        case 'start':
        case 'stop':
        case 'restart':
        case 'rm':
            if (!subArgs[0]) {
                console.log(chalk.red(`Error: Container name required for ${subCommand} command.`));
                return false;
            }
            dockerCommand = `docker ${subCommand} ${subArgs[0]}`;
            break;

        case 'rmi':
            if (!subArgs[0]) {
                console.log(chalk.red('Error: Image name required for rmi command.'));
                return false;
            }
            dockerCommand = `docker rmi ${subArgs[0]}`;
            break;

        case 'pull':
            if (!subArgs[0]) {
                console.log(chalk.red('Error: Image name required for pull command.'));
                return false;
            }
            dockerCommand = `docker pull ${subArgs[0]}`;
            break;

        case 'build':
            if (!subArgs[0]) {
                console.log(chalk.red('Error: Path required for build command.'));
                return false;
            }
            const buildPath = subArgs[0];
            const tag = subArgs[1] ? `-t ${subArgs[1]}` : '';
            dockerCommand = `docker build ${tag} ${buildPath}`;
            break;

        default:
            console.log(chalk.red(`Unknown Docker command: ${subCommand}`));
            usage();
            return false;
    }

    try {
        let result: string;

        if (state.ssh.host_string) {
            // Execute on remote server
            const [user, host] = state.ssh.host_string.split('@');
            const sshCommand = `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${user}@${host} "${dockerCommand}"`;
            const { stdout, stderr } = await execAsync(sshCommand);
            result = stdout || stderr;
        } else {
            // Execute locally
            const { stdout, stderr } = await execAsync(dockerCommand);
            result = stdout || stderr;
        }

        console.log(result.trim());

    } catch (error: any) {
        console.log(chalk.red(`Docker command failed: ${error.message}`));
        return false;
    }

    return false;
}