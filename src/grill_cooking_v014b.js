import {ING,RECIPES,RECIPE_INDEX,recipeSignature} from './data.js';

const MIN_FACE={beef:3.2,chicken:3.0,garlic:1.5,chili:1.5,mushroom:2.0,cabbage:1.8,onion:1.9};
const MAX_FACE={beef:8.4,chicken:8.2,garlic:8.0,chili:8.0,mushroom:8.2,cabbage:8.0,onion:8.1};
export function grillHeat(id,elapsed,actions=[],rate=1.05){
 const turn=actions.find(x=>x.type==='turn');
 const faceA=Math.max(0,Math.min(elapsed,turn?.t??elapsed))*rate;
 const faceB=turn?Math.max(0,elapsed-turn.t)*rate:0;
 const low=MIN_FACE[id]??2.2,high=MAX_FACE[id]??8;
 const state=faceA>high||faceB>high?'焦糊':faceA<low||faceB<low?'偏生':'熟透';
 return {front:faceA,back:faceB,frontProgress:Math.min(100,Math.round(faceA/low*100)),backProgress:Math.min(100,Math.round(faceB/low*100)),state,tone:state==='焦糊'?'bad':state==='熟透'?'good':'warming'};
}
export function grillTechnique(recipeId,style){
 if(!RECIPES[recipeId]||RECIPES[recipeId].station!=='GRILL')return null;
 if(style==='glazed')return {affinity:'signature',affinityLabel:'招牌适配',priceDeltaCoins:1,timeDeltaSeconds:1,
  guestFitDelta:recipeId==='grill_chicken'?{adventurer:5,critic:4}:recipeId==='grill_beef'?{adventurer:5,regular:2}:{family:5,stargazer:4},
  reason:'及时翻面并刷香料，两面熟透后形成这道烤串的招牌风味。'};
 return {affinity:'ordinary',affinityLabel:'普通',priceDeltaCoins:0,timeDeltaSeconds:0,guestFitDelta:{},reason:'两面熟透，保留食材本味。'};
}
export function evaluateGrillCook(ids,drops,actions,elapsed){
 const recipeId=RECIPE_INDEX[recipeSignature(ids,'GRILL')]||null,recipe=RECIPES[recipeId];
 const missing=ids.filter(id=>!drops.some(d=>d.id===id));
 const states=drops.map(d=>({id:d.id,label:grillHeat(d.id,elapsed-d.t,actions.map(a=>({...a,t:a.t-d.t}))).state}));
 const bad=states.find(x=>x.label!=='熟透');
 const turn=actions.find(a=>a.type==='turn'),brush=actions.find(a=>a.type==='brush');
 const glazed=!!(turn&&brush&&brush.t>=turn.t&&brush.t-turn.t<=3.5&&brush.with.length===ids.length);
 const style=glazed?'glazed':'even',tech=grillTechnique(recipeId,style);
 const sellable=!!recipe&&!missing.length&&!bad;
 const quality=Math.max(35,Math.min(85,72+(turn?8:0)+(glazed?5:0)));
 const status=!recipe?'未知组合':missing.length?'漏下料':bad?.label==='焦糊'?'焦糊失败':bad?'夹生失败':'成功';
 return {recipeId,recipeName:recipe?.name||'未识别料理',ids:[...ids],vessel:'GRILL',quality,sellable,status,style,
  styleLabel:glazed?'双面刷香':'双面原味',secondaryTrait:glazed?'香料焦边':'双面火候',affinity:tech?.affinity||'ordinary',
  affinityLabel:tech?.affinityLabel||'普通',culinaryReason:tech?.reason||'食材组合不能上架',events:drops.map(d=>({...d})),
  actions:actions.map(a=>({...a,with:[...a.with]})),duration:+elapsed.toFixed(2),
  doneness:[...states,...missing.map(id=>({id,label:'未下锅'}))],
  reason:sellable?tech.reason:status,
  facts:{frontBack:ids.map(id=>({id,...grillHeat(id,elapsed-(drops.find(d=>d.id===id)?.t||0),actions)})),turnedAt:turn?.t??null,brushedAt:brush?.t??null}};
}
