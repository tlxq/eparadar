import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ScreenBackground } from '@/components/screen-background';
import { SkeletonList } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Common, loadError } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { REPORT_REASONS } from '@/features/moderation/api';
import {
  TARGET_LABELS,
  canRemove,
  useMarkHandled,
  useOpenReports,
  useRemoveReported,
  type AdminReport,
} from '@/features/moderation/admin';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { useQueryErrorToast } from '@/hooks/use-query-error-toast';
import { useTheme } from '@/hooks/use-theme';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { formatPostAge } from '@/lib/relative-time';
import { showToast } from '@/store/toast';

function reasonLabel(reason: string): string {
  return REPORT_REASONS.find((item) => item.key === reason)?.label ?? reason;
}

function ReportCard({ report }: { report: AdminReport }) {
  const theme = useTheme();
  const markHandled = useMarkHandled();
  const remove = useRemoveReported();
  const busy = markHandled.isPending || remove.isPending;

  function handle() {
    markHandled.mutate(report.id, {
      onSuccess: () => showToast({ message: 'Klart, rapporten är hanterad.' }),
      onError: (error) => showToast({ tone: 'error', message: getErrorMessage(error) }),
    });
  }

  async function removeContent() {
    const ok = await confirmDestructive({
      title: 'Ta bort innehållet?',
      message: 'Det försvinner för alla och går inte att ångra. Rapporten blir hanterad.',
      confirmLabel: Common.remove,
      icon: 'trash-outline',
    });
    if (!ok) return;
    remove.mutate(report.id, {
      onSuccess: (removed) =>
        showToast({
          message: removed
            ? 'Borta! Innehållet är borttaget.'
            : 'Det var redan borta, rapporten är hanterad.',
        }),
      onError: (error) => showToast({ tone: 'error', message: getErrorMessage(error) }),
    });
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.cardHeader}>
        <ThemedText type="smallBold" themeColor="brandOnSurface">
          {TARGET_LABELS[report.target_type] ?? report.target_type}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {formatPostAge(report.created_at)}
        </ThemedText>
      </View>
      <ThemedText type="headline">{reasonLabel(report.reason)}</ThemedText>
      {report.reported_username ? (
        <ThemedText type="small" themeColor="textSecondary">
          {report.reported_display_name} (@{report.reported_username})
        </ThemedText>
      ) : null}
      {report.snapshot ? (
        <View style={[styles.snapshot, { backgroundColor: theme.background }]}>
          <ThemedText type="small" selectable>
            {report.snapshot}
          </ThemedText>
        </View>
      ) : null}
      {report.details ? (
        <ThemedText type="small" themeColor="textSecondary">
          Kommentar: {report.details}
        </ThemedText>
      ) : null}
      <ThemedText type="caption" themeColor="textSecondary" selectable>
        Id: {report.target_id}
      </ThemedText>
      <View style={styles.actions}>
        <Button
          label="Hanterad"
          icon="checkmark"
          size="sm"
          variant="secondary"
          tone="success"
          disabled={busy}
          loading={markHandled.isPending}
          onPress={handle}
        />
        {canRemove(report.target_type) ? (
          <Button
            label="Ta bort innehållet"
            icon="trash-outline"
            size="sm"
            variant="ghost"
            tone="danger"
            disabled={busy}
            loading={remove.isPending}
            onPress={removeContent}
          />
        ) : null}
      </View>
    </View>
  );
}

export default function AdminScreen() {
  const { data, isPending, isError, refetch } = useOpenReports();
  const pull = usePullRefresh(refetch);
  useQueryErrorToast(isError && !!data, 'Rapporterna gick inte att uppdatera.', refetch);

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {isPending ? (
          <SkeletonList rows={4} style={styles.content} />
        ) : isError && !data ? (
          <ErrorState message={loadError('Rapporterna')} onRetry={refetch} />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} />
            }
            ListHeaderComponent={
              <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
                Öppna rapporter. Den rapporterade ser aldrig vem som rapporterade.
              </ThemedText>
            }
            ListEmptyComponent={
              <EmptyState
                icon="shield-checkmark-outline"
                title="Inga öppna rapporter"
                message="Allt är lugnt just nu!"
              />
            }
            renderItem={({ item }) => <ReportCard report={item} />}
          />
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  intro: { paddingHorizontal: Spacing.one },
  card: { borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.two },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  snapshot: { borderRadius: Radius.md, padding: Spacing.two },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
});
