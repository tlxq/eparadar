export const Common = {
  back: 'Tillbaka',
  block: 'Blockera',
  cancel: 'Avbryt',
  close: 'Stäng',
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
  ragga: 'Ragga',
  meet: 'Meet',
  warning: 'Varning',
  vehicle: 'EPA',
  vehicles: 'EPA:or',
  addVehicle: 'Lägg till EPA',
  newPost: 'Ny post',
  publishPost: 'Posta',
  myPosts: 'Dina poster',
  photo: '📷 Bild',
} as const;

export function blockedText(name: string | null) {
  return `${name ?? 'Hen'} kan inte längre se dig eller skriva till dig.`;
}

export function reportThanks(name?: string | null) {
  return name
    ? `Tack, vi kollar på det. ${name} får inte veta att du rapporterade.`
    : 'Tack, vi kollar på det. Ingen får veta att du rapporterade.';
}
