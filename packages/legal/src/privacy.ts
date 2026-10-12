import { CONTACT_EMAIL, MINIMUM_AGE, type LegalDocument } from './types';

export const privacyPolicy: LegalDocument = {
  title: 'Integritetspolicy',
  updated: '12 oktober 2026',
  intro: [
    'Den här policyn beskriver hur epaRadar hanterar personuppgifter i mobilappen och på eparadar.se. epaRadar är en app för dig med EPA-traktor: du kan skapa en profil, visa upp din EPA, hitta kompisar, chatta, ordna meets och dela din plats med kompisar.',
  ],
  sections: [
    {
      heading: 'Vem som ansvarar',
      blocks: [
        `epaRadar är ett skolprojekt (examensarbete) som ännu inte drivs som ett registrerat bolag. Personuppgiftsansvarig är den som utvecklar epaRadar. Du når oss på ${CONTACT_EMAIL}.`,
      ],
    },
    {
      heading: 'Vem appen är till för',
      blocks: [
        `Du måste vara minst ${MINIMUM_AGE} år för att använda epaRadar. Vi frågar efter ditt födelseår när du skapar konto och sparar bara året. Många som använder appen är minderåriga, så allt som visar var du är är privat från början och delas bara med dina kompisar.`,
      ],
    },
    {
      heading: 'Vilka uppgifter vi behandlar',
      blocks: [
        [
          'Konto: e-postadress, lösenord (krypterat) och födelseår. Födelseåret syns bara för dig.',
          'Profil: visningsnamn, användarnamn, profiltext, profilbild och dina EPA:or med bilder.',
          'Kompisar: vilka du är kompis med, kompisförfrågningar, blockeringar och tillfälliga kompiskoder (QR).',
          'Innehåll: poster med bilder, chattmeddelanden, bilder i chatten, reaktioner och gruppchattar.',
          'Karta: din position, riktning och om du rör dig när platsdelning är på, din status, spots du placerar (Ragga och Varning) med bilder, meets du skapar, intresse och incheckningar.',
          'Radarn: din position i ungefär 20 sekunder medan du själv letar.',
          'Rapporter: när du rapporterar något sparar vi en kopia av innehållet, din anledning och det du skriver till oss.',
          'Teknik: en token för aviseringar, när du öppnar appen, och felrapporter om appen kraschar.',
        ],
        'På webbplatsens väntelista sparar vi din e-postadress om du själv fyller i den.',
      ],
    },
    {
      heading: 'Varför vi behandlar uppgifterna',
      blocks: [
        'För att driva ditt konto, visa ditt och dina kompisars innehåll, leverera chatt, karta och meets, skicka aviseringar, hålla appen säker, hantera rapporter och hitta fel.',
      ],
    },
    {
      heading: 'Rättslig grund',
      blocks: [
        'Det som behövs för att appen ska fungera grundar sig på avtalet med dig (våra användarvillkor). Platsdelning bygger på ditt samtycke, som du kan ta tillbaka när som helst. Åldersgräns, rapporter, blockering och felrapporter grundar sig på vårt berättigade intresse av att hålla appen trygg.',
      ],
    },
    {
      heading: 'Din plats',
      blocks: [
        [
          'Platsdelning är av från början och slås bara på om du själv väljer det.',
          'När den är på ser bara dina kompisar var du är, med exakt position. Du kan välja ungefärlig position i Inställningar.',
          'Bakgrundsplats används bara om du har gett telefonen den behörigheten och har platsdelning på. Telefonen visar då en avisering.',
          'Spots och meets du placerar på kartan syns bara för dina kompisar.',
          'Du stänger av delningen genom att trycka på dig själv på kartan eller i Inställningar.',
        ],
      ],
    },
    {
      heading: 'Hur länge vi sparar',
      blocks: [
        [
          'Din position: raderas efter 12 timmar utan uppdatering.',
          'Status: 1 timme. Varningar: 2 timmar. Ragga-spots och bilder på dem: 24 timmar.',
          'Träffar raderas ett dygn efter att de började, tillsammans med intresse och incheckningar.',
          'Radarn: 2 minuter.',
          'Konto, profil, poster och meddelanden: tills du tar bort dem eller raderar kontot.',
          'Rapporter: så länge vi behöver dem för att hantera ärendet.',
          'Väntelistan: tills lanseringsbeskedet har skickats eller du ber oss radera adressen.',
        ],
      ],
    },
    {
      heading: 'Vem som ser vad',
      blocks: [
        'Poster, spots, meets och din position syns bara för dina kompisar. Nya chattar kan bara startas mellan kompisar. Din profil (namn, användarnamn, profilbild och EPA:or) syns för andra inloggade användare så att ni kan hitta varandra. Ingenting syns för den som inte är inloggad. Vi säljer inte personuppgifter och använder dem inte för reklam.',
      ],
    },
    {
      heading: 'Leverantörer',
      blocks: [
        [
          'Supabase lagrar databas, bilder och inloggning i EU (Irland).',
          'Expo skickar aviseringar vidare till Google (Android) och Apple (iOS). Aviseringar för meddelanden innehåller bara avsändarens namn och, i grupper, gruppens namn, aldrig texten.',
          'Resend skickar e-post från väntelistan, mejl när du bekräftar din e-post eller byter lösenord, och rapporter till oss.',
          'Sentry tar emot felrapporter när appen eller webbplatsen kraschar.',
          'Kartan använder MapLibre (laddas från unpkg) och kartbilder från OpenFreeMap. De ser din IP-adress men inte vem du är.',
          'Webbplatsen laddar typsnittet Inter från Google Fonts och ligger hos Vercel.',
        ],
        'Leverantörerna behandlar uppgifterna åt oss enligt sina villkor och personuppgiftsbiträdesavtal. När uppgifter hanteras utanför EU sker det med EU:s standardavtalsklausuler.',
      ],
    },
    {
      heading: 'Dina rättigheter',
      blocks: [
        [
          'Ladda ner dina uppgifter i appen under Inställningar → Ladda ner mina uppgifter.',
          'Rätta uppgifter direkt i appen, eller be oss göra det.',
          'Radera ditt konto i appen under Inställningar → Radera konto, eller på eparadar.se/radera-konto.',
          'Ta tillbaka ditt samtycke till platsdelning när som helst.',
          'Klaga hos Integritetsskyddsmyndigheten (IMY) om du tycker att vi gör fel.',
        ],
        `Hör av dig till ${CONTACT_EMAIL} om du har frågor.`,
      ],
    },
    {
      heading: 'Webbplatsen',
      blocks: ['eparadar.se använder inga cookies och ingen spårning för reklam.'],
    },
    {
      heading: 'Ändringar',
      blocks: [
        'Om vi ändrar policyn uppdaterar vi datumet högst upp och berättar om större ändringar i appen.',
      ],
    },
  ],
};
