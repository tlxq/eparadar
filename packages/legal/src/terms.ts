import { CONTACT_EMAIL, MINIMUM_AGE, type LegalDocument } from './types';

export const termsOfUse: LegalDocument = {
  title: 'Användarvillkor',
  updated: '12 oktober 2026',
  intro: [
    'De här villkoren gäller när du använder epaRadar. Genom att skapa ett konto godkänner du dem och våra communityregler.',
  ],
  sections: [
    {
      heading: 'Vem som får använda appen',
      blocks: [
        `Du måste vara minst ${MINIMUM_AGE} år. Du ska ange ditt riktiga födelseår och bara ha ett konto. Kontot är personligt, så dela inte ditt lösenord.`,
      ],
    },
    {
      heading: 'Ditt innehåll',
      blocks: [
        'Du äger det du lägger upp, till exempel inlägg, bilder och meddelanden. Du ger oss rätt att lagra och visa det för dem du delar det med, så länge det finns kvar i appen. Lägg bara upp sådant du har rätt att dela, och bilder på andra bara om de är okej med det.',
      ],
    },
    {
      heading: 'Regler',
      blocks: [
        'Du ska följa våra communityregler och svensk lag. Använd aldrig appen när du kör: titta inte på kartan och skriv inga meddelanden bakom ratten.',
      ],
    },
    {
      heading: 'Rapporter och avstängning',
      blocks: [
        'Du kan rapportera innehåll och personer i appen. Vi går igenom rapporter och kan ta bort innehåll, varna eller stänga av konton som bryter mot reglerna. Vid allvarliga brott, till exempel hot eller sexuellt innehåll som rör barn, kan vi kontakta polisen.',
      ],
    },
    {
      heading: 'Tjänsten',
      blocks: [
        'epaRadar är ett skolprojekt och erbjuds som den är, utan garantier. Positioner och varningar kan vara fel eller gamla, så lita alltid på det du själv ser i trafiken. Vi kan ändra, pausa eller lägga ner appen.',
      ],
    },
    {
      heading: 'Avsluta',
      blocks: [
        'Du kan radera ditt konto när du vill i appen under Inställningar → Radera konto. Då raderas din profil och ditt innehåll enligt vår integritetspolicy.',
      ],
    },
    {
      heading: 'Ändringar och kontakt',
      blocks: [
        `Om vi ändrar villkoren uppdaterar vi datumet högst upp och berättar om större ändringar i appen. Frågor? Mejla ${CONTACT_EMAIL}.`,
      ],
    },
  ],
};
