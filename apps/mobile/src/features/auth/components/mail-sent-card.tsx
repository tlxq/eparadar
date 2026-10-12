import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function MailSentCard({ email, action }: { email: string; action: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.icon, { backgroundColor: theme.brand }]}>
        <Ionicons name="mail-unread-outline" size={22} color={theme.brandText} />
      </View>
      <View style={styles.text}>
        <ThemedText type="small" themeColor="textSecondary">
          Vi skickade ett mejl till
        </ThemedText>
        <ThemedText type="headline" selectable>
          {email}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {action} Hittar du inget? Kolla skräpposten.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: Spacing.one },
});
