import { useEffect, useRef } from 'react';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import {
  normalizeFriendCode,
  redeemFriendCode,
  type RedeemOutcome,
  type RedeemResult,
} from '@/features/friends/friend-code';
import { useTheme } from '@/hooks/use-theme';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { useUserId } from '@/hooks/use-user-id';
import { successHaptic } from '@/lib/haptics';

type Copy = {
  title: string;
  message: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  tone: 'success' | 'info' | 'error';
};

function copyFor(outcome: RedeemOutcome, name: string): Copy {
  switch (outcome) {
    case 'sent':
      return {
        title: `Förfrågan skickad till ${name}`,
        message: `Ni blir kompisar när ${name} accepterar.`,
        icon: 'checkmark',
        tone: 'success',
      };
    case 'accepted':
      return {
        title: `Du och ${name} är kompisar nu`,
        message: `${name} hade redan skickat en förfrågan till dig.`,
        icon: 'people',
        tone: 'success',
      };
    case 'already_sent':
      return {
        title: 'Förfrågan är redan skickad',
        message: `Ni blir kompisar när ${name} accepterar.`,
        icon: 'time-outline',
        tone: 'info',
      };
    case 'already_friends':
      return {
        title: `Du och ${name} är redan kompisar`,
        message: 'Ni hittar varandra under Kompisar.',
        icon: 'people',
        tone: 'info',
      };
    case 'own_code':
      return {
        title: 'Det där är din egen kod',
        message: 'Låt kompisen skanna den istället.',
        icon: 'person-circle-outline',
        tone: 'info',
      };
    case 'invalid':
      return {
        title: 'Koden har gått ut eller finns inte',
        message: 'Be kompisen visa en ny kod och försök igen.',
        icon: 'alert-circle-outline',
        tone: 'error',
      };
  }
}

export default function RedeemFriendCodeScreen() {
  const theme = useTheme();
  const { code: rawCode, via } = useLocalSearchParams<{ code: string; via?: string }>();
  const typed = via === 'typed';
  const userId = useUserId();
  const queryClient = useQueryClient();
  const started = useRef(false);

  const redeem = useMutation({
    mutationFn: (code: string) => redeemFriendCode(code),
    onSuccess: (result: RedeemResult) => {
      if (result.outcome === 'sent' || result.outcome === 'accepted') {
        successHaptic();
        queryClient.invalidateQueries({ queryKey: queryKeys.friends(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.friendRequests(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.outgoingRequests(userId) });
      }
    },
  });

  const { mutate } = redeem;

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mutate(normalizeFriendCode(rawCode ?? ''));
  }, [rawCode, mutate]);

  const result = redeem.data;
  const copy: Copy | null = result
    ? copyFor(result.outcome, result.display_name ?? 'kompisen')
    : redeem.isError
      ? {
          title: 'Det gick inte att lägga till',
          message: getErrorMessage(redeem.error),
          icon: 'alert-circle-outline',
          tone: 'error',
        }
      : null;

  const badgeColor =
    copy?.tone === 'success' ? theme.success : copy?.tone === 'error' ? theme.danger : theme.brand;
  const failed = copy?.tone === 'error';

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.body} accessibilityLiveRegion="polite">
          {!copy ? (
            <>
              <ActivityIndicator color={theme.brandOnSurface} size="large" />
              <ThemedText themeColor="textSecondary">Lägger till…</ThemedText>
            </>
          ) : (
            <>
              <View>
                {result?.user_id ? (
                  <Avatar
                    name={result.display_name ?? '?'}
                    imageUrl={result.avatar_url}
                    size={96}
                  />
                ) : (
                  <View style={[styles.iconTile, { backgroundColor: theme.backgroundElement }]}>
                    <Ionicons name={copy.icon} size={40} color={badgeColor} />
                  </View>
                )}
                {result?.user_id ? (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: badgeColor, borderColor: theme.background },
                    ]}
                  >
                    <Ionicons name={copy.icon} size={16} color={theme.background} />
                  </View>
                ) : null}
              </View>
              <ThemedText type="subtitle" style={styles.center} accessibilityRole="header">
                {copy.title}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.center}>
                {copy.message}
              </ThemedText>
            </>
          )}
        </View>
        <View style={styles.footer}>
          {failed ? (
            <Button
              label={typed ? 'Skriv in igen' : 'Skanna igen'}
              icon={typed ? 'keypad-outline' : 'scan-outline'}
              onPress={() => router.replace(typed ? '/friends/enter-code' : '/friends/scan')}
            />
          ) : null}
          <Button
            label="Klar"
            variant={failed ? 'secondary' : 'primary'}
            disabled={!copy}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/friends'))}
          />
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  iconTile: {
    width: 96,
    height: 96,
    borderRadius: Radius.xl + Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  footer: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two, gap: Spacing.two },
});
