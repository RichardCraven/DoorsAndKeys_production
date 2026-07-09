#!/bin/bash
OPAL_DIR="src/assets/icons/misc/loot"
CRYSTAL_DIR="src/assets/icons/loot"
OUT_DIR="src/assets/icons/misc/loot"

# Ensure output dir exists
mkdir -p "$OUT_DIR"

# Base opal is green (~120 hue)
BASE_OPAL="$OPAL_DIR/green opal.png"
magick "$BASE_OPAL" -modulate 100,100,166 "$OUT_DIR/blue_opal.png"
magick "$BASE_OPAL" -modulate 100,100,33 "$OUT_DIR/red_opal.png"
magick "$BASE_OPAL" -modulate 100,100,58 "$OUT_DIR/amber_opal.png"

# Base crystal is Quest_131_crystal.png (Assuming it is blue ~240 hue)
BASE_CRYSTAL="$CRYSTAL_DIR/Quest_131_crystal.png"
cp "$BASE_CRYSTAL" "$OUT_DIR/blue_crystal.png"
magick "$BASE_CRYSTAL" -modulate 100,100,116 "$OUT_DIR/purple_crystal.png"
magick "$BASE_CRYSTAL" -modulate 100,100,133 "$OUT_DIR/pink_crystal.png"
magick "$BASE_CRYSTAL" -modulate 100,100,34 "$OUT_DIR/green_crystal.png"
magick "$BASE_CRYSTAL" -modulate 100,100,166 "$OUT_DIR/ruddy_crystal.png"
magick "$BASE_CRYSTAL" -modulate 100,100,85 "$OUT_DIR/saphite_crystal.png"
magick "$BASE_CRYSTAL" -modulate 100,100,150 "$OUT_DIR/magentite_crystal.png"
magick "$BASE_CRYSTAL" -modulate 100,50,50 "$OUT_DIR/moxite_crystal.png"

echo "Images generated successfully!"
