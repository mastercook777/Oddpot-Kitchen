// Shared pure pointer math; platform-independent so it can be unit-tested.
export function joystickVector(originX,originY,pointerX,pointerY,radius=54,deadZone=9){
 const dx=pointerX-originX,dy=pointerY-originY,d=Math.hypot(dx,dy);
 if(d<=deadZone)return {x:0,y:0,knobX:0,knobY:0};
 const t=Math.min(1,(d-deadZone)/Math.max(1,radius-deadZone));
 const a=t*dx/d,b=t*dy/d;
 return {x:a,y:b,knobX:dx/d*Math.min(radius,d),knobY:dy/d*Math.min(radius,d)};
}