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

    def spawn_simulated(self, name: str, command: str) -> ProcessRecord:
        records = self.list_processes()
        next_pid = max((record.pid for record in records), default=1000) + 1
        record = ProcessRecord(
            pid=next_pid,
            name=name,
            command=command,
            status="running",
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        records.append(record)
        write_json(self.config.process_state_path, [asdict(item) for item in records])
        return record

    def stop(self, pid: int) -> ProcessRecord:
        records = self.list_processes()
        for record in records:
            if record.pid == pid:
                record.status = "stopped"
                write_json(self.config.process_state_path, [asdict(item) for item in records])
                return record
        raise KeyError(f"Process not found: {pid}")
