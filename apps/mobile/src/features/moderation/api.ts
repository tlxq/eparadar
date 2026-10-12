import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';

export type ReportTargetType =
  'post' | 'message' | 'profile' | 'spot' | 'spot_photo' | 'meetup' | 'status' | 'conversation';

export type ReportReason =
  'hat' | 'sexuellt' | 'hot' | 'mobbning' | 'spam' | 'farligt' | 'under15' | 'annat';

export const REPORT_REASONS: {
  key: ReportReason;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}[] = [
  { key: 'mobbning', label: 'Mobbning eller trakasserier', icon: 'sad-outline' },
  { key: 'hat', label: 'Hat eller kränkningar', icon: 'megaphone-outline' },
  { key: 'hot', label: 'Hot eller våld', icon: 'warning-outline' },
  { key: 'sexuellt', label: 'Sexuellt innehåll', icon: 'eye-off-outline' },
  { key: 'farligt', label: 'Farlig körning eller brott', icon: 'car-outline' },
  { key: 'spam', label: 'Spam eller bedrägeri', icon: 'mail-unread-outline' },
  { key: 'under15', label: 'Verkar vara under 15 år', icon: 'person-outline' },
  { key: 'annat', label: 'Något annat', icon: 'ellipsis-horizontal-circle-outline' },
];

export async function reportContent(input: {
  type: ReportTargetType;
  id: string;
  reason: ReportReason;
  details?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('report_content', {
    p_target_type: input.type,
    p_target_id: input.id,
    p_reason: input.reason,
    p_details: input.details,
  });
  if (error) throw error;
}
