#!/bin/bash
# M.A.T.R.I.X. AI-OS chroot configuration script
# This script executes inside the debootstrap chroot environment.

set -e
export DEBIAN_FRONTEND=noninteractive

echo "=========================================================="
echo "Starting chroot configuration for M.A.T.R.I.X. AI-OS..."
echo "=========================================================="

# 1. Update source repositories
apt-get update

# 2. Purge unwanted default telemetry and graphic bloat
echo "Removing excluded telemetry, snapd, and bloated packages..."
apt-get purge --auto-remove -y \
    snapd \
    gnome-shell \
    gdm3 \
    popularity-contest \
    apport \
    ubuntu-report || true

# 3. Install core systems libraries and utilities
echo "Installing required utilities..."
apt-get install -y --no-install-recommends \
    sudo \
    systemd-sysv \
    xorg \
    mate-desktop-environment-core \
    xterm \
    python3 \
    python3-pip \
    sqlite3 \
    espeak \
    xdotool \
    git \
    curl \
    ca-certificates \
    gnupg \
    vulkan-tools \
    libgl1-mesa-dri

# 4. Install Wine Compatibility Layer (Devel Channel)
echo "Configuring Wine Developer repositories..."
dpkg --add-architecture i386
mkdir -pm 755 /etc/apt/keyrings
curl -fsSL https://dl.winehq.org/wine-builds/winehq.key | gpg --dearmor -o /etc/apt/keyrings/winehq-archive.key
echo "deb [signed-by=/etc/apt/keyrings/winehq-archive.key] https://dl.winehq.org/wine-builds/debian/ bookworm main" | tee /etc/apt/sources.list.d/winehq.list
apt-get update

echo "Installing Wine elements (Direct PE Call Interceptors)..."
apt-get install -y --install-recommends \
    winehq-devel \
    cabextract

# 5. Download and set up Ollama AI Engine offline binary
echo "Downloading and installing Ollama system daemon..."
curl -fsSL https://ollama.com/install.sh | sh || true

# 6. Copy system daemon script to bin directory
echo "Registering matrix-scheduler daemon scripts..."
mkdir -p /var/lib/matrix
chmod 750 /var/lib/matrix
touch /var/log/matrix_scheduler.log
chmod 640 /var/log/matrix_scheduler.log

cat << 'EOF' > /usr/local/bin/matrix_scheduler.py
#!/usr/bin/env python3
# M.A.T.R.I.X. Kernel Agent Scheduler Daemon (Offline Service)
# This file is loaded at boot time by systemd.

import sys
import os
import sqlite3
import json
import asyncio
from datetime import datetime
from collections import deque
from typing import List, Dict, Optional

# Reconfigure stdout/stderr to support Unicode/UTF-8 emojis
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Ground truth DB paths
DB_PATH = "/var/lib/matrix/scheduler.db"
LOG_PATH = "/var/log/matrix_scheduler.log"

def log_message(msg: str):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"{timestamp} {msg}"
    print(formatted, flush=True)
    try:
        with open(LOG_PATH, "a", encoding='utf-8') as f:
            f.write(formatted + "\n")
    except Exception:
        pass

class LRUKCache:
    """
    LRU-K Cache implementation for tracking agent attention history contexts.
    Eviction is based on the K-th backward reference distance.
    """
    def __init__(self, capacity: int, k: int = 2):
        self.capacity = capacity
        self.k = k
        self.cache = {}             # key (agent_id) -> value (attention_history)
        self.access_history = {}    # key (agent_id) -> list of access count timestamps
        self.access_count = 0

    def get(self, key: str) -> Optional[List[str]]:
        if key not in self.cache:
            return None
        self.access_count += 1
        self._record_access(key)
        return self.cache[key]

    def put(self, key: str, value: List[str]):
        self.access_count += 1
        if key in self.cache:
            self.cache[key] = value
            self._record_access(key)
            return
        if len(self.cache) >= self.capacity:
            self._evict()
        self.cache[key] = value
        self._record_access(key)

    def _record_access(self, key: str):
        if key not in self.access_history:
            self.access_history[key] = []
        self.access_history[key].append(self.access_count)
        if len(self.access_history[key]) > self.k:
            self.access_history[key].pop(0)

    def _evict(self):
        victim = None
        inf_keys = []
        for key in self.cache:
            history = self.access_history.get(key, [])
            if len(history) < self.k:
                inf_keys.append(key)
        if inf_keys:
            victim = min(inf_keys, key=lambda k: self.access_history[k][0] if self.access_history[k] else 0)
        else:
            victim = min(self.cache.keys(), key=lambda k: self.access_history[k][0])
        if victim:
            del self.cache[victim]
            if victim in self.access_history:
                del self.access_history[victim]
            log_message(f"💾 [Cache Eviction] LRU-{self.k} cache full. Evicted state for agent '{victim}'")

class AgentTask:
    def __init__(self, db_id: int, agent_id: str, task_name: str, duration: float, 
                 task_complexity: float, urgency: float, 
                 resource_requirements: float, user_priority: float,
                 attention_history: List[str] = None):
        self.db_id = db_id
        self.agent_id = agent_id
        self.task_name = task_name
        self.duration = duration
        self.remaining_time = duration
        self.task_complexity = task_complexity
        self.urgency = urgency
        self.resource_requirements = resource_requirements
        self.user_priority = user_priority
        self.priority = self.calculate_priority()
        self.attention_history = attention_history or []
        self.executed_time = 0.0

    def calculate_priority(self) -> float:
        return round(
            (self.task_complexity * 0.2) + 
            (self.urgency * 0.4) + 
            (self.resource_requirements * 0.1) + 
            (self.user_priority * 0.3), 
            2
        )

def init_db(db_path: str):
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_config (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT,
            task_name TEXT,
            duration REAL,
            remaining_time REAL,
            task_complexity REAL,
            urgency REAL,
            resource_requirements REAL,
            user_priority REAL,
            priority REAL,
            status TEXT,
            attention_history TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cache_state (
            agent_id TEXT PRIMARY KEY,
            attention_history TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cache_metrics (
            key TEXT PRIMARY KEY,
            value INTEGER
        )
    """)
    cursor.execute("INSERT OR IGNORE INTO system_config (key, value) VALUES ('algorithm', 'Priority')")
    cursor.execute("INSERT OR IGNORE INTO cache_metrics (key, value) VALUES ('hits', 0)")
    cursor.execute("INSERT OR IGNORE INTO cache_metrics (key, value) VALUES ('misses', 0)")
    
    # Pre-populate some initial tasks if tables are empty to simulate boot tasks
    cursor.execute("SELECT COUNT(*) FROM tasks")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO tasks (agent_id, task_name, duration, remaining_time, task_complexity, urgency, resource_requirements, user_priority, priority, status, attention_history)
            VALUES ('Security Auditor', 'Vulnerability Scan', 2.0, 2.0, 8.0, 9.0, 5.0, 7.0, 7.3, 'pending', '[]')
        """)
        cursor.execute("""
            INSERT INTO tasks (agent_id, task_name, duration, remaining_time, task_complexity, urgency, resource_requirements, user_priority, priority, status, attention_history)
            VALUES ('Wine Translator', 'Translate win32 API', 1.0, 1.0, 4.0, 3.0, 3.0, 5.0, 4.1, 'pending', '[]')
        """)
        cursor.execute("""
            INSERT INTO tasks (agent_id, task_name, duration, remaining_time, task_complexity, urgency, resource_requirements, user_priority, priority, status, attention_history)
            VALUES ('Filesystem Stripper', 'Purge temp caches', 1.5, 1.5, 5.0, 6.0, 8.0, 4.0, 5.4, 'pending', '[]')
        """)
        cursor.execute("""
            INSERT INTO tasks (agent_id, task_name, duration, remaining_time, task_complexity, urgency, resource_requirements, user_priority, priority, status, attention_history)
            VALUES ('Network Guard', 'Inspect traffic', 2.5, 2.5, 7.0, 8.0, 6.0, 9.0, 8.5, 'pending', '[]')
        """)
        
    conn.commit()
    conn.close()

class AgentScheduler:
    def __init__(self, db_path: str, cache_capacity: int = 2, cache_k: int = 2):
        self.db_path = db_path
        self.cache = LRUKCache(capacity=cache_capacity, k=cache_k)
        
    async def context_switch(self, from_task: Optional[AgentTask], to_task: AgentTask):
        log_message(f"🔄 [Context Switch] Preparing switch to agent '{to_task.agent_id}'...")
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        if from_task:
            state_to_save = list(from_task.attention_history)
            self.cache.put(from_task.agent_id, state_to_save)
            cursor.execute("INSERT OR REPLACE INTO cache_state (agent_id, attention_history) VALUES (?, ?)",
                           (from_task.agent_id, json.dumps(state_to_save)))
            log_message(f"💾 [Context Switch] Saved attention history for '{from_task.agent_id}' to cache.")
            await asyncio.sleep(0.05)

        cached_state = self.cache.get(to_task.agent_id)
        if cached_state is not None:
            log_message(f"⚡ [Context Switch] Cache HIT (LRU-{self.cache.k}): Restored state for '{to_task.agent_id}'")
            to_task.attention_history = list(cached_state)
            cursor.execute("UPDATE cache_metrics SET value = value + 1 WHERE key = 'hits'")
        else:
            cursor.execute("SELECT attention_history FROM cache_state WHERE agent_id = ?", (to_task.agent_id,))
            row = cursor.fetchone()
            disk_state = json.loads(row[0]) if row else []
            log_message(f"🔍 [Context Switch] Cache MISS: '{to_task.agent_id}' state not in cache. Loading from Disk...")
            await asyncio.sleep(0.15)
            log_message(f"📖 [Context Switch] Restored state from Disk for '{to_task.agent_id}': {disk_state}")
            to_task.attention_history = list(disk_state)
            self.cache.put(to_task.agent_id, to_task.attention_history)
            cursor.execute("UPDATE cache_metrics SET value = value + 1 WHERE key = 'misses'")

        cursor.execute("DELETE FROM cache_state")
        for key, val in self.cache.cache.items():
            cursor.execute("INSERT OR REPLACE INTO cache_state (agent_id, attention_history) VALUES (?, ?)", (key, json.dumps(val)))
        conn.commit()
        conn.close()
        log_message(f"🚀 [Context Switch] Complete: Agent '{to_task.agent_id}' is now active.\n" + "-"*60)

async def main():
    init_db(DB_PATH)
    log_message("M.A.T.R.I.X. Kernel Scheduler Daemon active.")
    scheduler = AgentScheduler(DB_PATH, cache_capacity=2, cache_k=2)
    active_task = None
    
    while True:
        # Load active configuration policy
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM system_config WHERE key = 'algorithm'")
        row = cursor.fetchone()
        algo = row[0].lower() if row else "priority"
        
        # Pull pending or running tasks
        cursor.execute("""
            SELECT id, agent_id, task_name, duration, remaining_time, task_complexity,
                   urgency, resource_requirements, user_priority, attention_history
            FROM tasks
            WHERE status IN ('pending', 'running', 'preempted')
            ORDER BY id ASC
        """)
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            active_task = None
            await asyncio.sleep(1.0)
            continue

        tasks = []
        for r in rows:
            history = json.loads(r[9]) if r[9] else []
            t = AgentTask(
                db_id=r[0], agent_id=r[1], task_name=r[2], duration=r[3],
                task_complexity=r[5], urgency=r[6], resource_requirements=r[7],
                user_priority=r[8], attention_history=history
            )
            t.remaining_time = r[4]
            tasks.append(t)

        # Select the next task based on the policy
        if algo == 'fifo':
            next_task = tasks[0]
            slice_dur = next_task.remaining_time
        elif algo == 'sjf':
            tasks.sort(key=lambda t: t.remaining_time)
            next_task = tasks[0]
            slice_dur = next_task.remaining_time
        elif algo == 'rr':
            next_task = tasks[0]
            slice_dur = min(1.0, next_task.remaining_time)
        else: # priority
            for t in tasks:
                t.priority = t.calculate_priority()
            tasks.sort(key=lambda t: t.priority, reverse=True)
            next_task = tasks[0]
            slice_dur = next_task.remaining_time

        # Context switch if necessary
        if active_task is None or active_task.agent_id != next_task.agent_id:
            await scheduler.context_switch(active_task, next_task)
            active_task = next_task

        # Run scheduler execution slice
        log_message(f"⏳ Running task '{active_task.task_name}' ({active_task.agent_id}) for slice of {slice_dur:.1f}s...")
        steps = max(1, int(slice_dur * 2))
        step_time = slice_dur / steps

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("UPDATE tasks SET status = 'running' WHERE id = ?", (active_task.db_id,))
        conn.commit()

        for step in range(steps):
            await asyncio.sleep(step_time)
            active_task.executed_time += step_time
            active_task.remaining_time = max(0.0, active_task.remaining_time - step_time)
            
            action = f"{algo.upper()} step {step+1}/{steps} for {active_task.task_name}"
            active_task.attention_history.append(action)
            log_message(f"   [Running] '{active_task.agent_id}': {action}")

            cursor.execute("""
                UPDATE tasks
                SET remaining_time = ?, attention_history = ?
                WHERE id = ?
            """, (active_task.remaining_time, json.dumps(active_task.attention_history), active_task.db_id))
            conn.commit()

        # Update final task status
        if active_task.remaining_time <= 0.01:
            log_message(f"✅ Completed task '{active_task.task_name}' for agent '{active_task.agent_id}'")
            active_task.attention_history.append(f"Completed '{active_task.task_name}'")
            cursor.execute("UPDATE tasks SET status = 'completed', attention_history = ? WHERE id = ?",
                           (json.dumps(active_task.attention_history), active_task.db_id))
            active_task = None
        else:
            log_message(f"⏱️ Preempting task '{active_task.task_name}' for '{active_task.agent_id}'")
            active_task.attention_history.append(f"Preempted. Executed={active_task.executed_time:.1f}s")
            cursor.execute("UPDATE tasks SET status = 'preempted', attention_history = ? WHERE id = ?",
                           (json.dumps(active_task.attention_history), active_task.db_id))

        # Apply Aging Starvation Defense (for Priority algorithm only)
        if algo == 'priority':
            cursor.execute("SELECT id, urgency FROM tasks WHERE status IN ('pending', 'preempted')")
            waiting = cursor.fetchall()
            for w_id, w_urgency in waiting:
                new_urgency = min(10.0, w_urgency + 0.8)
                cursor.execute("UPDATE tasks SET urgency = ? WHERE id = ?", (new_urgency, w_id))
                log_message(f"📈 [Aging] Increased urgency of task ID {w_id} to {new_urgency:.1f}")
        
        conn.commit()
        conn.close()

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log_message("[Daemon] Service interrupted. Shutting down.")
EOF

chmod +x /usr/local/bin/matrix_scheduler.py

# 7. Enable system services
echo "Enabling systemd service profiles..."
systemctl enable matrix-firstboot || true
systemctl enable matrix-daemon || true

# 8. Setting up Hostname
echo "matrix-os" > /etc/hostname
cat << 'EOF' > /etc/hosts
127.0.0.1   localhost
127.0.1.1   matrix-os

# The following lines are desirable for IPv6 capable hosts
::1     localhost ip6-localhost ip6-loopback
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters
EOF

# 9. Clean up Package Manager to reduce SquashFS size
echo "Performing filesystem compilation cleanup..."
apt-get clean
rm -rf /var/lib/apt/lists/*
rm -rf /tmp/*

echo "=========================================================="
echo "Chroot setup completed successfully!"
echo "=========================================================="
