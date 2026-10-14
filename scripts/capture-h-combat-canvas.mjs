import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {createMeadowPreview,prepareCombatPreview} from '../src/meadow_preview_state_e1.js';
import {drawField} from '../src/scenes_v04.js';
const require=createRequire(import.meta.url);let runtime;try{runtime=require('@napi-rs/canvas');}catch{runtime=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');}
const {createCanvas}=runtime;globalThis.window={devicePixelRatio:2};globalThis.document={createElement:()=>createCanvas(1,1)};
const out='docs/screenshots/h';await mkdir(out,{recursive:true});
const views=['combat_wok','combat_pot','combat_wok_skill','combat_pot_skill','combat_boss'],stages=['cast','impact','recovery'];
const sheet=createCanvas(1170,5*320),c=sheet.getContext('2d');c.fillStyle='#eae8d8';c.fillRect(0,0,sheet.width,sheet.height);
for(const [row,view] of views.entries())for(const [col,stage] of stages.entries()){
 const s=createMeadowPreview(20261014);prepareCombatPreview(s,view,stage);
 const cv=createCanvas(780,600);cv.getBoundingClientRect=()=>({width:390,height:300});
 const before=JSON.stringify(s);for(let i=0;i<2;i++)drawField(cv,s,s.field.elapsed);
 if(JSON.stringify(s)!==before)throw new Error('Draw mutated '+view);
 c.drawImage(cv,col*390,row*320+20,390,300);c.font='14px sans-serif';c.fillStyle='#354d3d';c.fillText(view+' / '+stage,col*390+10,row*320+16);
 await writeFile(`${out}/${view}-${stage}.png`,cv.toBuffer('image/png'));
}
await writeFile(out+'/review.png',sheet.toBuffer('image/png'));
for(const [w,h] of [[320,568],[375,667],[390,844]]){
 const s=createMeadowPreview(20261014);prepareCombatPreview(s,'combat_pot_skill');
 const cv=createCanvas(w*2,h*2);cv.getBoundingClientRect=()=>({width:w,height:h});drawField(cv,s,s.field.elapsed);
 await writeFile(`${out}/canvas-${w}.png`,cv.toBuffer('image/png'));
}
console.log('Rendered 15 combat keyframes + 3 Canvas viewports; renderer is read-only. DOM/touch QA is separate.');
