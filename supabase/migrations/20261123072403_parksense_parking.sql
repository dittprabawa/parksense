begin;

create schema parksense_private;
revoke all on schema parksense_private from public, anon, authenticated;
grant usage on schema parksense_private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plate text not null check (length(trim(plate)) > 0),
  vehicle_type text not null check (length(trim(vehicle_type)) > 0),
  unique (user_id, plate, vehicle_type),
  unique (user_id, id)
);

-- Zone descriptions come from the user's form and can include private landmarks.
create table public.parking_zones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  location text not null check (length(trim(location)) > 0),
  building text not null,
  floor text not null,
  zone text not null,
  floor_zone text not null,
  unique (user_id, location, building, floor, zone, floor_zone),
  unique (user_id, id)
);

create table public.parking_sessions (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid not null,
  zone_id uuid not null,
  status text not null check (status in ('active', 'past')),
  parked_at timestamptz not null,
  landmark text,
  notes text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  accuracy double precision check (accuracy >= 0 and accuracy < 'Infinity'::float8),
  photo_path text,
  revision integer not null default 1,
  legacy_id text,
  foreign key (user_id, vehicle_id) references public.vehicles(user_id, id),
  foreign key (user_id, zone_id) references public.parking_zones(user_id, id),
  check ((latitude is null) = (longitude is null)),
  check (accuracy is null or latitude is not null),
  check (photo_path is null or (split_part(photo_path, '/', 1) = user_id::text
    and split_part(photo_path, '/', 2) = id::text)),
  unique (user_id, legacy_id)
);
create index parking_sessions_vehicle on public.parking_sessions(user_id, vehicle_id);
create index parking_sessions_zone on public.parking_sessions(user_id, zone_id);
create unique index one_active_parking_session on public.parking_sessions(user_id) where status = 'active';
create index parking_history_order on public.parking_sessions(user_id, parked_at desc, id desc);

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.parking_zones enable row level security;
alter table public.parking_sessions enable row level security;
create policy own_profile on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy own_vehicles on public.vehicles for select to authenticated using (user_id = (select auth.uid()));
create policy own_zones on public.parking_zones for select to authenticated using (user_id = (select auth.uid()));
create policy own_sessions on public.parking_sessions for select to authenticated using (user_id = (select auth.uid()));

create view public.parking_records with (security_invoker = true) as
  select s.*, v.plate, v.vehicle_type, z.location, z.building, z.floor, z.zone, z.floor_zone
  from public.parking_sessions s join public.vehicles v on v.id = s.vehicle_id and v.user_id = s.user_id
  join public.parking_zones z on z.id = s.zone_id and z.user_id = s.user_id;

revoke all on public.profiles, public.vehicles, public.parking_zones, public.parking_sessions,
  public.parking_records from public, anon, authenticated;
grant select on public.profiles, public.vehicles, public.parking_zones, public.parking_sessions,
  public.parking_records to authenticated;

create function parksense_private.parksense_new_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
revoke all on function parksense_private.parksense_new_profile() from public, anon, authenticated;
create trigger parksense_after_signup after insert on auth.users
  for each row execute function parksense_private.parksense_new_profile();
insert into public.profiles(id) select id from auth.users on conflict do nothing;

-- All changes to a user's sessions serialize on that user's profile row.
-- The caller supplies a stable session UUID across retries and the revision seen by the editor.
create function parksense_private.write_parking(p_id uuid, p_action text, p_data jsonb, p_revision integer default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  previous public.parking_sessions;
  vehicle uuid;
  parking_zone uuid;
  wanted text := p_data->>'status';
  photo text := nullif(p_data->>'photoPath','');
  legacy text := nullif(p_data->>'legacyId','');
  started timestamptz;
begin
  if uid is null or p_id is null or p_action is null or p_action not in ('save','import','edit','end','delete') then
    raise exception 'Invalid parking request';
  end if;
  if p_action in ('save','edit','import') and uid::text is distinct from p_data->>'ownerId' then
    raise exception 'Account changed. Reopen the parking form.';
  end if;
  perform 1 from public.profiles where id = uid for update;
  if not found then raise exception 'Account profile unavailable'; end if;
  if p_action = 'import' then
    if legacy is null then raise exception 'Missing local record identifier'; end if;
    select * into previous from public.parking_sessions where user_id = uid and legacy_id = legacy;
    if found then return previous.id; end if;
  end if;
  select * into previous from public.parking_sessions where user_id = uid and id = p_id;
  if p_action in ('save','import') then
    if found then return previous.id; end if;
  elsif not found or p_revision is distinct from previous.revision then
    raise exception 'Record changed or removed. Reload before trying again.';
  end if;

  if p_action = 'delete' then
    delete from public.parking_sessions where user_id = uid and id = p_id;
    return p_id;
  elsif p_action = 'end' then
    update public.parking_sessions set status = 'past', revision = revision + 1 where user_id = uid and id = p_id;
    return p_id;
  end if;

  started := case p_action when 'edit' then previous.parked_at when 'import' then (p_data->>'parkedAt')::timestamptz else now() end;
  if wanted = 'active' then
    -- A local import must never end a spot already saved on another device.
    if p_action = 'import' and exists (select from public.parking_sessions where user_id = uid and status = 'active') then
      wanted := 'past';
    else
      update public.parking_sessions set status = 'past', revision = revision + 1
        where user_id = uid and status = 'active' and id <> p_id;
    end if;
  end if;

  if photo is not null and (split_part(photo,'/',1) <> uid::text or split_part(photo,'/',2) <> p_id::text
    or not exists(select from storage.objects where bucket_id = 'parking-photos' and name = photo)) then
    raise exception 'Parking photo unavailable';
  end if;

  insert into public.vehicles(user_id, plate, vehicle_type)
    values (uid, upper(trim(p_data->>'licensePlate')), p_data->>'type') on conflict do nothing;
  select id into strict vehicle from public.vehicles
    where user_id = uid and plate = upper(trim(p_data->>'licensePlate')) and vehicle_type = p_data->>'type';

  insert into public.parking_zones(user_id, location, building, floor, zone, floor_zone)
    values (uid, p_data->>'location', coalesce(p_data->>'building',''), coalesce(p_data->>'floor',''),
      coalesce(p_data->>'zone',''), coalesce(p_data->>'floorZone','')) on conflict do nothing;
  select id into strict parking_zone from public.parking_zones where user_id = uid
    and location = p_data->>'location' and building = coalesce(p_data->>'building','')
    and floor = coalesce(p_data->>'floor','') and zone = coalesce(p_data->>'zone','')
    and floor_zone = coalesce(p_data->>'floorZone','');

  if p_action = 'edit' then
    update public.parking_sessions set vehicle_id = vehicle, zone_id = parking_zone, status = wanted,
      landmark = p_data->>'nearbyLandmark', notes = p_data->>'notes', photo_path = photo,
      revision = revision + 1 where user_id = uid and id = p_id;
  else
    insert into public.parking_sessions(id, user_id, vehicle_id, zone_id, status, parked_at, landmark,
      notes, latitude, longitude, accuracy, photo_path, legacy_id)
    values (p_id, uid, vehicle, parking_zone, wanted, started, p_data->>'nearbyLandmark', p_data->>'notes',
      (p_data->>'latitude')::float8, (p_data->>'longitude')::float8, (p_data->>'accuracy')::float8,
      photo, case when p_action = 'import' then legacy end);
  end if;
  return p_id;
end;
$$;
revoke all on function parksense_private.write_parking(uuid,text,jsonb,integer) from public, anon, authenticated;
grant execute on function parksense_private.write_parking(uuid,text,jsonb,integer) to authenticated;
-- PostgREST exposes only the invoker wrapper. The private implementation owns the transaction.
create function public.write_parking(p_id uuid, p_action text, p_data jsonb, p_revision integer default null)
returns uuid language sql security invoker set search_path = '' as $$
  select parksense_private.write_parking(p_id, p_action, p_data, p_revision);
$$;
revoke all on function public.write_parking(uuid,text,jsonb,integer) from public, anon, authenticated;
grant execute on function public.write_parking(uuid,text,jsonb,integer) to authenticated;
commit;
