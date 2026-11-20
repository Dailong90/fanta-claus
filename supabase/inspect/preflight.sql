-- Read-only catalog inventory. No user rows, passwords, keys or function bodies.
-- Not executed against production in B03/B04/B05. Sanitize identifiers before sharing.
select n.nspname as schema_name, c.relname, pg_get_userbyid(c.relowner) as owner,
  c.relkind, c.relrowsecurity, c.relforcerowsecurity, c.relacl
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%'
order by 1,2;
select table_schema,table_name,column_name,data_type,udt_schema,udt_name,is_nullable,column_default
from information_schema.columns where table_schema='public' order by table_name,ordinal_position;
select n.nspname,c.relname,x.conname,pg_get_constraintdef(x.oid) as definition
from pg_constraint x join pg_class c on c.oid=x.conrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' order by 1,2,3;
select schemaname,tablename,indexname,indexdef from pg_indexes where schemaname='public' order by 1,2,3;
select n.nspname,c.relname,p.polname,p.polcmd,p.polpermissive,p.polroles
from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace order by 1,2,3;
select n.nspname,p.oid::regprocedure as function_name,p.prosecdef,pg_get_userbyid(p.proowner) as owner,p.proacl,
  (select array_agg(setting) from unnest(p.proconfig) setting where setting like 'search_path=%') as function_search_path
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','fc_api','fc_private') order by 1,2;
select defaclrole::regrole,defaclnamespace::regnamespace,defaclobjtype,defaclacl from pg_default_acl;
select event_object_schema,event_object_table,trigger_name,action_timing,event_manipulation
from information_schema.triggers where event_object_schema in ('public','auth');
select evtname,evtevent,evtenabled,evtfoid::regprocedure from pg_event_trigger;
select extname,extversion from pg_extension;
-- Exposed schema names must also be recorded from Supabase Data API settings.
-- This setting, if present, is only additional evidence, not the hosted dashboard configuration.
select current_setting('pgrst.db_schemas',true) as connection_exposed_schemas;
