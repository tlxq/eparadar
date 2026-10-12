import { ActionSheet } from '@/components/action-sheet';
import { reportThanks } from '@/constants/strings';
import { REPORT_REASONS, reportContent, type ReportReason } from '@/features/moderation/api';
import { useBlockPerson } from '@/features/moderation/use-block-person';
import { getErrorMessage } from '@/lib/errors';
import { successHaptic } from '@/lib/haptics';
import { useReportSheetStore, type ReportTarget } from '@/store/report-sheet';
import { showToast } from '@/store/toast';

const TITLES: Record<ReportTarget['type'], string> = {
  post: 'Varför rapporterar du posten?',
  message: 'Varför rapporterar du meddelandet?',
  profile: 'Varför rapporterar du personen?',
  spot: 'Varför rapporterar du spotten?',
  spot_photo: 'Varför rapporterar du bilden?',
  meetup: 'Varför rapporterar du meeten?',
};

export function ReportSheetHost() {
  const target = useReportSheetStore((state) => state.target);
  const close = useReportSheetStore((state) => state.close);
  const blockPerson = useBlockPerson();

  async function submit(reported: ReportTarget, reason: ReportReason) {
    try {
      await reportContent({ type: reported.type, id: reported.id, reason });
      successHaptic();
      showToast({
        tone: 'success',
        message: reportThanks(reported.type === 'spot' ? null : reported.name),
      });
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
      return;
    }
    await blockPerson(reported.userId, reported.name, `Vill du också blockera ${reported.name}?`);
  }

  return (
    <ActionSheet
      visible={!!target}
      title={target ? TITLES[target.type] : undefined}
      onClose={close}
      actions={
        target
          ? REPORT_REASONS.map((reason) => ({
              label: reason.label,
              icon: reason.icon,
              onPress: () => submit(target, reason.key),
            }))
          : []
      }
    />
  );
}
