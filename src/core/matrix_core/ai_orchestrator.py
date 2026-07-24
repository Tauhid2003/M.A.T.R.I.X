from dataclasses import asdict, dataclass
from typing import Any

from .config import CoreConfig
from .process_manager import ProcessManager
from .service_manager import ServiceManager


@dataclass(frozen=True)
class AIModelProfile:
    name: str
    role: str
    size: str
    context_window: str
    required_memory: str
    default: bool = False
    optional: bool = False


@dataclass(frozen=True)
class AIAction:
    action: str
    target: str
    requires_confirmation: bool
    payload: dict[str, Any]


class AIOrchestrator:
    def __init__(self, config: CoreConfig):
        self.config = config
        self.services = ServiceManager(config)
        self.processes = ProcessManager(config)

    def model_profiles(self) -> list[AIModelProfile]:
        return [
            AIModelProfile(
                name="matrix-local-synapse",
                role="offline fallback command router",
                size="built-in",
                context_window="local rules",
                required_memory="minimal",
            ),
            AIModelProfile(
                name="qwen2.5:0.5b",
                role="default baked local OS orchestrator",
                size="about 390 MB",
                context_window="32K tokens",
                required_memory="minimal (baked offline ISO model)",
                default=True,
            ),
            AIModelProfile(
                name="qwen3:8b",
                role="medium-power local OS orchestrator",
                size="about 5.2 GB",
                context_window="40K tokens",
                required_memory="8-12 GB RAM recommended",
                optional=True,
            ),
            AIModelProfile(
                name="qwen3:30b",
                role="high-power reasoning and planning",
                size="about 19 GB",
                context_window="256K tokens",
                required_memory="32 GB+ RAM or strong GPU recommended",
                optional=True,
            ),
            AIModelProfile(
                name="qwen3-coder:30b",
                role="code generation and repository automation",
                size="large",
                context_window="model dependent",
                required_memory="32 GB+ RAM or strong GPU recommended",
                optional=True,
            ),
            AIModelProfile(
                name="llama3.3:70b",
                role="large general reasoning fallback",
                size="about 43 GB",
                context_window="model dependent",
                required_memory="64 GB+ RAM or high VRAM recommended",
                optional=True,
            ),
        ]

    def plan_action(self, text: str) -> AIAction:
        command = text.lower().strip()
        if any(word in command for word in ["tauhid", "shaik", "creator", "developer", "owner", "who am i", "about me"]):
            return AIAction("query_user_profile", "user-profile", False, self.user_profile())
        if any(word in command for word in ["diagnostic", "audit", "scan"]):
            return AIAction("run_diagnostics", "system", False, {"source": text})
        if "terminal" in command or "shell" in command:
            return AIAction("open_app", "terminal", False, {"source": text})
        if "file" in command or "folder" in command:
            return AIAction("open_app", "files", False, {"source": text})
        if "sandbox" in command or "security" in command:
            return AIAction("open_app", "sandbox", False, {"source": text})
        if "build" in command or "iso" in command:
            return AIAction("build_iso", "build-factory", True, {"source": text})
        if "status" in command or "core" in command:
            return AIAction("query_core_status", "core-runtime", False, self.core_status())
        return AIAction("schedule_agent_task", "scheduler", False, {"source": text})

    def core_status(self) -> dict[str, Any]:
        return {
            "project": self.config.project_name,
            "version": self.config.version,
            "runtime": "offline",
            "state_dir": str(self.config.state_dir),
            "services": len(self.services.list_services()),
            "processes": len(self.processes.list_processes()),
            "default_model": "qwen2.5:0.5b",
            "fallback_model": "matrix-local-synapse",
        }

    def user_profile(self) -> dict[str, Any]:
        return {
            "name": "Shaik Tauhidur Rahman",
            "role": "Executive (Club Welfare & Member Services) of AIUB Research & Development Club",
            "education": "BS in Electrical and Electronic Engineering (EEE), AIUB (Dean's List Honors)",
            "specialization": "Cyber-Physical Systems, Digital Twins, and Edge AI",
            "academic_honors": [
                "Dean's List Honors (Faculty of Engineering, Spring 24-25)",
                "Merit-Based Scholarship (Fall 24-25)",
                "Academic Scholarship (Fall 24-25)",
                "Zilla Parishad Scholarship (HSC Merit)"
            ],
            "key_projects": [
                "Digital Twin of DC Motor (ESP32, Hall Sensors, ACS712, MQTT, state-space modeling)",
                "Wind Turbine Aerodynamics Simulator (anemometer, Cp modeling, QBlade, MATLAB)",
                "Home Power Distribution Board (modular electrical wiring demonstration)"
            ],
            "publications": [
                "A Digital Twin Approach for Smart Monitoring of DC Motors with Real-Time Fault Analysis and Power Evaluation (Submitted to WiDS NSU Conference 2026)"
            ],
            "website": "strtauhid.app",
            "github": "github.com/Tauhid2003"
        }

    def describe(self) -> dict[str, Any]:
        return {
            "mode": "local-first",
            "runtime_network_required": False,
            "models": [asdict(profile) for profile in self.model_profiles()],
            "allowed_actions": [
                "open_app",
                "run_diagnostics",
                "schedule_agent_task",
                "change_scheduler_policy",
                "query_core_status",
                "query_user_profile",
                "start_service",
                "stop_service",
            ],
            "confirmation_required": [
                "build_iso",
                "install_package",
                "modify_boot_config",
                "start_network_service",
            ],
        }
