import os
from pathlib import Path
import uuid
import json


LIBRARY_ROOT = "/Users/shlomo/Library/Mobile Documents/iCloud~com~kolyvan~yar/Documents"


def walk(path, is_dir, nodes):
    node_id = str(uuid.uuid4())
    child_ids = []

    if is_dir:
        with os.scandir(path) as entries:
            for entry in entries:
                child_id = walk(entry.path, entry.is_dir(), nodes)
                child_ids.append(child_id)

    nodes[node_id] = {
        "type": "directory" if is_dir else "file",
        "name": Path(path).name,
        "path": path,
        "childIds": child_ids
    }

    return node_id


nodes = {}
root_id = walk(LIBRARY_ROOT, True, nodes)

tree = {
    "rootId": root_id,
    "nodes": nodes
}

with open("library.json", "w", encoding="utf-8") as outfile:
    json.dump(tree, outfile, indent=3, ensure_ascii=False)
