import blessed from 'blessed';
import * as contrib from 'blessed-contrib';
import { SyncOrchestrator } from '../../services/sync/SyncOrchestrator';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { TaskBrowser } from './TaskBrowser';
import { SettingsModal } from './SettingsModal';
import { SyncMenu } from './SyncMenu';
import { MaintenanceModal } from './MaintenanceModal';
import { MetricsView } from './MetricsView';

export class Dashboard {
  private screen: blessed.Widgets.Screen;
  private syncOrchestrator: SyncOrchestrator;
  
  // UI Components
  private statusTable: any;
  private activityLog: any;
  private menuList: any;
  private metricsBox: any;
  private logModal: any = null;
  private logTailInterval: NodeJS.Timeout | null = null;
  private taskBrowser: TaskBrowser | null = null;
  private settingsModal: SettingsModal | null = null;
  private syncMenu: SyncMenu | null = null;
  private maintenanceModal: MaintenanceModal | null = null;
  private metricsViewModal: MetricsView | null = null;
  
  constructor(
    screen: blessed.Widgets.Screen,
    syncOrchestrator: SyncOrchestrator
  ) {
    this.screen = screen;
    this.syncOrchestrator = syncOrchestrator;
    this.initializeComponents();
  }
  
  private initializeComponents(): void {
    // Platform Status Table (top)
    this.statusTable = contrib.table({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '30%',
      keys: false,
      fg: 'white',
      selectedFg: 'white',
      selectedBg: 'blue',
      interactive: false,
      label: ' Platform Status ',
      border: { type: 'line' },
      columnSpacing: 3,
      columnWidth: [20, 10, 15, 25]
    } as any);
    
    // Menu List (middle)
    this.menuList = blessed.list({
      parent: this.screen,
      top: '30%',
      left: 0,
      width: '100%',
      height: '35%',
      label: ' Quick Actions ',
      keys: true,
      interactive: true,
      items: [
        '[1] Three-Way Sync (All Platforms)',
        '[2] Check Sync Health',
        '[3] Clean Duplicates',
        '[4] View Detailed Logs',
        '[5] Settings & Configuration',
        '[6] View Metrics'
      ],
      border: { type: 'line' },
      style: { fg: 'white', selected: { bg: 'blue', fg: 'white' } }
    } as any);
    
    // Activity Log (bottom left)
    this.activityLog = contrib.log({
      parent: this.screen,
      top: '65%',
      left: 0,
      width: '65%',
      height: '35%',
      fg: 'green',
      selectedFg: 'green',
      label: ' Recent Activity ',
      border: { type: 'line' }
    } as any);
    
    // Metrics Box (bottom right) - simple text box instead of charts
    this.metricsBox = blessed.box({
      parent: this.screen,
      top: '65%',
      left: '65%',
      width: '35%',
      height: '35%',
      label: ' Metrics (24h) ',
      border: { type: 'line' },
      style: { fg: 'white' },
      content: 'Loading metrics...'
    } as any);

    // Bind menu actions
    this.bindMenuActions();
  }
  
  private bindMenuActions(): void {
    (this.menuList as any).on('select', (_item: any, index: number) => {
      switch (index) {
        case 0:
          this.quickSync();
          break;
        case 1:
          this.checkHealth();
          break;
        case 2:
          this.cleanDuplicates();
          break;
        case 3:
          this.toggleLogs();
          break;
        case 4:
          this.showSettings();
          break;
        case 5:
          this.showMetrics();
          break;
      }
    });
  }
  
  render(): void {
    this.updateStatusTable();
    this.screen.render();
  }
  
  private updateStatusTable(): void {
    const data = [
      ['Platform', 'Tasks', 'Status', 'Last Sync'],
      ['Todoist', '25', '✅ Online', '2 minutes ago'],
      ['Things', '6', '✅ Online', '5 minutes ago'],
      ['Obsidian', '6', '⚠️ Manual', '1 hour ago']
    ];
    
    if (this.statusTable && this.statusTable.setData) {
      this.statusTable.setData({
        headers: data[0],
        data: data.slice(1)
      });
    }
  }
  
  async refreshStatus(): Promise<void> {
    this.activityLog.log('Refreshing platform status...');
    
    try {
      const status = await this.syncOrchestrator.getStatus();
      
      // Update status table with real data
      const data = [
        ['Platform', 'Tasks', 'Status', 'Last Sync'],
        ['Todoist', status.todoist.count.toString(), status.todoist.online ? '✅ Online' : '❌ Offline', status.todoist.lastSync],
        ['Things', status.things.count.toString(), status.things.online ? '✅ Online' : '❌ Offline', status.things.lastSync],
        ['Obsidian', status.obsidian.count.toString(), status.obsidian.online ? '✅ Online' : '⚠️ Manual', status.obsidian.lastSync]
      ];
      
      if (this.statusTable && this.statusTable.setData) {
        this.statusTable.setData({
          headers: data[0],
          data: data.slice(1)
        });
      }
      
      this.activityLog.log('✅ Status refreshed successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.activityLog.log(`❌ Failed to refresh status: ${msg}`);
    }
    
    // Update metrics box with simple text
    try {
      const metrics = await this.syncOrchestrator.getMetrics(24);
      if (metrics && this.metricsBox) {
        const success = Math.round((metrics.successRate || 0) * 100);
        const syncTypeEntries = Object.entries(metrics.byType || {})
          .map(([k, v]: [string, any]) => `  ${k}: ${v.count}`)
          .slice(0, 4)
          .join('\n');
        
        this.metricsBox.setContent(
          `Success Rate: ${success}%\n\n` +
          `Sync Types:\n${syncTypeEntries || '  No data'}\n\n` +
          `Total: ${metrics.total || 0} syncs`
        );
      }
    } catch (_) {
      // ignore
    }
    
    this.screen.render();
  }
  
  async quickSync(): Promise<void> {
    this.activityLog.log('Starting three-way sync...');
    this.screen.render();
    
    try {
      // Simulate progress
      const result = await this.syncOrchestrator.performThreeWaySync();
      this.activityLog.log(`✅ Sync complete: ${result.synced} tasks synced`);
      await this.refreshStatus();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.activityLog.log(`❌ Sync failed: ${msg}`);
    }
    
    this.screen.render();
  }
  
  
  async checkHealth(): Promise<void> {
    this.activityLog.log('Running health check...');
    
    try {
      const health = await this.syncOrchestrator.checkHealth();
      if (health.isHealthy) {
        this.activityLog.log('✅ All systems healthy');
      } else {
        this.activityLog.log(`⚠️ Issues found: ${health.issues.join(', ')}`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.activityLog.log(`❌ Health check failed: ${msg}`);
    }
    
    this.screen.render();
  }
  
  async cleanDuplicates(): Promise<void> {
    this.activityLog.log('Scanning for duplicates...');
    
    try {
      const result = await this.syncOrchestrator.cleanDuplicates();
      this.activityLog.log(`✅ Cleaned ${result.removed} duplicate tasks`);
      await this.refreshStatus();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.activityLog.log(`❌ Duplicate cleanup failed: ${msg}`);
    }
    
    this.screen.render();
  }
  
  showHelp(): void {
    const helpBox = blessed.box({
      parent: this.screen,
      label: ' Help ',
      top: 'center',
      left: 'center',
      width: '50%',
      height: '50%',
      content: `
Keyboard Shortcuts:
  
  F1 / ? / h : Show this help
  F2        : Sync menu
  F3        : Task browser
  F4        : Maintenance tools
  F5 / r    : Refresh status
  F6        : Settings
  F7        : Metrics view
  
  Quick Actions (Number Keys):
  1         : Three-way sync
  2         : Check sync health
  3         : Clean duplicates
  4         : View detailed logs
  5         : Settings & configuration
  6         : View metrics
  
  s         : Three-way sync (all platforms)
  l         : Toggle log view
  q / Ctrl+C: Quit
  
  ↑↓        : Navigate menus
  Enter     : Select item
  ESC       : Cancel/Back
  
Press any key to close this help...`,
      border: 'line',
      keys: true,
      vi: true,
      scrollable: true
    } as any);
    
    helpBox.focus();
    helpBox.key(['escape', 'q', 'enter'], () => {
      helpBox.destroy();
      this.screen.render();
    });
    
    this.screen.render();
  }
  
  showTaskBrowser(): void {
    if (!this.taskBrowser) {
      this.taskBrowser = new TaskBrowser(this.screen, this.syncOrchestrator);
    }
    this.taskBrowser.open();
  }
  
  showSettings(): void {
    if (!this.settingsModal) {
      this.settingsModal = new SettingsModal(this.screen, this.syncOrchestrator);
    }
    this.settingsModal.open();
  }
  
  showSyncMenu(): void {
    if (!this.syncMenu) {
      this.syncMenu = new SyncMenu(this.screen, this.syncOrchestrator);
    }
    this.syncMenu.open();
  }
  
  showMaintenance(): void {
    if (!this.maintenanceModal) {
      this.maintenanceModal = new MaintenanceModal(this.screen, this.syncOrchestrator);
    }
    this.maintenanceModal.open();
  }
  
  showMetrics(): void {
    if (!this.metricsViewModal) {
      this.metricsViewModal = new MetricsView(this.screen, this.syncOrchestrator);
    }
    this.metricsViewModal.open();
  }
  
  toggleLogs(): void {
    if (this.logModal) {
      this.screen.remove(this.logModal);
      // @ts-ignore
      this.logModal = null;
      if (this.logTailInterval) {
        clearInterval(this.logTailInterval);
        this.logTailInterval = null;
      }
      this.screen.render();
      return;
    }
    
    const logBox = blessed.box({
      parent: this.screen,
      label: ' Detailed Logs (Press L/ESC to close) ',
      top: 'center',
      left: 'center',
      width: '90%',
      height: '80%',
      border: 'line',
      style: { fg: 'white' },
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      mouse: true,
      vi: true,
      tags: true,
      content: 'Loading logs...'
    } as any);
    
    // Streaming tail the combined log (read only new bytes)
    const logPath = path.join(os.homedir(), '.musubi', 'logs', 'combined.log');
    let position = 0;
    
    const readInitial = () => {
      try {
        const stat = fs.statSync(logPath);
        const size = stat.size;
        const start = Math.max(0, size - 64 * 1024); // last 64KB
        const fd = fs.openSync(logPath, 'r');
        const buf = Buffer.alloc(size - start);
        fs.readSync(fd, buf, 0, size - start, start);
        fs.closeSync(fd);
        position = size;
        logBox.setContent(buf.toString('utf-8') || '');
        this.screen.render();
      } catch (err) {
        logBox.setContent('No logs found or failed to read logs.');
        this.screen.render();
      }
    };
    
    readInitial();
    
    const appendNew = () => {
      try {
        const stat = fs.statSync(logPath);
        const size = stat.size;
        if (size > position) {
          const fd = fs.openSync(logPath, 'r');
          const buf = Buffer.alloc(size - position);
          fs.readSync(fd, buf, 0, size - position, position);
          fs.closeSync(fd);
          position = size;
          const current = (this.logModal && this.logModal.getContent()) || '';
          const next = (current + buf.toString('utf-8')).split(/\r?\n/).slice(-2000).join('\n');
          this.logModal.setContent(next);
          this.screen.render();
        }
      } catch (_) {
        // ignore transient errors while file rotates
      }
    };
    
    this.logTailInterval = setInterval(appendNew, 1000);
    
    logBox.focus();
    this.logModal = logBox;
    this.screen.render();
    
    const close = () => {
      if (this.logModal) {
        this.screen.remove(this.logModal);
        // @ts-ignore
        this.logModal = null;
        if (this.logTailInterval) {
          clearInterval(this.logTailInterval);
          this.logTailInterval = null;
        }
        this.screen.render();
      }
    };
    
    // Close handlers
    // @ts-ignore
    logBox.key(['escape', 'l', 'q'], close);
  }
  
  // Removed legacy placeholder methods
  focus(): void {
    this.menuList.focus();
  }
  
  async start(): Promise<void> {
    this.activityLog.log('Welcome to Todoist-Things-Obsidian Sync Manager!');
    this.activityLog.log('Press ? for help, q to quit');
  }
}