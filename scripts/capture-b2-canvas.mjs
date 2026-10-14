import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {createMeadowPreview,prepareEcologyPreview} from '../src/meadow_preview_state_e1.js';
import {drawField} from '../src/scenes_v04.js';
import {stepActionField} from '../src/field_v04.js';
const require=createRequire(import.meta.url);let runtime;try{runtime=require('@napi-rs/canvas');}catch{runtime=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');}
const {createCanvas}=runtime;globalThis.window={devicePixelRatio:2};globalThis.document={createElement:()=>createCanvas(1,1)};
const out='docs/screenshots/b2';await mkdir(out,{recursive:true});
const sheet=createCanvas(1280,1100),c=sheet.getContext('2d');c.fillStyle='#eae8d8';c.fillRect(0,0,1280,1100);const results=[];
for(const [i,zone] of ['forest_garden','old_tree_edge','steam_crack','ember_edge'].entries())for(const [j,risk] of [false,true].entries()){
 const begin=performance.now(),s=createMeadowPreview(20261014,zone);prepareEcologyPreview(s,risk);const initMs=performance.now()-begin;
 s.field.damageCd=999;for(const e of s.field.enemies)e.cooldown=0;stepActionField(s,0,0,0);
 const cv=createCanvas(640,960);cv.getBoundingClientRect=()=>({width:320,height:480});const before=JSON.stringify(s);drawField(cv,s,3.2);if(JSON.stringify(s)!==before)throw new Error('Mutated scene '+zone);
 const x=i*320,y=j*550;c.drawImage(cv,x,y+35,320,480);c.fillStyle='#354d3d';c.font='16px sans-serif';c.fillText(zone+' / '+(risk?'risk':'safe'),x+12,y+23);
 const simStart=performance.now();for(let frame=0;frame<300;frame++)stepActionField(s,0,0,.03);
 results.push({zone,risk,initializationMs:initMs,simulationMeanMs:(performance.now()-simStart)/300,ordinary:s.field.enemies.filter(e=>!e.isBoss).length});
}
c.font='14px sans-serif';c.fillText('Actual native Canvas controller keyframes; timing is not iPhone FPS or player telemetry.',12,1090);
await writeFile(out+'/review.png',sheet.toBuffer('image/png'));await writeFile(out+'/native-performance.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
