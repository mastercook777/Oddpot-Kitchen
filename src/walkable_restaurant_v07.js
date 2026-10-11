// v0.7.4 mainline walkable restaurant geometry.
// Coordinates live in UNTRANSFORMED diner world (0-1 in w/h), matching
// drawDiner's save/translate/scale exactly. No separate canvas-space scale.
export const HERO_STATIONS={WOK:{x:.21,y:.35},POT:{x:.79,y:.35}};
export const HERO_PASS={x:.50,y:.46};
export const HERO_TABLES=[{x:.28,y:.71},{x:.72,y:.71}];
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const at=(p,q,rx=.12,ry=.09)=>Math.hypot((p.x-q.x)/rx,(p.y-q.y)/ry)<1;
export function newServiceHero(){
 return {x:.5,y:.34,direction:'down',moving:false,energy:6,maxEnergy:6,recovery:0,
   carryOrderId:null,assistIds:[],comfortIds:[],assists:0,comforts:0,delivered:0};
}
export function heroZone(h){
 if(!h)return null;
 // The pass is a separate physical hotspot; this preserves pickup purpose.
 if(at(h,HERO_PASS,.11,.07))return 'PASS';
 for(const [id,p] of Object.entries(HERO_STATIONS))if(at(h,p,.13,.085))return id;
 for(let i=0;i<HERO_TABLES.length;i++)if(at(h,HERO_TABLES[i],.12,.095))return 'TABLE'+i;
 return null;
}
function blocked(x,y){
 // No crossing tables or the solid kitchen counter except its center gap.
 if((x<.12||x>.88)||y<.23||y>.84)return true;
 if(y>.425&&y<.47&&(x<.435||x>.565))return true;
 for(const p of [{x:.28,y:.60},{x:.72,y:.60}]){
  if(Math.hypot((x-p.x)/.16,(y-p.y)/.09)<1)return true;
 }
 return false;
}
export function walkServiceHero(hero,dx,dy,dt){
 if(!hero||!Number.isFinite(dx)||!Number.isFinite(dy)||!Number.isFinite(dt))return false;
 dt=clamp(dt,0,.06);
 const length=Math.hypot(dx,dy);
 if(length<.10||dt===0){hero.moving=false;return false}
 dx/=Math.max(1,length);dy/=Math.max(1,length);
 // Pixel velocity is matched in world units, so up/down does not zoom actors.
 const vx=dx*.40*dt,vy=dy*.32*dt;
 const oldX=hero.x,oldY=hero.y;
 let nx=clamp(hero.x+vx,.12,.88),ny=clamp(hero.y+vy,.23,.84);
 // Split-axis sliding avoids sticky corners and sudden teleports.
 if(!blocked(nx,hero.y))hero.x=nx;
 if(!blocked(hero.x,ny))hero.y=ny;
 hero.moving=Math.hypot(hero.x-oldX,hero.y-oldY)>.0001;
 if(hero.moving)hero.direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
 return hero.moving;
}
export function waiterDeliveryPose(s,simTime){
 const v=s?.service,home={x:HERO_PASS.x,y:HERO_PASS.y};
 const o=v?.orders.find(x=>x.status==='delivering'&&Number.isFinite(x.deliveryAt));
 let table=null,u=0,returning=false,plate=false;
 if(o){table=o.tableId;u=clamp((simTime-o.deliveryAt)/3,0,1);plate=true;}
 else{
  const e=(v?.events||[]).slice().reverse().find(x=>x.type==='waiter_return'&&simTime-x.t>=0&&simTime-x.t<2);
  if(e){table=e.table;u=1-clamp((simTime-e.t)/2,0,1);returning=true;}
 }
 if(table==null)return {...home,moving:false,plate:false};
 // Pass -> center aisle -> table (and back), never jump between unrelated
 // tables or use one-frame teleports for the return journey.
 const mid={x:.5,y:.54},dest=HERO_TABLES[table]||HERO_TABLES[0];
 const seg=.35;const a=u<=seg?home:mid,b=u<=seg?mid:dest;
 const portion=u<=seg?u/seg:(u-seg)/(1-seg);
 return {x:a.x+(b.x-a.x)*portion,y:a.y+(b.y-a.y)*portion,
  moving:true,plate,returning,table};
}
