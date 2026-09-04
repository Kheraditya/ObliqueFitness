alter table exercises
  drop column muscle_group,
  add column primary_muscles text[] not null default '{}',
  add column secondary_muscles text[] not null default '{}';

alter table exercises
  alter column instructions type text[] using case when instructions is null then '{}'::text[] else array[instructions] end;

alter table exercises
  add column images text[] not null default '{}';

alter table users
  add column leaderboard_opt_in boolean not null default false;
