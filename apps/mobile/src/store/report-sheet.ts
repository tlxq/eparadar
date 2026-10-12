import { create } from 'zustand';

import type { ReportTargetType } from '@/features/moderation/api';

export type ReportTarget = {
  type: ReportTargetType;
  id: string;
  userId: string;
  name: string;
};

type ReportSheetState = {
  target: ReportTarget | null;
  close: () => void;
};

export const useReportSheetStore = create<ReportSheetState>((set) => ({
  target: null,
  close: () => set({ target: null }),
}));

export function openReport(target: ReportTarget) {
  useReportSheetStore.setState({ target });
}
