import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export default function PrivacyScreen() {
  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Integritetspolicy
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Senast uppdaterad: 17 september 2026
          </ThemedText>
          <ThemedText type="default" style={styles.paragraph}>
            epaRadar är en community-app för ungdomar med EPA-traktorer. Här kan du skapa en profil,
            lägga till en bil, hitta vänner, chatta, delta i meetups och dela din plats med vänner.
          </ThemedText>
          <ThemedText type="subtitle" style={styles.heading}>
            Vilka uppgifter vi samlar in
          </ThemedText>
          <ThemedText type="default" style={styles.paragraph}>
            Vi behandlar uppgifter som behövs för appens funktioner och som du själv väljer att
            lämna: e-postadress och inloggningsuppgifter, födelseår (för att kontrollera att du är
            minst 15 år, syns bara för dig), visningsnamn, profiltext, profilbild,
            vänskaper och biluppgifter, inlägg, kommentarer, meddelanden, gruppmedlemskap, meetups,
            intressemarkeringar och frivilliga check-ins.
          </ThemedText>
          <ThemedText type="default" style={styles.paragraph}>
            På webbplatsens väntelista samlar vi in din e-postadress om du själv fyller i den.
          </ThemedText>
          <ThemedText type="subtitle" style={styles.heading}>
            Varför vi behandlar uppgifterna
          </ThemedText>
          <ThemedText type="default" style={styles.paragraph}>
            Uppgifterna används för att skapa och driva ditt konto, visa innehåll och vänskaper,
            leverera chat och meetups, visa din bilprofil, hålla appen säker och ge support.
          </ThemedText>
          <ThemedText type="subtitle" style={styles.heading}>
            Platsdelning
          </ThemedText>
          <ThemedText type="default" style={styles.paragraph}>
            Platsdelning är avstängd från början. När du aktiverar den kan dina accepterade vänner
            se din ungefärliga aktuella position på kartan. Platsen delas aldrig offentligt och
            skickas inte till andra användare som du inte är vän med. Bakgrundsplats används bara
            när du har gett telefonen den behörigheten och aktiverat platsdelning i appen.
          </ThemedText>
          <ThemedText type="default" style={styles.paragraph}>
            Du kan stänga av delningen i Inställningar eller återkalla telefonens behörighet när du
            vill. Appen visar en notis medan bakgrundsdelningen är aktiv.
          </ThemedText>
          <ThemedText type="subtitle" style={styles.heading}>
            Vem som har tillgång
          </ThemedText>
          <ThemedText type="default" style={styles.paragraph}>
            Dina profiluppgifter, inlägg, kommentarer och meddelanden visas enligt appens
            behörighetsregler för de personer och grupper som funktionen kräver. Inlägg visas bara
            för dina vänner, och nya chattar kan bara startas mellan vänner. Platsdata visas bara
            för dina vänner när platsdelning är på. Vi säljer inte personuppgifter och delar dem
            inte för annonsering.
          </ThemedText>
          <ThemedText type="subtitle" style={styles.heading}>
            Var uppgifterna lagras
          </ThemedText>
          <ThemedText type="default" style={styles.paragraph}>
            Uppgifter lagras hos Supabase i deras EU-region (eu-west-1, Irland). Profilbilder lagras
            i Supabase Storage. Vi använder Resend för e-post från väntelistan.
          </ThemedText>
          <ThemedText type="subtitle" style={styles.heading}>
            Hur länge vi sparar uppgifterna
          </ThemedText>
          <ThemedText type="default" style={styles.paragraph}>
            Vi sparar kontouppgifter medan ditt konto finns kvar och raderar eller anonymiserar dem
            när kontot tas bort, om vi inte måste spara viss information enligt lag. Du kan radera
            ditt konto själv under Inställningar → Radera konto. Då tas din profil, dina inlägg,
            bilder, vänskaper, chattar och din plats bort direkt. Kontakta oss om du vill radera
            vissa uppgifter.
          </ThemedText>
          <ThemedText type="subtitle" style={styles.heading}>
            Minderåriga
          </ThemedText>
          <ThemedText type="default" style={styles.paragraph}>
            epaRadar riktar sig till ungdomar i EPA-traktorålder. Plats är privat som standard,
            delning kräver ett aktivt val och vänners plats visas bara inom vänskapen.
          </ThemedText>
          <ThemedText type="subtitle" style={styles.heading}>
            Dina rättigheter
          </ThemedText>
          <ThemedText type="default" style={styles.paragraph}>
            Du kan begära tillgång till, rättelse av eller radering av dina uppgifter och dra
            tillbaka samtycken när som helst. Kontakta contact@eparadar.se för frågor eller
            begäranden. Du kan också klaga hos Integritetsskyddsmyndigheten (IMY).
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.two,
  },
  title: { marginBottom: Spacing.half },
  heading: { marginTop: Spacing.two },
  paragraph: { lineHeight: 26 },
});
