export const MAP_LABEL_SCRIPT = `
function agoText(ms) {
  var min = Math.floor(ms / 60000);
  if (min < 60) return min + ' min sedan';
  var h = Math.floor(min / 60);
  return h < 24 ? h + ' h sedan' : 'över ett dygn sedan';
}
function shortStatus(text, max) {
  var t = String(text == null ? '' : text).replace(/\\s+/g, ' ').trim();
  if (t.length <= max) return t;
  var head = t.slice(0, max + 1);
  var space = head.lastIndexOf(' ');
  var cut = space > max * 0.5 ? head.slice(0, space) : t.slice(0, max);
  return cut.replace(/[\\s,.;:-]+$/, '') + '…';
}
function labelParts(name, ageMs, stale, driving) {
  var extra = stale ? agoText(ageMs) : driving ? 'kör' : '';
  return { name: String(name == null ? '' : name), extra: extra };
}
var PRIORITY = { me: 7, person: 6, spot: 5, meet: 4, drop: 3 };
function labelPriority(classNames) {
  var best = 0;
  String(classNames).split(/\\s+/).forEach(function (c) {
    if (PRIORITY[c] && PRIORITY[c] > best) best = PRIORITY[c];
  });
  return best;
}
function rectsOverlap(a, b, gap) {
  return a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom + gap && a.bottom + gap > b.top;
}
function hiddenLabels(items, obstacles, gap, sameNameReach) {
  var order = items.map(function (item, index) { return { item: item, index: index }; });
  order.sort(function (a, b) { return b.item.prio - a.item.prio || a.index - b.index; });
  var kept = [];
  var hidden = [];
  order.forEach(function (entry) {
    var item = entry.item;
    var blocked = obstacles.some(function (o) {
      return o.owner !== item.owner && rectsOverlap(item.rect, o.rect, 0);
    }) || kept.some(function (k) {
      if (rectsOverlap(item.rect, k.rect, gap)) return true;
      if (!item.name || item.name !== k.name) return false;
      var dx = (item.rect.left + item.rect.right - k.rect.left - k.rect.right) / 2;
      var dy = (item.rect.top + item.rect.bottom - k.rect.top - k.rect.bottom) / 2;
      return Math.hypot(dx, dy) < sameNameReach;
    });
    if (blocked) hidden.push(item.id);
    else kept.push(item);
  });
  return hidden;
}
`;
