// Visual idle choreography only. Positions are normalized restaurant floor
// coordinates; the real service actors take over as soon as a shift starts.
export function homeKitchenActors(s,time,reducedMotion=false){
 const crew=s.crew||{};
 const moving=!reducedMotion;
 const sway=(phase,span)=>moving?Math.sin(time*.68+phase)*span:0;
 const actors=[{id:'home-chef',kind:'chef',x:.50+sway(0,.095),y:.314+sway(1,.018),walk:moving,working:moving&&Math.sin(time*.68)>0}];
 if(crew.helper?.hired){
  const station=Math.min(2,crew.helper.station||0),base=[.16,.84,.42][station];
  actors.push({id:'home-helper',kind:'helper',level:crew.helper.level||1,x:base+sway(1.9,.037),y:.332+sway(2.4,.012),walk:moving,working:moving});
 }
 if(crew.helper2?.hired&&s.kitchen?.thirdUnlocked){
  const station=Math.min(2,crew.helper2.station??2),base=[.16,.84,.42][station];
  actors.push({id:'home-helper2',kind:'helper2',level:crew.helper2.level||1,x:base+sway(3.5,.032),y:.32+sway(4,.012),walk:moving,working:moving});
 }
 if(crew.waiter?.hired)actors.push({id:'home-waiter',kind:'waiter',level:crew.waiter.level||1,x:.5+sway(4.3,.105),y:.57+sway(5,.02),walk:moving});
 if(s.activeWorld==='cloud'&&crew.waiter2?.hired)actors.push({id:'home-waiter2',kind:'waiter2',level:crew.waiter2.level||1,x:.60+sway(2.7,.065),y:.62+sway(3.1,.015),walk:moving});
 return actors;
}

export function homeKitchenChatter(s,time,reducedMotion=false){
 if(reducedMotion)return null;
 const seconds=time%19;
 if(seconds>2.4)return null;
 if(seconds<1.2)return s.crew?.helper?.hired?
  {actor:'home-helper',text:'今晚试试新味道？'}:{actor:'home-chef',text:'今天会遇见谁呢？'};
 if(s.crew?.waiter?.hired)return {actor:'home-waiter',text:'我把餐桌收拾好啦！'};
 if(s.crew?.helper2?.hired&&s.kitchen?.thirdUnlocked)return {actor:'home-helper2',text:'中间这锅交给我！'};
 return {actor:'home-chef',text:'锅已经热起来啦！'};
}
