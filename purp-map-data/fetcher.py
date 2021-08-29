#!/usr/bin/env python3
import json
from datetime import datetime, timedelta
import os
from functools import partial
import pathlib
import requests
import sys
import time
import threading

TOK_THINGSPEAK_PRIMARY_ID = "THINGSPEAK_PRIMARY_ID"
TOK_THINGSPEAK_PRIMARY_ID_READ_KEY = "THINGSPEAK_PRIMARY_ID_READ_KEY"

DATA_DIR = "./data-cache"

IN_BACKGROUND = True
GET_SLEEP = 0.1
MAX_THREADS=20

class Cache:
    @staticmethod
    def init():
        pathlib.Path(DATA_DIR).mkdir(parents=True, exist_ok=True)

    @staticmethod
    def get(fname, func):
        path = os.path.join(DATA_DIR, fname)
        if os.path.exists(path):
            print(f"{fname} previously cached")
            with open(path, "r") as f:
                return json.load(f)
        print(f"{fname} not cached, calling {func}")
        content = func()
        if content:
            with open(path, "w") as f:
                print(f"Caching {fname}")
                json.dump(content, f)
        return content

    @staticmethod
    def clear(fname):
        path = os.path.join(DATA_DIR, fname)
        print(f"Removing {fname}")
        os.unlink(path)

    @staticmethod
    def contains(fname):
        path = os.path.join(DATA_DIR, fname)
        return os.path.exists(path)


def getUrl(url):
    res = requests.get(url)
    time.sleep(GET_SLEEP)
    return {
        "status_code": res.status_code,
        "headers": dict(res.headers),
        "text": res.json()
    }

def getSensorData(id, key=None):
    print(f"Fetching sensor data for {id}")
    url = f"https://www.purpleair.com/json?show={id}&key={key}"
    return getUrl(url)

def getSensorTimeline(channel, api_key):
    field = 2
    now = datetime.now()
    start = now - timedelta(days=7)
    startStr = "{:%Y-%m-%d %H:%M:%S}".format(start)
    endStr = ""
    offset = 0
    avg = 60

    url = f"https://api.thingspeak.com/channels/{channel}/fields/{field}.json?start={startStr}&end={endStr}&offset={offset}&round=2&average={avg}&api_key={api_key}"
    return getUrl(url)

Cache.init()

def handle_id(id):
    fname_data = f"{id}.data"
    print(f"{id}: Getting: {fname_data}")
    data = Cache.get(fname_data, partial(getSensorData, id))
    status = data["status_code"]
    print(f"{id}: Status(data): {status}")
    if status != 200:
        print(f"{id}: ====================== Deleting {fname_data}")
        Cache.clear(fname_data)
        return
    results = data["text"]["results"]
    if len(results) == 0:
        print(f"{id}: Skipping: empty")
        return
    if results[0].get("DEVICE_LOCATIONTYPE") == "inside":
        print(f"{id}: Skipping: inside")
        return
    if results[0].get("ParentID"):
        print(f"{id}: Skipping: has a parent")
        return
    fname_timeline = f"{id}.timeline"
    channel = data["text"]["results"][0][TOK_THINGSPEAK_PRIMARY_ID]
    api_key = data["text"]["results"][0][TOK_THINGSPEAK_PRIMARY_ID_READ_KEY]

    timeline = Cache.get(fname_timeline, partial(getSensorTimeline, channel, api_key))
    print(f"{id}: Status(timeline): {timeline['status_code']}")
    status = timeline["status_code"]
    if status != 200:
        print(f"{id}: ====================== Deleting {fname_timeline}")
        Cache.clear(fname_timeline)

assert MAX_THREADS >= 2
for id in range(1000, 80000):
    if IN_BACKGROUND:
        while threading.activeCount() >= MAX_THREADS:
            time.sleep(0.01)
        func = partial(handle_id, id)
        threading.Thread(target=func).start()
    else:
        handle_id(id)
