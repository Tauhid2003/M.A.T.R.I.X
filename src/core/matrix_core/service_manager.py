from dataclasses import asdict, dataclass
from datetime import datetime, timezone

from .config import CoreConfig
from .state import read_json, write_json


@dataclass
class ServiceRecord:
    name: str
    command: str
    status: str
    updated_at: str


class ServiceManager:
    def __init__(self, config: CoreConfig):
        self.config = config

    def list_services(self) -> list[ServiceRecord]:
        return [ServiceRecord(**item) for item in read_json(self.config.service_state_path, [])]

    def register(self, name: str, command: str) -> ServiceRecord:
        records = [record for record in self.list_services() if record.name != name]
        record = ServiceRecord(
            name=name,
            command=command,
            status="registered",
            updated_at=datetime.now(timezone.utc).isoformat(),
        )
        records.append(record)
        self._save(records)
        return record

    def start(self, name: str) -> ServiceRecord:
        return self._set_status(name, "running")

    def stop(self, name: str) -> ServiceRecord:
        return self._set_status(name, "stopped")

    def _set_status(self, name: str, status: str) -> ServiceRecord:
        records = self.list_services()
        for record in records:
            if record.name == name:
                record.status = status
                record.updated_at = datetime.now(timezone.utc).isoformat()
                self._save(records)
                return record
        raise KeyError(f"Service not found: {name}")

    def _save(self, records: list[ServiceRecord]) -> None:
        records.sort(key=lambda record: record.name)
        write_json(self.config.service_state_path, [asdict(item) for item in records])
