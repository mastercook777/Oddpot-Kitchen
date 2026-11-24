import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {A21_ATLAS_URI,A21_SPRITES,a21AtlasReady} from '../src/hearth_assets_v016a21.js';
test('original A2.1 atlas includes 12 bounded sprite crops and valid PNG dimensions',()=>{
 const png=Buffer.from(A21_ATLAS_URI.split(',')[1],'base64');
 assert.equal(png.length,5741);
 assert.equal(png.readUInt32BE(16),192);assert.equal(png.readUInt32BE(20),144);
 assert.equal(Object.keys(A21_SPRITES).length,12);
 for(const [i,w,h] of Object.values(A21_SPRITES)){assert.ok(i>=0&&i<12&&w>0&&w<=48&&h>0&&h<=48);}
 assert.equal(a21AtlasReady(),false,'no browser image: graceful fallback');
});
test('online and offline scene assets are the same and limited to forecast',()=>{
 const scene=readFileSync(new URL('../src/scenes_v04.js',import.meta.url),'utf8');
 const offline=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');
 const builder=readFileSync(new URL('../scripts/build-standalone.py',import.meta.url),'utf8');
 assert.ok(offline.includes(A21_ATLAS_URI));assert.match(builder,/hearth_assets_v016a21\.js/);
 assert.match(scene,/assetHome=!cloud&&s\.phase==='forecast'&&!v&&a21AtlasReady\(\)/);
});
