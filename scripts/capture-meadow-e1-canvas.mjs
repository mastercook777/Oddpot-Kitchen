// Render the actual drawField into a native Canvas. This is NOT browser / touch QA.
// Uses @napi-rs/canvas from CODEX_PRIMARY_RUNTIME_NODE_MODULES when available.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {createMeadowPreview,setMeadowPreviewMode,meadowPreviewPose} from '../src/meadow_preview_state_e1.js';
import {drawField} from '../src/scenes_v04.js';
const require=createRequire(import.meta.url);
let createCanvas;
try{({createCanvas}=require('@napi-rs/canvas'));}
catch{({createCanvas}=require((process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'')+'/@napi-rs/canvas'));}
globalThis.window={devicePixelRatio:2};
globalThis.document={createElement:()=>createCanvas(1,1)};
await mkdir('docs/screenshots',{recursive:true});
const sizes=[[430,932],[390,844],[375,667],[320,568]];
const report=[];
for(const [width,height] of sizes){
 for(const [seed,poses] of [[20261013,['spawn','mid','tree','harvest']],[20261150,['mid']],[20261287,['harvest']]]){
  for(const pose of poses)for(const mode of ['hybrid-e1','hybrid-e0']){
   const s=createMeadowPreview(seed);s.field.pos={...meadowPreviewPose(s,pose)};setMeadowPreviewMode(s,mode);
   const canvas=createCanvas(width*2,(height-265)*2);
   canvas.getBoundingClientRect=()=>({width,height:height-265});
   const before=JSON.stringify(s);drawField(canvas,s,4.3);
   if(JSON.stringify(s)!==before)throw new Error('Renderer mutated game');
   const name=`meadow-${mode}-${pose}-${width}-${seed}.png`;
   await writeFile('docs/screenshots/'+name,canvas.toBuffer('image/png'));
   report.push({name,width,height:height-265,seed,pose,mode});
  }
 }
}
await writeFile('docs/screenshots/meadow-e1-native-render-report.json',JSON.stringify({kind:'native Canvas render; browser/touch unverified',screens:report},null,2));
console.log('Rendered '+report.length+' actual Canvas comparisons; browser/touch QA remains unverified.');
