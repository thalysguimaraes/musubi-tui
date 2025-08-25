import blessed from 'blessed';
import { SyncOrchestrator } from '../../services/sync/SyncOrchestrator';

export class MaintenanceModal {
  private screen: blessed.Widgets.Screen;
  private orchestrator: SyncOrchestrator;
  private modal: any = null;
  private list: blessed.Widgets.ListElement | null = null;

  constructor(screen: blessed.Widgets.Screen, orchestrator: SyncOrchestrator) {
    this.screen = screen;
    this.orchestrator = orchestrator;
  }

  open(): void {
    if (this.modal) return;
    this.modal = blessed.box({
      parent: this.screen,
      label: ' Maintenance (ESC to close) ',
      top: 'center',
      left: 'center',
      width: '50%',
      height: '50%',
      border: 'line',
    } as any);

    this.list = blessed.list({
      parent: this.modal,
      keys: true,
      interactive: true,
      mouse: true,
      items: [
        'Clean Duplicates',
        'Check Sync Health'
      ],
      top: 1,
      left: 1,
      width: '98%',
      height: '90%',
      style: {
        selected: { bg: 'blue', fg: 'white' }
      }
    } as any);

    // @ts-ignore
    this.modal.key(['escape', 'q'], () => this.close());

    this.list.on('select', async (_, index) => {
      try {
        if (index === 0) await this.orchestrator.cleanDuplicates();
        if (index === 1) await this.orchestrator.checkHealth();
      } finally {
        this.close();
      }
    });

    this.list.focus();
    this.screen.render();
  }

  close(): void {
    if (!this.modal) return;
    this.screen.remove(this.modal);
    // @ts-ignore
    this.modal = null;
    this.screen.render();
  }
}
