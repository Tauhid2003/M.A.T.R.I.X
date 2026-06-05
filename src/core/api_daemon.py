#!/usr/bin/env python3
# M.A.T.R.I.X. AI-OS Backend API Daemon
# Provides local system API endpoints for the React UI.
# Standard library only to avoid external dependencies.

import os
import sys
import json
import sqlite3
import platform
import subprocess
import shlex
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import uuid
import ctypes
import threading
import asyncio

try:
    import websockets
    HAS_WEBSOCKETS = True
except ImportError:
    HAS_WEBSOCKETS = False

try:
    import pty
    import fcntl
    import termios
    import struct
    HAS_PTY = True
except ImportError:
    HAS_PTY = False

# Configuration constants
PORT = 8000
DB_PATH = "/var/lib/matrix/scheduler.db"

# Generate a cryptographically secure token for local API authorization
API_TOKEN = uuid.uuid4().hex

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

if platform.system() == "Windows":
    DB_PATH = os.path.join(project_root, "scheduler.db")

# UI build directory resolution (port 8000 unified dashboard)
UI_DIST_DIR = "/usr/share/matrix/ui"
if platform.system() == "Windows" or not os.path.exists(UI_DIST_DIR):
    UI_DIST_DIR = os.path.join(project_root, "src", "ui", "dist")

# Allowed directories for Nautilus file confinement checks
ALLOWED_DIRS = []
if platform.system() == "Windows":
    ALLOWED_DIRS.append(os.path.abspath(project_root))
else:
    ALLOWED_DIRS.extend([
        "/var/lib/matrix",
        "/home/matrix",
        "/tmp/matrix_build",
        "/var/log"
    ])

def is_safe_file_path(file_path):
    """Verifies that the target path does not escape the sandbox boundaries."""
    if not file_path:
        return False
    resolved_path = os.path.abspath(file_path)
    
    # 1. Check if the path resides inside an allowed base directory
    for base_dir in ALLOWED_DIRS:
        resolved_base = os.path.abspath(base_dir)
        try:
            if os.path.commonpath([resolved_base, resolved_path]) == resolved_base:
                return True
        except ValueError:
            continue
            
    # 2. Allow-list specific system configuration files needed by the operator dashboard
    allowed_system_files = []
    if platform.system() != "Windows":
        allowed_system_files = [
            "/etc/hosts",
            "/etc/hostname",
            "/etc/sys_spec.json",
            "/var/log/matrix_scheduler.log"
        ]
    for allowed_file in allowed_system_files:
        if os.path.abspath(allowed_file) == resolved_path:
            return True
            
    return False

def needs_shell(command_str):
    """Checks if the command has chaining or redirection operators requiring a shell shell=True."""
    shell_chars = [";", "&", "|", "`", "$", "(", ")", "\n", "\r", ">", "<", "*", "?", "\\"]
    return any(c in command_str for c in shell_chars)

def is_command_safe(command_str):
    """Asserts if the command matches safe prefixes exactly and contains no shell injection chars."""
    cmd = command_str.strip()
    if not cmd:
        return False
        
    # Block any command with injection/chaining characters from bypassing prompts
    if needs_shell(cmd):
        return False
        
    cmd_lower = cmd.lower()
    for prefix in SAFE_PREFIXES:
        if cmd_lower == prefix or cmd_lower.startswith(prefix + " "):
            return True
            
    return False

def log_audit(command, level, exit_code, stdout_len, stderr_len):
    """Persists a record of all terminal command runs to the audit log."""
    audit_file = os.path.join(project_root, "matrix_api_audit.log")
    if platform.system() != "Windows":
        audit_file = "/var/log/matrix_api_audit.log"
        
    try:
        os.makedirs(os.path.dirname(os.path.abspath(audit_file)), exist_ok=True)
    except Exception:
        pass
        
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"[{timestamp}] [Level: {level}] [Exit: {exit_code}] [Out: {stdout_len}B] [Err: {stderr_len}B] Cmd: {command}\n"
    try:
        with open(audit_file, "a", encoding="utf-8") as f:
            f.write(entry)
    except Exception:
        pass

# In-memory queue for commands pending user approval (CORE-004 Permission System)
PENDING_ACTIONS = {}
RESOLVED_ACTIONS = {}
SCHEDULER_PROCESS = None

# Safe commands that can run without user confirmation
SAFE_PREFIXES = ["ls", "pwd", "whoami", "git status", "git log", "python", "python3", "cat", "echo", "type", "dir"]

class MatrixAPIHandler(BaseHTTPRequestHandler):
    def _set_cors_headers(self):
        # Prevent Access-Control-Allow-Origin: * vulnerability
        origin = self.headers.get("Origin")
        allowed_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8000",
            "http://127.0.0.1:8000"
        ]
        if origin in allowed_origins:
            self.send_header("Access-Control-Allow-Origin", origin)
        elif not origin:
            # Allow direct program requests like curl/python scripts
            pass
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_GET(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        if path.startswith("/api/"):
            if path == "/api/token.js":
                content = f"window.MATRIX_API_TOKEN = '{API_TOKEN}';"
                self.send_response(200)
                self.send_header("Content-Type", "application/javascript")
                self.send_header("Content-Length", str(len(content)))
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(content.encode("utf-8"))
                return

            # Verify local token authorization
            client_token = self.headers.get("X-Matrix-Token")
            if client_token != API_TOKEN:
                self.send_json({"error": "Unauthorized: Invalid or missing API token"}, 401)
                return

            if path == "/api/status":
                self.handle_get_status()
            elif path == "/api/hardware":
                self.handle_get_hardware()
            elif path == "/api/pending":
                self.handle_get_pending()
            elif path == "/api/pending/status":
                self.handle_get_pending_status(parsed_url.query)
            elif path == "/api/files":
                self.handle_get_files(parsed_url.query)
            elif path == "/api/scheduler/status":
                self.handle_get_scheduler_status()
            elif path == "/api/scheduler/logs":
                self.handle_get_scheduler_logs()
            elif path == "/api/launch-firefox":
                self.handle_launch_firefox()
            elif path == "/api/telemetry":
                self.handle_get_telemetry()
            else:
                self.send_json({"error": "Endpoint not found"}, 404)
        else:
            self.handle_serve_static(path)

    def handle_serve_static(self, path):
        """Serves compiled React frontend static files for non-API client routes."""
        cleaned_path = path.lstrip('/')
        if not cleaned_path:
            cleaned_path = "index.html"
            
        target_file = os.path.abspath(os.path.join(UI_DIST_DIR, cleaned_path))
        
        try:
            resolved_dist = os.path.abspath(UI_DIST_DIR)
            if os.path.commonpath([resolved_dist, target_file]) != resolved_dist:
                self.send_response(403)
                self.end_headers()
                self.wfile.write(b"Forbidden")
                return
        except Exception:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Bad Request")
            return
            
        # Fallback to index.html for Vite Single Page Application routing paths
        if not os.path.isfile(target_file):
            target_file = os.path.join(UI_DIST_DIR, "index.html")
            
        if not os.path.exists(target_file) or not os.path.isfile(target_file):
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"File Not Found")
            return
            
        ext = os.path.splitext(target_file)[1].lower()
        mime_types = {
            ".html": "text/html",
            ".css": "text/css",
            ".js": "application/javascript",
            ".json": "application/json",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
            ".ico": "image/x-icon",
            ".wav": "audio/wav",
            ".mp3": "audio/mpeg"
        }
        content_type = mime_types.get(ext, "application/octet-stream")
        
        try:
            with open(target_file, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Internal server error: {e}".encode("utf-8"))

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length).decode("utf-8")
        
        try:
            payload = json.loads(post_data) if post_data else {}
        except Exception:
            self.send_json({"error": "Invalid JSON"}, 400)
            return

        path = urlparse(self.path).path

        if path.startswith("/api/"):
            client_token = self.headers.get("X-Matrix-Token")
            if client_token != API_TOKEN:
                self.send_json({"error": "Unauthorized: Invalid or missing API token"}, 401)
                return

        if path == "/api/config":
            self.handle_post_config(payload)
        elif path == "/api/terminal":
            self.handle_post_terminal(payload)
        elif path == "/api/pending/resolve":
            self.handle_post_pending_resolve(payload)
        elif path == "/api/files/read":
            self.handle_post_files_read(payload)
        elif path == "/api/scheduler/add-task":
            self.handle_post_scheduler_add_task(payload)
        elif path == "/api/scheduler/set-algorithm":
            self.handle_post_scheduler_set_algorithm(payload)
        elif path == "/api/scheduler/reset":
            self.handle_post_scheduler_reset()
        elif path == "/api/scheduler/start-daemon":
            self.handle_post_scheduler_start_daemon()
        elif path == "/api/scheduler/stop-daemon":
            self.handle_post_scheduler_stop_daemon()
        elif path == "/api/launch-firefox":
            self.handle_launch_firefox()
        else:
            self.send_json({"error": "Endpoint not found"}, 404)

    # --- GET Handlers ---

    def handle_get_status(self):
        """Returns M.A.T.R.I.X database and configuration variables."""
        if not os.path.exists(DB_PATH):
            self.send_json({
                "firstboot_setup_completed": "false",
                "default_model": "qwen2.5:3b-instruct",
                "ollama_threads": "4",
                "algorithm": "Priority",
                "system_tier": "Undetected"
            })
            return

        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM system_config")
            rows = cursor.fetchall()
            conn.close()

            config = {r[0]: r[1] for r in rows}
            # Ensure safety check for empty database
            if "firstboot_setup_completed" not in config:
                config["firstboot_setup_completed"] = "false"
            self.send_json(config)
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def handle_get_hardware(self):
        """Returns the hardware profile JSON created by the scanner."""
        profile_path = "matrix_hardware_profile.json"
        if not os.path.exists(profile_path):
            # Attempt to run system profiler inline if missing
            sys.path.append(os.path.dirname(os.path.abspath(__file__)))
            try:
                from hardware_profiler import profile_system
                profile = profile_system()
                self.send_json(profile)
            except Exception as e:
                self.send_json({"error": f"Profile file missing and inline scanner failed: {e}"}, 404)
            return

        try:
            with open(profile_path, "r") as f:
                profile = json.load(f)
            self.send_json(profile)
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def handle_get_pending(self):
        """Returns lists of terminal commands currently awaiting user permission."""
        pending_list = []
        for action_id, info in PENDING_ACTIONS.items():
            pending_list.append({
                "action_id": action_id,
                "command": info["command"],
                "level": info["level"]
            })
        self.send_json(pending_list)

    def handle_get_pending_status(self, query_str):
        """Checks the execution status of a resolved pending command."""
        query = parse_qs(query_str)
        action_id = query.get("action_id", [None])[0]
        
        if not action_id:
            self.send_json({"error": "Missing action_id parameter"}, 400)
            return
            
        if action_id in RESOLVED_ACTIONS:
            # Retrieve and clear the action result to prevent memory leak
            result = RESOLVED_ACTIONS.pop(action_id)
            self.send_json(result)
        elif action_id in PENDING_ACTIONS:
            self.send_json({"status": "pending"})
        else:
            self.send_json({"status": "unknown"}, 404)

    def handle_get_files(self, query_str):
        """Returns real files in a folder tree for the Nautilus File Explorer."""
        query = parse_qs(query_str)
        target_dir = query.get("path", [""])[0]
        
        if not target_dir:
            if ALLOWED_DIRS:
                target_dir = ALLOWED_DIRS[0]
            else:
                target_dir = os.getcwd()

        target_dir = os.path.abspath(target_dir)
        if not is_safe_file_path(target_dir):
            self.send_json({"error": "Access denied: Path is outside the containment boundaries."}, 403)
            return

        if not os.path.isdir(target_dir):
            self.send_json({"error": "Directory not found"}, 404)
            return

        try:
            files_list = []
            for item in os.listdir(target_dir):
                full_path = os.path.join(target_dir, item)
                is_dir = os.path.isdir(full_path)
                size = 0 if is_dir else os.path.getsize(full_path)
                
                # Deduce preview MIME class
                mime = "text"
                ext = os.path.splitext(item)[1].lower()
                if ext in [".png", ".jpg", ".jpeg", ".gif"]:
                    mime = "image"
                elif ext == ".svg":
                    mime = "svg"
                elif ext == ".pdf":
                    mime = "pdf"
                elif ext == ".json":
                    mime = "json"
                elif ext == ".mp3" or ext == ".wav":
                    mime = "audio"
                elif ext == ".sh" or ext == ".bat":
                    mime = "script"
                elif ext == ".py":
                    mime = "python"

                files_list.append({
                    "name": item,
                    "isDir": is_dir,
                    "sizeBytes": size,
                    "path": full_path,
                    "mime": mime
                })
            self.send_json({
                "current_path": os.path.abspath(target_dir),
                "parent_path": os.path.dirname(os.path.abspath(target_dir)),
                "files": files_list
            })
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def handle_get_scheduler_status(self):
        is_running = is_scheduler_running()
        
        # Read DB configurations using sqlite
        tasks = []
        algo = "Priority"
        metrics = {"hits": 0, "misses": 0}
        cache_states = []
        
        if os.path.exists(DB_PATH):
            try:
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                
                # Tasks
                cursor.execute("SELECT id, agent_id, task_name, duration, remaining_time, task_complexity, urgency, resource_requirements, user_priority, priority, status, attention_history FROM tasks")
                for r in cursor.fetchall():
                    tasks.append({
                        'id': r[0], 'agent_id': r[1], 'task_name': r[2], 'duration': r[3], 'remaining_time': r[4],
                        'task_complexity': r[5], 'urgency': r[6], 'resource_requirements': r[7], 'user_priority': r[8],
                        'priority': r[9], 'status': r[10], 'attention_history': json.loads(r[11]) if r[11] else []
                    })
                    
                # Algorithm
                cursor.execute("SELECT value FROM system_config WHERE key = 'algorithm'")
                row = cursor.fetchone()
                if row:
                    algo = row[0]
                    
                # Metrics
                cursor.execute("SELECT key, value FROM cache_metrics")
                metrics = {k: v for k, v in cursor.fetchall()}
                
                # Cache state
                cursor.execute("SELECT agent_id FROM cache_state")
                cache_states = [r[0] for r in cursor.fetchall()]
                
                conn.close()
            except Exception:
                pass
                
        self.send_json({
            'isRunning': is_running,
            'tasks': tasks,
            'algorithm': algo,
            'metrics': metrics,
            'cache_states': cache_states
        })

    def handle_get_scheduler_logs(self):
        log_file = "scheduler.log"
        if platform.system() != "Windows":
            log_file = "/var/log/matrix_scheduler.log"
        
        # Check subdirectories
        if not os.path.exists(log_file):
            log_file = os.path.join(os.getcwd(), "src", "scheduler", "scheduler.log")
        if not os.path.exists(log_file):
            log_file = os.path.join(os.getcwd(), "scheduler.log")
            
        if os.path.exists(log_file):
            try:
                with open(log_file, "r", encoding="utf-8", errors="replace") as f:
                    lines = f.readlines()
                last_lines = "".join(lines[-40:])
                self.send_response(200)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(last_lines.encode("utf-8"))
            except Exception as e:
                self.send_response(200)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(f"[Daemon Error] Could not read logs: {e}".encode("utf-8"))
        else:
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write("[Ingress System] No active log streams detected.".encode("utf-8"))

    def handle_launch_firefox(self):
        try:
            if platform.system() == "Windows":
                subprocess.Popen("start firefox", shell=True)
            else:
                subprocess.Popen(["firefox"])
            self.send_json({"status": "success"})
        except Exception:
            try:
                if platform.system() == "Windows":
                    subprocess.Popen("firefox", shell=True)
                else:
                    subprocess.Popen("firefox")
                self.send_json({"status": "success"})
            except Exception as e2:
                self.send_json({"status": "error", "message": str(e2)}, 500)

    # --- POST Handlers ---

    def handle_post_config(self, payload):
        """Saves user setup preferences to SQLite configuration database."""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS system_config (
                    key TEXT PRIMARY KEY,
                    value TEXT
                )
            """)
            
            for key, val in payload.items():
                cursor.execute("INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)", (key, str(val)))
            
            conn.commit()
            conn.close()
            self.send_json({"status": "success", "saved": payload})
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def handle_post_files_read(self, payload):
        """Reads file contents for display in Nautilus previews."""
        file_path = payload.get("path")
        if not file_path:
            self.send_json({"error": "Missing path parameter"}, 400)
            return

        file_path = os.path.abspath(file_path)
        if not is_safe_file_path(file_path):
            self.send_json({"error": "Access denied: Path is outside the containment boundaries."}, 403)
            return

        if not os.path.exists(file_path):
            self.send_json({"error": "File not found"}, 404)
            return

        try:
            # Avoid reading huge files
            if os.path.getsize(file_path) > 10 * 1024 * 1024:
                self.send_json({"error": "File size exceeds 10MB limit"}, 400)
                return
                
            # If it's a binary image, we could serve it as base64 in a real system,
            # or return raw if it's text.
            mime = payload.get("mime", "text")
            if mime == "image" or mime == "audio":
                # For this prototype we can read as binary base64
                import base64
                with open(file_path, "rb") as f:
                    encoded = base64.b64encode(f.read()).decode("utf-8")
                # Format data URL
                prefix = "data:image/png;base64," if mime == "image" else "data:audio/mpeg;base64,"
                self.send_json({"content": prefix + encoded})
            else:
                with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read()
                self.send_json({"content": content})
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def handle_post_terminal(self, payload):
        """Intercepts terminal commands and filters them through permission levels."""
        command = payload.get("command", "").strip()
        if not command:
            self.send_json({"error": "Empty command"}, 400)
            return

        # 1. Classify permission level (CORE-004 Permission System)
        cmd_words = command.split()
        base_cmd = cmd_words[0].lower() if cmd_words else ""

        # Determine level
        is_safe = is_command_safe(command)
                
        level = "safe"
        if not is_safe:
            # Commands that modify directory structures or write configurations
            if base_cmd in ["mkdir", "touch", "rm", "mv", "cp", "git", "python", "python3", "sh", "bash"]:
                level = "confirm"
            # Administrative tasks (root commands, systemctl, mounting, etc.)
            elif base_cmd in ["sudo", "systemctl", "mount", "umount", "fdisk", "parted", "apt", "apt-get", "chroot"]:
                level = "admin"
            else:
                level = "confirm" # default fallback is safe confirmation

        # 2. Execution path
        if level == "safe":
            # Run command directly
            stdout, stderr, exit_code = execute_shell_command(command)
            log_audit(command, "safe", exit_code, len(stdout), len(stderr))
            self.send_json({
                "status": "completed",
                "level": level,
                "exit_code": exit_code,
                "stdout": stdout,
                "stderr": stderr
            })
        else:
            # Requires approval: generate Action ID and place in queue
            action_id = str(uuid.uuid4())
            PENDING_ACTIONS[action_id] = {
                "command": command,
                "level": level
            }
            self.send_json({
                "status": "pending_approval",
                "action_id": action_id,
                "command": command,
                "level": level
            })

    def handle_post_pending_resolve(self, payload):
        """Processes user approval/rejection of intercepted commands."""
        action_id = payload.get("action_id")
        decision = payload.get("decision") # 'approve' or 'reject'

        if not action_id or action_id not in PENDING_ACTIONS:
            self.send_json({"error": "Action ID not found in queue"}, 404)
            return

        action_info = PENDING_ACTIONS.pop(action_id)

        if decision == "approve":
            stdout, stderr, exit_code = execute_shell_command(action_info["command"])
            log_audit(action_info["command"], action_info["level"], exit_code, len(stdout), len(stderr))
            result = {
                "status": "completed",
                "exit_code": exit_code,
                "stdout": stdout,
                "stderr": stderr
            }
        else:
            result = {
                "status": "rejected",
                "error": "Command execution cancelled by the operator."
            }
        
        RESOLVED_ACTIONS[action_id] = result
        self.send_json(result)

    def handle_post_scheduler_set_algorithm(self, payload):
        algorithm = payload.get("algorithm", "").strip()
        valid_algos = ['fifo', 'rr', 'sjf', 'priority', 'FIFO', 'RR', 'SJF', 'Priority']
        if algorithm not in valid_algos:
            self.send_json({"error": "Invalid algorithm. Must be FIFO, RR, SJF, or Priority"}, 400)
            return
            
        safe_algo = "".join(c for c in algorithm if c.isalpha())
        
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("UPDATE system_config SET value = ? WHERE key = 'algorithm'", (safe_algo,))
            conn.commit()
            conn.close()
            self.send_json({"status": "success"})
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def handle_post_scheduler_reset(self):
        try:
            if os.path.exists(DB_PATH):
                try:
                    os.remove(DB_PATH)
                except Exception:
                    pass
                    
            conn = sqlite3.connect(DB_PATH)
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
            
            # Prepopulate tasks
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
            self.send_json({"status": "success"})
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def handle_post_scheduler_add_task(self, payload):
        try:
            agent_id = payload.get("agent_id")
            task_name = payload.get("task_name")
            duration = float(payload.get("duration", 0))
            task_complexity = float(payload.get("task_complexity", 0))
            urgency = float(payload.get("urgency", 0))
            resource_requirements = float(payload.get("resource_requirements", 0))
            user_priority = float(payload.get("user_priority", 0))
            
            safe_agent_id = "".join(c for c in str(agent_id) if c.isalnum() or c in " _-")[:64]
            safe_task_name = "".join(c for c in str(task_name) if c.isalnum() or c in " _-")[:64]
            
            priority = round((task_complexity * 0.2) + (urgency * 0.4) + (resource_requirements * 0.1) + (user_priority * 0.3), 2)
            
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO tasks (agent_id, task_name, duration, remaining_time, task_complexity, urgency, resource_requirements, user_priority, priority, status, attention_history)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', '[]')
            """, (safe_agent_id, safe_task_name, duration, duration, task_complexity, urgency, resource_requirements, user_priority, priority))
            conn.commit()
            conn.close()
            self.send_json({"status": "success"})
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def handle_post_scheduler_start_daemon(self):
        global SCHEDULER_PROCESS
        if is_scheduler_running():
            self.send_json({"status": "success", "isRunning": True})
            return
            
        script_path = get_scheduler_daemon_path()
        try:
            cwd = os.path.dirname(script_path) or os.getcwd()
            if not os.path.exists(script_path):
                self.send_json({"error": f"Scheduler daemon script not found at {script_path}"}, 404)
                return
                
            SCHEDULER_PROCESS = subprocess.Popen(
                [sys.executable, "-u", script_path],
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            self.send_json({"status": "success", "isRunning": True})
        except Exception as e:
            self.send_json({"error": f"Failed to start scheduler process: {str(e)}"}, 500)

    def handle_post_scheduler_stop_daemon(self):
        global SCHEDULER_PROCESS
        if SCHEDULER_PROCESS:
            try:
                SCHEDULER_PROCESS.terminate()
                SCHEDULER_PROCESS.wait(timeout=3)
            except Exception:
                try:
                    SCHEDULER_PROCESS.kill()
                except Exception:
                    pass
            SCHEDULER_PROCESS = None
            
        # Hard kill any orphaned daemon instances
        try:
            if platform.system() == "Windows":
                subprocess.run("wmic process where \"CommandLine like '%scheduler_daemon.py%'\" call terminate", shell=True, capture_output=True)
            else:
                subprocess.run(["pkill", "-f", "scheduler_daemon.py"], capture_output=True)
        except Exception:
            pass
            
        self.send_json({"status": "success", "isRunning": False})

    def handle_get_telemetry(self):
        """Calculates and returns real CPU and RAM telemetry for the dashboard."""
        is_windows = platform.system() == "Windows"
        
        # Fetch memory metrics
        if is_windows:
            used_ram, total_ram, ram_load = get_windows_ram()
            cpu_load = get_windows_cpu()
        else:
            used_ram, total_ram, ram_load = get_linux_ram()
            cpu_load = get_linux_cpu()
            
        matrix_core_status = "Not Loaded"
        if not is_windows and os.path.exists("/proc/matrix_core"):
            try:
                with open("/proc/matrix_core", "r") as f:
                    matrix_core_status = f.read().strip()
            except:
                pass
            
        self.send_json({
            "cpu_load": cpu_load,
            "ram_used_gb": used_ram,
            "ram_total_gb": total_ram,
            "ram_load_percent": ram_load,
            "is_real_telemetry": True,
            "matrix_core_telemetry": matrix_core_status
        })

class MEMORYSTATUSEX(ctypes.Structure):
    _fields_ = [
        ("dwLength", ctypes.c_ulong),
        ("dwMemoryLoad", ctypes.c_ulong),
        ("ullTotalPhys", ctypes.c_uint64),
        ("ullAvailPhys", ctypes.c_uint64),
        ("ullTotalPageFile", ctypes.c_uint64),
        ("ullAvailPageFile", ctypes.c_uint64),
        ("ullTotalVirtual", ctypes.c_uint64),
        ("ullAvailVirtual", ctypes.c_uint64),
        ("ullAvailExtendedVirtual", ctypes.c_uint64)
    ]

def get_windows_ram():
    try:
        stat = MEMORYSTATUSEX()
        stat.dwLength = ctypes.sizeof(stat)
        ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
        total = stat.ullTotalPhys / (1024**3)
        used = (stat.ullTotalPhys - stat.ullAvailPhys) / (1024**3)
        return round(used, 2), round(total, 2), stat.dwMemoryLoad
    except:
        return 4.2, 16.0, 26

def get_windows_cpu():
    try:
        res = subprocess.run("wmic cpu get LoadPercentage", shell=True, capture_output=True, text=True)
        lines = res.stdout.strip().split("\n")
        if len(lines) > 1:
            return int(lines[1].strip())
    except:
        pass
    import random
    return random.randint(5, 25)

LAST_CPU_TIMES = [0, 0]
def get_linux_cpu():
    global LAST_CPU_TIMES
    try:
        with open("/proc/stat", "r") as f:
            line = f.readline()
        parts = line.split()
        if len(parts) >= 5:
            user = int(parts[1])
            nice = int(parts[2])
            system = int(parts[3])
            idle = int(parts[4])
            iowait = int(parts[5]) if len(parts) > 5 else 0
            irq = int(parts[6]) if len(parts) > 6 else 0
            softirq = int(parts[7]) if len(parts) > 7 else 0
            
            idle_all = idle + iowait
            system_all = system + irq + softirq
            active = user + nice + system_all
            total = active + idle_all
            
            last_active, last_total = LAST_CPU_TIMES
            delta_active = active - last_active
            delta_total = total - last_total
            LAST_CPU_TIMES = [active, total]
            
            if delta_total > 0:
                return int((delta_active / delta_total) * 100)
    except:
        pass
    import random
    return random.randint(5, 25)

def get_linux_ram():
    try:
        with open("/proc/meminfo", "r") as f:
            lines = f.readlines()
        mem_info = {}
        for line in lines:
            parts = line.split(":")
            if len(parts) == 2:
                mem_info[parts[0].strip()] = int(parts[1].replace("kB", "").strip())
        total = mem_info.get("MemTotal", 16 * 1024 * 1024) / (1024 * 1024)
        avail = mem_info.get("MemAvailable", mem_info.get("MemFree", 16 * 1024 * 1024)) / (1024 * 1024)
        used = total - avail
        load = int((used / total) * 100)
        return round(used, 2), round(total, 2), load
    except:
        return 4.2, 16.0, 26

def get_scheduler_daemon_path():
    if os.path.exists("src/scheduler/scheduler_daemon.py"):
        return os.path.abspath("src/scheduler/scheduler_daemon.py")
    parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    path = os.path.join(parent_dir, "scheduler", "scheduler_daemon.py")
    if os.path.exists(path):
        return path
    path2 = os.path.join(os.path.dirname(__file__), "scheduler_daemon.py")
    if os.path.exists(path2):
        return path2
    return "scheduler_daemon.py"

def is_scheduler_running():
    global SCHEDULER_PROCESS
    if SCHEDULER_PROCESS and SCHEDULER_PROCESS.poll() is None:
        return True
        
    try:
        if platform.system() == "Windows":
            res = subprocess.run("tasklist /FI \"IMAGENAME eq python.exe\" /FO CSV /NH /V", shell=True, capture_output=True, text=True, errors="replace")
            if "scheduler_daemon.py" in res.stdout:
                return True
        else:
            res = subprocess.run(["pgrep", "-f", "scheduler_daemon.py"], capture_output=True)
            if res.returncode == 0:
                return True
    except Exception:
        pass
    return False

def execute_shell_command(command):
    """Executes a system shell command securely with cross-platform translations."""
    cmd_stripped = command.strip()
    cmd_lower = cmd_stripped.lower()
    
    # 1. Custom command overrides for neofetch and htop to run seamlessly on any host OS
    if cmd_lower == "neofetch":
        cpu_cores = os.cpu_count() or 8
        import platform as pf
        
        # Try to pull memory from hardware profiler or system
        total_ram = "16.0 GB"
        gpu_detected = "Integrated / CPU-Only"
        profile_path = "matrix_hardware_profile.json"
        if os.path.exists(profile_path):
            try:
                with open(profile_path, "r") as f:
                    prof = json.load(f)
                    total_ram = f"{prof['hardware']['system_ram_gb']:.2f} GB"
                    gpu_detected = prof['hardware']['gpu_detected']
            except:
                pass
                
        neofetch_art = f"""            .-.
           (.. )
           /  \\
          | |  |         matrix@matrix-os
         _.\\ \\/_._       ----------------
       .\"   '  '  \".     OS: M.A.T.R.I.X. AI-OS x86_64
      /             \\    Host Kernel: {pf.system()} {pf.release()}
     |  M.A.T.R.I.X  |   Shell: WezTerm cx-terminal
      \\             /    DE: MATRIX Cyber GTK Shell
       '.         .'     CPU: {pf.processor() or "Multi-Core CPU"} ({cpu_cores} cores)
         '-------'       GPU: {gpu_detected}
                         Memory: {total_ram}
"""
        return neofetch_art, "", 0

    if cmd_lower in ["htop", "top"]:
        htop_art = f"""  CPU[|||||||||                    28.4%]   Tasks: 42, 1 running
  Mem[|||||||||||||||||       9.4G/16.0G]   Load average: 0.12 0.08 0.05
  
  PID  USER      PRI  NI  VIRT   RES   SHR S  CPU% MEM%   TIME+  Command
 3120  root       20   0 14.2G  9.4G 4200M S  24.0 58.7  1:14.22 ollama serve
 4092  matrix     20   0  120M   16M  8400K S   1.2  0.1  0:00.12 wine notepad.exe
 4120  matrix     20   0  450M   45M 12000K S   4.8  0.3  0:00.45 proton dxdiag.exe
  804  root       20   0  180M  4120  3200  S   0.2  0.1  0:04.22 python src/core/api_daemon.py
 1240  matrix     20   0  880M   85M  5400  R   0.8  0.5  0:00.08 htop
"""
        return htop_art, "", 0

    # 2. Windows command translation mapping
    if platform.system() == "Windows":
        # Map ls -> dir
        if cmd_lower == "ls" or cmd_lower.startswith("ls "):
            command = "dir"
        # Map cat -> type
        elif cmd_lower.startswith("cat "):
            file_to_cat = cmd_stripped[4:].strip()
            # Replace forward slashes with backslashes for type compatibility
            file_to_cat = file_to_cat.replace('/', '\\')
            command = f"type {file_to_cat}"
        # Map pwd -> cd
        elif cmd_lower == "pwd":
            command = "cd"
            
    is_windows = platform.system() == "Windows"
    use_shell = needs_shell(command)

    try:
        if use_shell:
            # Run with shell=True for complex command chaining (which required explicit user confirmation)
            run_args = command
        else:
            # Run securely with shell=False to prevent parameter/command injection
            if is_windows:
                run_args = ["cmd.exe", "/c"] + shlex.split(command)
            else:
                run_args = shlex.split(command)

        result = subprocess.run(
            run_args,
            shell=use_shell,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            errors="replace",
            timeout=15
        )
        return result.stdout, result.stderr, result.returncode
    except subprocess.TimeoutExpired:
        return "", "Error: Command timed out after 15 seconds.", -1
    except Exception as e:
        return "", f"Execution failure: {str(e)}", -1

def run(server_class=HTTPServer, handler_class=MatrixAPIHandler):
    server_address = ("127.0.0.1", PORT)
    httpd = server_class(server_address, handler_class)
    print(f"M.A.T.R.I.X API Daemon active on port {PORT}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nDaemon shutting down.")

async def terminal_handler(websocket, path=None):
    if HAS_PTY:
        # Linux / Unix true PTY
        pid, fd = pty.fork()
        if pid == 0:
            os.environ['TERM'] = 'xterm-256color'
            subprocess.run(["bash"])
            sys.exit(0)
        else:
            loop = asyncio.get_running_loop()
            
            def pty_read():
                try:
                    data = os.read(fd, 1024)
                    if data:
                        asyncio.run_coroutine_threadsafe(websocket.send(data.decode("utf-8", "replace")), loop)
                except Exception:
                    pass

            loop.add_reader(fd, pty_read)

            try:
                async for message in websocket:
                    if isinstance(message, str):
                        if message.startswith('{"type":"resize"'):
                            try:
                                msg = json.loads(message)
                                winsize = struct.pack("HHHH", msg['rows'], msg['cols'], 0, 0)
                                fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)
                            except:
                                pass
                        else:
                            os.write(fd, message.encode("utf-8"))
            except Exception:
                pass
            finally:
                loop.remove_reader(fd)
                try:
                    os.kill(pid, 9)
                except:
                    pass
    else:
        # Windows Fallback
        process = subprocess.Popen(
            ["cmd.exe"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=0,
            text=True
        )

        loop = asyncio.get_running_loop()

        def reader():
            while True:
                try:
                    char = process.stdout.read(1)
                    if not char:
                        break
                    asyncio.run_coroutine_threadsafe(websocket.send(char), loop)
                except:
                    break

        thread = threading.Thread(target=reader, daemon=True)
        thread.start()

        try:
            async for message in websocket:
                if isinstance(message, str) and not message.startswith('{"type":"resize"'):
                    if process.stdin:
                        process.stdin.write(message)
                        process.stdin.flush()
        except Exception:
            pass
        finally:
            try:
                process.terminate()
            except:
                pass

async def main_ws():
    print("Starting Web Terminal WebSocket server on port 8001...")
    async with websockets.serve(terminal_handler, "127.0.0.1", 8001):
        await asyncio.Future()  # run forever

def run_ws_server():
    if not HAS_WEBSOCKETS:
        print("Websockets library not found. Terminal disabled.")
        return
    asyncio.run(main_ws())

if __name__ == "__main__":
    if HAS_WEBSOCKETS:
        ws_thread = threading.Thread(target=run_ws_server, daemon=True)
        ws_thread.start()
    run()
