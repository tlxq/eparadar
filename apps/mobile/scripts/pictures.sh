#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../../.."

STORE="${XDG_DATA_HOME:-$HOME/.local/share}/eparadar/pictures"
branch="$(git rev-parse --abbrev-ref HEAD)"
slug="$(printf '%s' "$branch" | tr -c 'A-Za-z0-9._-' '-')"
run="$STORE/run-$slug"
here="$STORE/$slug"
base="$STORE/master"
page="$here/index.html"

usage() {
  cat <<'EOF'
Användning: mise run pictures [-- --no-reset] [-- --baseline]

Kör Maestro-flödena med bilder och jämför varje skärm med senaste bilderna från master.
På master blir bilderna nya jämförelsebilder. På en gren skrivs en sida med före och efter:
  ~/.local/share/eparadar/pictures/<gren>/index.html
--baseline sparar körningen som jämförelsebilder, till exempel när Tom har godkänt en ändring.
--compare-only gör om sidan från senaste bilderna utan att köra flödena.
EOF
}

e2e_args=()
save_base=0
compare_only=0
while [ $# -gt 0 ]; do
  case "$1" in
    -h | --help)
      usage
      exit 0
      ;;
    --baseline) save_base=1 ;;
    --compare-only) compare_only=1 ;;
    *) e2e_args+=("$1") ;;
  esac
  shift
done

if [ "$compare_only" = 0 ]; then
  bash apps/mobile/scripts/e2e.sh --pictures "$run" "${e2e_args[@]}"
  rm -rf "$here"
  mkdir -p "$here"
  find "$run" -path '*takeScreenshot*' -name '*.png' -exec cp {} "$here/" \;
fi
count="$(find "$here" -maxdepth 1 -name '*.png' | wc -l)"
[ "$count" -gt 0 ] || {
  echo "Flödena sparade inga bilder." >&2
  exit 1
}

if [ "$branch" = master ] || [ "$save_base" = 1 ]; then
  if [ "$here" != "$base" ]; then
    rm -rf "$base"
    cp -r "$here" "$base"
  fi
  echo "Sparade $count bilder som jämförelse."
  exit 0
fi

[ -d "$base" ] || {
  echo "Det finns inga bilder från master att jämföra med. Kör mise run pictures på master först." >&2
  exit 1
}

rows=""
changed=0
for after in "$here"/*.png; do
  name="$(basename "$after" .png)"
  before="$base/$name.png"
  magick "$after" -resize 360x -quality 75 "$here/$name-after.jpg"
  after_img="data:image/jpeg;base64,$(base64 -w0 "$here/$name-after.jpg")"
  if [ -f "$before" ]; then
    fraction="$(magick "$before" "$after" -resize 270x -compose difference -composite -colorspace gray -threshold 3% -format '%[fx:mean]' info: 2>/dev/null || echo 1)"
    percent="$(awk -v f="$fraction" 'BEGIN { printf "%.2f", f * 100 }')"
    magick "$before" -resize 360x -quality 75 "$here/$name-before.jpg"
    before_cell="<img src=\"data:image/jpeg;base64,$(base64 -w0 "$here/$name-before.jpg")\" alt=\"$name före\">"
    if awk -v p="$percent" 'BEGIN { exit !(p >= 0.1) }'; then
      status="Ändrad $percent %"
      tone="changed"
      changed=$((changed + 1))
    else
      status="Samma"
      tone="same"
    fi
  else
    before_cell="<div class=\"empty\">Ny skärm</div>"
    status="Ny"
    tone="changed"
    changed=$((changed + 1))
  fi
  rows+="<section class=\"$tone\"><h2>$name <span>$status</span></h2><div class=\"pair\"><figure>$before_cell<figcaption>master</figcaption></figure><figure><img src=\"$after_img\" alt=\"$name efter\"><figcaption>$branch</figcaption></figure></div></section>"
done

for before in "$base"/*.png; do
  name="$(basename "$before" .png)"
  [ -f "$here/$name.png" ] && continue
  rows+="<section class=\"changed\"><h2>$name <span>Saknas</span></h2><p>Skärmen fanns på master men inte i den här körningen.</p></section>"
  changed=$((changed + 1))
done

cat >"$page" <<EOF
<!doctype html>
<html lang="sv">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bildkoll $branch</title>
<style>
:root { --bg: #0f1422; --card: #171b23; --line: #2a3142; --fg: #e9edf6; --muted: #9aa5bd; --warn: #f0bb55; --ok: #5fd197; color-scheme: dark; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.5 Inter, system-ui, sans-serif; }
main { max-width: 860px; margin: 0 auto; padding: 24px 16px 64px; display: grid; gap: 20px; }
h1 { margin: 0; font-size: 26px; }
p { margin: 0; color: var(--muted); }
section { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 16px; display: grid; gap: 12px; }
section.same { opacity: 0.6; }
h2 { margin: 0; font-size: 17px; display: flex; gap: 10px; align-items: baseline; }
h2 span { font-size: 13px; font-weight: 700; color: var(--ok); }
.changed h2 span { color: var(--warn); }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
figure { margin: 0; display: grid; gap: 6px; }
img { width: 100%; border-radius: 10px; border: 1px solid var(--line); }
figcaption { font-size: 12px; color: var(--muted); }
.empty { aspect-ratio: 1080 / 2340; border: 1px dashed var(--line); border-radius: 10px; display: grid; place-items: center; color: var(--muted); }
</style>
<main>
<h1>Bildkoll: $branch</h1>
<p>$changed av $count skärmar skiljer sig från master. Ändrade först, samma längst ner. Kartan ritas om varje gång och tiderna i chatten följer klockan, så de skiljer sig alltid lite: titta på dem själv.</p>
$rows
</main>
</html>
EOF

python3 -I - "$page" <<'PY'
import re, sys
path = sys.argv[1]
html = open(path, encoding="utf-8").read()
blocks = re.findall(r'<section class="(?:changed|same)">.*?</section>', html, flags=re.S)
ordered = [b for b in blocks if b.startswith('<section class="changed"')] + [b for b in blocks if b.startswith('<section class="same"')]
start = html.index(blocks[0])
end = html.index(blocks[-1]) + len(blocks[-1])
open(path, "w", encoding="utf-8").write(html[:start] + "".join(ordered) + html[end:])
PY

echo "$changed av $count skärmar skiljer sig från master."
echo "Sidan: $page"
