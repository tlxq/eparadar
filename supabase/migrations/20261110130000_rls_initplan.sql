alter policy "anyone can record their own events" on public.analytics_events
  with check (((user_id IS NULL) OR (user_id = (select auth.uid()))));

alter policy "users delete their own cars" on public.cars
  using (((select auth.uid()) = owner_id));

alter policy "users manage their own cars" on public.cars
  with check (((select auth.uid()) = owner_id));

alter policy "users update their own cars" on public.cars
  using (((select auth.uid()) = owner_id));

alter policy "members can view conversation members" on public.conversation_members
  using (is_conversation_member(conversation_id, (select auth.uid())));

alter policy "members read their own mutes" on public.conversation_mutes
  using ((user_id = (select auth.uid())));

alter policy "members can view their conversations" on public.conversations
  using (is_conversation_member(id, (select auth.uid())));

alter policy "owners view their own friend code" on public.friend_codes
  using (((select auth.uid()) = user_id));

alter policy "participants remove their non-blocked friendships" on public.friendships
  using (((((select auth.uid()) = requester_id) OR ((select auth.uid()) = addressee_id)) AND (status <> 'blocked'::text)));

alter policy "participants view their friendships" on public.friendships
  using (((((select auth.uid()) = requester_id) OR ((select auth.uid()) = addressee_id)) AND ((status <> 'blocked'::text) OR ((select auth.uid()) = blocked_by))));

alter policy "owner and friends view fresh shared locations" on public.locations
  using ((((select auth.uid()) = user_id) OR (sharing_enabled AND (lat IS NOT NULL) AND (updated_at > (now() - '12:00:00'::interval)) AND is_friend((select auth.uid()), user_id))));

alter policy "users delete their own location" on public.locations
  using (((select auth.uid()) = user_id));

alter policy "users manage their own location" on public.locations
  with check (((select auth.uid()) = user_id));

alter policy "users update their own location" on public.locations
  using (((select auth.uid()) = user_id));

alter policy "own and friends' checkins are visible" on public.meetup_checkins
  using (((user_id = (select auth.uid())) OR is_friend((select auth.uid()), user_id)));

alter policy "own, friends' and own meetups' interest is visible" on public.meetup_interests
  using (((user_id = (select auth.uid())) OR is_friend((select auth.uid()), user_id) OR (EXISTS ( SELECT 1
   FROM meetups m
  WHERE ((m.id = meetup_interests.meetup_id) AND (m.creator_id = (select auth.uid())))))));

alter policy "users mark their own interest" on public.meetup_interests
  with check (((select auth.uid()) = user_id));

alter policy "users remove their own interest" on public.meetup_interests
  using (((select auth.uid()) = user_id));

alter policy "authenticated users create meetups" on public.meetups
  with check (((select auth.uid()) = creator_id));

alter policy "creator and friends see current meetups" on public.meetups
  using (((starts_at > (now() - '1 day'::interval)) AND ((creator_id = (select auth.uid())) OR is_friend((select auth.uid()), creator_id))));

alter policy "creator deletes their meetup" on public.meetups
  using (((select auth.uid()) = creator_id));

alter policy "creator updates their meetup" on public.meetups
  using (((select auth.uid()) = creator_id))
  with check ((((select auth.uid()) = creator_id) AND (starts_at > (now() - '1 day'::interval)) AND (starts_at < (now() + '60 days'::interval)) AND ((lat >= ('-90'::integer)::double precision) AND (lat <= (90)::double precision)) AND ((lng >= ('-180'::integer)::double precision) AND (lng <= (180)::double precision))));

alter policy "members can view reactions in their conversations" on public.message_reactions
  using ((EXISTS ( SELECT 1
   FROM messages m
  WHERE ((m.id = message_reactions.message_id) AND is_conversation_member(m.conversation_id, (select auth.uid()))))));

alter policy "members can send messages" on public.messages
  with check (((sender_id = (select auth.uid())) AND is_conversation_member(conversation_id, (select auth.uid())) AND (NOT is_blocked_direct_chat(conversation_id, (select auth.uid())))));

alter policy "people change their own notification settings" on public.notification_settings
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

alter policy "people create their own notification settings" on public.notification_settings
  with check (((select auth.uid()) = user_id));

alter policy "people read their own notification settings" on public.notification_settings
  using (((select auth.uid()) = user_id));

alter policy "authors drop their new posts on the map" on public.post_places
  with check (((author_id = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM posts p
  WHERE ((p.id = post_places.post_id) AND (p.author_id = (select auth.uid())) AND (p.created_at > (now() - '01:00:00'::interval)))))));

alter policy "authors remove their post places" on public.post_places
  using ((author_id = (select auth.uid())));

alter policy "owner and kompisar see live post places" on public.post_places
  using (((expires_at > now()) AND ((author_id = (select auth.uid())) OR is_friend((select auth.uid()), author_id))));

alter policy "people react to posts they can see" on public.post_reactions
  with check (((user_id = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM posts p
  WHERE (p.id = post_reactions.post_id)))));

alter policy "people remove their own reactions" on public.post_reactions
  using ((user_id = (select auth.uid())));

alter policy "reactions by me, my kompisar or on my posts are readable" on public.post_reactions
  using (((EXISTS ( SELECT 1
   FROM posts p
  WHERE (p.id = post_reactions.post_id))) AND ((user_id = (select auth.uid())) OR is_friend((select auth.uid()), user_id) OR (EXISTS ( SELECT 1
   FROM posts p
  WHERE ((p.id = post_reactions.post_id) AND (p.author_id = (select auth.uid()))))))));

alter policy "authors and friends read posts" on public.posts
  using ((((select auth.uid()) = author_id) OR is_friend((select auth.uid()), author_id)));

alter policy "users delete their own posts" on public.posts
  using (((select auth.uid()) = author_id));

alter policy "users manage their own posts" on public.posts
  with check (((select auth.uid()) = author_id));

alter policy "users update their own posts" on public.posts
  using (((select auth.uid()) = author_id));

alter policy "users manage their own profile" on public.profiles
  with check (((select auth.uid()) = id));

alter policy "users update their own profile" on public.profiles
  using (((select auth.uid()) = id));

alter policy "users delete their own push tokens" on public.push_tokens
  using (((select auth.uid()) = user_id));

alter policy "users insert their own push tokens" on public.push_tokens
  with check (((select auth.uid()) = user_id));

alter policy "users update their own push tokens" on public.push_tokens
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

alter policy "users view their own push tokens" on public.push_tokens
  using (((select auth.uid()) = user_id));

alter policy "people file reports as themselves" on public.reports
  with check ((reporter_id = (select auth.uid())));

alter policy "people see their own reports" on public.reports
  using ((reporter_id = (select auth.uid())));

alter policy "authors and spot creators remove photos" on public.spot_photos
  using (((author_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM spots s
  WHERE ((s.id = spot_photos.spot_id) AND (s.creator_id = (select auth.uid())))))));

alter policy "people add photos to Raggställen they can see" on public.spot_photos
  with check (((author_id = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM spots s
  WHERE ((s.id = spot_photos.spot_id) AND (s.kind = 'ragg'::text)))) AND (split_part(path, '/'::text, 1) = (spot_id)::text)));

alter policy "people see fresh photos on spots they can see" on public.spot_photos
  using (((expires_at > now()) AND (EXISTS ( SELECT 1
   FROM spots s
  WHERE (s.id = spot_photos.spot_id))) AND (NOT is_blocked_between((select auth.uid()), author_id))));

alter policy "people see their own votes on live warnings" on public.spot_votes
  using (((user_id = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM spots s
  WHERE (s.id = spot_votes.spot_id)))));

alter policy "people create their own spots" on public.spots
  with check ((creator_id = (select auth.uid())));

alter policy "people remove their own spots" on public.spots
  using ((creator_id = (select auth.uid())));

alter policy "people see their own and friends' live spots" on public.spots
  using (((expires_at > now()) AND ((creator_id = (select auth.uid())) OR is_friend((select auth.uid()), creator_id))));

alter policy "people read their own birth year" on public.user_ages
  using ((user_id = (select auth.uid())));

alter policy "people set their own birth year once" on public.user_ages
  with check ((user_id = (select auth.uid())));

alter policy "members delete their groups' avatars" on storage.objects
  using (((bucket_id = 'group-avatars'::text) AND is_group_member(((storage.foldername(name))[1])::uuid, (select auth.uid()))));

alter policy "members read their conversations' chat images" on storage.objects
  using (((bucket_id = 'chat-images'::text) AND is_conversation_member(((storage.foldername(name))[1])::uuid, (select auth.uid()))));

alter policy "members read their groups' avatars" on storage.objects
  using (((bucket_id = 'group-avatars'::text) AND is_group_member(((storage.foldername(name))[1])::uuid, (select auth.uid()))));

alter policy "members upload avatars to their groups" on storage.objects
  with check (((bucket_id = 'group-avatars'::text) AND is_group_member(((storage.foldername(name))[1])::uuid, (select auth.uid()))));

alter policy "members upload chat images to their conversations" on storage.objects
  with check (((bucket_id = 'chat-images'::text) AND is_conversation_member(((storage.foldername(name))[1])::uuid, (select auth.uid()))));

alter policy "owners and people who can see the post read post images" on storage.objects
  using (((bucket_id = 'post-images'::text) AND (((storage.foldername(name))[1] = ((select auth.uid()))::text) OR (EXISTS ( SELECT 1
   FROM posts p
  WHERE (p.image_url = objects.name))))));

alter policy "people read spot photos they can see" on storage.objects
  using (((bucket_id = 'spot-photos'::text) AND ((owner_id = ((select auth.uid()))::text) OR (EXISTS ( SELECT 1
   FROM spot_photos p
  WHERE (p.path = objects.name))))));

alter policy "people upload their own photos to Raggställen they can see" on storage.objects
  with check (((bucket_id = 'spot-photos'::text) AND (storage.filename(name) ~~ (((select auth.uid()))::text || '-%'::text)) AND (EXISTS ( SELECT 1
   FROM spots s
  WHERE (((s.id)::text = (storage.foldername(objects.name))[1]) AND (s.kind = 'ragg'::text))))));

alter policy "uploaders delete their own chat images" on storage.objects
  using (((bucket_id = 'chat-images'::text) AND (owner_id = ((select auth.uid()))::text)));

alter policy "uploaders delete their own spot photos" on storage.objects
  using (((bucket_id = 'spot-photos'::text) AND (owner_id = ((select auth.uid()))::text)));

alter policy "users delete their own avatar" on storage.objects
  using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

alter policy "users delete their own car photos" on storage.objects
  using (((bucket_id = 'car-photos'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

alter policy "users delete their own post images" on storage.objects
  using (((bucket_id = 'post-images'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

alter policy "users update their own avatar" on storage.objects
  using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

alter policy "users update their own car photos" on storage.objects
  using (((bucket_id = 'car-photos'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

alter policy "users update their own post images" on storage.objects
  using (((bucket_id = 'post-images'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

alter policy "users upload their own avatar" on storage.objects
  with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

alter policy "users upload their own car photos" on storage.objects
  with check (((bucket_id = 'car-photos'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

alter policy "users upload their own post images" on storage.objects
  with check (((bucket_id = 'post-images'::text) AND ((storage.foldername(name))[1] = ((select auth.uid()))::text)));

