import { Common } from '@/constants/strings';
import { useBlockPerson } from '@/features/moderation/use-block-person';
import { openReport, type ReportTarget } from '@/store/report-sheet';

type ModerationItem = {
  label: string;
  icon: 'flag-outline' | 'ban-outline';
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

type ModerationOptions = {
  report: ReportTarget;
  reportLabel?: string;
  blockLabel?: string;
  disabled?: boolean;
  blockOnly?: boolean;
  onBlocked?: () => void;
};

export function reportItem(
  report: ReportTarget,
  label: string = Common.report,
  disabled?: boolean,
): ModerationItem {
  return { label, icon: 'flag-outline', disabled, onPress: () => openReport(report) };
}

export function messageReportTarget(message: {
  id: string;
  sender_id: string;
  sender?: { display_name: string } | null;
}): ReportTarget {
  return {
    type: 'message',
    id: message.id,
    userId: message.sender_id,
    name: message.sender?.display_name ?? 'personen',
  };
}

export function buildModerationItems(
  options: ModerationOptions,
  blockPerson: (userId: string, name: string | null) => Promise<boolean>,
): ModerationItem[] {
  const { report, disabled } = options;
  const items: ModerationItem[] = options.blockOnly
    ? []
    : [reportItem(report, options.reportLabel, disabled)];
  const blockUserId = report.userId;
  if (blockUserId) {
    items.push({
      label: options.blockLabel ?? Common.block,
      icon: 'ban-outline',
      destructive: true,
      disabled,
      onPress: async () => {
        if (await blockPerson(blockUserId, report.name)) options.onBlocked?.();
      },
    });
  }
  return items;
}

export function useModerationItems() {
  const blockPerson = useBlockPerson();
  return (options: ModerationOptions) => buildModerationItems(options, blockPerson);
}
