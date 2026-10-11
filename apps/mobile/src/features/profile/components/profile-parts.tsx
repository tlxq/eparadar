import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
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

export const CAR_CARD_WIDTH = 160;

export function CarCard({ car, onMore }: { car: Car; onMore: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.carCard, { backgroundColor: theme.backgroundElement }]}>
      <CarPhoto imageUrl={car.photo_url} size={CAR_CARD_WIDTH} radius={0} />
      <View style={styles.carMore}>
        <IconButton
          icon="ellipsis-horizontal"
          size={32}
          accessibilityLabel={`Fler val för ${car.nickname ?? `${car.make} ${car.model}`}`}
          onPress={onMore}
        />
      </View>
      <View style={styles.carText}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {car.nickname ?? `${car.make} ${car.model}`}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {[`${car.make} ${car.model}`, car.year].filter(Boolean).join(' · ')}
        </ThemedText>
      </View>
    </View>
  );
}

export function Stat({ value, label }: { value: number | undefined; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
      {value === undefined ? (
        <Skeleton width={24} height={20} />
      ) : (
        <ThemedText type="subtitle" style={styles.statValue}>
          {value}
        </ThemedText>
      )}
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

type EditProfileSheetProps = {
  profile: Profile;
  visible: boolean;
  onClose: () => void;
};

export function EditProfileSheet({ profile, visible, onClose }: EditProfileSheetProps) {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!displayName.trim()) {
      setError('Skriv ett visningsnamn.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProfile(profile.id, {
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
      action={{ label: Common.save, onPress: handleSave, loading: saving }}
    >
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
  carCard: { width: CAR_CARD_WIDTH, borderRadius: Radius.lg, overflow: 'hidden' },
  carText: { padding: Spacing.two + Spacing.half, gap: Spacing.half },
  carMore: { position: 'absolute', top: Spacing.one, right: Spacing.one },
  counter: { alignSelf: 'flex-end', marginTop: -Spacing.two },
});
