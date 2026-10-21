"""Restore only the publisher's demo scene; keep the prepared game assets intact."""
import io
import os
import tarfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
project = root / 'UnityComparison'
package = next((Path(os.environ['APPDATA']) / 'Unity/Asset Store-5.x').rglob('Coffee Shop Environment.unitypackage'))
def records(archive):
    for member in archive.getmembers():
        if member.name.endswith('/pathname'):
            yield member.name.rsplit('/', 1)[0], archive.extractfile(member).read().decode('utf-8-sig').splitlines()[0].rstrip('\0')
with tarfile.open(package) as outer:
    guid = next(g for g, p in records(outer) if p.endswith('/CoffeeShopURP.unitypackage'))
    with tarfile.open(fileobj=io.BytesIO(outer.extractfile(guid + '/asset').read())) as inner:
        for guid, path in records(inner):
            if not path.endswith('/CoffeeShopInteriorDAY.unity'):
                continue
            target = (project / path).resolve()
            if not target.is_relative_to(project / 'Assets'):
                raise ValueError(path)
            if target.exists():
                print('Demo scene already present:', target)
                continue
            target.write_bytes(inner.extractfile(guid + '/asset').read())
            Path(str(target) + '.meta').write_bytes(inner.extractfile(guid + '/asset.meta').read())
            print('Restored publisher demo:', target)
