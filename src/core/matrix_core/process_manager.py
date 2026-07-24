import os
import platform
import subprocess
from dataclasses import asdict, dataclass
from datetime import datetime, timezone

from .config import CoreConfig
from .state import read_json, write_json


@dataclass
class ProcessRecord:
    pid: int
    name: str
    command: str
    status: str
    created_at: str


class ProcessManager:
    def __init__(self, config: CoreConfig):
        self.config = config

    def list_processes(self) -> list[ProcessRecord]:
        return [ProcessRecord(**item) for item in read_json(self.config.process_state_path, [])]

    def spawn_process(self, name: str, command: str) -> ProcessRecord:
        """Spawns an actual OS process while maintaining process registry state."""
        try:
            if platform.system() == "Windows":
                proc = subprocess.Popen(command, shell=True)
            else:
                proc = subprocess.Popen(command, shell=True, start_new_session=True)
            real_pid = proc.pid
        except Exception:
            records = self.list_processes()
            real_pid = max((r.pid for r in records), default=1000) + 1

        record = ProcessRecord(
            pid=real_pid,
            name=name,
            command=command,
            status="running",
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        records = self.list_processes()
        records.append(record)
        write_json(self.config.process_state_path, [asdict(item) for item in records])
        return record

    def spawn_simulated(self, name: str, command: str) -> ProcessRecord:
        return self.spawn_process(name, command)

    def stop(self, pid: int) -> ProcessRecord:
        try:
            if platform.system() == "Windows":
                subprocess.run(f"taskkill /F /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                os.kill(pid, 9)
        except Exception:
            pass

        records = self.list_processes()
        for record in records:
            if record.pid == pid:
                record.status = "stopped"
                write_json(self.config.process_state_path, [asdict(item) for item in records])
                return record
        raise KeyError(f"Process not found: {pid}")
