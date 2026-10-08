#!/usr/bin/env python3
"""Build an allowlisted, locally reviewed release. Never upload or invoke Git."""
import argparse
import hashlib
import json
import re
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def digest(data):
    return hashlib.sha256(data).hexdigest()


def inspect_text(name, data):
    if name.endswith('.png'):
        return
    text = data.decode('utf-8')
    # The one deliberately synthetic private-path fixture is not a real account.
    text = text.replace('/Users/QA_ONLY/private', '<synthetic-test-fixture>')
    patterns = [
        r'/Users/[A-Za-z0-9._-]+/', r'/home/[A-Za-z0-9._-]+/', r'[A-Za-z]:\\Users\\[^\s\\]+',
        r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
        r'gh[pousr]_[A-Za-z0-9]{20,}', r'github_pat_[A-Za-z0-9_]{20,}',
        r'sk-(?:proj-)?[A-Za-z0-9_-]{20,}', r'AKIA[A-Z0-9]{16}',
        r'https?://[^\s"/]+:[^\s"/]+@',
        r'[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,24}',
    ]
    for pattern in patterns:
        if re.search(pattern, text):
            raise ValueError('Review possible private information in ' + name)


def build(output):
    output = (ROOT / output).resolve()
    if ROOT / 'release' not in output.parents:
        raise ValueError('Output must be a new directory below release/.')
    archive = output.with_suffix('.zip')
    if output.exists() or archive.exists():
        raise ValueError('Output already exists; choose a fresh output name.')
    names = (ROOT / 'release-files.txt').read_text().splitlines()
    if not names or len(names) != len(set(names)):
        raise ValueError('Empty or duplicate release allowlist.')
    records = []
    for name in names:
        relative = Path(name)
        if relative.is_absolute() or '..' in relative.parts or not name:
            raise ValueError('Unsafe allowlist path.')
        source = ROOT / relative
        if any((ROOT / Path(*relative.parts[:i])).is_symlink() for i in range(1, len(relative.parts) + 1)):
            raise ValueError('Symlinks cannot be published: ' + name)
        if not source.is_file():
            raise ValueError('Missing allowlisted file: ' + name)
        if relative.parts[0] in ('work', 'reports', 'release', 'node_modules', '.git'):
            raise ValueError('Local-only directory in allowlist.')
        data = source.read_bytes()
        inspect_text(name, data)
        records.append({'path':name, 'bytes':len(data), 'sha256':digest(data)})
    baseline = json.loads((ROOT / 'automation/original-app.sha256.json').read_text())
    for name, expected in baseline.items():
        if name not in names or digest((ROOT / name).read_bytes()) != expected:
            raise ValueError('Original experiment file missing or modified: ' + name)
    output.mkdir(parents=True)
    for record in records:
        dest = output / record['path']
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / record['path'], dest)
    manifest = {'schemaVersion':1, 'release':'phase1', 'files':records,
                'note':'All payload files are listed; this generated manifest does not hash itself. No dependencies or raw local reports are bundled.'}
    (output / 'RELEASE-MANIFEST.json').write_text(json.dumps(manifest, indent=2) + '\n')
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
        for name in names + ['RELEASE-MANIFEST.json']:
            # Stable timestamps and permissions; no source machine ownership metadata.
            entry = zipfile.ZipInfo('ai-agent-testing-lab/' + name, date_time=(2026, 10, 8, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            bundle.writestr(entry, (output / name).read_bytes())
    archive.with_suffix('.zip.sha256').write_text(digest(archive.read_bytes()) + '  ' + archive.name + '\n')
    print('Prepared', len(records) + 1, 'files at', output.relative_to(ROOT))
    print('Archive:', archive.relative_to(ROOT), '(' + str(archive.stat().st_size) + ' bytes)')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', default='release/phase1-public')
    build(parser.parse_args().output)
