#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PACKAGE="com.tlxq.eparadar"
PHONE_HOST="${PHONE_HOST:-}"
METRO_PORT=8081

force_build=0
port=""
wanted=""
while [ $# -gt 0 ]; do
  case "$1" in
    --build) force_build=1 ;;
    --device)
      wanted="${2:-}"
      shift
      ;;
    [0-9]*) port="$1" ;;
    *)
      echo "Användning: npm run phone [-- --build] [-- --device <modell>] [-- <port>]" >&2
      exit 1
      ;;
  esac
  shift
done

devices() {
  adb devices -l | awk 'NR > 1 && $2 == "device" {
    model = ""
    for (i = 3; i <= NF; i++) if ($i ~ /^model:/) model = substr($i, 7)
    print $1, model
  }'
}

while IFS=$'\t' read -r _ type addr; do
  if [ "$type" = "_adb-tls-connect._tcp" ]; then
    adb connect "$addr" >/dev/null 2>&1 || true
  fi
done < <(adb mdns services | tail -n +2)

if [ -z "$(devices)" ] && [ -n "$port" ] && [ -n "$PHONE_HOST" ]; then
  phone_ip="$(tailscale ip -4 "$PHONE_HOST" 2>/dev/null || true)"
  if [ -n "$phone_ip" ]; then
    adb connect "$phone_ip:$port" >/dev/null || true
  fi
fi

mapfile -t found < <(devices | grep -i -- "$wanted" || true)
if [ "${#found[@]}" -eq 0 ]; then
  echo "Hittar ingen telefon${wanted:+ som matchar \"$wanted\"}." >&2
  echo "Slå på Trådlös felsökning på telefonen, eller kör: npm run phone -- <port>" >&2
  exit 1
fi

if [ "${#found[@]}" -gt 1 ]; then
  echo "Flera telefoner hittades, välj en:"
  PS3="Nummer: "
  select choice in "${found[@]}"; do
    [ -n "$choice" ] && break
  done
  found=("$choice")
fi

read -r serial model <<<"${found[0]}"
export ANDROID_SERIAL="$serial"
echo "Telefon: $model ($serial)"

device_id="$(adb shell getprop ro.serialno | tr -d '\r')"
stamp=".expo/last-install-fingerprint-${device_id:-$model}"

fingerprint="$(npx @expo/fingerprint . | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).hash))')"
installed="$(adb shell pm path "$PACKAGE" 2>/dev/null || true)"
previous="$(cat "$stamp" 2>/dev/null || true)"

if [ "$force_build" = 1 ] || [ -z "$installed" ] || [ "$fingerprint" != "$previous" ]; then
  echo "Native-delar har ändrats, bygger appen..."
  npx expo run:android --no-bundler --device "$model"
  mkdir -p "$(dirname "$stamp")"
  echo "$fingerprint" >"$stamp"
else
  echo "Inga native-ändringar, hoppar över bygget."
fi

if adb reverse "tcp:$METRO_PORT" "tcp:$METRO_PORT" >/dev/null 2>&1; then
  metro_url="http://localhost:$METRO_PORT"
else
  metro_url="http://$(tailscale ip -4 | head -n 1):$METRO_PORT"
fi

metro_running() {
  curl -fs "http://localhost:$METRO_PORT/status" 2>/dev/null | grep -q running
}

open_app() {
  until metro_running; do
    sleep 1
  done
  encoded="$(node -e 'console.log(encodeURIComponent(process.argv[1]))' "$metro_url")"
  adb shell am start -a android.intent.action.VIEW \
    -d "exp+eparadar://expo-development-client/?url=$encoded" "$PACKAGE" >/dev/null
  echo "Öppnade appen på $model mot $metro_url"
}

if metro_running; then
  open_app
  echo "Metro körs redan, använder den."
  exit 0
fi

open_app &

exec npx expo start --dev-client --port "$METRO_PORT"
