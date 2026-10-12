import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { FormSheet } from '@/components/form-sheet';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { reportThanks } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { REPORT_REASONS, reportContent, type ReportReason } from '@/features/moderation/api';
import { useBlockPerson } from '@/features/moderation/use-block-person';
import { useTheme } from '@/hooks/use-theme';
import { getErrorMessage } from '@/lib/errors';
import { successHaptic } from '@/lib/haptics';
import { useReportSheetStore, type ReportTarget } from '@/store/report-sheet';
import { showToast } from '@/store/toast';

const CLOSE_DELAY_MS = 400;

const TITLES: Record<ReportTarget['type'], string> = {
  post: 'Varför rapporterar du posten?',
  message: 'Varför rapporterar du meddelandet?',
  profile: 'Varför rapporterar du personen?',
  spot: 'Varför rapporterar du spotten?',
  spot_photo: 'Varför rapporterar du bilden?',
  meetup: 'Varför rapporterar du meeten?',
  status: 'Varför rapporterar du statusen?',
  conversation: 'Varför rapporterar du gruppens namn eller bild?',
};

export function ReportSheetHost() {
  const target = useReportSheetStore((state) => state.target);
  const close = useReportSheetStore((state) => state.close);
  const blockPerson = useBlockPerson();

  function offerBlock(reported: ReportTarget) {
    const userId = reported.userId;
    if (!userId) return;
    setTimeout(() => {
      blockPerson(
        userId,
        reported.name,
        reported.name
          ? `Vill du också blockera ${reported.name}?`
          : `Vill du också blockera den som ${reported.type === 'spot' ? 'placerade spotten' : 'la upp bilden'}?`,
      );
    }, CLOSE_DELAY_MS);
  }

  if (!target) return null;
  return (
    <ReportSheet
      key={`${target.type}:${target.id}`}
      target={target}
      onClose={close}
      onSent={offerBlock}
    />
  );
}

function ReportSheet({
  target,
  onClose,
  onSent,
}: {
  target: ReportTarget;
  onClose: () => void;
  onSent: (target: ReportTarget) => void;
}) {
  const theme = useTheme();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const needsText = reason === 'annat';
  const canSend = !!reason && (!needsText || !!details.trim()) && !sending;

  async function submit() {
    if (!reason) return;
    setSending(true);
    try {
      await reportContent({
        type: target.type,
        id: target.id,
        reason,
        details: details.trim() || undefined,
      });
    } catch (error) {
      setSending(false);
      showToast({ tone: 'error', message: getErrorMessage(error) });
      return;
    }
    successHaptic();
    onClose();
    showToast({ tone: 'success', message: reportThanks(target.name) });
    onSent(target);
  }

  return (
    <FormSheet
      title="Rapportera"
      onClose={onClose}
      gap="two"
      action={{ label: 'Skicka', onPress: submit, loading: sending, disabled: !canSend }}
    >
      <ThemedText type="headline">{TITLES[target.type]}</ThemedText>
      <View accessibilityRole="radiogroup" style={styles.reasons}>
        {REPORT_REASONS.map((item) => {
          const selected = reason === item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => setReason(item.key)}
              style={({ pressed }) => [
                styles.reason,
                {
                  backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                  borderColor: selected ? theme.brand : 'transparent',
                },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name={item.icon} size={20} color={theme.text} />
              <ThemedText type="headline" style={styles.reasonLabel}>
                {item.label}
              </ThemedText>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selected ? theme.brand : theme.textSecondary}
              />
            </Pressable>
          );
        })}
      </View>
      {reason ? (
        <TextField
          label={needsText ? 'Vad är det som är fel?' : 'Vill du berätta mer? (valfritt)'}
          placeholder="Skriv här…"
          value={details}
          onChangeText={setDetails}
          multiline
          maxLength={500}
          autoFocus={needsText}
        />
      ) : null}
      <ThemedText type="caption" themeColor="textSecondary">
        {target.name
          ? `${target.name} får inte veta att du rapporterade.`
          : 'Ingen får veta att du rapporterade.'}
      </ThemedText>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  reasons: { gap: Spacing.two, paddingVertical: Spacing.two },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 2,
  },
  reasonLabel: { flex: 1 },
  pressed: { opacity: 0.7 },
});
