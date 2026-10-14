import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {createMeadowPreview,prepareGPreview} from '../src/meadow_preview_state_e1.js';
import {drawField} from '../src/scenes_v04.js';
import {stepMiniBoss} from '../src/field_bosses_v011g.js';
import {ingredientSpriteCanvas} from '../src/field_pixel_herb_v011c.js?v=0.11.0-alpha.7';
import {ING} from '../src/data.js';
const require=createRequire(import.meta.url);let runtime;try{runtime=require('@napi-rs/canvas');}catch{runtime=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');}
const {createCanvas}=runtime;globalThis.window={devicePixelRatio:2};globalThis.document={createElement:()=>createCanvas(1,1)};
const out='docs/screenshots/g';await mkdir(out,{recursive:true});
const sheet=createCanvas(1170,740),c=sheet.getContext('2d');c.fillStyle='#eae8d8';c.fillRect(0,0,1170,740);
for(const [i,name] of ['boss_spore','boss_ember','merchant'].entries()){
 const s=createMeadowPreview(20261013,name==='boss_ember'?'ember_edge':'glow_mushroom');prepareGPreview(s,name);
 if(name!=='merchant'){const e=s.field.enemies[0];e.attackCycle=1;e.cooldown=0;stepMiniBoss(s.field,e,0,{blocked:()=>false,hurt(){}});}
 const cv=createCanvas(780,960);cv.getBoundingClientRect=()=>({width:390,height:480});const before=JSON.stringify(s);drawField(cv,s,3.2);if(JSON.stringify(s)!==before)throw new Error('Renderer mutated '+name);
 await writeFile(`${out}/${name}.png`,cv.toBuffer('image/png'));c.drawImage(cv,i*390,35,390,480);c.fillStyle='#354d3d';c.font='18px sans-serif';c.fillText(name,i*390+16,25);
}
c.imageSmoothingEnabled=false;for(const [i,id] of Object.keys(ING).entries()){const x=25+i*114;c.drawImage(ingredientSpriteCanvas(id),x,550,72,72);c.font='13px sans-serif';c.fillText(id,x,645);}
c.font='16px sans-serif';c.fillText('Actual native Canvas keyframes · smooth telegraphs / pixel entities · not phone/browser acceptance',25,700);
await writeFile(`${out}/review.png`,sheet.toBuffer('image/png'));console.log('Bosses, merchant and ten ingredient raster keyframes rendered without state writes.');
