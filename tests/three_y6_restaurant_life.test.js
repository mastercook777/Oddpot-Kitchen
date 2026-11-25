import test from 'node:test';import assert from 'node:assert/strict';
import {Y6_SPECIES,dinerIdentity,mealLife,guestLife,dishPlan,ingredientShape} from '../src/three_y6_life.js';
import {RECIPES,ING,CUSTOMERS} from '../src/data.js';
import {DINER_TIMING} from '../src/engine.js';
test('Y6 six genuine species, stable visual identity and independent idle phases',()=>{
 assert.deepEqual(Y6_SPECIES.slice().sort(),Object.keys(CUSTOMERS).filter(k=>!k.startsWith('cloud_')).sort());
 for(const kind of Y6_SPECIES){const phases=new Set();for(let i=0;i<32;i++){const id='o-'+i,b=dinerIdentity(id,kind);assert.deepEqual(b,dinerIdentity(id,kind));phases.add(b.phase);assert.ok(b.variant>=0&&b.variant<4);}assert.ok(phases.size>20);}
});
test('Y6 order states, real eating clock, empty review plate and readonly model',()=>{
 for(const kind of Y6_SPECIES)for(let i=0;i<8;i++)for(const status of ['waiting','entering','ordering','queued','cooking','pickup','carried','delivering','eating','review','served','left']){
  const o={id:'o-'+i,status,landedAt:10,reviewAt:13,arrival:2,patience:17,sat:i%2?55:85},before=JSON.stringify(o);let prev=1;
  for(let j=0;j<=60;j++){const t=10+j*.05,v=guestLife(kind,o,t,{moving:status==='entering',seated:!['waiting','entering','left'].includes(status),waiting:status==='waiting'},o.id);
   assert.ok(Number.isFinite(v.meal.portion)&&v.meal.portion>=0&&v.meal.portion<=1);assert.ok(v.meal.portion<=prev+1e-8);assert.ok(v.meal.lift>=0&&v.meal.lift<=1);assert.equal(JSON.stringify(o),before);prev=v.meal.portion;
   if(status==='eating')assert.equal(v.mode,'eat');if(status==='review'){assert.equal(v.mode,'review');assert.equal(v.meal.portion,0);}
  }
  if(status==='eating')assert.equal(prev,0);
 }
 assert.equal(mealLife({status:'eating',landedAt:10},10,DINER_TIMING.eat).portion,1);
 assert.equal(mealLife({status:'eating',landedAt:10},13,DINER_TIMING.eat).portion,0);
 assert.equal(mealLife({status:'review'},0).portion,0);
 assert.equal(guestLife('regular',null,1,{},'new').mode,'idle');
});
test('Y6 all current recipes and real ingredients map to physical plates and monotone portions',()=>{
 for(const id of Object.keys(ING))assert.notEqual(ingredientShape(id),undefined);
 for(const [id,recipe] of Object.entries(RECIPES)){const before=JSON.stringify(recipe);let prev=Infinity;
  for(const portion of [1,2/3,1/3,0]){const p=dishPlan(recipe,portion),count=p.pieces.filter(x=>x.visible).length;assert.ok(p.pieces.every(x=>recipe.ids.includes(x.id)&&[x.x,x.y,x.z,x.angle].every(Number.isFinite)),id);assert.equal(count,Math.ceil(p.pieces.length*portion));assert.ok(count<=prev);prev=count;assert.equal(p.broth,recipe.method==='stew'&&portion>0);assert.equal(JSON.stringify(recipe),before);}
 }
 assert.equal(dishPlan(null,0).pieces.filter(p=>p.visible).length,0);
});
