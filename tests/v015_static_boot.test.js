import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Pages direct-static entry loads portal CSS as a stylesheet, not an unsupported JS module',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(html,/<link rel="stylesheet" href="\.\/src\/portal_v015\.css\?v=0\.15\.0-alpha\.8"\/>/);
 assert.match(html,/<script type="module" src="\.\/src\/app\.js\?v=0\.15\.0-alpha\.8"/);
 assert.doesNotMatch(app,/^import\s+['"].*\.css['"];?/m);
});
