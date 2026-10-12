create table post_reactions (
  post_id uuid not null references posts on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  emoji text not null check (emoji in ('🔥', '😂', '👍')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, emoji)
);

create index post_reactions_user_id_idx on post_reactions (user_id);

alter table post_reactions enable row level security;

create policy "reactions by me, my kompisar or on my posts are readable"
  on post_reactions for select to authenticated
  using (
    exists (select 1 from posts p where p.id = post_reactions.post_id)
    and (
      user_id = auth.uid()
      or is_friend(auth.uid(), user_id)
      or exists (
        select 1 from posts p
        where p.id = post_reactions.post_id and p.author_id = auth.uid()
      )
    )
  );

create policy "people react to posts they can see"
  on post_reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from posts p where p.id = post_reactions.post_id)
  );

create policy "people remove their own reactions"
  on post_reactions for delete to authenticated
  using (user_id = auth.uid());

alter table messages add column post_id uuid;

alter table messages drop constraint messages_body_or_image;

alter table messages add constraint messages_body_image_or_post
  check (btrim(body) <> '' or image_path is not null or post_id is not null) not valid;

create policy "shared posts must be visible to the sender"
  on messages as restrictive for insert to authenticated
  with check (
    post_id is null
    or exists (select 1 from posts p where p.id = messages.post_id)
  );
