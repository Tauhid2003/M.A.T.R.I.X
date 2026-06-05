#!/usr/bin/env python3
import sys
import json
import urllib.request
import urllib.error
import time

def print_color(text, color_code):
    print(f"\033[{color_code}m{text}\033[0m")

def get_best_ollama_model():
    url = "http://localhost:11434/api/tags"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=2) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            models = res_json.get("models", [])
            if models:
                names = [m.get("name") for m in models if m.get("name")]
                return names[0] if names else None
    except Exception:
        pass
    return None

def query_ollama(model, prompt):
    system_prompt = """You are the M.A.T.R.I.X. AI-OS NLP Ingress. Translate the user natural language command into a structured agent task. Choose ONE of these agents:
1. 'Security Auditor' (Complexity: 8, Urgency: 9, Resource: 5, User Priority: 7)
2. 'Wine Translator' (Complexity: 4, Urgency: 3, Resource: 3, User Priority: 5)
3. 'Filesystem Stripper' (Complexity: 5, Urgency: 6, Resource: 8, User Priority: 4)
4. 'Network Guard' (Complexity: 7, Urgency: 8, Resource: 6, User Priority: 9)
5. 'Data Analyst' (Complexity: 6, Urgency: 4, Resource: 7, User Priority: 6)
6. 'Code Builder' (Complexity: 9, Urgency: 5, Resource: 8, User Priority: 8)
7. 'Self Improver' (Complexity: 10, Urgency: 6, Resource: 9, User Priority: 10)

Provide output ONLY as a JSON block with these keys:
- 'agent_id': name of the agent
- 'task_name': a short descriptive name for the task
- 'duration': float duration in seconds (between 1.0 and 4.0)
- 'task_complexity': float from 1.0 to 10.0
- 'urgency': float from 1.0 to 10.0
- 'resource_requirements': float from 1.0 to 10.0
- 'user_priority': float from 1.0 to 10.0
- 'intent_explanation': a short 1-sentence explanation of what the agent will do."""

    url = "http://localhost:11434/api/generate"
    data = {
        "model": model,
        "prompt": prompt,
        "system": system_prompt,
        "options": {"temperature": 0.2},
        "stream": False
    }
    
    try:
        req_body = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(url, data=req_body, headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=15) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            return res_json.get("response", "")
    except Exception:
        return ""

def fallback_heuristics(prompt):
    text = prompt.lower()
    if any(k in text for k in ['security', 'vulnerab', 'audit', 'scan']):
        return {
            "agent_id": "Security Auditor",
            "task_name": "Audit: " + prompt[:20],
            "duration": 2.0, "task_complexity": 8.0, "urgency": 9.0,
            "resource_requirements": 5.0, "user_priority": 7.0,
            "intent_explanation": "User requested local system security audit scan."
        }
    elif any(k in text for k in ['wine', 'translate', 'windows', 'exe']):
        return {
            "agent_id": "Wine Translator",
            "task_name": "Translate win32 link",
            "duration": 1.5, "task_complexity": 4.0, "urgency": 3.0,
            "resource_requirements": 3.0, "user_priority": 5.0,
            "intent_explanation": "Mapping user Windows subsystem compatibility layers."
        }
    elif any(k in text for k in ['file', 'clean', 'purge', 'cache', 'stripper']):
        return {
            "agent_id": "Filesystem Stripper",
            "task_name": "Clean: " + prompt[:20],
            "duration": 1.5, "task_complexity": 5.0, "urgency": 6.0,
            "resource_requirements": 8.0, "user_priority": 4.0,
            "intent_explanation": "Executing filesystem duplicate cache cleanup."
        }
    elif any(k in text for k in ['data', 'analyze', 'log', 'metric']):
        return {
            "agent_id": "Data Analyst",
            "task_name": "Analyze: " + prompt[:20],
            "duration": 3.0, "task_complexity": 6.0, "urgency": 4.0,
            "resource_requirements": 7.0, "user_priority": 6.0,
            "intent_explanation": "Analyzing system telemetry and metric logs."
        }
    elif any(k in text for k in ['code', 'build', 'compile', 'refactor', 'module']):
        return {
            "agent_id": "Code Builder",
            "task_name": "Build: " + prompt[:20],
            "duration": 4.0, "task_complexity": 9.0, "urgency": 5.0,
            "resource_requirements": 8.0, "user_priority": 8.0,
            "intent_explanation": "Compiling or refactoring OS source code modules."
        }
    elif any(k in text for k in ['improve', 'self', 'upgrade', 'adapt', 'efficient']):
        return {
            "agent_id": "Self Improver",
            "task_name": "Improve: " + prompt[:20],
            "duration": 4.0, "task_complexity": 10.0, "urgency": 6.0,
            "resource_requirements": 9.0, "user_priority": 10.0,
            "intent_explanation": "Evaluating OS performance for self-adaptation."
        }
    else:
        return {
            "agent_id": "Network Guard",
            "task_name": "NetGuard: " + prompt[:20],
            "duration": 2.5, "task_complexity": 7.0, "urgency": 8.0,
            "resource_requirements": 6.0, "user_priority": 9.0,
            "intent_explanation": "Monitoring inbound packets from local domain interfaces."
        }

def post_to_scheduler(task_data):
    url = "http://127.0.0.1:8000/api/scheduler/add-task"
    try:
        req_body = json.dumps(task_data).encode("utf-8")
        req = urllib.request.Request(url, data=req_body, headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status == 200
    except Exception:
        return False

def main():
    if len(sys.argv) < 2:
        print_color("Usage: matrix-ai \"<your natural language command>\"", "33")
        sys.exit(1)
        
    prompt = " ".join(sys.argv[1:])
    print_color(f"[NLP Orchestrator] Intent parsing open for: \"{prompt}\"", "95")
    
    model = get_best_ollama_model()
    parsed_task = None
    
    if model:
        print_color(f"[NLP Orchestrator] Local Ollama model \"{model}\" online. Mapping synaptic intent vectors...", "96")
        raw_response = query_ollama(model, prompt)
        if raw_response:
            try:
                start = raw_response.find('{')
                end = raw_response.rfind('}')
                if start != -1 and end != -1:
                    parsed_task = json.loads(raw_response[start:end+1])
            except json.JSONDecodeError:
                pass

    if not parsed_task:
        print_color("[NLP Orchestrator] Ollama offline or returned invalid schema. Mapped via local heuristics.", "93")
        time.sleep(0.5)
        parsed_task = fallback_heuristics(prompt)
        
    print_color(f"[SandboxGate] Parsing NLP Intent: mapped to Agent \"{parsed_task.get('agent_id', 'Unknown')}\" | Task: \"{parsed_task.get('task_name', 'Unknown')}\"", "92")
    time.sleep(0.3)
    
    print_color("[Syscall] Initiating task registration syscall to local database queue...", "94")
    
    success = post_to_scheduler(parsed_task)
    
    if success:
        print_color("\n[Syscall] Success! SQL execution committed to database.", "92")
        print_color("M.A.T.R.I.X. AI-OS NLP Ingress Report:", "1;37")
        print_color("------------------------------------", "1;37")
        print_color(f"Target Agent  : {parsed_task.get('agent_id')}", "37")
        print_color(f"Directives    : {parsed_task.get('task_name')}", "37")
        print_color(f"Syscall Action: {parsed_task.get('intent_explanation')}", "37")
        print_color(f"Alloc. Time   : {parsed_task.get('duration')} seconds", "37")
        print_color(f"Complexity    : {parsed_task.get('task_complexity')} | Urgency: {parsed_task.get('urgency')}", "37")
        print_color("\n[Kernel] Task registered. Running daemon will execute context switch automatically.", "92")
    else:
        print_color("\n[Syscall] Error: API Daemon offline or SQLite write failed.", "91")
        print_color("Could not persist task to scheduler database.", "91")

if __name__ == "__main__":
    main()
