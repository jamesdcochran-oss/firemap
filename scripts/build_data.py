#!/usr/bin/env python3
# scripts/build_data.py
# Writes docs/fire_data.json with hotspot counts for the configured counties.
# Also writes docs/windy_key.js when WINDY_KEY is provided as env var.
import os, json, pathlib, requests, sys
from datetime import datetime, timezone

OUT = pathlib.Path('docs')
OUT.mkdir(exist_ok=True)

COUNTY_CFG = {
  "Amelia": {"lat":37.342,"lon":-77.980},
  "Nottoway": {"lat":37.142,"lon":-78.089},
  "Dinwiddie": {"lat":37.077,"lon":-77.587},
  "Prince George": {"lat":37.221,"lon":-77.288},
  "Brunswick": {"lat":36.770,"lon":-77.880},
  "Greensville": {"lat":36.680,"lon":-77.540}
}
BBOX_DELTA = 0.25  # degrees (approx ~25km) - tweak as needed

def get_firms_count(api_key, lat, lon):
    if not api_key:
        return None
    minLon = lon - BBOX_DELTA; maxLon = lon + BBOX_DELTA
    minLat = lat - BBOX_DELTA; maxLat = lat + BBOX_DELTA
    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{api_key}/VIIRS_SNPP_NRT/24h/{minLat},{minLon},{maxLat},{maxLon}"
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        txt = r.text.strip()
        lines = [l for l in txt.splitlines() if l.strip()]
        # if header present (latitude,longitude,...) subtract header
        if lines and 'latitude' in lines[0].lower() and 'longitude' in lines[0].lower():
            return max(0, len(lines)-1)
        return len(lines)
    except Exception as e:
        print('FIRMS fetch error for', lat, lon, repr(e), file=sys.stderr)
        return None

def main():
    key = os.environ.get('FIRMS_KEY') or os.environ.get('MAP_KEY')
    out = {}
    for name,c in COUNTY_CFG.items():
        count = get_firms_count(key, c['lat'], c['lon'])
        out[name] = {"hotspots": count}
    meta = {"generated_at": datetime.now(timezone.utc).isoformat()}
    payload = {"meta":meta,"counties":out}
    (OUT / 'fire_data.json').write_text(json.dumps(payload, indent=2))
    print('Wrote', OUT / 'fire_data.json')

    # write windy key JS (if WINDY_KEY is set)
    windy = os.environ.get('WINDY_KEY')
    if windy:
        (OUT / 'windy_key.js').write_text("window.WINDY_KEY = " + json.dumps(windy) + ";")
        print('Wrote windy_key.js')
    else:
        # ensure previous windy_key.js removed if present
        if (OUT / 'windy_key.js').exists():
            (OUT / 'windy_key.js').unlink()
            print('Removed old windy_key.js')

if __name__ == '__main__':
    main()
