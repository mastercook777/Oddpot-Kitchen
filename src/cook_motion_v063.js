// v0.6.3-C: deterministic, stateless presentation for the live pan.
// Exactly one transform per original ingredient node; no clones, canvas trails,
// transform/keyframe races or duplicated emoji/sprite layers.
const MOTION_DURATION={flip:1.15,toss:.88,gentle:1.35,reduce:1.55};
const ACTION_LABEL={flip:'🍳 翻炒',toss:'↗ 颠勺',gentle:'🥄 轻搅',reduce:'💧 收汁'};
const motionClamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const easeOut=p=>1-Math.pow(1-p,3);

export function livePanMotion(cook,dimensions={width:310,height:190}){
 const w=Math.max(160,dimensions.width||310),h=Math.max(90,dimensions.height||190);
 const t=Math.max(0,cook?.elapsed||0),isPot=cook?.vessel==='POT';
 const drops=cook?.dropped||[],actions=cook?.actions||[];
 // Actions are keyed to the recipe's actual elapsed clock, not wall-clock time.
 // This makes a re-render or saved-game resume unable to spawn duplicate effects.
 const active=actions.slice().reverse().find(a=>t>=a.t&&(t-a.t)<(MOTION_DURATION[a.type]||0));
 const p=active?motionClamp((t-active.t)/MOTION_DURATION[active.type]):1;
 const swing=active?Math.sin(Math.PI*p):0;
 const radiusX=Math.min(w*.205,h*.32),radiusY=Math.min(w*.12,h*.19);
 const latestReduction=actions.slice().reverse().find(a=>a.type==='reduce'&&t>=a.t);
 let panRotation=0,panLift=0,glow=0,ripple=0,
     brothScale=latestReduction?1-.37*easeOut(motionClamp((t-latestReduction.t)/MOTION_DURATION.reduce)):1,steam=1;
 if(active?.type==='toss'){panRotation=12*Math.sin(Math.PI*2*p)*Math.pow(1-p,.38);panLift=-7*swing;glow=.55*swing;steam=1+.75*swing;}
 if(active?.type==='flip'){panRotation=4.5*Math.sin(Math.PI*4*p)*(1-p);glow=.35*swing;steam=1+.2*swing;}
 if(active?.type==='gentle'){panRotation=1.6*Math.sin(Math.PI*2*p);ripple=.85*swing;steam=1+.16*swing;}
 if(active?.type==='reduce'){ripple=.55*swing;glow=.35*swing;steam=1+1.4*swing;}
 const items=drops.map((d,i)=>{
   // Base simmer movement uses elapsed cooking time, not frame count.
   // Individual action motion applies only to ingredients already in the pot.
   const angle=t*(isPot?.62:1.17)+i*2.3999632;
   let x=Math.cos(angle)*radiusX,y=Math.sin(angle)*radiusY;
   let rotation=0,scale=1;
   const age=t-(d.t||0);
   if(active?.with?.includes(d.id)){
    if(active.type==='toss'){
     // Shared ballistic arc. All food remains the SAME DOM nodes.
     x+=Math.sin(p*Math.PI)*Math.min(18,w*.06)+Math.sin(i*2.7)*5*swing;
     y-=Math.min(58,h*.34)*swing;
     rotation=180*p*(i%2===0?1:-1);
     scale=1+.13*swing;
    }else if(active.type==='flip'){
     const spin=2*Math.PI*1.35*easeOut(p);
     x=Math.cos(angle+spin)*radiusX*1.02;
     y=Math.sin(angle+spin)*radiusY*.95;
     rotation=220*p;
    }else if(active.type==='gentle'){
     const stir=2*Math.PI*.75*easeOut(p);
     x=Math.cos(angle+stir)*radiusX*.72;
     y=Math.sin(angle+stir)*radiusY*.69;
     rotation=32*swing;
    }else if(active.type==='reduce'){
     x*=1-.13*swing;y*=1-.13*swing;
     scale=1-.08*swing;
    }
   }
   // A single entry arc. No duplicate falling icon is ever drawn.
   if(age>=0&&age<.53){
     const entry=1-easeOut(motionClamp(age/.53));
     y-=Math.min(76,h*.48)*entry;
     scale*=.88+.12*(1-entry);
   }
   return {id:d.id,x,y,rotation,scale,opacity:1};
 });
 return {
   items,panRotation,panLift,glow,ripple,brothScale,steam,
   action:active?.type||null,
   actionLabel:active?ACTION_LABEL[active.type]:null,
   actionOpacity:active?Math.pow(Math.sin(Math.PI*p),.75):0,
   elapsed:t
 };
}
