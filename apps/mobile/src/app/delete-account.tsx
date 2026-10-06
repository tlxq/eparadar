import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/button';
import { KeyboardAvoider } from '@/components/keyboard-avoider';
import { ScreenBackground } from '@/components/screen-background';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteAccount } from '@/lib/api';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { stopLocationSharingQuietly } from '@/lib/location-task';
import { showToast } from '@/store/toast';

const WHAT_GOES = [
  'Din profil, profilbild och dina bilar',
  'Alla dina inlägg och bilder',
  'Dina vänskaper och din plats på kartan',
  'Dina 1:1-chattar, och du lämnar alla gruppchattar',
  'Träffar du har skapat',
];

export default function DeleteAccountScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setError(null);
    const ok = await confirmDestructive({
      title: 'Radera kontot för alltid?',
      message: 'Det här går inte att ångra.',
      confirmLabel: 'Radera',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await stopLocationSharingQuietly();
      await deleteAccount(password);
      queryClient.clear();
      showToast({ message: 'Ditt konto är raderat.' });
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoider style={styles.container}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={[styles.icon, { backgroundColor: `${theme.danger}1F` }]}>
              <Ionicons name="warning-outline" size={32} color={theme.danger} />
            </View>
            <ThemedText type="subtitle">Radera ditt konto</ThemedText>
            <ThemedText themeColor="textSecondary">
              Allt det här tas bort direkt och kan inte återställas:
            </ThemedText>
            <View style={[styles.list, { backgroundColor: theme.backgroundElement }]}>
              {WHAT_GOES.map((item) => (
                <View key={item} style={styles.listRow}>
                  <Ionicons name="close-circle" size={18} color={theme.danger} />
                  <ThemedText style={styles.flex}>{item}</ThemedText>
                </View>
              ))}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              Meddelanden du har skickat i gruppchattar försvinner också.
            </ThemedText>
            <TextField
              label="Lösenord"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              error={error}
              onSubmitEditing={() => password && handleDelete()}
            />
            <Button
              label="Radera mitt konto"
              icon="trash-outline"
              tone="danger"
              loading={busy}
              disabled={!password}
              onPress={handleDelete}
            />
          </ScrollView>
        </KeyboardAvoider>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.two },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
