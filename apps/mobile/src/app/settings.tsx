import { useCallback, useState, type ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { Linking, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { ScreenBackground } from '@/components/screen-background';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { SectionLabel } from '@/components/section-label';
import { Spacing } from '@/constants/theme';
import { CONTACT_EMAIL } from '@eparadar/legal';
import { setLocationApproximate, setLocationSharing, signOut } from '@/lib/api';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { stopLocationSharing, stopLocationSharingQuietly } from '@/lib/location-task';
import { queryKeys } from '@/lib/query-keys';
import { useMyLocation } from '@/features/map/hooks';
import { BlockedSection } from '@/features/friends/components/blocked-section';
import { showSharingFailure, useSharingToggle } from '@/features/map/use-sharing-toggle';
import { useUserId } from '@/hooks/use-user-id';
import { shareMyData } from '@/features/profile/export';
import { NotificationSection } from '@/features/profile/components/notification-section';
import {
  InfoRow,
  LinkRow,
  SettingsGroup,
  SwitchRow,
} from '@/features/profile/components/settings-rows';
import { useIsAdmin } from '@/features/moderation/admin';
import { showToast } from '@/store/toast';

const APP_VERSION = Constants.expoConfig?.version ?? '–';

const HELP_LINKS: {
  href: '/privacy' | '/terms' | '/community';
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}[] = [
  { href: '/community', label: 'Communityregler', icon: 'people-outline' },
  { href: '/terms', label: 'Användarvillkor', icon: 'document-text-outline' },
  { href: '/privacy', label: 'Integritetspolicy', icon: 'shield-checkmark-outline' },
];

export default function SettingsScreen() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const { setSharing, busy } = useSharingToggle();
  const { data: isAdmin } = useIsAdmin();
  const [error, setError] = useState<string | null>(null);

  const { data: location, refetch, isPending: locationLoading } = useMyLocation();
  const sharingEnabled = location?.sharing_enabled ?? false;
  const approximateEnabled = location?.approximate_enabled ?? false;
  const [approximateBusy, setApproximateBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId || !sharingEnabled) return;
      Location.getForegroundPermissionsAsync().then(async (permission) => {
        if (permission.status !== 'granted') {
          await stopLocationSharing();
          await setLocationSharing(userId, false);
          setError('Platsen är avstängd i telefonens inställningar, så delningen är av nu.');
          refetch();
          return;
        }
        const background = await Location.getBackgroundPermissionsAsync();
        if (background.status !== 'granted') await stopLocationSharingQuietly();
      });
    }, [userId, sharingEnabled, refetch]),
  );

  async function handleToggle(value: boolean) {
    setError(null);
    const failure = await setSharing(value);
    if (failure) showSharingFailure(failure);
  }

  async function handleApproximateToggle(value: boolean) {
    if (!userId) return;
    setError(null);
    setApproximateBusy(true);
    try {
      await setLocationApproximate(userId, value);
      queryClient.invalidateQueries({ queryKey: queryKeys.myLocation(userId) });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setApproximateBusy(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await shareMyData();
    } catch (err) {
      showToast({ tone: 'error', message: getErrorMessage(err) });
    } finally {
      setExporting(false);
    }
  }

  function handleContact() {
    Linking.openURL(`mailto:${CONTACT_EMAIL}`).catch(() =>
      showToast({ message: `Mejla oss på ${CONTACT_EMAIL}!` }),
    );
  }

  async function handleSignOut() {
    const ok = await confirmDestructive({
      title: 'Logga ut?',
      message: 'Du kan logga in igen när du vill.',
      confirmLabel: 'Logga ut',
      icon: 'log-out-outline',
    });
    if (!ok) return;
    await stopLocationSharingQuietly();
    await signOut();
  }

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScreenHeader title="Inställningar" />
        <ScrollView contentContainerStyle={styles.content}>
          <SectionLabel style={styles.sectionLabel}>Plats</SectionLabel>
          <SettingsGroup>
            <SwitchRow
              testID="sharing-toggle"
              title="Dela min plats"
              hint="Bara dina kompisar ser dig. Av = spökläge."
              loading={locationLoading}
              value={sharingEnabled}
              onValueChange={handleToggle}
              disabled={busy}
            />
            <SwitchRow
              testID="approximate-toggle"
              title="Ungefärlig plats"
              hint="Visar ett område på ca 300 m."
              loading={locationLoading}
              value={approximateEnabled}
              onValueChange={handleApproximateToggle}
              disabled={!sharingEnabled || approximateBusy}
              dimmed={!sharingEnabled}
            />
          </SettingsGroup>
          {error ? <ThemedText type="error">{error}</ThemedText> : null}

          <SectionLabel style={styles.sectionLabel}>Aviseringar</SectionLabel>
          <NotificationSection />

          {isAdmin ? (
            <>
              <SectionLabel style={styles.sectionLabel}>Admin</SectionLabel>
              <SettingsGroup>
                <LinkRow
                  icon="shield-half-outline"
                  label="Rapporter"
                  chevron
                  onPress={() => router.push('/admin')}
                />
              </SettingsGroup>
            </>
          ) : null}

          <SectionLabel style={styles.sectionLabel}>Sekretess</SectionLabel>
          <BlockedSection>
            <LinkRow
              role="button"
              icon="download-outline"
              label={exporting ? 'Hämtar dina uppgifter …' : 'Ladda ner mina uppgifter'}
              busy={exporting}
              onPress={handleExport}
            />
          </BlockedSection>

          <SectionLabel style={styles.sectionLabel}>Hjälp</SectionLabel>
          <SettingsGroup>
            <LinkRow icon="mail-outline" label="Kontakta oss" onPress={handleContact} />
            {HELP_LINKS.map((link) => (
              <LinkRow
                key={link.href}
                icon={link.icon}
                label={link.label}
                chevron
                onPress={() => router.push(link.href)}
              />
            ))}
            <InfoRow icon="information-circle-outline" label="Version" value={APP_VERSION} />
          </SettingsGroup>

          <SectionLabel style={styles.sectionLabel}>Konto</SectionLabel>
          <SettingsGroup>
            <LinkRow
              role="button"
              icon="log-out-outline"
              label="Logga ut"
              danger
              onPress={handleSignOut}
            />
            <LinkRow
              icon="trash-outline"
              label="Radera konto"
              danger
              chevron
              onPress={() => router.push('/delete-account')}
            />
          </SettingsGroup>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.five },
  sectionLabel: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
});
