#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PACKAGE="com.tlxq.eparadar"
PHONE_HOST="${PHONE_HOST:-phone}"
METRO_PORT=8081
STAMP=".expo/last-install-fingerprint"

force_build=0
port=""
for arg in "$@"; do
  case "$arg" in
    --build) force_build=1 ;;
    [0-9]*) port="$arg" ;;
    *)
      echo "Användning: npm run phone [-- --build] [-- <port>]" >&2
      exit 1
      ;;
  esac
done

devices() {
  adb devices | awk 'NR > 1 && $2 == "device" { print $1 }'
}

if [ -z "$(devices)" ]; then
  while read -r _ type addr; do
    if [ "$type" = "_adb-tls-connect._tcp" ]; then
      adb connect "$addr" >/dev/null || true
    fi
  done < <(adb mdns services | tail -n +2)
fi

if [ -z "$(devices)" ] && [ -n "$port" ]; then
  phone_ip="$(tailscale ip -4 "$PHONE_HOST" 2>/dev/null || true)"
  if [ -n "$phone_ip" ]; then
    adb connect "$phone_ip:$port" >/dev/null || true
  fi
fi

serial="$(devices | head -n 1)"
if [ -z "$serial" ]; then
  echo "Hittar ingen telefon." >&2
  echo "Slå på Trådlös felsökning på telefonen, eller kör: npm run phone -- <port>" >&2
  exit 1
fi
export ANDROID_SERIAL="$serial"
echo "Telefon: $serial"

fingerprint="$(npx @expo/fingerprint . | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).hash))')"
installed="$(adb shell pm path "$PACKAGE" 2>/dev/null || true)"
previous="$(cat "$STAMP" 2>/dev/null || true)"

if [ "$force_build" = 1 ] || [ -z "$installed" ] || [ "$fingerprint" != "$previous" ]; then
  echo "Native-delar har ändrats, bygger appen..."
  npx expo run:android --no-bundler
  mkdir -p "$(dirname "$STAMP")"
  echo "$fingerprint" >"$STAMP"
else
  echo "Inga native-ändringar, hoppar över bygget."
fi

if adb reverse "tcp:$METRO_PORT" "tcp:$METRO_PORT" >/dev/null 2>&1; then
  metro_url="http://localhost:$METRO_PORT"
else
  metro_url="http://$(tailscale ip -4 | head -n 1):$METRO_PORT"
fi

(
  until curl -fs "http://localhost:$METRO_PORT/status" 2>/dev/null | grep -q running; do
    sleep 1
  done
  encoded="$(node -e 'console.log(encodeURIComponent(process.argv[1]))' "$metro_url")"
  adb shell am start -a android.intent.action.VIEW \
    -d "exp+eparadar://expo-development-client/?url=$encoded" "$PACKAGE" >/dev/null
  echo "Öppnade appen mot $metro_url"
) &

exec npx expo start --dev-client --port "$METRO_PORT"
