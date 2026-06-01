import argparse
from dataclasses import asdict
import json
from pathlib import Path

from .ai_orchestrator import AIOrchestrator
from .config import CoreConfig
from .filesystem import FileSystemModule
from .process_manager import ProcessManager
from .service_manager import ServiceManager


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="matrix-core", description="M.A.T.R.I.X offline core runtime")
    parser.add_argument("--state-dir", default=".matrix_state", help="Local runtime state directory")
    subcommands = parser.add_subparsers(dest="command", required=True)

    subcommands.add_parser("status", help="Show core runtime status")

    ai_parser = subcommands.add_parser("ai", help="AI orchestration commands")
    ai_subcommands = ai_parser.add_subparsers(dest="ai_command", required=True)
    ai_subcommands.add_parser("status", help="Show local AI orchestration status")
    ai_plan = ai_subcommands.add_parser("plan", help="Plan a local AI action")
    ai_plan.add_argument("prompt")
    ai_subcommands.add_parser("profile", help="Show creator's profile knowledge")

    fs_parser = subcommands.add_parser("fs", help="Filesystem commands")
    fs_subcommands = fs_parser.add_subparsers(dest="fs_command", required=True)
    fs_list = fs_subcommands.add_parser("ls", help="List a local directory")
    fs_list.add_argument("path", nargs="?", default=".")

    process_parser = subcommands.add_parser("process", help="Process commands")
    process_subcommands = process_parser.add_subparsers(dest="process_command", required=True)
    process_subcommands.add_parser("list", help="List simulated processes")
    process_spawn = process_subcommands.add_parser("spawn", help="Spawn a simulated process")
    process_spawn.add_argument("name")
    process_spawn.add_argument("command")
    process_stop = process_subcommands.add_parser("stop", help="Stop a simulated process")
    process_stop.add_argument("pid", type=int)

    service_parser = subcommands.add_parser("service", help="Service commands")
    service_subcommands = service_parser.add_subparsers(dest="service_command", required=True)
    service_subcommands.add_parser("list", help="List services")
    service_register = service_subcommands.add_parser("register", help="Register a service")
    service_register.add_argument("name")
    service_register.add_argument("command")
    service_start = service_subcommands.add_parser("start", help="Start a service")
    service_start.add_argument("name")
    service_stop = service_subcommands.add_parser("stop", help="Stop a service")
    service_stop.add_argument("name")

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    config = CoreConfig(state_dir=Path(args.state_dir))

    if args.command == "status":
        return _status(config)
    if args.command == "ai":
        return _ai(args, config)
    if args.command == "fs":
        return _filesystem(args)
    if args.command == "process":
        return _process(args, config)
    if args.command == "service":
        return _service(args, config)
    return 2


def _status(config: CoreConfig) -> int:
    processes = ProcessManager(config).list_processes()
    services = ServiceManager(config).list_services()
    print(f"{config.project_name} {config.version}")
    print("runtime: offline")
    print(f"state_dir: {config.state_dir}")
    print(f"processes: {len(processes)}")
    print(f"services: {len(services)}")
    return 0


def _ai(args: argparse.Namespace, config: CoreConfig) -> int:
    orchestrator = AIOrchestrator(config)
    if args.ai_command == "status":
        print(json.dumps(orchestrator.describe(), indent=2))
        return 0
    if args.ai_command == "plan":
        print(json.dumps(asdict(orchestrator.plan_action(args.prompt)), indent=2))
        return 0
    if args.ai_command == "profile":
        print(json.dumps(orchestrator.user_profile(), indent=2))
        return 0
    return 2


def _filesystem(args: argparse.Namespace) -> int:
    module = FileSystemModule()
    entries = module.list_dir(args.path)
    for entry in entries:
        print(f"{entry.kind:9} {entry.size_bytes:10} {entry.name}")
    summary = module.summarize(entries)
    print(f"summary: {summary['directories']} dirs, {summary['files']} files, {summary['total_bytes']} bytes")
    return 0


def _process(args: argparse.Namespace, config: CoreConfig) -> int:
    manager = ProcessManager(config)
    if args.process_command == "list":
        return _print_records(manager.list_processes())
    if args.process_command == "spawn":
        print(asdict(manager.spawn_simulated(args.name, args.command)))
        return 0
    if args.process_command == "stop":
        print(asdict(manager.stop(args.pid)))
        return 0
    return 2


def _service(args: argparse.Namespace, config: CoreConfig) -> int:
    manager = ServiceManager(config)
    if args.service_command == "list":
        return _print_records(manager.list_services())
    if args.service_command == "register":
        print(asdict(manager.register(args.name, args.command)))
        return 0
    if args.service_command == "start":
        print(asdict(manager.start(args.name)))
        return 0
    if args.service_command == "stop":
        print(asdict(manager.stop(args.name)))
        return 0
    return 2


def _print_records(records: list[object]) -> int:
    if not records:
        print("[]")
        return 0
    for record in records:
        print(asdict(record))
    return 0
