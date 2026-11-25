import test from 'node:test';
import assert from 'node:assert/strict';
import {departureEcologyZ2c4,ECOLOGY_ENCOUNTERS} from '../src/field_ecology_v011b2.js';
import {getFieldBiome} from '../src/field_biomes_v081.js';
import {readFileSync} from 'node:fs';
test('regions contain both route intents and enemies from actual entry ecologies',()=>{
 const fixtures=[['forest',['safe','risk'],['herb_path','old_tree_edge']],['spring',['spring_safe','spring_risk'],['hot_spring_shallows','ember_edge']],['cloud',['cloud_safe','cloud_risk'],['cloud_dock','cloud_roost']]];
 for(const [region,routes,zones] of fixtures){const p=departureEcologyZ2c4(region);assert.deepEqual(p.routes,routes);const b=zones.map((z,i)=>getFieldBiome(z,routes[i]));assert.deepEqual(p.enemies,[...new Set(b.flatMap(x=>ECOLOGY_ENCOUNTERS[x.style].mix))]);assert.ok(p.resources.every((r,i)=>r.every(id=>b[i].resources.some(([key])=>key===id))));assert.ok(p.enemies.length>=2);}
});
test('departure and live combat use the same enemy and weapon models, with actual mastery',()=>{
 const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8'),a=read('app.js'),d=read('three_z2c3_departure.js'),f=read('three_y3_forest.js'),r=read('three_y3b_weapon_pose.js');
 assert.match(a,/data-weapon-level="\$\{q.level\}"/);assert.match(a,/class="z2c4-routes"/);assert.match(d,/createWeaponRig\(T,hero,rounded\)/);assert.match(f,/createWeaponRig\(T,hero,rounded\)/);assert.match(d,/createFieldEnemyModel\(/);assert.match(f,/createFieldEnemyModel\(/);assert.match(r,/f.weapon\?\.level\|\|1\)>1/);assert.match(d,/bench.rig.masteryParts\(\)/);
});
