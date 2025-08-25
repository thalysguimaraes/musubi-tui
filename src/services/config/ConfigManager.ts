import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface Config {
  api: {
    workerUrl: string;
    todoistApiToken?: string;
    repairAuthToken?: string;
  };
  sync: {
    autoSync: boolean;
    interval: number;
    retryAttempts: number;
  };
  paths: {
    scripts: string;
    logs: string;
    obsidianVault?: string;
  };
}

export class ConfigManager {
  private config: Config | null = null;
  private configPath: string;
  
  constructor() {
    this.configPath = path.join(os.homedir(), '.todoist-things-sync', 'config.json');
  }
  
  async load(): Promise<Config> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(configData);
      return this.config!;
    } catch (error) {
      // Return default config if file doesn't exist
      this.config = this.getDefaultConfig();
      return this.config;
    }
  }
  
  async save(config: Config): Promise<void> {
    this.config = config;
    const dir = path.dirname(this.configPath);
    
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save config: ${error}`);
    }
  }
  
  isConfigured(): boolean {
    // Consider configured if we at least have a worker URL set
    return !!(this.config?.api?.workerUrl);
  }
  
  getConfig(): Config {
    if (!this.config) {
      throw new Error('Config not loaded');
    }
    return this.config;
  }
  
  private getDefaultConfig(): Config {
    return {
      api: {
        workerUrl: 'https://todoist-things-sync.thalys.workers.dev'
      },
      sync: {
        autoSync: true,
        interval: 900000, // 15 minutes
        retryAttempts: 3
      },
      paths: {
        scripts: path.join(__dirname, '../../../../scripts'),
        logs: path.join(os.homedir(), '.todoist-things-sync', 'logs')
      }
    };
  }
}
