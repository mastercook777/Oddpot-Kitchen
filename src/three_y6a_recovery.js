// Recover transient network / WebGL failures without changing game state.
export function createRecovery({now=()=>performance.now(),limit=3,delay=900}={}){
 let failures=0,next=0,successAt=null;
 return {canTry:()=>failures<limit&&now()>=next,
  fail(){failures++;successAt=null;next=now()+delay*failures;},
  success(){if(successAt===null)successAt=now();if(now()-successAt>=2500){failures=0;next=0;}},
  reset(){failures=0;next=0;successAt=null;},
  get exhausted(){return failures>=limit;},get failures(){return failures;}};
}
export function createRetryLoader(loaders,{now=()=>performance.now(),delay=900}={}){
 let value=null,pending=null,attempt=0,next=0;
 return {get value(){return value;},get exhausted(){return attempt>=loaders.length&&!pending&&!value;},
  get pending(){return pending;},
  tryLoad(){if(value)return Promise.resolve(value);if(pending)return pending;if(attempt>=loaders.length||now()<next)return Promise.resolve(null);
   const loader=loaders[attempt++];pending=Promise.resolve().then(loader).then(v=>{value=v;return v;}).catch(e=>{next=now()+delay*attempt;console.warn('Oddpot resource retry',String(e));return null;}).finally(()=>{pending=null;});return pending;
  },reset(){if(!value&&!pending){attempt=0;next=0;}}};
}
// Primary jsDelivr URL remains identical to existing smoke interception.
// A distinct module URL allows retry after the browser caches a rejected import.
export const sharedThree=createRetryLoader([
 ()=>import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js'),
 ()=>import('https://unpkg.com/three@0.170.0/build/three.module.js'),
 ()=>import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js?retry=y6a')
]);
export function visibleHost(el){return !!el?.isConnected&&el.clientWidth>=5&&el.clientHeight>=5&&!document.hidden;}
