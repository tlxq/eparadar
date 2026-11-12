import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const createSignedUrl = jest.fn<(path: string, ttl: number) => Promise<unknown>>();
const createSignedUrls = jest.fn<(paths: string[], ttl: number) => Promise<unknown>>();
const mockFrom = jest.fn((_bucket: string) => ({ createSignedUrl, createSignedUrls }));

jest.mock('@/lib/supabase', () => ({
  supabase: { storage: { from: (b: string) => mockFrom(b) } },
}));

import { SIGNED_URL_TTL_S, signedUrl, signedUrls } from '@/lib/storage';

describe('storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signs one path', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://x/a' }, error: null });
    await expect(signedUrl('chat-images', 'a.jpg')).resolves.toBe('https://x/a');
    expect(mockFrom).toHaveBeenCalledWith('chat-images');
    expect(createSignedUrl).toHaveBeenCalledWith('a.jpg', SIGNED_URL_TTL_S);
  });

  it('throws on error', async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: new Error('nej') });
    await expect(signedUrl('chat-images', 'a.jpg')).rejects.toThrow('nej');
  });

  it('signs many paths into a map', async () => {
    createSignedUrls.mockResolvedValue({
      data: [
        { path: 'a', signedUrl: 'u-a' },
        { path: 'b', signedUrl: null },
      ],
      error: null,
    });
    const urls = await signedUrls('spot-photos', ['a', 'b']);
    expect(urls.get('a')).toBe('u-a');
    expect(urls.has('b')).toBe(false);
  });

  it('skips the call without paths', async () => {
    expect((await signedUrls('spot-photos', [])).size).toBe(0);
    expect(createSignedUrls).not.toHaveBeenCalled();
  });
});
