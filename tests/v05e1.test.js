import test from 'node:test';
import assert from 'node:assert/strict';
import {dinerBubbleSize,dinerBubbleLayout,guestStagePosition} from '../src/scenes_v04.js';
const guest=(id,tableId,seatId,status='ordering')=>({id,tableId,seatId,status,doorAt:0,arrival:0});
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));

test('bubble tail stays within 6px of the actor head for a single seated guest',()=>{
 for(const w of [320,375,390]){
  const g=guest('single',1,1),h=480,t=5;
  const [bubble]=dinerBubbleLayout([g],t,w,h),pos=guestStagePosition(g,t,w,h);
  assert.equal(bubble.anchorY,pos.y-22);
  assert.ok(bubble.anchorY-(bubble.y+bubble.height)<=10);
  assert.ok(Math.abs(bubble.anchorX-(bubble.x+bubble.width/2))<34);
 }
});

test('two diners at the same table have non-overlapping, nearby request bubbles',()=>{
 for(const w of [320,375,390]){
  const boxes=dinerBubbleLayout([guest('a',0,0),guest('b',0,1)],5,w,460);
  assert.equal(boxes.length,2);
  assert.equal(overlap(...boxes),0);
  for(const box of boxes){
   assert.ok(box.anchorY-(box.y+box.height)<=14,'speech should be close to head');
   assert.ok(box.x>=8&&box.x+box.width<=w-8,'speech should stay inside scene');
  }
  assert.equal(boxes[0].y,boxes[1].y,'no arbitrary seat-specific vertical shift');
 }
});

test('four simultaneous guest reviews are readable without collisions at 320px',()=>{
 const guests=[];
 for(let table=0;table<2;table++)for(let seat=0;seat<2;seat++)guests.push({...guest(`${table}:${seat}`,table,seat,'review'),reviewText:'味道不错，服务很热情',reviewType:'happy'});
 for(const w of [320,390]){
  const boxes=dinerBubbleLayout(guests,5,w,450);
  assert.equal(boxes.length,4);
  for(let i=0;i<boxes.length;i++){
   const b=boxes[i];assert.ok(b.x>=8&&b.x+b.width<=w-8);assert.ok(b.y>=8&&b.y+b.height<=442);
   for(let j=i+1;j<boxes.length;j++)assert.equal(overlap(b,boxes[j]),0,`overlap at ${w}px between ${i} and ${j}`);
  }
 }
});

test('long reviews wrap instead of drawing past bubble bounds',()=>{
 const b=dinerBubbleSize('这道料理口感非常丰富但等餐时间实在太长啦','late');
 assert.equal(b.lines.length,2);assert.ok(b.width<=135);assert.ok(b.height>=39);
 assert.ok(b.lines.every(s=>Array.from(s).length<=8));
});

test('off-screen or eating guests do not create decorative speech',()=>{
 const guests=[guest('entry',0,0),{...guest('eat',0,1,'eating'),landedAt:4}];
 assert.equal(dinerBubbleLayout(guests,-1,320,430).length,0);
 assert.equal(dinerBubbleLayout(guests,5,320,430).length,1);
});

test('no more than two low-value menu musings obscure important dining reviews',()=>{
 const os=[guest('a',0,0),guest('b',0,1),
  {...guest('c',1,0,'review'),reviewText:'真好吃',reviewType:'happy'},
  {...guest('d',1,1,'review'),reviewText:'有点辣',reviewType:'taste'}];
 const boxes=dinerBubbleLayout(os,5,390,490);
 assert.equal(boxes.length,2);
 assert.ok(boxes.every(box=>box.kind!=='choice'));
 assert.equal(overlap(boxes[0],boxes[1]),0);
 for(const box of boxes)assert.ok(box.anchorY-(box.y+box.height)<=12);
});