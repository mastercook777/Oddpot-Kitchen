import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {createMeadowPreview,prepareSpecialPreview} from '../src/meadow_preview_state_e1.js';
import {drawField} from '../src/scenes_v04.js';
import {ingredientSpriteCanvas} from '../src/field_pixel_herb_v011c.js?v=0.11.0-alpha.7';
const require=createRequire(import.meta.url);let runtime;try{runtime=require('@napi-rs/canvas');}catch{runtime=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');}
const {createCanvas}=runtime;globalThis.window={devicePixelRatio:2};globalThis.document={createElement:()=>createCanvas(1,1)};
const out='docs/screenshots/c';await mkdir(out,{recursive:true});
const sheet=createCanvas(1170,650),c=sheet.getContext('2d');c.fillStyle='#eae8d8';c.fillRect(0,0,1170,650);
for(const [i,view] of ['merchant_trade','traveler_trade','ecology_event'].entries()){
 const s=createMeadowPreview(20261014,i===2?'hot_spring_shallows':'herb_path');prepareSpecialPreview(s,view);
 const cv=createCanvas(780,900);cv.getBoundingClientRect=()=>({width:390,height:450});const before=JSON.stringify(s);drawField(cv,s,2.2);if(JSON.stringify(s)!==before)throw new Error('Renderer mutated '+view);
 c.drawImage(cv,i*390,32,390,450);c.font='17px sans-serif';c.fillStyle='#354d3d';c.fillText(view,i*390+16,24);
}
c.imageSmoothingEnabled=false;
for(const [i,id] of ['tide_sour_pulp','starlit_nectar'].entries()){c.drawImage(ingredientSpriteCanvas(id),320+i*310,510,64,64);c.font='16px sans-serif';c.fillText(id,300+i*310,603);}
c.font='14px sans-serif';c.fillText('Actual formal Canvas entities and shared ingredient rasters; browser dialog QA is separate.',16,637);
await writeFile(out+'/review.png',sheet.toBuffer('image/png'));console.log('C entity/item keyframes rendered without state writes.');
