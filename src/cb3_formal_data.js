// Formal migration staging; separate from cbExperiment, never activates Build.
import {cb3MigrationPlan,cb3SafeBoundary} from './cb3_migration_a1.js?v=cb3a1';
import {evaluateCBDeck,compileCBDeck} from './cb_build_rules.js?v=cb3a2';
const copy=x=>x==null?x:JSON.parse(JSON.stringify(x));
const worldOf=s=>s.activeWorld==='cloud'?'cloud':'hearth';
const chapterOf=(s,w)=>w===worldOf(s)?s:s.worlds?.[w];
export function cb3SourceBackup(s){
 const chapters={};
 for(const w of ['hearth','cloud']){const c=chapterOf(s,w);if(c)chapters[w]={menu:copy(c.menu||[]),kitchen:copy(c.kitchen||null)};}
 return {recipes:copy(s.recipes||{}),learned:copy(s.learned||{}),recipeVariants:copy(s.recipeVariants||{}),activeVariantIds:copy(s.activeVariantIds||{}),chapters};
}
export function cb3MigrationCurrent(s){
 const b=s.cbBuild;return b?.schema===1&&b.status==='staged'&&JSON.stringify(b.backup)===JSON.stringify(cb3SourceBackup(s));
}
export function createCB3Staging(s,prepared,snapshot){
 if(s.cbExperiment||!cb3SafeBoundary(s)||s.cbBuild)return null;
 const plan=cb3MigrationPlan(prepared),collection=[],retired=[],chapters={};
 for(const row of plan.collection){
  if(row.status!=='mapped'){retired.push(copy(row));continue;}
  const v=row.history,old=snapshot(prepared,row.oldId,v);
  if(!old){retired.push({...copy(row),status:'missing-snapshot'});continue;}
  const variantId='legacy:'+encodeURIComponent(row.oldId)+':'+encodeURIComponent(row.legacyVariantId||'standard');
  collection.push({variantId,recipeId:row.recipeId,formulaId:row.formulaId,world:row.world,vessel:row.vessel,ingredientIds:[...row.ingredientIds],baseTier:1,rarity:1,affixes:[],style:old.style,styleLabel:old.styleLabel,source:'legacy-migration',oldId:row.oldId,oldVariantId:row.legacyVariantId,legacySnapshot:copy(old)});
 }
 for(const [w,p] of Object.entries(plan.worlds)){
  const c=chapterOf(prepared,w),deck=p.menu.map(m=>m.eligible?collection.find(v=>v.oldId===m.oldId&&v.formulaId===m.formulaId&&v.oldVariantId===(m.history?.variantId??null))?.variantId||null:null);
  const b=evaluateCBDeck(collection,deck,1,v=>v.world===w&&!!c.kitchen?.slots?.some(k=>k.type===v.vessel));
  const needsReview=!p.safeBoundary||p.needsReview||!b.valid;
  chapters[w]={level:1,deck,needsReview,sourceSafe:p.safeBoundary,reasons:[...b.reasons,...(!p.safeBoundary?['章节未到安全迁移边界']:[]),...(p.needsReview?['旧菜单需重新配置']:[])],crafts:b.valid?compileCBDeck(b.variants):{}};
 }
 return {schema:1,status:'staged',backup:cb3SourceBackup(s),collection,retired,chapters,discoveredRecipes:[],discoveredFormulas:[],lockedCrafts:[]};
}
export function discardCB3Migration(s){
 if(s.cbBuild?.schema!==1||s.cbBuild.status!=='staged')return false;
 delete s.cbBuild;return true;
}
