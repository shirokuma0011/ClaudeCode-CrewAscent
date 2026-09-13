import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
export function sqliteBinding(filename,migrationDir){
 if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true});const sqlite=new DatabaseSync(filename);sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
 sqlite.exec('CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY)');
 for(const name of readdirSync(migrationDir).filter(n=>n.endsWith('.sql')).sort()){if(sqlite.prepare('SELECT name FROM _local_migrations WHERE name=?').get(name))continue;sqlite.exec('BEGIN');try{sqlite.exec(readFileSync(join(migrationDir,name),'utf8'));sqlite.prepare('INSERT INTO _local_migrations(name) VALUES (?)').run(name);sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}}
 const wrap=(sql,args=[])=>({bind(...values){return wrap(sql,values);},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){return {meta:sqlite.prepare(sql).run(...args)};},sql,args});
 return {prepare:wrap,async batch(stmts){sqlite.exec('BEGIN IMMEDIATE');try{const result=[];for(const s of stmts)result.push(await s.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}},close:()=>sqlite.close(),raw:sqlite};
}
