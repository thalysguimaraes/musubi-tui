import { execa } from 'execa';
import path from 'path';
import { Logger } from '../utils/Logger';

export interface ScriptResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export class ScriptRunner {
  private scriptsPath: string;
  private logger: Logger;
  
  constructor(logger: Logger) {
    this.logger = logger;
    // Default scripts path - can be overridden by config
    this.scriptsPath = path.join(__dirname, '../../../../../scripts');
  }
  
  setScriptsPath(path: string): void {
    this.scriptsPath = path;
  }
  
  async execute(scriptName: string, args: string[] = []): Promise<ScriptResult> {
    const scriptPath = path.join(this.scriptsPath, scriptName);
    const startTime = Date.now();
    
    this.logger.info(`Executing script: ${scriptName}`, { args });
    
    try {
      const { stdout, stderr, exitCode } = await execa(scriptPath, args, {
        shell: true,
        env: {
          ...process.env,
          // Add any required environment variables
          TODOIST_THINGS_WORKER_URL: process.env.TODOIST_THINGS_WORKER_URL || 'https://todoist-things-sync.thalys.workers.dev'
        }
      });
      
      const duration = Date.now() - startTime;
      
      const result: ScriptResult = {
        stdout,
        stderr,
        exitCode: exitCode || 0,
        duration
      };
      
      this.logger.info(`Script completed: ${scriptName}`, {
        exitCode: result.exitCode,
        duration: result.duration
      });
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // For health check scripts, exit code 1 is just a warning, not a failure
      if (scriptName === 'check-sync-health.sh' && error.exitCode === 1) {
        this.logger.info(`Health check completed with warnings`, {
          exitCode: error.exitCode,
          duration
        });
      } else {
        this.logger.error(`Script failed: ${scriptName}`, error);
      }
      
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.exitCode || 1,
        duration
      };
    }
  }
  
  async executeAsync(scriptName: string, args: string[] = []): Promise<void> {
    const scriptPath = path.join(this.scriptsPath, scriptName);
    
    this.logger.info(`Executing async script: ${scriptName}`, { args });
    
    // Run in background without waiting
    execa(scriptPath, args, {
      shell: true,
      detached: true,
      stdio: 'ignore'
    }).unref();
  }
}