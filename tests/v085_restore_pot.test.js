import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,nextPhase,ensureKitchen,fieldWeaponChoices,fieldWeaponSnapshot,
 selectedFieldWeaponType,selectFieldWeapon,enterField,configureKitchenSlot} from '../src/engine.js';
import {fieldPotPose} from '../src/field_pose_v083.js';
import {startActionField,stepActionField,useFieldSkill} from '../src/field_v04.js';

const prepare=()=>{const s=newGame(20261012);nextPhase(s,'field');return s;};
test('both WOK and POT are always displayed as selectable expedition modes',()=>{
 const s=prepare();
 assert.deepEqual(fieldWeaponChoices(s).map(x=>x.type),['WOK','POT']);
 assert.equal(selectFieldWeapon(s,'POT'),true);
 assert.equal(selectedFieldWeaponType(s),'POT');
 assert.deepEqual({type:fieldWeaponSnapshot(s).type,level:fieldWeaponSnapshot(s).level},{type:'POT',level:1});
 assert.equal(selectFieldWeapon(s,'WOK'),true);
 assert.equal(fieldWeaponSnapshot(s).type,'WOK');
});

test('fitting two WOK kitchen stations does not remove the spare Lv1 POT weapon',()=>{
 const s=prepare(),k=ensureKitchen(s);
 k.slots[0]={type:'WOK',level:2};
 k.slots[1]={type:'WOK',level:1};
 const before=JSON.stringify(k.slots);
 const choices=fieldWeaponChoices(s);
 assert.deepEqual(choices.map(c=>c.type),['WOK','POT']);
 assert.equal(choices.find(c=>c.type==='WOK').level,2);
 assert.equal(choices.find(c=>c.type==='POT').level,1);
 assert.equal(choices.find(c=>c.type==='POT').source,'reserve');
 assert.equal(selectFieldWeapon(s,'POT'),true);
 const weapon=fieldWeaponSnapshot(s);
 assert.equal(weapon.type,'POT');assert.equal(weapon.level,1);assert.equal(weapon.slotIndex,null);
 assert.equal(weapon.attackId,'pot_onion');assert.equal(weapon.skillId,'pot_pressure');
 assert.deepEqual(k.slots.map(x=>x.type),JSON.parse(before).map(x=>x.type),'spare expedition weapon does not refit kitchen');
 assert.equal(k.slots[1].level,2,'both WOK stoves inherit one shared type mastery, instead of requiring separate upgrades');
 assert.equal(enterField(s,'safe'),true);
 assert.equal(s.field.weapon.type,'POT');
 assert.equal(s.field.weapon.level,1);
 assert.equal(selectFieldWeapon(s,'WOK'),false,'cannot change weapon in an active expedition');
});

test('two POT stations still allow spare basic WOK; fitted POT inherits actual level',()=>{
 const s=prepare();
 s.kitchen.slots=[{type:'POT',level:2},{type:'POT',level:1}];
 assert.equal(fieldWeaponChoices(s).find(c=>c.type==='POT').level,2);
 assert.equal(fieldWeaponChoices(s).find(c=>c.type==='WOK').source,'reserve');
 assert.equal(selectFieldWeapon(s,'WOK'),true);
 assert.equal(fieldWeaponSnapshot(s).level,1);
 assert.equal(selectFieldWeapon(s,'POT'),true);
 assert.equal(fieldWeaponSnapshot(s).level,2);
 assert.equal(fieldWeaponSnapshot(s).slotIndex,0);
});

test('legacy selectedWeaponSlot without type remains compatible',()=>{
 const s=prepare();
 delete s.selectedWeaponType;
 s.selectedWeaponSlot=1;
 assert.equal(fieldWeaponSnapshot(s).type,'POT');
 assert.equal(selectFieldWeapon(s,0),true);
 assert.equal(fieldWeaponSnapshot(s).type,'WOK');
 assert.equal(selectFieldWeapon(s,1),true);
 assert.equal(fieldWeaponSnapshot(s).type,'POT');
});

test('spare POT can actually launch free onion bombs with no onion inventory',()=>{
 const s=prepare();s.kitchen.slots=[{type:'WOK',level:1},{type:'WOK',level:2}];
 assert.equal(selectFieldWeapon(s,'POT'),true);
 assert.ok(enterField(s,'risk'));
 assert.ok(startActionField(s));
 const f=s.field;
 f.enemies=[{id:'target',kind:'pepper',x:f.pos.x+.6,y:f.pos.y-.2,hp:8,maxHp:8,cooldown:999,phase:0}];
 f.hazards=[];const onions=s.inventory.onion||0;
 f.attackCd=0;
 for(let i=0;i<17;i++)stepActionField(s,0,0,.06);
 assert.ok(f.enemies[0].hp<8,'remote thrown-onion attacks must work');
 assert.equal(s.inventory.onion||0,onions,'animated onion ammo never consumes real ingredients');
 f.skillCd=0;assert.equal(useFieldSkill(s),true);
 assert.ok(f.playerProjectiles.some(p=>p.damage===2));
});

test('four-direction POT stance and renderer keep a recognisable lower held pot',()=>{
 const directions=[{x:1,y:0},{x:-1,y:0},{x:0,y:-1},{x:0,y:1}];
 for(const f of directions){
  const pose=fieldPotPose(f);
  assert.ok(Math.abs(pose.pot.x)>18);
  assert.ok(pose.pot.y>0,'must not obscure chef head');
  assert.equal(Math.sign(pose.pot.x),Math.sign(pose.hand.x));
 }
 assert.notEqual(fieldPotPose({x:1,y:0}).side,fieldPotPose({x:-1,y:0}).side);
 assert.ok(fieldPotPose({x:1,y:0},false,0,true).pot.y<fieldPotPose({x:1,y:0}).pot.y);
 const source=readFileSync(new URL('../src/scenes_v04.js',import.meta.url),'utf8');
 assert.match(source,/fieldPotPose/);
 assert.match(source,/POT FOREGROUND/);
 assert.match(source,/ellipse\(0,-4,7\.5,3/);
 assert.doesNotMatch(source,/text\(c,'🍲',17,-10/);
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/fieldWeaponChoices\(game\)/);
 assert.match(app,/data-weapon="\$\{type\}"/);
});

test('kitchen POT station rendering and refit controls are preserved independently',()=>{
 const s=newGame();
 assert.equal(s.kitchen.slots[1].type,'POT');
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/data-act="kitchen:\$\{i\}:POT"/);
 assert.match(app,/slot\.type==='WOK'\?'炒锅':'炖锅'/);
});
