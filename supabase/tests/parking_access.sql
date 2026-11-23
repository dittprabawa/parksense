-- Run on a test database after both migrations. All fixtures are rolled back.
begin;
select set_config('parksense.qa_owner', gen_random_uuid()::text, true),
       set_config('parksense.qa_other', gen_random_uuid()::text, true),
       set_config('parksense.qa_spot', gen_random_uuid()::text, true);
insert into auth.users(id) values (current_setting('parksense.qa_owner')::uuid), (current_setting('parksense.qa_other')::uuid);
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('parksense.qa_owner'), true),
       set_config('request.jwt.claims', json_build_object('sub',current_setting('parksense.qa_owner'),'role','authenticated')::text, true);
do $$
declare
  owner_id text := current_setting('parksense.qa_owner');
  first_id uuid := current_setting('parksense.qa_spot')::uuid;
  second_id uuid := gen_random_uuid();
  imported_id uuid := gen_random_uuid();
  body jsonb := jsonb_build_object('ownerId',owner_id,'type','Car','licensePlate','QA','location','QA','status','active');
begin
  perform public.write_parking(first_id,'save',body);
  perform public.write_parking(first_id,'save',body);
  perform public.write_parking(second_id,'save',body);
  body := body || jsonb_build_object('legacyId','rec-qa','parkedAt',now());
  perform public.write_parking(imported_id,'import',body);
  if public.write_parking(gen_random_uuid(),'import',body) <> imported_id then raise exception 'Duplicate import'; end if;
  if (select count(*) from public.parking_records) <> 3
    or (select id from public.parking_records where status='active') <> second_id then
    raise exception 'Active session or retry invariant failed';
  end if;
  begin
    perform public.write_parking(first_id,'edit',body,1);
    raise exception using errcode='XX000', message='Stale edit accepted';
  exception when raise_exception then
    if sqlerrm not like 'Record changed%' then raise; end if;
  end;
  -- A failed save must roll back the transition of the previously active spot.
  begin
    perform public.write_parking(gen_random_uuid(),'save',body || '{"latitude":95,"longitude":20}');
    raise exception using errcode='XX000', message='Invalid coordinates accepted';
  exception when check_violation then null;
  end;
  if not exists(select from public.parking_records where status='active' and id=second_id) then
    raise exception 'Failed save ended active spot';
  end if;
  perform public.write_parking(second_id,'end','{}',1);
  if exists(select from public.parking_records where status='active') then raise exception 'End failed'; end if;
  perform public.write_parking(imported_id,'delete','{}',1);
end;
$$;
select set_config('request.jwt.claim.sub', current_setting('parksense.qa_other'), true),
       set_config('request.jwt.claims', json_build_object('sub',current_setting('parksense.qa_other'),'role','authenticated')::text, true);
do $$
begin
  if exists(select from public.parking_records) or exists(select from public.vehicles)
    or exists(select from public.parking_zones) or exists(select from public.profiles where id <> auth.uid()) then
    raise exception 'Cross-account read';
  end if;
  begin
    perform public.write_parking(current_setting('parksense.qa_spot')::uuid,'delete','{}',2);
    raise exception using errcode='XX000', message='Cross-account delete accepted';
  exception when raise_exception then
    if sqlerrm not like 'Record changed%' then raise; end if;
  end;
  if has_table_privilege('authenticated','public.parking_sessions','UPDATE')
    or has_function_privilege('anon','public.write_parking(uuid,text,jsonb,integer)','EXECUTE')
    or has_table_privilege('anon','public.parking_records','SELECT') then raise exception 'Unexpected grants'; end if;
end;
$$;
rollback;
