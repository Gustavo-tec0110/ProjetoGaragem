// Existing pg driver supplied by path; no new project dependency or remote target.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import process from 'node:process';

export async function nativeFixture() {
  const socket = process.env.GARAGEM_TEST_PG_SOCKET;
  assert.match(socket ?? '', /^\/tmp\/garagem-final-[a-zA-Z0-9/-]+$/);
  assert.ok(process.env.GARAGEM_TEST_PG_MODULE, 'Set path to the existing pg driver');
  const { default: pg } = await import(pathToFileURL(process.env.GARAGEM_TEST_PG_MODULE).href);
  const config = { host: socket, port: 55431, user: process.env.USER ?? 'gustavo', database: 'postgres' };
  const admin = new pg.Client(config);
  await admin.connect();
  const target = (await admin.query("select current_setting('data_directory') as directory,inet_server_addr() as address")).rows[0];
  assert.equal(target.address,null,'Only a UNIX socket is permitted');
  assert.equal(target.directory,`${socket}/pgdata`,'Only the disposable cluster under the test root is permitted');
  const database = `garagem_fixture_${process.pid}`;
  // CREATE DATABASE fails if it already exists. Never reuses or deletes an unrelated DB.
  await admin.query(`create database ${database}`);
  const connect = async () => {
    const client = new pg.Client({ ...config, database });
    await client.connect();
    await client.query("set statement_timeout='15s'; set lock_timeout='10s'");
    return client;
  };
  const client = await connect();
  return {
    native: true, connect,
    exec: sql => client.query(sql),
    query: (sql, args) => client.query(sql, args),
    close: async () => { await client.end(); await admin.end(); },
  };
}
