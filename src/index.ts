#!/usr/bin/env node

import blessed from 'blessed';
import { Dashboard } from './ui/components/Dashboard';
import { SyncOrchestrator } from './services/sync/SyncOrchestrator';
import { ConfigManager } from './services/config/ConfigManager';
import { Logger } from './lib/utils/Logger';

class TodoistThingsTUI {
  private screen: blessed.Widgets.Screen;
  private dashboard: Dashboard;
  private syncOrchestrator: SyncOrchestrator;
  private configManager: ConfigManager;
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
    this.configManager = new ConfigManager();
    this.syncOrchestrator = new SyncOrchestrator(this.configManager, this.logger);
    
    // Create the main screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Musubi Sync Manager'
    });

    // Initialize dashboard
    this.dashboard = new Dashboard(this.screen, this.syncOrchestrator);
  }

  async init(): Promise<void> {
    try {
      // Load configuration
      await this.configManager.load();
      
      // Check if first run
      if (!this.configManager.isConfigured()) {
        await this.runFirstTimeSetup();
      }
      
      // Initialize services
      await this.syncOrchestrator.init();
      
      // Setup the UI
      this.setupUI();
      this.bindKeyboardShortcuts();
      
      // Start the dashboard
      await this.dashboard.start();
      
      // Initial status check
      await this.dashboard.refreshStatus();
      
      this.logger.info('TUI started successfully');
    } catch (error) {
      this.logger.error('Failed to initialize TUI', error);
      process.exit(1);
    }
  }

  private setupUI(): void {
    // Set up the main layout
    this.dashboard.render();
    
    // Focus on the dashboard
    this.dashboard.focus();
    
    // Render the screen
    this.screen.render();
  }

  private bindKeyboardShortcuts(): void {
    // Global shortcuts
    this.screen.key(['q', 'C-c'], () => {
      this.quit();
    });

    this.screen.key(['?', 'h'], () => {
      this.dashboard.showHelp();
    });

    this.screen.key(['s'], () => {
      this.dashboard.quickSync();
    });

    // Number key shortcuts for quick actions
    this.screen.key(['1'], () => {
      this.dashboard.quickSync();
    });

    this.screen.key(['2'], () => {
      this.dashboard.checkHealth();
    });

    this.screen.key(['3'], () => {
      this.dashboard.cleanDuplicates();
    });

    this.screen.key(['4'], () => {
      this.dashboard.toggleLogs();
    });

    this.screen.key(['5'], () => {
      this.dashboard.showSettings();
    });

    this.screen.key(['6'], () => {
      this.dashboard.showMetrics();
    });

    this.screen.key(['r', 'f5'], () => {
      this.dashboard.refreshStatus();
    });

    this.screen.key(['l'], () => {
      this.dashboard.toggleLogs();
    });

    this.screen.key(['f1'], () => {
      this.dashboard.showHelp();
    });

    this.screen.key(['f2'], () => {
      this.dashboard.showSyncMenu();
    });

    this.screen.key(['f3'], () => {
      this.dashboard.showTaskBrowser();
    });

    this.screen.key(['f4'], () => {
      this.dashboard.showMaintenance();
    });

    this.screen.key(['f6'], () => {
      this.dashboard.showSettings();
    });

    this.screen.key(['f7'], () => {
      this.dashboard.showMetrics();
    });
  }

  private async runFirstTimeSetup(): Promise<void> {
    this.logger.info('First time setup required');
    // Inline minimal setup using inquirer prompts
    const inquirer = await import('inquirer');
    const answers = await inquirer.default.prompt([
      {
        type: 'input',
        name: 'workerUrl',
        message: 'Cloudflare Worker URL:',
        default: 'https://musubi-sync.workers.dev'
      },
      {
        type: 'password',
        name: 'todoistApiToken',
        message: 'Todoist API Token (optional for TUI):',
        mask: '*'
      },
      {
        type: 'confirm',
        name: 'autoSync',
        message: 'Enable auto-sync?',
        default: true
      },
      {
        type: 'number',
        name: 'interval',
        message: 'Sync interval (ms):',
        default: 900000
      }
    ]);

    const cfg = this.configManager.getConfig();
    const updated = {
      ...cfg,
      api: {
        ...cfg.api,
        workerUrl: answers.workerUrl,
        todoistApiToken: answers.todoistApiToken || ''
      },
      sync: {
        ...cfg.sync,
        autoSync: !!answers.autoSync,
        interval: Number(answers.interval) || cfg.sync.interval
      }
    };
    await this.configManager.save(updated);
  }

  private quit(): void {
    this.logger.info('Shutting down TUI');
    process.exit(0);
  }

  async start(): Promise<void> {
    await this.init();
  }
}

// Main entry point
if (require.main === module) {
  const app = new TodoistThingsTUI();
  app.start().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { TodoistThingsTUI };
