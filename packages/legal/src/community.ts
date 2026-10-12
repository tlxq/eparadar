import { CONTACT_EMAIL, type LegalDocument } from './types';

export const communityRules: LegalDocument = {
  title: 'Communityregler',
  updated: '12 oktober 2026',
  intro: ['epaRadar ska vara ett ställe där alla känner sig trygga. Det här gäller för alla.'],
  sections: [
    {
      heading: 'Var schysst',
      blocks: [
        [
          'Ingen mobbning, inga hot och inga trakasserier.',
          'Inget hat mot någon för vem de är, till exempel kön, ursprung, religion, sexualitet eller funktionsnedsättning.',
          'Inga nakenbilder eller sexuellt innehåll, och tjata aldrig på någon om bilder.',
        ],
      ],
    },
    {
      heading: 'Var trygg',
      blocks: [
        [
          'Dela aldrig någon annans plats, adress eller nummer utan att de vill det.',
          'Lägg inte upp bilder på andra som de inte är okej med.',
          'Träffas på platser där det finns fler människor, och säg till någon vart du åker.',
        ],
      ],
    },
    {
      heading: 'Kör lagligt',
      blocks: [
        [
          'Ingen uppmaning till farlig körning, race på allmän väg eller trimning som är olaglig.',
          'Använd inte appen medan du kör.',
          'Varningar på kartan ska vara riktiga, inte skämt.',
        ],
      ],
    },
    {
      heading: 'Inget fusk',
      blocks: [
        [
          'Låtsas inte vara någon annan och skapa inte flera konton.',
          'Ingen spam, reklam eller bedrägerier.',
          'Inget som är olagligt, till exempel droger, vapen eller stulna saker.',
        ],
      ],
    },
    {
      heading: 'Om något händer',
      blocks: [
        'Tryck på … eller håll inne på innehållet och välj Rapportera, eller öppna personen och välj Rapportera eller Blockera. Den du blockerar kan inte se dig, din plats eller skriva till dig, och får inget besked om det.',
        `Är det akut, ring 112. Behöver du prata med någon kan du ringa BRIS på 116 111. Du kan alltid mejla oss på ${CONTACT_EMAIL}.`,
        'Den som bryter mot reglerna kan få innehåll borttaget eller kontot avstängt.',
      ],
    },
  ],
};
