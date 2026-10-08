import hashlib, json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'backup/manifest.json').read_text())
for item in manifest['files']:
    path = root / item['path']
    assert path.is_file(), f"Missing: {item['path']}"
    data = path.read_bytes()
    assert len(data) == item['size'] and hashlib.sha256(data).hexdigest() == item['sha256'], f"Mismatch: {item['path']}"
print(f"PASS: all {len(manifest['files'])} payload files match the backup manifest.")
