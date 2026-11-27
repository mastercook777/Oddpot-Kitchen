import {ING,RECIPES,RECIPE_INDEX,recipeSignature} from './data.js';
import {grillHeat,grillTechnique,automaticGrillState} from './grill_cooking_v014b.js?v=cb2r1c';

export const GRILL_LANES=Object.freeze({edge:{name:'边火',rate:.86},middle:{name:'均火',rate:1.05},flame:{name:'猛火',rate:1.22}});
export function grillPreview(c){
 if(c?.mode!=='v014c-grill')return null;
 const rate=GRILL_LANES[c.lane]?.rate||0;
 return {elapsed:c.elapsed,lane:c.lane,...(c.cbTiming?{auto:automaticGrillState(c.elapsed)}:{}),items:c.skewer.map(id=>({id,...grillHeat(id,c.elapsed,c.actions,rate,!!c.cbTiming)}))};
}
export function evaluatePlacedGrill(c,recipeOverride=undefined){
 const ids=c.ids,recipeId=recipeOverride===undefined?(RECIPE_INDEX[recipeSignature(ids,'GRILL')]||null):recipeOverride,recipe=RECIPES[recipeId];
 const rate=GRILL_LANES[c.lane]?.rate||0;
 const states=c.skewer.map(id=>({id,label:grillHeat(id,c.elapsed,c.actions,rate,!!c.cbTiming).state}));
 const turn=c.actions.find(a=>a.type==='turn'),brush=c.actions.find(a=>a.type==='brush');
 const smoke=c.actions.find(a=>a.type==='smoke');
 const glazed=c.cbTiming?!!brush:!!(turn&&brush&&brush.t>=turn.t&&brush.t-turn.t<=3.5);
 const ordered=!!recipe&&c.skewer.every((id,i)=>id===recipe.ids[i]);
 const style=c.cbTiming&&smoke?(glazed?'glazed_smoke':'smoked'):glazed?'glazed':'even',tech=grillTechnique(recipeId,style);
 const missing=ids.filter(id=>!c.skewer.includes(id));
 const bad=states.find(x=>x.label!=='熟透');
 const sellable=!!recipe&&!!c.lane&&!missing.length&&!bad;
 const status=!recipe?'未知组合':missing.length?'漏穿串':bad?.label==='焦糊'?'焦糊失败':bad?'夹生失败':'成功';
 const quality=Math.max(35,Math.min(90,76+(turn?4:0)+(ordered?3:0)+(glazed?5:0)+(c.lane==='flame'?2:0)));
 return {...(c.cbTiming?{baseOnly:true}:{}),recipeId,recipeName:recipe?.name||'未识别料理',ids:[...ids],vessel:'GRILL',quality,sellable,status,style,
  styleLabel:style==='glazed_smoke'?'酱香烟熏':style==='smoked'?'炭火熏香':glazed?'双面刷香':'双面原味',secondaryTrait:smoke?'炭火烟香':glazed?'香料焦边':'双面火候',affinity:tech?.affinity||'ordinary',
  affinityLabel:tech?.affinityLabel||'普通',culinaryReason:c.cbTiming?(recipe?'双面自动烤制，酱香与烟香取决于技法时机。':'食材组合不能上架'):tech?.reason||'食材组合不能上架',
  events:c.skewer.map((id,index)=>({id,t:0,index})),actions:c.actions.map(a=>({...a,with:[...a.with]})),
  duration:+c.elapsed.toFixed(2),doneness:[...states,...missing.map(id=>({id,label:'未穿串'}))],reason:sellable?(c.cbTiming?'双面熟透':tech.reason):status,
  facts:{lane:c.lane,...(c.cbTiming?{rate,automatic:true}:{}),skewer:[...c.skewer],ordered,frontBack:c.skewer.map(id=>({id,...grillHeat(id,c.elapsed,c.actions,rate,!!c.cbTiming)})),turnedAt:turn?.t??null,brushedAt:brush?.t??null}};
}
