#!/usr/bin/env python3
# M.A.T.R.I.X. AI-OS Capability-Based Policy Engine
# Enforces fine-grained permission bounds and 4 Autonomy Modes:
# 1. OBSERVE   - Dry-run inspection only, no state mutations.
# 2. SUGGEST   - Propose actions without auto-execution.
# 3. APPROVE   - Operator confirmation required for sensitive actions.
# 4. AUTONOMOUS- Auto-execute within verified capability boundaries.

import os
import sys
import json
import platform
from enum import Enum
from typing import Dict, List, Any, Optional

class AutonomyMode(Enum):
    OBSERVE = "observe"
    SUGGEST = "suggest"
    APPROVE = "approve"
    AUTONOMOUS = "autonomous"

class PolicyDecision(Enum):
    ALLOW = "allow"
    DENY = "deny"
    REQUIRES_APPROVAL = "requires_approval"

class PolicyEngine:
    """Evaluates agent tool capabilities and enforces system security policies."""

    DEFAULT_CAPABILITIES = {
        "Security Auditor": {
            "mode": AutonomyMode.AUTONOMOUS,
            "read_paths": ["/etc", "/var/log", "scheduler.db", "matrix_api_token.txt", "."],
            "write_paths": [],
            "allowed_commands": ["netstat", "ss", "ls", "ps", "whoami"],
            "network_local_scan": True,
            "network_external": False,
        },
        "Filesystem Stripper": {
            "mode": AutonomyMode.AUTONOMOUS,
            "read_paths": ["/tmp", "."],
            "write_paths": ["/tmp", "."],
            "allowed_commands": ["rm", "clean", "purge"],
            "network_local_scan": False,
            "network_external": False,
        },
        "Network Guard": {
            "mode": AutonomyMode.AUTONOMOUS,
            "read_paths": ["/etc/hosts", "/etc/resolv.conf"],
            "write_paths": [],
            "allowed_commands": ["ip", "ifconfig", "ping", "netstat"],
            "network_local_scan": True,
            "network_external": False,
        },
        "Data Analyst": {
            "mode": AutonomyMode.AUTONOMOUS,
            "read_paths": ["/var/log", "scheduler.log", "matrix_api_audit.log", "."],
            "write_paths": [],
            "allowed_commands": ["cat", "grep", "tail"],
            "network_local_scan": False,
            "network_external": False,
        },
        "Code Builder": {
            "mode": AutonomyMode.APPROVE,
            "read_paths": ["src", "."],
            "write_paths": ["src", "dist", "."],
            "allowed_commands": ["python", "python3", "npm", "gcc", "make"],
            "network_local_scan": False,
            "network_external": False,
        },
        "Wine Translator": {
            "mode": AutonomyMode.OBSERVE,
            "read_paths": ["/usr/bin/wine", "."],
            "write_paths": [],
            "allowed_commands": ["wine"],
            "network_local_scan": False,
            "network_external": False,
        },
        "Self Improver": {
            "mode": AutonomyMode.AUTONOMOUS,
            "read_paths": ["/proc/meminfo", "/proc/cpuinfo", "."],
            "write_paths": [],
            "allowed_commands": ["sysctl"],
            "network_local_scan": False,
            "network_external": False,
        }
    }

    def __init__(self, mode: AutonomyMode = AutonomyMode.AUTONOMOUS):
        self.global_mode = mode
        self.capabilities = dict(self.DEFAULT_CAPABILITIES)

    def set_global_mode(self, mode: AutonomyMode):
        self.global_mode = mode

    def get_agent_capability(self, agent_id: str) -> Dict[str, Any]:
        return self.capabilities.get(agent_id, {
            "mode": AutonomyMode.APPROVE,
            "read_paths": ["."],
            "write_paths": [],
            "allowed_commands": [],
            "network_local_scan": False,
            "network_external": False,
        })

    def evaluate_action(self, agent_id: str, action_type: str, target: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Evaluates whether an action is ALLOWED, DENIED, or REQUIRES_APPROVAL."""
        cap = self.get_agent_capability(agent_id)
        effective_mode = cap.get("mode", self.global_mode)
        if isinstance(effective_mode, str):
            effective_mode = AutonomyMode(effective_mode)

        # 1. OBSERVE Mode: Only inspect operations permitted, block write/destructive actions
        if effective_mode == AutonomyMode.OBSERVE:
            if action_type in ["read", "scan", "inspect", "audit"]:
                return {"decision": PolicyDecision.ALLOW, "reason": "Observe mode allows read-only inspection."}
            else:
                return {"decision": PolicyDecision.DENY, "reason": f"Observe mode blocks action type '{action_type}'."}

        # 2. SUGGEST Mode: All mutating operations require confirmation
        if effective_mode == AutonomyMode.SUGGEST:
            return {"decision": PolicyDecision.REQUIRES_APPROVAL, "reason": f"Suggest mode proposes action '{action_type}' for approval."}

        # 3. Path & Boundary Capability Verification
        if action_type == "write" or action_type == "delete":
            allowed_writes = cap.get("write_paths", [])
            target_abs = os.path.abspath(target) if target else ""
            matched = any(os.path.abspath(p) in target_abs or target_abs.startswith(os.path.abspath(p)) for p in allowed_writes)
            if not matched:
                if effective_mode == AutonomyMode.APPROVE:
                    return {"decision": PolicyDecision.REQUIRES_APPROVAL, "reason": f"Write to '{target}' requires operator approval."}
                return {"decision": PolicyDecision.DENY, "reason": f"Agent '{agent_id}' lacks write capability for '{target}'."}

        # 4. Command Allowlist Check
        if action_type == "execute_command":
            cmd = target.split()[0].lower() if target else ""
            allowed = cap.get("allowed_commands", [])
            if cmd not in allowed:
                return {"decision": PolicyDecision.DENY, "reason": f"Command '{cmd}' not in allowlist for agent '{agent_id}'."}

        # 5. APPROVE Mode default check
        if effective_mode == AutonomyMode.APPROVE and action_type in ["write", "delete", "execute_command", "build"]:
            return {"decision": PolicyDecision.REQUIRES_APPROVAL, "reason": f"Action '{action_type}' requires user approval under APPROVE policy."}

        return {"decision": PolicyDecision.ALLOW, "reason": "Action verified within capability policy bounds."}
