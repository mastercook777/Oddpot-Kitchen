// v0.8.3: procedural held-utensil geometry. All offsets are Canvas pixels
// relative to the current chef sprite; no external art or new equipment rules.
export function fieldWokPose(facing={x:0,y:1},moving=false,time=0,parrying=false){
 const x=Number(facing?.x)||0,y=Number(facing?.y)||0;
 const direction=Math.abs(x)>.35?(x>0?'right':'left'):(y<0?'up':'down');
 const shieldSign=direction==='right'||direction==='up'?1:-1;
 const bob=moving?Math.sin(time*11)*1.2:0;
 const shield={x:shieldSign*21.5,y:(direction==='up'?5:7)+bob-(parrying?3:0),
   radius:6.7};
 const weapon={x:-shieldSign*23,y:5+bob,angle:-shieldSign*.45};
 const hand={x:-shieldSign*11,y:8+bob};
 return {direction,shield,weapon,hand,shieldSign};
}

// Carry a recognisable cauldron low by the forearm, NOT a floating emoji by
// the character face. POT keeps one full hand free to lob magical onion bombs.
export function fieldPotPose(facing={x:0,y:1},moving=false,time=0,casting=false){
 const x=Number(facing?.x)||0,y=Number(facing?.y)||0;
 const direction=Math.abs(x)>.35?(x>0?'right':'left'):(y<0?'up':'down');
 const side=direction==='left'||direction==='up'?-1:1;
 const bob=moving?Math.sin(time*11)*1.0:0;
 return {direction,side,hand:{x:side*9,y:7+bob},pot:{x:side*20.5,y:8+bob-(casting?2:0),scale:.98},casting};
}
