import { describe, expect, it } from '@jest/globals';

import type { Conversation } from '@/lib/api';
import { isMuted, isUnread, lastActivity, readersOf } from '@/lib/chat-state';

const ME = 'me';
const ELSA = 'elsa';
const LINUS = 'linus';

function member(userId: string, lastReadAt: string | null, addedAt: string | null = null) {
  return {
    user_id: userId,
    last_read_at: lastReadAt,
    added_at: addedAt,
    role: 'member' as const,
    profiles: { id: userId, username: userId, display_name: userId, avatar_url: null },
  };
}

function conversation(
  lastMessage: { sender_id: string; created_at: string } | null,
  members: ReturnType<typeof member>[],
  isGroup = false,
): Conversation {
  return {
    id: 'c1',
    is_group: isGroup,
    name: null,
    avatar_path: null,
    created_at: '2026-10-01T10:00:00+00:00',
    conversation_members: members,
    messages: lastMessage ? [{ body: 'hej', image_path: null, post_id: null, ...lastMessage }] : [],
  };
}

describe('isUnread', () => {
  it('is unread when someone else wrote after my read time', () => {
    const chat = conversation({ sender_id: ELSA, created_at: '2026-10-05T18:00:00.5+00:00' }, [
      member(ME, '2026-10-05T18:00:00+00:00'),
      member(ELSA, null),
    ]);
    expect(isUnread(chat, ME)).toBe(true);
  });

  it('is read once my read time passes the last message', () => {
    const chat = conversation({ sender_id: ELSA, created_at: '2026-10-05T18:00:00+00:00' }, [
      member(ME, '2026-10-05T18:00:00.25+00:00'),
      member(ELSA, null),
    ]);
    expect(isUnread(chat, ME)).toBe(false);
  });

  it('never counts my own latest message as unread', () => {
    const chat = conversation({ sender_id: ME, created_at: '2026-10-05T18:00:00+00:00' }, [
      member(ME, null),
    ]);
    expect(isUnread(chat, ME)).toBe(false);
  });
});

describe('readersOf', () => {
  it('lists other members who read at or after the message, never the sender or me', () => {
    const message = { sender_id: ME, created_at: '2026-10-05T18:00:00+00:00' };
    const chat = conversation(
      message,
      [
        member(ME, '2026-10-05T19:00:00+00:00'),
        member(ELSA, '2026-10-05T18:00:00+00:00'),
        member(LINUS, '2026-10-05T17:59:59+00:00'),
      ],
      true,
    );
    expect(readersOf(chat, message, ME).map((reader) => reader.user_id)).toEqual([ELSA]);
  });

  it('skips members who were added after the message was sent', () => {
    const message = { sender_id: ME, created_at: '2026-10-05T18:00:00+00:00' };
    const chat = conversation(
      message,
      [member(ME, null), member(LINUS, '2026-10-05T20:00:00+00:00', '2026-10-05T19:00:00+00:00')],
      true,
    );
    expect(readersOf(chat, message, ME)).toEqual([]);
  });
});

describe('isMuted', () => {
  const now = Date.parse('2026-10-05T18:00:00+00:00');

  it('is muted until the time passes, and forever for infinity', () => {
    const chat = conversation(null, []);
    expect(isMuted({ ...chat, muted_until: '2026-10-05T19:00:00+00:00' }, now)).toBe(true);
    expect(isMuted({ ...chat, muted_until: '2026-10-05T17:00:00+00:00' }, now)).toBe(false);
    expect(isMuted({ ...chat, muted_until: 'infinity' }, now)).toBe(true);
    expect(isMuted({ ...chat, muted_until: null }, now)).toBe(false);
  });
});

describe('lastActivity', () => {
  it('uses the last message and falls back to when the chat was created', () => {
    const withMessage = conversation(
      { sender_id: ELSA, created_at: '2026-10-05T18:00:00+00:00' },
      [],
    );
    expect(lastActivity(withMessage)).toBe(Date.parse('2026-10-05T18:00:00+00:00'));
    expect(lastActivity(conversation(null, []))).toBe(Date.parse('2026-10-01T10:00:00+00:00'));
  });
});
