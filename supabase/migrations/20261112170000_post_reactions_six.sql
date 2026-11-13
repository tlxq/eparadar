alter table public.post_reactions drop constraint post_reactions_emoji_check;

alter table public.post_reactions
  add constraint post_reactions_emoji_check
  check (emoji = any (array['❤️', '😂', '😮', '😢', '🔥', '👍']));
