import { describe, expect, it, jest } from '@jest/globals';

import { buildImageDraft, deliverDraft } from '@/features/chat/image-draft';

const draft = buildImageDraft({
  id: 'm1',
  conversationId: 'c1',
  senderId: 'u1',
  caption: 'Kolla!',
  uri: 'file:///bild.jpg',
  sender: null,
  now: new Date('2026-11-12T10:00:00Z'),
});

type Send = (input: {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  imagePath: string | null;
}) => Promise<void>;

describe('buildImageDraft', () => {
  it('is pending and shows the local picture at once', () => {
    expect(draft.pending).toBe(true);
    expect(draft.localImageUri).toBe('file:///bild.jpg');
    expect(draft.image_path).toBeNull();
    expect(draft.body).toBe('Kolla!');
    expect(draft.created_at).toBe('2026-11-12T10:00:00.000Z');
  });
});

describe('deliverDraft', () => {
  it('uploads the picture and sends the message with the same id', async () => {
    const upload = jest.fn<(uri: string) => Promise<string>>().mockResolvedValue('c1/x.jpg');
    const send = jest.fn<Send>().mockResolvedValue(undefined);
    await deliverDraft(draft, { upload, send });
    expect(upload).toHaveBeenCalledWith('file:///bild.jpg');
    expect(send).toHaveBeenCalledWith({
      id: 'm1',
      conversationId: 'c1',
      senderId: 'u1',
      body: 'Kolla!',
      imagePath: 'c1/x.jpg',
    });
  });

  it('does not send when the upload fails', async () => {
    const upload = jest.fn<(uri: string) => Promise<string>>().mockRejectedValue(new Error('nät'));
    const send = jest.fn<Send>();
    await expect(deliverDraft(draft, { upload, send })).rejects.toThrow('nät');
    expect(send).not.toHaveBeenCalled();
  });

  it('sends plain text without uploading', async () => {
    const upload = jest.fn<(uri: string) => Promise<string>>();
    const send = jest.fn<Send>().mockResolvedValue(undefined);
    await deliverDraft({ ...draft, localImageUri: undefined }, { upload, send });
    expect(upload).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ imagePath: null }));
  });
});
