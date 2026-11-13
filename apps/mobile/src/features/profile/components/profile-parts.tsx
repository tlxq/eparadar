import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { CarPhoto } from '@/components/car-photo';
import { IconButton } from '@/components/icon-button';
import { Skeleton } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { updateProfile, type Car, type Profile } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';
import { FormSheet } from '@/components/form-sheet';
import { Common } from '@/constants/strings';
import { carColorHex } from '@/features/map/car-colors';
import { hasProfileChanges } from '@/features/profile/profile-changes';

export const CAR_CARD_WIDTH = 160;

export function carName(car: Pick<Car, 'nickname' | 'make' | 'model'>) {
  return car.nickname ?? `${car.make} ${car.model}`;
}

type CarCardProps = {
  car: Car;
  onPress: () => void;
  onMore?: () => void;
  width?: number;
};

export function CarCard({ car, onPress, onMore, width = CAR_CARD_WIDTH }: CarCardProps) {
  const theme = useTheme();
  const name = carName(car);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Visa ${name}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.carCard,
        { width, backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}
    >
      <CarPhoto imageUrl={car.photo_url} size={width} radius={0} />
      {onMore ? (
        <View style={styles.carMore}>
          <IconButton
            icon="ellipsis-horizontal"
            size={32}
            accessibilityLabel={`Fler val för ${name}`}
            onPress={onMore}
          />
        </View>
      ) : null}
      <View style={styles.carText}>
        <View style={styles.carTitle}>
          <View style={[styles.carDot, { backgroundColor: carColorHex(car.color) }]} />
          <ThemedText type="smallBold" numberOfLines={1} style={styles.flex}>
            {name}
          </ThemedText>
        </View>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {[`${car.make} ${car.model}`, car.year].filter(Boolean).join(' · ')}
        </ThemedText>
      </View>
    </Pressable>
  );
}

type StatProps = {
  value: number | undefined;
  label: (count: number) => string;
  onPress?: () => void;
  hint?: string;
};

export function Stat({ value, label, onPress, hint }: StatProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={value === undefined ? undefined : `${value} ${label(value)}`}
      accessibilityHint={hint}
      disabled={!onPress || value === undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stat,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}
    >
      {value === undefined ? (
        <Skeleton width={24} height={20} />
      ) : (
        <ThemedText type="subtitle" style={styles.statValue}>
          {value}
        </ThemedText>
      )}
      <ThemedText type="caption" themeColor="textSecondary">
        {label(value ?? 0)}
      </ThemedText>
    </Pressable>
  );
}

type EditProfileSheetProps = {
  profile: Profile;
  visible: boolean;
  onClose: () => void;
};

export function EditProfileSheet({ profile, visible, onClose }: EditProfileSheetProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed = hasProfileChanges(profile, { displayName, bio });

  async function handleSave() {
    if (!changed) return;
    if (!displayName.trim()) {
      setError('Skriv ett visningsnamn.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim() || null,
        avatarUrl: profile.avatar_url ?? undefined,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(profile.id) });
      showToast({ tone: 'success', message: 'Profilen är sparad.' });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormSheet
      title="Redigera profil"
      visible={visible}
      onClose={onClose}
      action={{ label: Common.save, onPress: handleSave, loading: saving, disabled: !changed }}
    >
      <TextField
        label="Användarnamn"
        value={`@${profile.username}`}
        editable={false}
        hint="Kan inte ändras"
        style={{ color: theme.textSecondary }}
      />
      <TextField
        label="Visningsnamn"
        value={displayName}
        onChangeText={setDisplayName}
        error={error}
        autoFocus
      />
      <TextField
        label="Bio"
        value={bio}
        onChangeText={setBio}
        placeholder="Vad kör du, var brukar du hänga?"
        multiline
        maxLength={160}
      />
      <ThemedText type="caption" themeColor="textSecondary" style={styles.counter}>
        {bio.length}/160
      </ThemedText>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
  },
  statValue: { fontVariant: ['tabular-nums'] },
  carCard: { borderRadius: Radius.lg, overflow: 'hidden' },
  carTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  carDot: { width: 10, height: 10, borderRadius: Radius.pill },
  flex: { flexShrink: 1 },
  pressed: { opacity: 0.8 },
  carText: { padding: Spacing.two + Spacing.half, gap: Spacing.half },
  carMore: { position: 'absolute', top: Spacing.one, right: Spacing.one },
  counter: { alignSelf: 'flex-end', marginTop: -Spacing.two },
});
