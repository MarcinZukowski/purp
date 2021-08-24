#!/usr/bin/env python3

from math import sqrt

SIZE=256
HALF=SIZE/2

OFF=SIZE/8 * 0
MAX=HALF

with open("rad.gray", "wb") as f:
    for y in range(0, SIZE):
        for x in range(0, SIZE):
            v1 = sqrt((x - HALF - OFF) ** 2 + (y - HALF) **2)
            v1 = ((HALF-min(v1,HALF))/HALF)
            v2 = sqrt((x - HALF + OFF) ** 2 + (y - HALF) **2)
            v2 = ((HALF-min(v2,HALF))/HALF)
            v1 = 255 * (v1 ** 2)
            v2 = 255 * (v2 ** 2)
            v = min(v1 + 0 * v2, 255)
#            v = 255 - v;
            if y == HALF:
                print(y, x, v)
            f.write(int(v).to_bytes(1, 'little'))

print(f"""
postprocess with
convert -size {SIZE}x{SIZE} -depth 8 GRAY:rad.gray rad.png
""");
