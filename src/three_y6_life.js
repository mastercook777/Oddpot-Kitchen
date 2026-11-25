// Y6 presentation contract: actual order clock, actual recipe ingredients.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export const Y6_SPECIES=Object.freeze(['gardener','adventurer','family','regular','critic','stargazer']);
export function dinerIdentity(id,kind){let n=2166136261;for(const c of String(id)+'|'+kind)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return {variant:n%4,phase:(n%997)/997*6.283185,tempo:.85+(n%19)/60};}
export function mealLife(order,t,eatSeconds=3){
 const status=order?.status||'',elapsed=Number.isFinite(order?.landedAt)?clamp(t-order.landedAt,0,eatSeconds):0;
 const p=status==='review'||status==='served'?1:status==='eating'?elapsed/eatSeconds:0;
 const bites=p>=1?3:Math.min(3,Math.floor(p*3+.30)),cycle=clamp(p*3-Math.floor(p*3)),lift=cycle<.17?0:cycle<.57?smooth((cycle-.17)/.40):cycle<.75?1:1-smooth((cycle-.75)/.25);
 return {portion:status==='review'||status==='served'?0:status==='eating'?1-bites/3:1,progress:p,bites,cycle,lift:status==='eating'?lift:0,chew:status==='eating'&&cycle>=.57&&cycle<.80};
}
export function guestLife(kind,order,t,flags={},id=''){
 const identity=dinerIdentity(id,kind),meal=mealLife(order,t),status=order?.status;
 const mode=flags.moving?'walk':flags.waiting?'queue':status==='eating'?'eat':status==='review'?'review':flags.seated?(status==='ordering'?'order':status==='pickup'||status==='carried'||status==='delivering'?'anticipate':'wait'):'idle';
 const a=t*identity.tempo+identity.phase,impatient=Number.isFinite(order?.patience)&&Number.isFinite(order?.arrival)&&order.patience-(t-order.arrival)<8;
 const reaction=mode==='review'?Math.sin(Math.PI*clamp((t-(order.reviewAt??t))/2)):0;
 return {mode,meal,identity,a,impatient,positive:(order?.sat??70)>=70,reaction,look:Math.sin(a*1.18)*.13,breath:Math.sin(a*2.3)*.014};
}
export const ingredientShape=id=>({beef:'beef',chicken:'chicken',mushroom:'mushroom',mushroom_heart:'mushroom',cabbage:'leaf',sky_moss:'leaf',garlic:'garlic',onion:'onion',potato:'potato',chili:'pepper',ember_pepper:'pepper',cloud_rice:'rice',storm_egg:'egg',sour_bell:'berry',tide_sour_pulp:'berry',starlit_nectar:'nectar',gale_core:'crystal'})[id]||'potato';
export function dishPlan(recipe,portion=1){
 const ids=recipe?.ids?.length?recipe.ids:['cabbage'],method=recipe?.method,kind=method==='stew'?'soup':method==='grill'?'skewer':method==='steam'?'steam':'stir',count=kind==='skewer'?8:12,visible=Math.ceil(count*clamp(portion)),pieces=[];
 for(let i=0;i<count;i++){const id=ids[i%ids.length],a=i*2.399963,rad=.04+.095*Math.sqrt((i+.5)/count),x=kind==='skewer'?(i<4?-.076:.076):Math.cos(a)*rad,z=kind==='skewer'?-.122+(i%4)*.081:Math.sin(a)*rad;
 pieces.push({id,shape:ingredientShape(id),x,z,y:kind==='soup'?.151:kind==='skewer'?.083:kind==='steam'?.109:.082,angle:a,visible:i<visible});}
 return {kind,pieces,portion:clamp(portion),broth:kind==='soup'&&portion>0};
}
