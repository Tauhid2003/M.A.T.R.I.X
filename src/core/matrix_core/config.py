from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class CoreConfig:
    project_name: str = "M.A.T.R.I.X OS"
    version: str = "0.1.0-core"
    state_dir: Path = Path(".matrix_state")

    @property
    def process_state_path(self) -> Path:
        return self.state_dir / "processes.json"

    @property
    def service_state_path(self) -> Path:
        return self.state_dir / "services.json"
