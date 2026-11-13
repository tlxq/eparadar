function normalizeBio(bio: string | null | undefined) {
  return bio?.trim() ?? '';
}

export function hasProfileChanges(
  profile: { display_name: string; bio: string | null },
  draft: { displayName: string; bio: string },
) {
  return (
    draft.displayName.trim() !== profile.display_name.trim() ||
    normalizeBio(draft.bio) !== normalizeBio(profile.bio)
  );
}
