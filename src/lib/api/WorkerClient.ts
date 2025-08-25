import fetch from 'node-fetch';

export interface WorkerTask {
  id: string;
  content: string;
  notes?: string;
  completed?: boolean;
  priority?: number;
  due?: string | null;
  tags?: string[];
}

export class WorkerClient {
  constructor(private baseUrl: string) {
    // Normalize trailing slash
    if (this.baseUrl.endsWith('/')) {
      this.baseUrl = this.baseUrl.slice(0, -1);
    }
  }

  async getInboxTasks(): Promise<WorkerTask[]> {
    const url = `${this.baseUrl}/obsidian/tasks`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      throw new Error(`Worker request failed: ${res.status} ${res.statusText}`);
    }
    const data: any = await res.json().catch(() => ({ tasks: [] }));
    return (data?.tasks || []) as WorkerTask[];
  }

  async getInboxCount(): Promise<number> {
    const tasks = await this.getInboxTasks();
    return tasks.length;
  }

  async getHealth(): Promise<{ ok: boolean; time: string; todoist: { ok: boolean; inboxCount: number; error?: string }; kv: { ok: boolean; error?: string }; d1: { ok: boolean; error?: string } }>{
    const url = `${this.baseUrl}/health`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      throw new Error(`Health request failed: ${res.status} ${res.statusText}`);
    }
    return res.json() as any;
  }

  async healthCheck(): Promise<{ ok: boolean; message?: string }>{
    try {
      const h = await this.getHealth();
      return { ok: h.ok, message: h.ok ? undefined : 'Health reported not ok' };
    } catch (err: any) {
      return { ok: false, message: err?.message || 'Unknown error' };
    }
  }

  async getMetrics(hours: number = 24): Promise<any> {
    const url = `${this.baseUrl}/metrics?hours=${encodeURIComponent(String(hours))}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      throw new Error(`Metrics request failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }
}
