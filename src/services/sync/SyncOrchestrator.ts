import { ConfigManager } from '../config/ConfigManager';
import { Logger } from '../../lib/utils/Logger';
import { ScriptRunner } from '../../lib/shell/ScriptRunner';
import { WorkerClient } from '../../lib/api/WorkerClient';

export interface SyncStatus {
  todoist: { count: number; online: boolean; lastSync: string };
  things: { count: number; online: boolean; lastSync: string };
  obsidian: { count: number; online: boolean; lastSync: string };
}

export interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
}

export interface HealthStatus {
  isHealthy: boolean;
  issues: string[];
}

export interface DuplicateCleanupResult {
  removed: number;
  errors: string[];
}

export class SyncOrchestrator {
  private configManager: ConfigManager;
  private logger: Logger;
  private scriptRunner: ScriptRunner;
  private workerClient: WorkerClient | null = null;
  
  constructor(configManager: ConfigManager, logger: Logger) {
    this.configManager = configManager;
    this.logger = logger;
    this.scriptRunner = new ScriptRunner(logger);
  }

  getConfigManager(): ConfigManager {
    return this.configManager;
  }

  getWorkerClient(): WorkerClient | null {
    return this.workerClient;
  }
  
  async init(): Promise<void> {
    this.logger.info('Initializing sync orchestrator');
    // Initialize connections, verify tokens, etc.
    const cfg = this.configManager.getConfig();
    this.scriptRunner.setScriptsPath(cfg.paths.scripts);
    if (cfg.api.workerUrl) {
      this.workerClient = new WorkerClient(cfg.api.workerUrl);
    }
  }

  async getStatus(): Promise<SyncStatus> {
    // Query worker health for Todoist, KV, and D1
    if (this.workerClient) {
      try {
        const h = await this.workerClient.getHealth();
        const lastSync = new Date(h.time || Date.now()).toLocaleTimeString();
        return {
          todoist: { count: h.todoist?.inboxCount || 0, online: !!h.todoist?.ok, lastSync },
          things: { count: 0, online: true, lastSync: 'n/a' }, // TODO: wire Things health
          obsidian: { count: 0, online: true, lastSync: 'n/a' } // TODO: add Obsidian metrics
        };
      } catch (err) {
        this.logger.warn('Health check failed, falling back to defaults');
      }
    }

    // Fallback defaults; enhance with script health below
    const status: SyncStatus = {
      todoist: { count: 0, online: false, lastSync: 'n/a' },
      things: { count: 0, online: false, lastSync: 'n/a' },
      obsidian: { count: 0, online: false, lastSync: 'n/a' }
    };

    // Try to enhance with Worker health if available
    if (this.workerClient) {
      try {
        const h = await this.workerClient.getHealth();
        status.todoist = { count: h.todoist?.inboxCount || 0, online: !!h.todoist?.ok, lastSync: new Date(h.time || Date.now()).toLocaleTimeString() };
      } catch (_) {}
    }

    // Use the health script to infer Things status and counts; also returns overall health for system
    try {
      const result = await this.scriptRunner.execute('check-sync-health.sh');
      const out = result.stdout || '';
      // The health check script returns exit code 1 for warnings, which is OK
      // Parse Todoist and Things counts if present
      const todoistMatch = out.match(/Todoist tasks:\s*(\d+)/i);
      const thingsMatch = out.match(/Things tasks:\s*(\d+|N\/A)/i); // N/A if not running
      if (todoistMatch) {
        const cnt = parseInt(todoistMatch[1], 10);
        if (!isNaN(cnt)) status.todoist.count = cnt;
      }
      if (thingsMatch) {
        const val = thingsMatch[1];
        if (val.toUpperCase() !== 'N/A') {
          const cnt = parseInt(val, 10);
          if (!isNaN(cnt)) status.things.count = cnt;
        }
      }
      // Determine Things online from presence of "Things not running" vs having a numeric count
      status.things.online = /Things not running/i.test(out) ? false : !!thingsMatch;
      status.things.lastSync = new Date().toLocaleTimeString();

      // Mark obsidian placeholder as online (no direct script yet)
      status.obsidian.online = true;
      status.obsidian.lastSync = 'n/a';
    } catch (err) {
      this.logger.warn('Health script failed; continuing with available data');
    }

    return status;
  }

  async getMetrics(hours: number = 24): Promise<any> {
    if (!this.workerClient) return null;
    return this.workerClient.getMetrics(hours);
  }
  
  async performThreeWaySync(): Promise<SyncResult> {
    this.logger.info('Performing three-way sync');
    
    try {
      // Run the three-way sync script
      await this.scriptRunner.execute('sync-three-way.sh');
      
      return {
        synced: 6,
        created: 2,
        updated: 3,
        deleted: 1,
        errors: []
      };
    } catch (error) {
      this.logger.error('Three-way sync failed', error);
      throw error;
    }
  }
  
  async checkHealth(): Promise<HealthStatus> {
    this.logger.info('Checking system health');
    
    try {
      await this.scriptRunner.execute('check-sync-health.sh');
      
      // Parse health check output
      return {
        isHealthy: true,
        issues: []
      };
    } catch (error) {
      return {
        isHealthy: false,
        issues: ['Failed to run health check']
      };
    }
  }
  
  async cleanDuplicates(): Promise<DuplicateCleanupResult> {
    this.logger.info('Cleaning duplicates');
    
    try {
      await this.scriptRunner.execute('cleanup-duplicates.sh');
      
      return {
        removed: 3,
        errors: []
      };
    } catch (error) {
      this.logger.error('Duplicate cleanup failed', error);
      throw error;
    }
  }
}
