// D0: local device preferences; no game-state schema change.
export const STICK_PREF_KEY='oddpot-ui-joystick-mode';
export function readStickMode(storage){try{return storage?.getItem(STICK_PREF_KEY)==='fixed'?'fixed':'floating'}catch{return 'floating'}}
export function writeStickMode(storage,mode){const value=mode==='fixed'?'fixed':'floating';try{storage?.setItem(STICK_PREF_KEY,value)}catch{}return value}
export function fixedStickAnchor(rect){return {x:rect.left+Math.min(72,rect.width/2),y:rect.bottom-Math.min(72,rect.height/2)}}
export function stickOrigin(mode,rect,x,y){if(mode!=='fixed')return {x,y};if(!rect)return null;const a=fixedStickAnchor(rect);return Math.hypot(x-a.x,y-a.y)<=64?a:null}
// Only actual disposable resources are owned. A malformed resource or one
// throwing during release must not prevent renderer/context teardown.
export function disposeSceneRenderer(scene,renderer){const resources=new Set(),errors=[];const run=(fn)=>{try{fn()}catch(e){errors.push(String(e))}};run(()=>scene.traverse(o=>{if(typeof o.geometry?.dispose==='function')resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(typeof m?.dispose==='function')resources.add(m)}));for(const item of resources)run(()=>item.dispose());run(()=>renderer.dispose());run(()=>renderer.forceContextLoss());return errors}
