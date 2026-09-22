import { useState } from 'react';

import type { Profile } from '@/lib/api';

export function useUserSearch(
  searchFn: (query: string, userId: string) => Promise<Profile[]>,
  userId: string | undefined,
) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);

  async function handleSearch(text: string) {
    setQuery(text);
    if (!userId || text.trim().length < 2) {
      setResults([]);
      return;
    }
    const users = await searchFn(text, userId);
    setResults(users);
  }

  return { query, results, handleSearch };
}
