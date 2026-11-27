// Original indexed pixel clusters. Each key pose describes a complete silhouette;
// the final frames are cached. No AI image, scaling limbs or sine-wave joints.
export const VARIANTS=Object.freeze({A:{name:'冒险家型',note:'短帽、斜挎包、紧凑身形'},B:{name:'经典 JRPG 型',note:'蓬松厨帽、圆脸、活泼身形'},C:{name:'温馨生活型',note:'软帽、宽围裙、敦厚身形'}});
const pal={o:'#34343b',d:'#51423b',h:'#80543b',H:'#b17c50',s:'#d99f75',S:'#f3c99e',r:'#bd644f',R:'#ec9570',w:'#faeed5',W:'#d7c9ad',v:'#a99b89',b:'#45778d',B:'#75a4ac',n:'#2c536a',a:'#e5d0a5',A:'#fff0c8',q:'#b9a37f',k:'#645047',K:'#97734d',g:'#d5ac6a'};
const mask=s=>s.split('/').map(x=>x.replaceAll(' ','.'));
const hats={
 A:mask('.....oooooo...../...ooWWwwwoo..../..oWwwwwwwWWo.../.oWwwwwwwwwWwo../.oWwwwwwwwwWWo../..oWWWWWWWWWo.../..oowwwwwwooo...'),
 B:mask('.......ooooo......./....oooWwwwwooo..../...oWwwwwwwwwWWo.../..oWwwwwwwwwwwWWo../..oWwwwwwwwwwwwWo../...oWWwwwwwwwWWo.../....oWWWWWWWWWo..../....oowwwwwwwoo....'),
 C:mask('.....oooooooo...../...ooWWwwwwWWoo.../..oWwwwwwwwwwwWo../..oWwwwwwwwwwwWo../...oWWwwwwwwWWo.../..ooWWWWWWWWWWoo../..owwwwwwwwwwwWo..')
};
const faces={
 A:{
 front:mask('...ohhSSSSShho../..ohhSSSSSSShho./..ohSSSSSSSSSho./..osSSoSSSoSSso./...oSSoSSSoSSo../...osSSsSSSSso../....osSSrSSso.../.....oossssoo.../.......oooo.....'),
 back:mask('...ohHHHHHHhho../..ohHHHHHHHhhho./..ohHHHHHHhhhho./..ohHHhHHhhhho../...ohHHhhhhhho../...ohhHHhhhho.../....ohhhhhoo..../.....oossoo...../.......oooo.....'),
 side:mask('...ohhSSSSShho../..ohHHhSSSSSSo../..ohHhhSSSSSSo../...ohhhSSSoSSo../...ohsSSSSoSSso./....ohsSSSSSSso./.....osSSSrSoo../......osssso..../.......oooo.....')},
 B:{
 front:mask('...ohhSSSSSSShho.../..ohhSSSSSSSSShho../..ohSSSSSSSSSSSho../..osSSoSSSSoSSSso../...osSoSSSSoSSso.../...osSSrSSrSSso..../....oSSSrrSSSo...../.....oossssoo....../.......oooo........'),
 back:mask('...ohHHHHHHHHhho.../..ohHHHHHHHHHhhho../..ohHHhHHHHHhhhho../..ohHHHHhHHhhhhhho./...ohHHHhhHhhhho.../...ohhHHhhhhhhho.../....ohhhhhhho....../.....oossssoo....../.......oooo........'),
 side:mask('...ohHHhSSSSShho.../..ohHHHhSSSSSSSo.../..ohHHhhSSSSSSSo.../...ohhhSSSSoSSSo.../...ohhsSSSSoSSSso../....ohsSSSSSrSSso../.....osSSSSSooo..../......oossssoo...../........oooo.......')},
 C:{
 front:mask('..oohhSSSSShhooo../..ohhSSSSSSShhho../..ohSSSSSSSSShho../..osSSoSSSoSSSso../..osSSoSSSoSSSso../...osSSrSrSSso.../...osSSSrrSSso.../....oosssssoo..../......ooooo......'),
 back:mask('..oohHHHHHHhhooo../..ohHHHHHHHHhhho../..ohHHHHhHHHhhho../..ohHHHhhHHhhhho../..ohHHHhhhhhhhho../...ohhHHhhhhhho../...ohhhhhhhho.../....oosssssoo..../......ooooo......'),
 side:mask('..oohHHhSSSShhoo../..ohHHHhSSSSSSo../..ohHHhhSSSSSSo../..ohhhsSSSoSSSo../...ohhsSSSoSSSso./....ohsSSSSrSSso./.....osSSSSooo.../......ossssoo..../.......oooo......')}
};
// Hand-authored torso/arms/legs in contact, compression and passing poses.
// Front/back walk sequences use mirrored opposite contact; side has its own opposite contact.
const poses={
 front:[
 mask('.....oooooo...../....obbrrbbo..../...oBbbrrbbno.../..oBBbAAabnnno../..oBbaAAaabnno../..oBbaAaaabnno../..osbaAqaabnso../..osbaAaaabnso../...onaAaaabno.../...onaAaaaqno.../...onaAaaaqno.../....onnnnnno..../....obnoobno..../....okko.okko.../...oKKko.oKKKo../...ooooo.ooooo..'),
 mask('.....oooooo...../...oobbrrbboo.../..oBBbbrrbbnno../..oBbaAAaabnno../.osBbaAaaabnnso./.osBbaAqaabnnso./..oBbaAaaabnno../...onaAaaaqno.../...onaAaaaqno.../....onnnnnno..../...obbnoobnno.../...okkno.obno.../..oKKko...okko../..ooooo..oKKko../.........ooooo..'),
 mask('......oooooo..../.....obbrrbbo.../....oBbbrrbbno../...oBBbaAaabnno./...oBbaAAaabnno./...osbaAqaabnso./....obaAaaabno../....onaAaaaqno../....onaAaaaqno../.....onnnnnno.../......obnoobno../......okkoobno../.....oKKko.okko./.....ooooo.oKKko/...........ooooo')],
 back:[
 mask('.....oooooo...../....oBBBBbbo..../...oBBbbbbnno.../..oBBbaabbbnno../..oBbaababbnno../..osbaababbnso../..osbaababbnso../...onaaaaabno.../...onbbAaabbno../...onbbAaabbno../....onnnnnnno.../....obnooobno.../....okko.ookko../...oKKko.oKKKo../...ooooo.ooooo..'),
 mask('.....oooooo...../...ooBBBBbboo.../..oBBbbbbbbnno../.osBbaaababbnso./.osBbaabbabbnso./..oBbaabbabbnno./...onaaaaabno.../...onbbAaabbno../....onnnnnnno.../...obbnobbbno.../...okkno.obno.../..oKKko...okko../..ooooo..oKKko../.........ooooo..'),
 mask('......oooooo..../.....oBBBBbbo.../....oBBbbbbnno../...oBBbaabbbnno./...osBbaababbnso/....oBbaababbno./....onaaaaabno../....onbbAaabbno./.....onnnnnnno../......obnoobno../......okkoobno../.....oKKko.okko./.....ooooo.oKKko/...........ooooo')],
 side:[
 mask('.....oooooo...../....obbrrbo...../...oBBbrrbno..../..oBBbbaAano..../..oBBbbaAano..../..oBbbbaAano..../..oBbbsAaAno..../..onbbsAaAno..../...onbsaAano..../...onbbaaqno..../....onnnnnno..../....obnoobno..../....okko.okko.../...oKKko.oKKko../...ooooo.ooooo..'),
 mask('......oooooo..../.....obbrrbo..../...ooBBbrrbno.../..oBBbbaAAano.../.osBBbbaAAano.../.osBbbbaAAano.../..oBbbbaAasno.../...onbbaAasno.../...onbbaAaqno.../....onnnnnno..../...obbnoobno..../..obbno..obno.../.okkko....okko../.ooooo....oKKko./..........ooooo.'),
 mask('.......oooooo.../......obbrrbo.../.....oBBbrrbno../....oBBbbaAano../....oBBbbaAano../....oBbbbaAsno../....onbbbaAsno../.....onbbaAano../.....onbbaaqno../......onnnnnno../.......obnoobno./.......okkoobno./......oKKko.okko/......ooooo.oKKk/............oooo'),
 mask('......oooooo..../.....obbrrbo..../....oBBbrrbno.../...oBBbbaAano.../...oBbbbaAano.../...oBbbaAsnso.../...oBbaAAansno../....onbaAaqno.../....onbbaaqno.../.....onnnnno..../...obbnoobnno.../..okko...obnno../..oKKko...okko../..ooooo..oKKko../.........ooooo..')]
};
const cache=new Map(),flipRows=rs=>rs.map(row=>row.split('').reverse().join(''));
export function framePixels(kind='A',direction='front',action='idle',frame=0){
 if(!VARIANTS[kind])kind='A';
 const left=direction==='left',dir=left||direction==='right'?'side':direction==='back'?'back':'front';
 const walk=action==='walk',f=((Math.floor(frame)%(walk?6:4))+(walk?6:4))%(walk?6:4);
 const key=[kind,direction,action,f].join(':');if(cache.has(key))return cache.get(key);
 const out=Array.from({length:44},()=>Array(32).fill('.'));
 const put=(rows,x,y)=>{for(let j=0;j<rows.length;j++)for(let i=0;i<rows[j].length;i++){const v=rows[j][i];if(pal[v]&&y+j>=0&&y+j<44&&x+i>=0&&x+i<32)out[y+j][x+i]=v;}};
 const pose=walk?(dir==='side'?[1,2,0,3,2,0][f]:[1,2,0,1,2,0][f]):0;
 let body=poses[dir][pose];if(walk&&f>=3&&dir!=='side')body=flipRows(body);
 if(kind==='C')body=body.map((row,i)=>i<11?row.slice(0,8)+row[7]+row[8]+row.slice(8):row);
 const y=43-body.length;put(body,kind==='C'?7:8,y);
 if(kind==='A'&&dir!=='back')put(['.oo','ogg','ogq','oqo','.oo'],dir==='side'?11:21,y+7);
 if(kind==='C'&&dir==='front')put(['.aaaa.','aAaaqa','aAaaqa','.aaaa.'],13,y+8);
 const face=faces[kind][dir],hat=hats[kind],lift=walk?[0,1,1,0,1,1][f]:[0,0,0,1][f];
 // Head overlaps shoulders and hat overlaps hair, avoiding gaps at joins.
 const hx=kind==='B'?6:kind==='C'?7:8,fy=y-face.length+3-lift;
 put(face,hx,fy);put(hat,hx,fy-hat.length+1);
 if(!walk&&f===2&&dir==='front'){
  const eyeRow=fy+(kind==='A'?3:kind==='B'?3:3);
  for(let i=9;i<24;i++)if(out[eyeRow]?.[i]==='o'&&out[eyeRow]?.[i-1]==='S'&&out[eyeRow]?.[i+1]==='S')out[eyeRow][i]='S';
 }
 const pixels=out.map(row=>(left?row.reverse():row).join(''));cache.set(key,pixels);return pixels;
}
export function paintChefV3(c,kind,direction,action,frame,x,y,scale=1){
 const pixels=framePixels(kind,direction,action,frame);c.save();c.imageSmoothingEnabled=false;
 for(let j=0;j<44;j++)for(let i=0;i<32;i++){let v=pixels[j][i];if(!pal[v])continue;let a=Math.round(x+(i-16)*scale),b=Math.round(y+(j-43)*scale),w=Math.round(x+(i-15)*scale)-a,h=Math.round(y+(j-42)*scale)-b;c.fillStyle=pal[v];c.fillRect(a,b,w,h);}
 c.restore();
}
