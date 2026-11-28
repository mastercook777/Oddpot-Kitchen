// Release identity is declared by the production entry; core package version is independent.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
export function publishedBuild(){
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const match=index.match(/const build='(v0\.16-[A-Za-z0-9.-]+)'/);
 assert.ok(match,'published build is declared');
 return match[1];
}
export function expectedOfflineTitle(){return '怪味食堂 · '+publishedBuild()+' 离线版';}
