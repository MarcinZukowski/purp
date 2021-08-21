#!/bin/bash

SIZE=32x32

for ((i = 0; i <= 100; i++)) ; do
  ((hue=(100 - i) * 180 / 100 + 270))
  echo $i - $hue;
  convert -size $SIZE xc:transparent \
    -fill "hsv(${hue},90%,100%)" -stroke purple \
    -draw "stroke-width 0.5 circle 16,16 2,16" icon-$i.png
done
