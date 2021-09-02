#!/usr/bin/env python3

from datetime import datetime
import glob
import json
import os
import sys
import subprocess

DATA_DIR = "./data-cache"
FILE_PATTERN = "*.timeline"
PREPROC_FILE = "preproc.json"

files = glob.glob(os.path.join(DATA_DIR, FILE_PATTERN))

print(len(files))

recs = []

cnt = len(files)
cur = 0

for fname in files:
    cur += 1
    print(f"{cur}/{cnt} Processing: {fname}")
    prefix = os.path.splitext(fname)[0]
    id = os.path.split(prefix)[1]

    with open(f"{prefix}.data", "r") as f:
        data = json.load(f)
    with open(fname, "r") as f:
        timeline = json.load(f)

    assert timeline["status_code"] == 200

    feeds = timeline["text"]["feeds"]

    meta = data["text"]["results"][0]

    if "Lat" not in meta or "Lon" not in meta:
        print("No geo info, skipping")
        continue

    if meta.get("ParentID"):
        print("Has a parent, skipping")
        continue

    optimized = []

    last = 0
    for f in feeds:
        ts = datetime.strptime(f["created_at"], "%Y-%m-%dT%H:%M:%SZ")

        val = f["field2"]
        if val is None:
            continue
        val = float(val)
        secs = int(ts.timestamp())
        delta = int((secs - last) / 60)
        optimized.extend([delta, val])
        last = secs

    if len(optimized) == 0:
        print("No feeds, skipping")
        continue

    rec = {
        "id": meta["ID"],
        "label": meta["Label"],
        "lat": meta["Lat"],
        "long": meta["Lon"],
        "feeds": optimized
    }

    recs.append(rec)

print(f"Saving {len(recs)} records (out of {len(files)} files)")

with open(PREPROC_FILE, "w") as f:
    json.dump(recs, f, separators=(",", ": "))

print(f"Compressing {PREPROC_FILE} into {PREPROC_FILE}.zst")
subprocess.run(f"zstd -f -15 {PREPROC_FILE}", shell=True)
