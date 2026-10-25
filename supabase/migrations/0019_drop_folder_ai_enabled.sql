-- 0019: drop the per-folder AI switch that 0018 replaced (#151)
--
-- 0018 moved the switch to one school-wide row (ai_settings) and stopped
-- reading song_folders.ai_enabled, but left the column for the app deployed
-- before it. That app is gone, and nothing in the database reads the column
-- either, so it goes rather than leave a switch that looks like it does
-- something.

alter table public.song_folders
  drop column if exists ai_enabled;
