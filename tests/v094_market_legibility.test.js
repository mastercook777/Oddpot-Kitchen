import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame,ensureDailyMarket,purchase} from '../src/engine.js';

const src=(name)=>readFileSync(new URL(name,import.meta.url),'utf8');
const rgb=hex=>hex.match(/[0-9a-f]{2}/gi).map(x=>parseInt(x,16)/255)
  .map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
const lum=hex=>rgb(hex).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const [light,dark]=[lum(a),lum(b)].sort((a,b)=>b-a);return(light+.05)/(dark+.05)};

test('pale marketplace sheet uses dark legible price and stock copy',()=>{
 const css=src('../src/kitchen_050.css');
 const selector=css.match(/\.sheet \.stock-line>small\{[^}]*\}/);
 assert.ok(selector,'the sheet price and stock rule must be specifically scoped');
 const color=selector[0].match(/color:\s*(#[0-9a-f]{6})/i);
 assert.ok(color);
 assert.ok(contrast(color[1],'#f1e2bc')>=4.5,
   'small price text must pass WCAG AA against the beige parchment');
 assert.doesNotMatch(css,/\.stock-line>small\{[^}]*color:#e0d5b8/);
});

test('the top-level inventory shortcut is labelled 采购 and still opens existing stock',()=>{
 const app=src('../src/app.js');
 const forecast=app.slice(app.indexOf('function forecast(){'),app.indexOf('\nfunction field(){'));
 assert.match(forecast,/data-act="stock"[^\n]*采购/);
 assert.doesNotMatch(forecast,/data-act="stock"[^\n]*仓库/);
 assert.match(app,/overlay==='stock'/);
});

test('copy-only correction keeps the same randomly limited market and prep-phase purchase',()=>{
 const s=newGame(223),market=ensureDailyMarket(s);
 assert.ok(Object.keys(market.goods).length>=3&&Object.keys(market.goods).length<=4);
 const [id,o]=Object.entries(market.goods)[0],before=s.coins;
 s.phase='prep';
 assert.equal(purchase(s,id,1),true);
 assert.equal(s.coins,before-o.price);
 assert.equal(market.goods[id].stock,o.initialStock-1);
});
