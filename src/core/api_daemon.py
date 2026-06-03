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
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import uuid

# Configuration constants
PORT = 8000
DB_PATH = "/var/lib/matrix/scheduler.db"

if platform.system() == "Windows":
    DB_PATH = os.path.join(os.getcwd(), "scheduler.db")

# In-memory queue for commands pending user approval (CORE-004 Permission System)
PENDING_ACTIONS = {}
RESOLVED_ACTIONS = {}

# Safe commands that can run without user confirmation
SAFE_PREFIXES = ["ls", "pwd", "whoami", "git status", "git log", "python", "python3", "cat", "echo", "type", "dir"]

class MatrixAPIHandler(BaseHTTPRequestHandler):
    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
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
        else:
            self.send_json({"error": "Endpoint not found"}, 404)

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length).decode("utf-8")
        
        try:
            payload = json.loads(post_data) if post_data else {}
        except Exception:
            self.send_json({"error": "Invalid JSON"}, 400)
            return

        path = urlparse(self.path).path

        if path == "/api/config":
            self.handle_post_config(payload)
        elif path == "/api/terminal":
            self.handle_post_terminal(payload)
        elif path == "/api/pending/resolve":
            self.handle_post_pending_resolve(payload)
        elif path == "/api/files/read":
            self.handle_post_files_read(payload)
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
        target_dir = query.get("path", [os.getcwd()])[0]

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
        if not file_path or not os.path.exists(file_path):
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
        is_safe = False
        for prefix in SAFE_PREFIXES:
            if command.lower().startswith(prefix):
                is_safe = True
                break
                
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

def execute_shell_command(command):
    """Executes a system shell command securely."""
    try:
        # Run command within the platform's default shell
        result = subprocess.run(
            command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=15
        )
        return result.stdout, result.stderr, result.returncode
    except subprocess.TimeoutExpired:
        return "", "Error: Command timed out after 15 seconds.", -1
    except Exception as e:
        return "", f"Execution failure: {str(e)}", -1

def run(server_class=HTTPServer, handler_class=MatrixAPIHandler):
    server_address = ("", PORT)
    httpd = server_class(server_address, handler_class)
    print(f"M.A.T.R.I.X API Daemon active on port {PORT}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nDaemon shutting down.")

if __name__ == "__main__":
    run()
