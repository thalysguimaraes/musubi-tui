import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { SyncOrchestrator } from '../../services/sync/SyncOrchestrator';

type Hours = 1 | 24 | 168;

export class MetricsView {
  private screen: blessed.Widgets.Screen;
  private orchestrator: SyncOrchestrator;
  private modal: any = null;
  private grid: any;
  private donut: any;
  private bar: any;
  private table: any;
  private timeframe: Hours = 24;

  constructor(screen: blessed.Widgets.Screen, orchestrator: SyncOrchestrator) {
    this.screen = screen;
    this.orchestrator = orchestrator;
  }

  open(): void {
    if (this.modal) return;
    this.modal = blessed.box({
      parent: this.screen,
      label: ' Metrics (1: 1h, 2: 24h, 3: 7d, ESC to close) ',
      top: 'center',
      left: 'center',
      width: '90%',
      height: '85%',
      border: 'line',
    } as any);

    // Nested grid for charts
    this.grid = new (contrib as any).grid({ rows: 12, cols: 12, screen: this.screen, parent: this.modal });

    this.donut = this.grid.set(0, 0, 6, 6, contrib.donut, {
      label: ' Success Rate ',
      radius: 16,
      arcWidth: 4,
      remainColor: 'black'
    });

    this.bar = this.grid.set(0, 6, 6, 6, contrib.bar, {
      label: ' Syncs by Type ',
      barWidth: 8,
      barSpacing: 4,
      xOffset: 1,
      maxHeight: 20
    });

    this.table = this.grid.set(6, 0, 6, 12, contrib.table, {
      label: ' Summary ',
      keys: true,
      interactive: false,
      columnSpacing: 4,
      columnWidth: [24, 12, 12, 12, 12]
    });

    // Key bindings
    // @ts-ignore
    this.modal.key(['1', '2', '3'], async (_ch: string, key: any) => {
      const k = key.full as string;
      this.timeframe = k === '1' ? 1 : k === '2' ? 24 : 168;
      await this.refresh();
    });
    // @ts-ignore
    this.modal.key(['escape', 'q'], () => this.close());

    this.refresh();
  }

  private async refresh() {
    try {
      const metrics = await this.orchestrator.getMetrics(this.timeframe);
      if (!metrics) return;
      const success = Math.round((metrics.successRate || 0) * 100);
      const failure = 100 - success;
      this.donut.setData([
        { percent: success, label: 'Success', color: 'green' },
        { percent: failure, label: 'Fail', color: 'red' }
      ]);

      const entries = Object.entries(metrics.byType || {})
        .map(([k, v]: any) => ({ type: k, count: v.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
      this.bar.setData({
        titles: entries.map(e => e.type.replace(/_/g, '\n')),
        data: entries.map(e => e.count)
      });

      const summaryRows = [
        ['Period', metrics.period, '', '', ''],
        ['Total syncs', String(metrics.totalSyncs), 'Success %', `${success}%`, ''],
        ['Avg duration', `${(metrics.averageDuration || 0).toFixed(0)} ms`, 'P50', `${(metrics.performance?.p50Duration || 0).toFixed(0)} ms`, 'P90'],
        ['', '', '', `${(metrics.performance?.p90Duration || 0).toFixed(0)} ms`, `P99 ${(metrics.performance?.p99Duration || 0).toFixed(0)} ms`],
        ['Processed', String(metrics.taskStats?.totalProcessed || 0), 'Created', String(metrics.taskStats?.created || 0), 'Updated'],
        ['', '', '', String(metrics.taskStats?.updated || 0), `Completed ${metrics.taskStats?.completed || 0}`],
        ['Errors', String(metrics.taskStats?.errors || 0), '', '', '']
      ];
      this.table.setData({ headers: ['Key', 'Value', 'Key', 'Value', 'Note'], data: summaryRows });

      this.screen.render();
    } catch (err) {
      // Ignore display errors
    }
  }

  close(): void {
    if (!this.modal) return;
    this.screen.remove(this.modal);
    // @ts-ignore
    this.modal = null;
    this.screen.render();
  }
}
