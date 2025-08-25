import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { SyncOrchestrator } from '../../services/sync/SyncOrchestrator';

export class TaskBrowser {
  private screen: blessed.Widgets.Screen;
  private orchestrator: SyncOrchestrator;
  private modal: any = null;
  private table: any;
  private status: any = null;

  constructor(screen: blessed.Widgets.Screen, orchestrator: SyncOrchestrator) {
    this.screen = screen;
    this.orchestrator = orchestrator;
  }

  open(): void {
    if (this.modal) return;
    this.modal = blessed.box({
      parent: this.screen,
      label: ' Task Browser (ESC to close, R to refresh) ',
      top: 'center',
      left: 'center',
      width: '90%',
      height: '80%',
      border: 'line',
    } as any);

    // Create a table inside modal
    // @ts-ignore
    this.table = (contrib as any).table({
      parent: this.modal,
      top: 0,
      left: 0,
      width: '100%',
      height: '90%',
      keys: true,
      fg: 'white',
      interactive: true,
      columnSpacing: 2,
      columnWidth: [14, 80]
    } as any);

    this.status = blessed.box({
      parent: this.modal,
      top: '90%',
      left: 0,
      width: '100%',
      height: '10%',
      tags: true,
      content: 'Loading...'
    } as any);

    this.bindKeys();
    this.refresh();
  }

  private bindKeys() {
    const close = () => this.close();
    // @ts-ignore
    this.modal!.key(['escape', 'q'], close);
    // @ts-ignore
    this.modal!.key(['r', 'f5'], () => this.refresh());
  }

  private async refresh() {
    try {
      this.setStatus('Loading tasks from Worker...');
      // Fetch full task list via Worker client when available
      const worker = this.orchestrator.getWorkerClient();
      let tasks: Array<{ id: string; content: string }> = [];
      if (worker) {
        tasks = await worker.getInboxTasks();
      }

      const rows = tasks.map((t) => [t.id, t.content.substring(0, 120)]);
      // @ts-ignore
      this.table.setData({ headers: ['ID', 'Content'], data: rows });
      this.setStatus(`Loaded ${rows.length} tasks.`);
      this.screen.render();
    } catch (err: any) {
      this.setStatus(`Failed to load tasks: ${err?.message || err}`);
      this.screen.render();
    }
  }

  private setStatus(text: string) {
    if (this.status) this.status.setContent(text);
  }

  close(): void {
    if (!this.modal) return;
    this.screen.remove(this.modal);
    // @ts-ignore
    this.modal = null;
    this.screen.render();
  }
}
