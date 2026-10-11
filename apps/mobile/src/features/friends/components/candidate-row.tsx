import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';

type CandidateRowProps = {
  displayName: string;
  avatarUrl: string | null;
  topLine?: string;
  subLine?: string;
  buttonVariant?: 'primary' | 'secondary';
  onAdd: () => void;
  sending: boolean;
  sent: boolean;
};

export function CandidateRow({
  displayName,
  avatarUrl,
  topLine,
  subLine,
  buttonVariant = 'secondary',
  onAdd,
  sending,
  sent,
}: CandidateRowProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <Avatar name={displayName} imageUrl={avatarUrl} size={44} />
      <View style={styles.text}>
        {topLine ? (
          <ThemedText type="small" themeColor="brandOnSurface">
            {topLine}
          </ThemedText>
        ) : null}
        <ThemedText type="headline">{displayName}</ThemedText>
        {subLine ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subLine}
          </ThemedText>
        ) : null}
      </View>
      {sent ? (
        <ThemedText type="smallBold" themeColor="success">
          Skickad
        </ThemedText>
      ) : (
        <Button
          label="Lägg till"
          size="sm"
          variant={buttonVariant}
          loading={sending}
          onPress={onAdd}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  text: { flex: 1, gap: Spacing.half },
});
