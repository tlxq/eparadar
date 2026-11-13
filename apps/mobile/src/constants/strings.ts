export const Common = {
  back: 'Tillbaka',
  block: 'Blockera',
  cancel: 'Avbryt',
  close: 'Stäng',
  done: 'Klar',
  more: 'Fler val',
  remove: 'Ta bort',
  report: 'Rapportera',
  retry: 'Försök igen',
  save: 'Spara',
  undo: 'Ångra',
} as const;

export const Words = {
  friends: 'Kompisar',
  addFriend: 'Lägg till kompis',
  radar: 'Radarn',
  startRadar: 'Starta radarn',
  place: 'Placera',
  placeOnMap: 'Placera på kartan',
  placedOnMap: 'Placerad på kartan',
  placePostOnMap: 'Placera posten på kartan',
  mapLoading: 'Kartan laddar…',
  mapFailed: 'Kartan laddar inte.',
  mapFailedHint: 'Kolla nätet och försök igen.',
  ragga: 'Häng',
  meet: 'Träff',
  talk: 'Snack',
  warning: 'Varning',
  vehicle: 'EPA',
  vehicles: 'EPA:or',
  addVehicle: 'Lägg till EPA',
  newPost: 'Ny post',
  postSomething: 'Posta något',
  creatorOfThis: 'Du skapade den här',
  you: 'Du',
  publishPost: 'Posta',
  myPosts: 'Dina poster',
  photo: '📷 Bild',
  sharedPost: '🔗 Post',
} as const;

export const Days = {
  today: 'i dag',
  tonight: 'i kväll',
  tomorrow: 'i morgon',
  yesterday: 'i går',
} as const;

export function sentenceStart(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function plural(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

export function countText(count: number, one: string, many: string) {
  return `${count} ${plural(count, one, many)}`;
}

export const Counts = {
  vehicles: (count: number) => plural(count, 'EPA', 'EPA:or'),
  friends: (count: number) => plural(count, 'kompis', 'kompisar'),
  posts: (count: number) => plural(count, 'post', 'poster'),
} as const;

export function blockedText(name: string | null) {
  return `${name ?? 'Hen'} kan inte längre se dig eller skriva till dig.`;
}

export function reportThanks(name?: string | null) {
  return name
    ? `Tack, vi kollar på det. ${name} får inte veta att du rapporterade.`
    : 'Tack, vi kollar på det. Ingen får veta att du rapporterade.';
}

export function loadError(thing: string) {
  return `${thing} gick inte att ladda. Kolla nätet och testa igen.`;
}
