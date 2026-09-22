create extension if not exists pg_net with schema extensions;

create or replace function public.trigger_send_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  secret_key text;
  function_url text;
begin
  select decrypted_secret into secret_key
  from vault.decrypted_secrets
  where name = 'edge_function_secret_key';

  select decrypted_secret into function_url
  from vault.decrypted_secrets
  where name = 'send_push_function_url';

  if secret_key is null or function_url is null then
    return coalesce(NEW, OLD);
  end if;

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', secret_key),
    body := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'type', TG_OP,
      'record', to_jsonb(NEW),
      'old_record', case when TG_OP = 'UPDATE' then to_jsonb(OLD) else null end
    )
  );

  return NEW;
end;
$$;

create trigger on_messages_insert_send_push
  after insert on public.messages
  for each row execute function public.trigger_send_push();

create trigger on_friendships_change_send_push
  after insert or update on public.friendships
  for each row execute function public.trigger_send_push();

create trigger on_meetup_interests_insert_send_push
  after insert on public.meetup_interests
  for each row execute function public.trigger_send_push();
