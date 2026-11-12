import { describe, expect, it, jest } from '@jest/globals';

import {
  buildModerationItems,
  messageReportTarget,
} from '@/features/moderation/use-moderation-items';
import { useReportSheetStore } from '@/store/report-sheet';

const target = { type: 'profile', id: 'u1', userId: 'u1', name: 'Kim' } as const;

describe('buildModerationItems', () => {
  it('returns report then block', () => {
    const items = buildModerationItems({ report: target }, async () => true);
    expect(items.map((item) => item.label)).toEqual(['Rapportera', 'Blockera']);
    expect(items[1].destructive).toBe(true);
  });

  it('opens the report sheet', () => {
    const items = buildModerationItems({ report: target }, async () => true);
    items[0].onPress();
    expect(useReportSheetStore.getState().target).toEqual(target);
  });

  it('blocks and calls onBlocked only when blocked', async () => {
    const onBlocked = jest.fn();
    const blockPerson = jest.fn<(id: string, name: string | null) => Promise<boolean>>();
    blockPerson.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const items = buildModerationItems({ report: target, onBlocked }, blockPerson);
    await items[1].onPress();
    expect(onBlocked).not.toHaveBeenCalled();
    await items[1].onPress();
    expect(blockPerson).toHaveBeenCalledWith('u1', 'Kim');
    expect(onBlocked).toHaveBeenCalledTimes(1);
  });

  it('supports custom labels, disabled and block only', () => {
    const items = buildModerationItems(
      {
        report: target,
        reportLabel: 'Rapportera post',
        blockLabel: 'Blockera Kim',
        disabled: true,
      },
      async () => true,
    );
    expect(items.map((item) => item.label)).toEqual(['Rapportera post', 'Blockera Kim']);
    expect(items.every((item) => item.disabled)).toBe(true);
    const only = buildModerationItems({ report: target, blockOnly: true }, async () => true);
    expect(only.map((item) => item.label)).toEqual(['Blockera']);
  });

  it('has no block item without a user', () => {
    const items = buildModerationItems(
      { report: { type: 'spot', id: 's1', userId: null, name: null } },
      async () => true,
    );
    expect(items).toHaveLength(1);
  });
});

describe('messageReportTarget', () => {
  it('falls back to personen', () => {
    expect(messageReportTarget({ id: 'm1', sender_id: 'u2' })).toEqual({
      type: 'message',
      id: 'm1',
      userId: 'u2',
      name: 'personen',
    });
  });
});
