// Scheduler interface only: no timer, background process or real cron execution.
// Used by disposable PostgreSQL/PGlite fixtures; hosted scheduling has separate evidence.
export const cronFixtureSql = `
  create schema cron;
  create table cron.job(jobid bigint generated always as identity primary key,
    jobname text unique, schedule text, command text, active boolean default true);
  create table cron.job_run_details(jobid bigint, status text, start_time timestamptz, end_time timestamptz);
  create function cron.schedule(text,text,text) returns bigint language sql as $$
    insert into cron.job(jobname,schedule,command) values($1,$2,$3) returning jobid;
  $$;
`;

export async function applyLocalMigration(db, sql) {
  if (sql.includes('create extension if not exists pg_cron;')) {
    await db.exec(cronFixtureSql);
    sql = sql.replace('create extension if not exists pg_cron;', '');
  }
  await db.exec(sql);
}
