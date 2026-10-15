// v0.12-F: distinguish the run's user-selected daily ingredient from a
// branch-local key:'target' which only unlocks progression to the next zone.
export function fieldDailyTarget(f){
 if(typeof f?.dailyTarget==='string'&&f.dailyTarget)return f.dailyTarget;
 // Legacy schema-4 expeditions preserve the original first-step target in
 // sequence even after branch maps replace their local target node.
 return f?.sequence?.[0]?.type==='gather'?f.sequence[0].id:null;
}
export function fieldHarvestTargetKind(f,node){
 if(!node||node.key!=='target')return null;
 const daily=fieldDailyTarget(f);
 return daily&&node.id===daily?'daily':'segment';
}
export function fieldHarvestTargetSuffix(f,node,{action=false}={}){
 const kind=fieldHarvestTargetKind(f,node);
 if(kind==='daily')return action?' · 今日目标已完成，可撤离！':' · 今日目标已完成！';
 if(kind==='segment')return action?' · 本区采集完成，可继续探索！':' · 本区采集完成！';
 return '';
}
