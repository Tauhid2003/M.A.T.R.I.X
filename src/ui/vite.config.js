import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { exec, spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let daemonProcess = null;

// Helper to run python code that interacts with the scheduler database
function runPythonDbQuery(pyCode, callback) {
  const rootDir = path.resolve(__dirname, '..');
  // Make sure python runs in the project root to read/write the correct scheduler.db
  exec(`python -c "${pyCode.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, { cwd: rootDir }, (err, stdout, stderr) => {
    callback(err, stdout, stderr);
  });
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'launch-firefox-plugin',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          
          // 1. Launch Firefox API
          if (req.url === '/api/launch-firefox') {
            exec('start firefox', (err) => {
              if (err) {
                exec('firefox', (err2) => {
                  if (err2) console.error("Failed to launch Firefox:", err2);
                });
              }
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success' }));
          } 
          
          // 2. GET Scheduler status, tasks, metrics & configuration from SQLite
          else if (req.url === '/api/scheduler/status') {
            const isRunning = daemonProcess !== null && !daemonProcess.killed;
            
            const pyCode = `import sqlite3, json, os
db_path = "/var/lib/matrix/scheduler.db"
if not os.path.exists(db_path):
    db_path = "scheduler.db"

# Check if exists
if not os.path.exists(db_path):
    # Initialize it automatically if missing
    import scheduler_daemon
    scheduler_daemon.init_db(db_path)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get tasks
cursor.execute("SELECT id, agent_id, task_name, duration, remaining_time, task_complexity, urgency, resource_requirements, user_priority, priority, status, attention_history FROM tasks")
tasks = []
for r in cursor.fetchall():
    tasks.append({
        'id': r[0], 'agent_id': r[1], 'task_name': r[2], 'duration': r[3], 'remaining_time': r[4],
        'task_complexity': r[5], 'urgency': r[6], 'resource_requirements': r[7], 'user_priority': r[8],
        'priority': r[9], 'status': r[10], 'attention_history': json.loads(r[11]) if r[11] else []
    })

# Get active algorithm
cursor.execute("SELECT value FROM system_config WHERE key = 'algorithm'")
row = cursor.fetchone()
algo = row[0] if row else "Priority"

# Get cache metrics
cursor.execute("SELECT key, value FROM cache_metrics")
metrics = {k: v for k, v in cursor.fetchall()}

# Get cache states
cursor.execute("SELECT agent_id FROM cache_state")
cache_states = [r[0] for r in cursor.fetchall()]

conn.close()
print(json.dumps({
    'isRunning': ${isRunning ? 'True' : 'False'},
    'tasks': tasks,
    'algorithm': algo,
    'metrics': metrics,
    'cache_states': cache_states
}))
`;
            runPythonDbQuery(pyCode, (err, stdout) => {
              if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
              } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(stdout);
              }
            });
          }

          // 3. POST Set Scheduling Algorithm Policy
          else if (req.url.startsWith('/api/scheduler/set-algorithm')) {
            if (req.method !== 'POST') { next(); return; }
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              const { algorithm } = JSON.parse(body);
              // Whitelist validation to prevent code injection
              const VALID_ALGORITHMS = ['fifo', 'rr', 'sjf', 'priority', 'FIFO', 'RR', 'SJF', 'Priority'];
              if (!VALID_ALGORITHMS.includes(algorithm)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid algorithm. Must be one of: FIFO, RR, SJF, Priority' }));
                return;
              }
              const safeAlgo = algorithm.replace(/[^a-zA-Z]/g, '');
              const pyCode = `import sqlite3
db_path = "/var/lib/matrix/scheduler.db"
import os
if not os.path.exists(db_path):
    db_path = "scheduler.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("UPDATE system_config SET value = ? WHERE key = 'algorithm'", ("${safeAlgo}",))
conn.commit()
conn.close()
print('{"status": "success"}')
`;
              runPythonDbQuery(pyCode, (err, stdout) => {
                if (err) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: err.message }));
                } else {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(stdout);
                }
              });
            });
          }

          else if (req.url === '/api/scheduler/reset') {
            if (req.method !== 'POST') { next(); return; }
            const pyCode = `import os, sqlite3
db_path = "/var/lib/matrix/scheduler.db"
if not os.path.exists(db_path):
    db_path = "scheduler.db"
if os.path.exists(db_path):
    try:
        os.remove(db_path)
    except:
        pass
import scheduler_daemon
scheduler_daemon.init_db(db_path)
print('{"status": "success"}')
`;
            runPythonDbQuery(pyCode, (err, stdout) => {
              if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
              } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(stdout);
              }
            });
          }

          // 4b. POST Add Task to Scheduler Database
          else if (req.url === '/api/scheduler/add-task') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const { agent_id, task_name, duration, task_complexity, urgency, resource_requirements, user_priority } = JSON.parse(body);
                // Sanitize input values to prevent code injection
                const sanitize = (val, type) => {
                  if (type === 'number') {
                    const n = parseFloat(val);
                    if (isNaN(n) || n < 0 || n > 100) throw new Error('Invalid numeric value');
                    return n;
                  }
                  // String: allow only alphanumeric, spaces, hyphens, underscores
                  return String(val).replace(/[^a-zA-Z0-9 _-]/g, '').substring(0, 64);
                };
                const safeAgentId = sanitize(agent_id, 'string');
                const safeTaskName = sanitize(task_name, 'string');
                const safeDuration = sanitize(duration, 'number');
                const safeComplexity = sanitize(task_complexity, 'number');
                const safeUrgency = sanitize(urgency, 'number');
                const safeResources = sanitize(resource_requirements, 'number');
                const safePriority = sanitize(user_priority, 'number');
                const pyCode = `import sqlite3, json, os
db_path = "/var/lib/matrix/scheduler.db"
if not os.path.exists(db_path):
    db_path = "scheduler.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
priority = round((${safeComplexity} * 0.2) + (${safeUrgency} * 0.4) + (${safeResources} * 0.1) + (${safePriority} * 0.3), 2)
cursor.execute("""
    INSERT INTO tasks (agent_id, task_name, duration, remaining_time, task_complexity, urgency, resource_requirements, user_priority, priority, status, attention_history)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', '[]')
""", ("${safeAgentId}", "${safeTaskName}", ${safeDuration}, ${safeDuration}, ${safeComplexity}, ${safeUrgency}, ${safeResources}, ${safePriority}, priority))
conn.commit()
conn.close()
print('{"status": "success"}')
`;
                runPythonDbQuery(pyCode, (err, stdout) => {
                  if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                  } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(stdout);
                  }
                });
              } catch (parseErr) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON body: ' + parseErr.message }));
              }
            });
          }

          else if (req.url === '/api/scheduler/start-daemon') {
            if (req.method !== 'POST') { next(); return; }
            const isRunning = daemonProcess !== null && !daemonProcess.killed;
            if (!isRunning) {
              const rootDir = path.resolve(__dirname, '..');
              daemonProcess = spawn('python', ['-u', 'scheduler_daemon.py'], { cwd: rootDir });
              
              daemonProcess.stdout.on('data', (data) => {
                console.log(`[SchedulerDaemon STDOUT]: ${data}`);
              });
              daemonProcess.stderr.on('data', (data) => {
                console.error(`[SchedulerDaemon STDERR]: ${data}`);
              });
              daemonProcess.on('close', (code) => {
                console.log(`SchedulerDaemon process exited with code ${code}`);
                daemonProcess = null;
              });
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', isRunning: true }));
          }

          else if (req.url === '/api/scheduler/stop-daemon') {
            if (req.method !== 'POST') { next(); return; }
            if (daemonProcess) {
              daemonProcess.kill();
              daemonProcess = null;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', isRunning: false }));
          }

          // 7. GET Scheduler log file streams
          else if (req.url === '/api/scheduler/logs') {
            const rootDir = path.resolve(__dirname, '..');
            const logPath = path.join(rootDir, 'scheduler.log');
            if (fs.existsSync(logPath)) {
              const lines = fs.readFileSync(logPath, 'utf8').split('\n').slice(-40).join('\n');
              res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end(lines);
            } else {
              res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end("[Ingress System] No active log streams detected.");
            }
          }

          // Fallback to normal routes
          else {
            next();
          }
        });
      }
    }
  ]
})
