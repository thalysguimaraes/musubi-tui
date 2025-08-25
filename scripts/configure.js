#!/usr/bin/env node
const inquirer = require('inquirer');
const os = require('os');
const fs = require('fs');
const path = require('path');

async function main() {
  const configDir = path.join(os.homedir(), '.todoist-things-sync');
  const configPath = path.join(configDir, 'config.json');

  let current = {
    api: { workerUrl: 'https://todoist-things-sync.thalys.workers.dev', todoistApiToken: '' },
    sync: { autoSync: true, interval: 900000, retryAttempts: 3 },
    paths: { scripts: path.join(__dirname, '../../scripts'), logs: path.join(os.homedir(), '.todoist-things-sync', 'logs') }
  };
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    current = JSON.parse(raw);
  } catch (_) {}

  const answers = await inquirer.prompt([
    { type: 'input', name: 'workerUrl', message: 'Cloudflare Worker URL:', default: current.api.workerUrl },
    { type: 'password', name: 'todoistApiToken', message: 'Todoist API Token (optional):', mask: '*' },
    { type: 'confirm', name: 'autoSync', message: 'Enable auto-sync?', default: current.sync.autoSync },
    { type: 'number', name: 'interval', message: 'Sync interval (ms):', default: current.sync.interval }
  ]);

  const updated = {
    ...current,
    api: { ...current.api, workerUrl: answers.workerUrl, todoistApiToken: answers.todoistApiToken || '' },
    sync: { ...current.sync, autoSync: !!answers.autoSync, interval: Number(answers.interval) || current.sync.interval }
  };

  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(updated, null, 2));
  console.log(`Saved configuration to ${configPath}`);
}

main().catch(err => {
  console.error('Configuration failed:', err);
  process.exit(1);
});

