from pathlib import Path
from tempfile import TemporaryDirectory

from matrix_core.ai_orchestrator import AIOrchestrator
from matrix_core.config import CoreConfig
from matrix_core.filesystem import FileSystemModule
from matrix_core.process_manager import ProcessManager
from matrix_core.service_manager import ServiceManager


def main() -> int:
    with TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        config = CoreConfig(state_dir=root / "state")

        fs_module = FileSystemModule()
        entries = fs_module.list_dir(".")
        assert fs_module.summarize(entries)["directories"] >= 1

        process = ProcessManager(config).spawn_simulated("core-smoke", "matrix-core status")
        assert process.pid > 1000
        assert process.status == "running"

        services = ServiceManager(config)
        services.register("matrix-core", "python -m matrix_core status")
        service = services.start("matrix-core")
        assert service.status == "running"

        orchestrator = AIOrchestrator(config)
        status = orchestrator.core_status()
        assert status["default_model"] == "qwen2.5:0.5b"
        assert orchestrator.plan_action("open terminal").action == "open_app"
        assert orchestrator.plan_action("who is Tauhid").action == "query_user_profile"
        assert orchestrator.plan_action("who is Tauhid").payload["name"] == "Shaik Tauhidur Rahman"

        # Verify scheduler_daemon agent prompts parser
        import sys
        sys.path.append(str(Path(__file__).parent.parent / "scheduler"))
        import scheduler_daemon
        prompts = scheduler_daemon.load_agent_prompts()
        assert "Security Auditor" in prompts
        assert "System Architect" in prompts

    print("CORE-001 smoke test PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
