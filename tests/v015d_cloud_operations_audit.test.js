import test from 'node:test';
import assert from 'node:assert/strict';
import {runAudit} from '../scripts/audit-cloud-v015d.mjs';

test('v0.15-D: real Cloud operations paired-capacity and earned freight audit is reproducible',()=>{
 const x=runAudit({runs:12,days:18});
 assert.equal(x.panel.runs,12);
 assert.equal(x.economy.days,18);
 for(const [id,r] of Object.entries(x.panel.summary)){
  assert.ok(r.served>=0&&r.served<=14,id);
  assert.ok(r.late>=0&&r.late<=14,id);
 }
 assert.equal(x.economy.summary.market_only.totalImportReceived,0);
 assert.equal(x.economy.summary.one_earned_export.totalImportReceived,6*8,
  'one authentic Hearth commission can only issue one eight-unit cargo per paired seed');
 // Print factual observation for GitHub CI log, not predeclared target outcomes.
 console.log('CLOUD_V015D_AUDIT_JSON='+JSON.stringify(x));
});
