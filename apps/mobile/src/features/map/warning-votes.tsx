import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  fetchWarningVotes,
  voteOnWarning,
  WARNING_CLEAR_VOTES,
  type WarningVotes,
} from '@/features/map/spots';
import { getErrorMessage } from '@/lib/errors';
import { successHaptic } from '@/lib/haptics';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';

export function useWarningVote(spotId: string, onDone?: () => void) {
  const queryClient = useQueryClient();
  const votes = useQuery({
    queryKey: queryKeys.warningVotes(spotId),
    queryFn: () => fetchWarningVotes(spotId),
  });

  const vote = useMutation({
    mutationFn: (gone: boolean) => voteOnWarning(spotId, gone),
    onSuccess: (result, gone) => {
      successHaptic();
      queryClient.setQueryData<WarningVotes>(queryKeys.warningVotes(spotId), {
        stillThere: result.stillThere,
        gone: result.gone,
        myVote: gone,
      });
      if (result.cleared) queryClient.invalidateQueries({ queryKey: queryKeys.spots() });
      showToast({
        tone: 'success',
        message: result.cleared
          ? 'Varningen är borta från kartan. Tack för hjälpen!'
          : gone
            ? `Tack! ${result.gone} av ${WARNING_CLEAR_VOTES} säger att den är borta.`
            : 'Tack! Varningen ligger kvar.',
      });
      onDone?.();
    },
    onError: (error) => {
      showToast({ tone: 'error', message: getErrorMessage(error) });
      queryClient.invalidateQueries({ queryKey: queryKeys.spots() });
    },
  });

  return { votes: votes.data, vote };
}

function votesText(votes: WarningVotes | undefined): string {
  if (!votes || (votes.stillThere === 0 && votes.gone === 0)) {
    return `Ingen har svarat än. ${WARNING_CLEAR_VOTES} "borta" tar bort den.`;
  }
  const parts = [];
  if (votes.stillThere > 0) parts.push(`${votes.stillThere} säger finns kvar`);
  if (votes.gone > 0) parts.push(`${votes.gone} av ${WARNING_CLEAR_VOTES} säger borta`);
  return parts.join(' · ');
}

type WarningVoteButtonsProps = {
  myVote: boolean | null | undefined;
  busy: boolean;
  onVote: (gone: boolean) => void;
};

export function WarningVoteButtons({ myVote, busy, onVote }: WarningVoteButtonsProps) {
  return (
    <View style={styles.row}>
      <View style={styles.cell}>
        <Button
          label="Finns kvar"
          icon={myVote === false ? 'checkmark-circle' : 'checkmark-circle-outline'}
          size="sm"
          variant={myVote === false ? 'primary' : 'secondary'}
          disabled={busy}
          onPress={() => onVote(false)}
        />
      </View>
      <View style={styles.cell}>
        <Button
          label="Borta nu"
          icon={myVote === true ? 'close-circle' : 'close-circle-outline'}
          size="sm"
          variant={myVote === true ? 'primary' : 'secondary'}
          disabled={busy}
          onPress={() => onVote(true)}
        />
      </View>
    </View>
  );
}

export function WarningVoteSection({ spotId }: { spotId: string }) {
  const { votes, vote } = useWarningVote(spotId);
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">Är den kvar?</ThemedText>
      <WarningVoteButtons
        myVote={votes?.myVote}
        busy={vote.isPending}
        onVote={(gone) => vote.mutate(gone)}
      />
      <ThemedText type="caption" themeColor="textSecondary">
        {votesText(votes)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  cell: { flex: 1 },
});
