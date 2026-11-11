#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../../.."

AVD="eparadar_play"
PACKAGE="com.tlxq.eparadar"
METRO_PORT=8081
SUPABASE_URL="http://127.0.0.1:54321"
IMAGE="system-images;android-35;google_apis_playstore;x86_64"
export ANDROID_AVD_HOME="${ANDROID_AVD_HOME:-$HOME/.config/.android/avd}"
LOG_DIR="${TMPDIR:-/tmp}/eparadar-e2e"
mkdir -p "$LOG_DIR"

usage() {
  cat <<'EOF'
Användning: mise run e2e [-- flöde.yaml ...]

Kör Maestro-flödena i .maestro mot emulatorn eparadar_play och den lokala demodatan.
Startar det som saknas: Supabase, emulatorn (utan fönster) och Metro.
Allt körs på datorn, inget går via GitHub. En riktig telefon rörs aldrig.

  --no-reset   behåll databasen som den är (annars: supabase db reset)
  --setup      skapa emulatorn eparadar_play om den saknas (bygg sedan appen en gång)
EOF
}

reset=1
setup=0
flows=()
while [ $# -gt 0 ]; do
  case "$1" in
    --no-reset) reset=0 ;;
    --setup) setup=1 ;;
    -h | --help)
      usage
      exit 0
      ;;
    *) flows+=("$1") ;;
  esac
  shift
done

step() { printf '\n▸ %s\n' "$1"; }
fail() {
  echo "$1" >&2
  exit 1
}

our_emulator() {
  local serial
  for serial in $(adb devices | awk '$1 ~ /^emulator-[0-9]+$/ && $2 == "device" { print $1 }'); do
    if adb -s "$serial" emu avd name 2>/dev/null | head -n 1 | tr -d '\r' | grep -qx "$AVD"; then
      echo "$serial"
      return 0
    fi
  done
  return 0
}

if [ "$setup" = 1 ] && [ ! -d "$ANDROID_AVD_HOME/$AVD.avd" ]; then
  step "Skapar emulatorn $AVD"
  yes 2>/dev/null | sdkmanager --licenses >/dev/null 2>&1 || true
  sdkmanager --install "$IMAGE" "emulator" "platform-tools" >/dev/null
  echo no | avdmanager create avd --name "$AVD" --package "$IMAGE" --device "pixel_7" >/dev/null
  [ -d "$ANDROID_AVD_HOME/$AVD.avd" ] || fail "Emulatorn kunde inte skapas. Kolla att sdkmanager och KVM fungerar."
fi

step "Lokala Supabase"
if ! curl -fs -o /dev/null "$SUPABASE_URL/auth/v1/health"; then
  supabase start >"$LOG_DIR/supabase.log" 2>&1 || fail "Supabase startade inte. Se $LOG_DIR/supabase.log"
fi
if [ "$reset" = 1 ]; then
  supabase db reset --local >"$LOG_DIR/reset.log" 2>&1 || fail "Demodatan kunde inte återställas. Se $LOG_DIR/reset.log"
  echo "Demodatan är ny."
fi

step "Emulatorn"
serial="$(our_emulator)"
if [ -z "$serial" ]; then
  [ -d "$ANDROID_AVD_HOME/$AVD.avd" ] || fail "Emulatorn $AVD finns inte. Kör: mise run e2e -- --setup"
  emulator -avd "$AVD" -skin 1080x2340 -no-window -no-snapshot-save -no-audio -no-boot-anim \
    -gpu swiftshader_indirect >"$LOG_DIR/emulator.log" 2>&1 &
  deadline=$((SECONDS + 180))
  until serial="$(our_emulator)" && [ -n "$serial" ]; do
    [ "$SECONDS" -lt "$deadline" ] || fail "Emulatorn startade inte på 3 minuter. Se $LOG_DIR/emulator.log"
    sleep 2
  done
  until [ "$(adb -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ]; do
    [ "$SECONDS" -lt "$deadline" ] || fail "Emulatorn blev inte klar på 3 minuter."
    sleep 2
  done
fi
case "$serial" in
  emulator-*) ;;
  *) fail "Bara emulatorn: en riktig telefon kan visa var du är." ;;
esac
echo "$serial ($AVD)"
device() { adb -s "$serial" "$@"; }

device shell pm path "$PACKAGE" >/dev/null 2>&1 ||
  fail "Appen finns inte på emulatorn. Bygg den en gång: cd apps/mobile && npx expo run:android --no-bundler --device $AVD"

if [ "$reset" = 1 ]; then
  device shell pm clear "$PACKAGE" >/dev/null
fi
device reverse "tcp:$METRO_PORT" "tcp:$METRO_PORT" >/dev/null
device reverse tcp:54321 tcp:54321 >/dev/null
device emu geo fix 18.0450 59.3150 >/dev/null
for permission in ACCESS_FINE_LOCATION ACCESS_COARSE_LOCATION POST_NOTIFICATIONS; do
  device shell pm grant "$PACKAGE" "android.permission.$permission" 2>/dev/null || true
done

metro_running() { curl -fs "http://localhost:$METRO_PORT/status" 2>/dev/null | grep -q running; }

step "Metro"
metro_pid=""
stop_metro() {
  if [ -n "$metro_pid" ]; then
    kill -- "-$metro_pid" 2>/dev/null || true
  fi
}
trap stop_metro EXIT
if ! metro_running; then
  anon_key="$(supabase status -o env 2>/dev/null | sed -n 's/^ANON_KEY="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' || true)"
  [ -n "$anon_key" ] || fail "Hittade ingen anon-nyckel i supabase status."
  (
    cd apps/mobile
    EXPO_PUBLIC_SUPABASE_URL="$SUPABASE_URL" EXPO_PUBLIC_SUPABASE_ANON_KEY="$anon_key" \
      exec setsid npx expo start --dev-client --port "$METRO_PORT"
  ) >"$LOG_DIR/metro.log" 2>&1 &
  metro_pid=$!
  deadline=$((SECONDS + 120))
  until metro_running; do
    kill -0 "$metro_pid" 2>/dev/null || fail "Metro stannade. Se $LOG_DIR/metro.log"
    [ "$SECONDS" -lt "$deadline" ] || fail "Metro svarade inte på 2 minuter. Se $LOG_DIR/metro.log"
    sleep 1
  done
  echo "Startade Metro mot lokala Supabase."
else
  pid="$(ss -ltnpH "sport = :$METRO_PORT" 2>/dev/null | grep -o 'pid=[0-9]*' | head -n 1 | cut -d= -f2 || true)"
  url=""
  if [ -n "$pid" ]; then
    url="$(tr '\0' '\n' <"/proc/$pid/environ" 2>/dev/null | sed -n 's/^EXPO_PUBLIC_SUPABASE_URL=//p' || true)"
  fi
  if [ "$url" != "$SUPABASE_URL" ]; then
    echo "Metro körs redan, och det går inte att se att den pekar på lokala Supabase." >&2
    fail "Flödena skriver poster och meddelanden. Stoppa Metro, så startar e2e en egen mot demodatan."
  fi
  echo "Metro körs redan mot lokala Supabase."
fi

step "Maestro"
if [ "${#flows[@]}" -eq 0 ]; then
  flows=(.maestro)
fi
maestro --device "$serial" test --format junit --output "$LOG_DIR/report.xml" "${flows[@]}"
