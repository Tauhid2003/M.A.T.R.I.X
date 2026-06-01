from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class FileEntry:
    name: str
    path: str
    kind: str
    size_bytes: int


class FileSystemModule:
    def list_dir(self, path: str = ".") -> list[FileEntry]:
        root = Path(path).expanduser().resolve()
        if not root.exists():
            raise FileNotFoundError(f"Path does not exist: {root}")
        if not root.is_dir():
            raise NotADirectoryError(f"Path is not a directory: {root}")
        return [self._entry(child) for child in sorted(root.iterdir(), key=lambda item: item.name.lower())]

    def exists(self, path: str) -> bool:
        return Path(path).expanduser().exists()

    def _entry(self, path: Path) -> FileEntry:
        kind = "directory" if path.is_dir() else "file"
        size = 0 if path.is_dir() else path.stat().st_size
        return FileEntry(name=path.name, path=str(path), kind=kind, size_bytes=size)

    def summarize(self, entries: Iterable[FileEntry]) -> dict[str, int]:
        files = 0
        directories = 0
        total_bytes = 0
        for entry in entries:
            if entry.kind == "directory":
                directories += 1
            else:
                files += 1
                total_bytes += entry.size_bytes
        return {"files": files, "directories": directories, "total_bytes": total_bytes}
