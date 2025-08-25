import blessed from 'blessed';
import { SyncOrchestrator } from '../../services/sync/SyncOrchestrator';
import { ConfigManager } from '../../services/config/ConfigManager';

export class SettingsModal {
  private screen: blessed.Widgets.Screen;
  private orchestrator: SyncOrchestrator;
  private modal: any = null;
  private form: blessed.Widgets.FormElement<any> | null = null;
  private inputs: Record<string, any> = {};

  constructor(screen: blessed.Widgets.Screen, orchestrator: SyncOrchestrator) {
    this.screen = screen;
    this.orchestrator = orchestrator;
  }

  open(): void {
    if (this.modal) return;

    this.modal = blessed.box({
      parent: this.screen,
      label: ' Settings (TAB to navigate, Enter to Save, ESC to close) ',
      top: 'center',
      left: 'center',
      width: '80%',
      height: '60%',
      border: 'line',
    } as any);

    // @ts-ignore
    this.form = blessed.form({
      parent: this.modal,
      keys: true,
      top: 0,
      left: 1,
      width: '98%',
      height: '100%'
    });

    const cfgManager: ConfigManager = this.orchestrator.getConfigManager();
    const cfg = cfgManager.getConfig();

    const labels = [
      'Worker URL:',
      'Todoist API Token:',
      'Auto-sync (true/false):',
      'Sync interval (ms):'
    ];
    const defaults: any[] = [
      cfg.api.workerUrl || '',
      cfg.api.todoistApiToken || '',
      String(cfg.sync.autoSync),
      String(cfg.sync.interval)
    ];

    labels.forEach((label, i) => {
      blessed.text({ parent: this.form!, top: 2 + i * 3, left: 0, content: label });
      const textbox = blessed.textbox({
        parent: this.form!,
        name: `field_${i}`,
        inputOnFocus: true,
        top: 2 + i * 3,
        left: 24,
        width: '70%',
        height: 1,
        border: 'line'
      } as any);
      textbox.setValue(defaults[i]);
      this.inputs[`field_${i}`] = textbox;
    });

    const saveButton = blessed.button({
      parent: this.form!,
      mouse: true,
      keys: true,
      shrink: true,
      padding: { left: 1, right: 1 },
      left: 24,
      bottom: 1,
      name: 'save',
      content: ' Save ',
      style: { bg: 'green', fg: 'black', focus: { bg: 'green' } }
    });

    const cancelButton = blessed.button({
      parent: this.form!,
      mouse: true,
      keys: true,
      shrink: true,
      padding: { left: 1, right: 1 },
      left: 34,
      bottom: 1,
      name: 'cancel',
      content: ' Cancel ',
      style: { bg: 'red', fg: 'black', focus: { bg: 'red' } }
    });

    saveButton.on('press', () => this.save());
    cancelButton.on('press', () => this.close());

    // Close on ESC
    // @ts-ignore
    this.modal.key(['escape'], () => this.close());

    // Focus first input
    this.inputs['field_0'].focus();
    this.screen.render();
  }

  private async save() {
    try {
      const cfgManager: ConfigManager = this.orchestrator.getConfigManager();
      const current = cfgManager.getConfig();

      const updated = {
        ...current,
        api: {
          ...current.api,
          workerUrl: this.inputs['field_0'].getValue(),
          todoistApiToken: this.inputs['field_1'].getValue()
        },
        sync: {
          ...current.sync,
          autoSync: String(this.inputs['field_2'].getValue()).toLowerCase() === 'true',
          interval: parseInt(this.inputs['field_3'].getValue(), 10) || current.sync.interval
        }
      };

      await cfgManager.save(updated);

      // Re-init orchestrator with new settings
      await this.orchestrator.init();
    } catch (err) {
      // no-op, modal UI only
    } finally {
      this.close();
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
