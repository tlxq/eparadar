import type { ComponentProps, ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Words } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { openPerson } from '@/store/person-sheet';

type IconName = ComponentProps<typeof Ionicons>['name'];

type DetailCreator = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type DetailRow = {
  icon: IconName;
  text: string;
  tone?: 'default' | 'success';
};

type DetailSummaryProps = {
  title: string;
  kindLabel: string;
  kindIcon: ReactNode;
  creator: DetailCreator | null;
  isMine: boolean;
  rows: DetailRow[];
  description?: string | null;
};

export function DetailSummary({
  title,
  kindLabel,
  kindIcon,
  creator,
  isMine,
  rows,
  description,
}: DetailSummaryProps) {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      <View style={[styles.kind, { backgroundColor: theme.backgroundSelected }]}>
        {kindIcon}
        <ThemedText type="smallBold">{kindLabel}</ThemedText>
      </View>

      <ThemedText type="title">{title}</ThemedText>

      {creator ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Visa ${isMine ? 'din profil' : creator.name}`}
          onPress={() => openPerson(creator.id)}
          style={styles.creator}
        >
          <Avatar name={creator.name} imageUrl={creator.avatarUrl} size={28} />
          <ThemedText type="smallBold">{isMine ? Words.you : creator.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            skapade den här
          </ThemedText>
        </Pressable>
      ) : null}

      <View style={styles.rows}>
        {rows.map((row) => (
          <View key={row.icon + row.text} style={styles.row}>
            <Ionicons
              name={row.icon}
              size={18}
              color={row.tone === 'success' ? theme.success : theme.textSecondary}
            />
            <ThemedText
              type="smallBold"
              themeColor={row.tone === 'success' ? 'success' : 'text'}
              style={styles.rowText}
            >
              {row.text}
            </ThemedText>
          </View>
        ))}
      </View>

      {description ? <ThemedText>{description}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.two },
  kind: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  creator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    minHeight: 44,
  },
  rows: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rowText: { flex: 1 },
});
