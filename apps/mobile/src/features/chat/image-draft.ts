import type { Message } from '@/lib/api';

type DraftInput = {
  id: string;
  conversationId: string;
  senderId: string;
  caption: string;
  uri: string;
  sender: Message['sender'];
  now?: Date;
};

export function buildImageDraft(input: DraftInput): Message {
  return {
    id: input.id,
    conversation_id: input.conversationId,
    sender_id: input.senderId,
    body: input.caption,
    image_path: null,
    post_id: null,
    meetup_id: null,
    created_at: (input.now ?? new Date()).toISOString(),
    sender: input.sender,
    reactions: [],
    pending: true,
    localImageUri: input.uri,
  };
}

export async function deliverDraft(
  draft: Message,
  deps: {
    upload: (uri: string) => Promise<string>;
    send: (input: {
      id: string;
      conversationId: string;
      senderId: string;
      body: string;
      imagePath: string | null;
    }) => Promise<void>;
  },
) {
  const imagePath = draft.localImageUri ? await deps.upload(draft.localImageUri) : null;
  await deps.send({
    id: draft.id,
    conversationId: draft.conversation_id,
    senderId: draft.sender_id,
    body: draft.body,
    imagePath,
  });
}
