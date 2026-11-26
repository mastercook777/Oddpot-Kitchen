import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const block=source.slice(source.indexOf('// Z2d.1: DOM-only focus state'),source.indexOf('function render(){'));
function fixture(){
 const make=(tag,attrs={},opts={})=>({tagName:tag,attributes:Object.entries(attrs).map(([name,value])=>({name,value})),tabIndex:opts.tabIndex??0,matches:s=>s===':disabled'?!!opts.disabled:true,getClientRects:()=>opts.hidden?[]:[{}],focus(){this.focused=(this.focused||0)+1}});
 const root=(els,children=[])=>({children,querySelectorAll:()=>els,contains:e=>els.includes(e),querySelector:s=>s==='.sheet-close'?els[0]:null});
 const game={phase:'forecast'},app={querySelector:s=>s==='.game-shell'?app.shell:app.sheet};
 const api=new Function('app','game',block+';return {drawerFocusSnapshot,drawerFindFocus,drawerFocusAfterRender,drawerTab,drawerControls};')(app,game);
 return {api,make,root,app,game};
}
test('Z2d restores repeated controls by stable attribute key and rejects hidden or disabled controls',()=>{
 const {api,make,root}=fixture(),a=make('BUTTON',{'data-act':'book'}),b=make('BUTTON',{'data-act':'book'}),other=make('BUTTON',{'data-act':'stock'});
 const snap=api.drawerFocusSnapshot(root([a,b,other]),b);
 const a2=make('BUTTON',{'data-act':'book'}),b2=make('BUTTON',{'data-act':'book'}),dead=make('BUTTON',{'data-act':'book'},{disabled:true});
 assert.equal(api.drawerFindFocus(root([other,a2,b2]),snap),b2);
 assert.equal(api.drawerFindFocus(root([a2,dead]),snap),null);
 assert.equal(api.drawerFindFocus(root([a2]),snap),null);
 assert.equal(api.drawerFocusSnapshot(root([a]),b),null);
 assert.deepEqual(api.drawerControls(root([a2,dead,make('BUTTON',{}, {hidden:true}),make('BUTTON',{}, {tabIndex:-1})])),[a2]);
});
test('Z2d drawer focuses close, isolates background, restores controls, wraps Tab and returns opener',()=>{
 const {api,make,root,app,game}=fixture();
 const opener=make('BUTTON',{'data-act':'book'}),origin=api.drawerFocusSnapshot(root([opener]),opener);
 const close=make('BUTTON',{'data-act':'close-sheet'}),filter=make('BUTTON',{'data-book-region':'all'});
 const background={classList:{contains:()=>false}},backdrop={classList:{contains:s=>s==='sheet-backdrop'}};
 app.sheet=Object.assign(root([close,filter]),{dataset:{sheetKind:'book'}});
 app.shell=root([], [background,backdrop,app.sheet]);
 api.drawerFocusAfterRender(undefined,null,origin);
 assert.equal(close.focused,1);assert.equal(background.inert,true);assert.equal(backdrop.inert,undefined);
 const snap=api.drawerFocusSnapshot(app.sheet,filter);
 const close2=make('BUTTON',{'data-act':'close-sheet'}),filter2=make('BUTTON',{'data-book-region':'all'});
 app.sheet=Object.assign(root([close2,filter2]),{dataset:{sheetKind:'book'}});app.shell=root([],[background,backdrop,app.sheet]);
 api.drawerFocusAfterRender('book',snap,null);assert.equal(filter2.focused,1);
 let prevented=0;const event=(shiftKey,key='Tab')=>({key,shiftKey,preventDefault:()=>prevented++});
 assert.equal(api.drawerTab(event(false),app.sheet,filter2),true);assert.equal(close2.focused,1);
 assert.equal(api.drawerTab(event(true),app.sheet,close2),true);assert.equal(filter2.focused,2);
 assert.equal(api.drawerTab(event(false),app.sheet,close2),false);assert.equal(api.drawerTab(event(false,'Enter'),app.sheet,filter2),false);assert.equal(prevented,2);
 const opener2=make('BUTTON',{'data-act':'book'});app.sheet=null;app.shell=root([opener2]);
 api.drawerFocusAfterRender('book',null,null);assert.equal(opener2.focused,1);
 app.sheet=Object.assign(root([close2]),{dataset:{sheetKind:'book'}});app.shell=root([],[app.sheet]);api.drawerFocusAfterRender(undefined,null,origin);
 game.phase='research';app.sheet=null;app.shell=root([opener2]);api.drawerFocusAfterRender('book',null,null);assert.equal(opener2.focused,1);
});
