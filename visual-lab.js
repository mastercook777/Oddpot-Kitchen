import {paintChefV3,VARIANTS} from './src/chef_v3_lab.js?v=x3';
import {pixelActor} from './src/pixels_v041.js';
const view=document.querySelector('#view'),canvas=document.querySelector('#art'),ctx=canvas.getContext('2d'),msg=document.querySelector('#message'),fps=document.querySelector('#fps');
const initialChef=new URLSearchParams(location.search).get('character');
const S={night:false,mode:'hd',hero:{x:5,z:6.1},target:{x:5,z:6.1},moving:false,hd2:true,newHero:true,facing:'front',chefV3:Object.hasOwn(VARIANTS,initialChef)?initialChef:null};
const room={tables:[{x:2.65,z:7.6},{x:7.35,z:7.6}],stoves:[{x:2.8,z:2.05,type:'wok'},{x:7.2,z:2.05,type:'pot'}],counter:[{x:2.5,z:4.1},{x:7.5,z:4.1}],shelf:{x:1.15,z:.75}};
const clamp=(n,l,h)=>Math.max(l,Math.min(h,n));
let last=0,frames=0,stat=0,renderer=null,loading=null,revision=0;
function blocked(x,z){return x<.55||x>9.45||z<.65||z>9.65||room.tables.some(o=>Math.abs(x-o.x)<1.04&&Math.abs(z-o.z)<.65)||room.stoves.some(o=>Math.abs(x-o.x)<.8&&Math.abs(z-o.z)<.65)||room.counter.some(o=>Math.abs(x-o.x)<1.75&&Math.abs(z-o.z)<.39)||x<2.25&&z<1.3;}
function setTarget(x,z){x=clamp(x,.6,9.4);z=clamp(z,.7,9.6);if(!blocked(x,z))S.target={x,z};}
function move(dt){const h=S.hero,dx=S.target.x-h.x,dz=S.target.z-h.z,d=Math.hypot(dx,dz),step=Math.min(d,dt*3.2);S.moving=d>.04;if(!S.moving)return;S.facing=Math.abs(dx)>Math.abs(dz)*.85?(dx<0?'left':'right'):(dz<0?'back':'front');const nx=h.x+dx/d*step,nz=h.z+dz/d*step;if(!blocked(nx,nz)){h.x=nx;h.z=nz;}else if(!blocked(nx,h.z)){h.x=nx;}else if(!blocked(h.x,nz)){h.z=nz;}else{S.target={...h};S.moving=false;}}
// Original vector/painted Canvas scene, authored in a single consistent projection.
// Ground plane: x→screen x, z→screen y, height rises vertically.
const W=600,H=720,U=52,V=40,A=48,B=220;
const X=x=>A+x*U,Y=z=>B+z*V;
const P=(x,z,h=0)=>[X(x),Y(z)-h*U];
const C={ink:'#322a29',dark:'#50382d',wood:'#a16a45',top:'#cd975f',cream:'#dfbd88',teal:'#416b67',stone:'#766f69'};
function poly(c,p,fill,stroke=null,lw=1){c.beginPath();c.moveTo(...p[0]);for(const pt of p.slice(1))c.lineTo(...pt);c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function rect(c,x,y,w,h,f){c.fillStyle=f;c.fillRect(x,y,w,h)}
function line(c,x,y,a,b,f,lw=1){c.beginPath();c.moveTo(x,y);c.lineTo(a,b);c.strokeStyle=f;c.lineWidth=lw;c.stroke()}
function ellipse(c,x,y,a,b,f){c.beginPath();c.ellipse(x,y,a,b,0,0,Math.PI*2);c.fillStyle=f;c.fill()}
function round(c,x,y,w,h,r,f,stroke){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=f;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke()}}
function gradient(c,x,y,w,h,a,b){const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,a);g.addColorStop(1,b);return g}
function hash(n){return ((Math.imul(n+19,1664525)+1013904223)>>>0)%1000/1000}
function shadow(c,x,z,rx,ry,a=.28){const px=X(x)+8,py=Y(z)+5;const g=c.createRadialGradient(px,py,0,px,py,rx);g.addColorStop(0,'rgba(35,25,24,'+a+')');g.addColorStop(1,'#23191800');c.save();c.translate(px,py);c.scale(1,ry/rx);c.translate(-px,-py);ellipse(c,px,py,rx,rx,g);c.restore()}
function box(c,x,z,w,d,h,top,front,side,base=0){const a=P(x-w/2,z-d/2,base+h),b=P(x+w/2,z-d/2,base+h),e=P(x+w/2,z+d/2,base+h),f=P(x-w/2,z+d/2,base+h),g=P(x+w/2,z+d/2,base),j=P(x-w/2,z+d/2,base);poly(c,[f,e,g,j],front,C.ink);poly(c,[b,e,g,P(x+w/2,z-d/2,base)],side,C.ink);poly(c,[a,b,e,f],top,C.ink);return {a,b,e,f,g,j}}
function woodBox(c,x,z,w,d,h,base=0){let q=box(c,x,z,w,d,h,C.top,C.wood,C.dark,base);const [l,t]=q.f,[r,b]=q.g;rect(c,l+2,t+2,r-l-4,3,'#e8ad7355');for(let k=1;k<4;k++){let yy=t+(b-t)*k/4;line(c,l+3,yy,r-3,yy,'#60422e66');}return q}
function plank(c,x,y,w,h,i){rect(c,x,y,w,h,['#a9754e','#b17a51','#aa7048','#b48155'][((i%4)+4)%4]);rect(c,x,y,w,1.4,'#d9a06a');rect(c,x,y+h-2,w,2,'#684631');for(let k=0;k<3;k++){let yy=y+4+hash(i*19+k*7)*(h-7),xx=x+hash(i*23+k)*w*.4;line(c,xx,yy,Math.min(x+w-2,xx+w*.4),yy+.4,'#82543955',.8)}}
function stone(c,x,y,w,h,i){round(c,x+1,y+1,w-2,h-2,3,['#858078','#77736b','#91887b','#79796e'][((i%4)+4)%4]);line(c,x+4,y+3,x+w-4,y+3,'#b6a99a88');line(c,x+4,y+h-3,x+w-5,y+h-3,'#4c494a80');}
function beam(c,x,y,w,h){rect(c,x,y,w,h,gradient(c,x,y,w,0,'#b78354','#68432e'));rect(c,x,y,w,3,'#d8a36a');rect(c,x+w-4,y,4,h,'#54382c');for(let i=0;i<3;i++)line(c,x+4,y+h*(i+1)/4,x+w-6,y+h*(i+1)/4,'#6c482f77');}
function windowArt(c,x,y,w,h){c.save();c.beginPath();c.moveTo(x,y+h);c.lineTo(x,y+w/2);c.arc(x+w/2,y+w/2,w/2,Math.PI,0);c.lineTo(x+w,y+h);c.closePath();c.clip();rect(c,x,y,w,h,gradient(c,x,y,0,h,S.night?'#243a59':'#8eb7bf',S.night?'#58657b':'#e7dcb0'));ellipse(c,x+w*.74,y+h*.26,8,8,S.night?'#f1deb4':'#fff0bc');for(let i=0;i<5;i++){let xx=x+i*w/4;poly(c,[[xx-18,y+h],[xx+8,y+h*.39+hash(i)*20],[xx+32,y+h]],S.night?'#304842':['#688776','#466d63'][i%2]);}rect(c,x+w/2-2,y,4,h,'#76513a');rect(c,x,y+h*.62,w,4,'#76513a');c.restore();c.beginPath();c.moveTo(x,y+h);c.lineTo(x,y+w/2);c.arc(x+w/2,y+w/2,w/2,Math.PI,0);c.lineTo(x+w,y+h);c.closePath();c.strokeStyle='#5c392a';c.lineWidth=6;c.stroke();beam(c,x-7,y+h-1,w+14,9)}
function jar(c,x,y,k){let color=['#b97040','#63805d','#c39a50','#954d42'][k%4];round(c,x-5,y-12,10,12,3,gradient(c,x-5,y-12,10,0,color,'#544436'),C.ink);round(c,x-4,y-15,8,4,1,'#c9a477');line(c,x-2,y-10,x-2,y-4,'#f4d8a477');}
function pantry(c){const x=X(1.15),y=Y(.75);shadow(c,1.15,.75,53,13);round(c,x-47,y-112,94,112,3,'#513b32','#322825');rect(c,x-42,y-107,84,77,'#66503a');for(let row=0;row<3;row++){const yy=y-80+row*24;beam(c,x-44,yy,88,5);for(let j=0;j<5;j++)jar(c,x-32+j*16,yy-1,row+j)}for(let i=0;i<2;i++){rect(c,x-40+i*40,y-25,37,22,'#a37147');rect(c,x-37+i*40,y-22,31,16,'#92603b');ellipse(c,x-11+i*19,y-13,2,2,'#e6bc79');}beam(c,x-47,y-112,94,6);beam(c,x-47,y-112,5,112);beam(c,x+42,y-112,5,112)}
function lantern(c,x,y,t){const pulse=1+.045*Math.sin(t*6+x);const g=c.createRadialGradient(x,y,4,x,y,45*pulse);g.addColorStop(0,'#ffd78b55');g.addColorStop(1,'#ffc06900');ellipse(c,x,y,45*pulse,45*pulse,g);line(c,x,y-22,x,y-13,'#3a302b',3);round(c,x-8,y-12,16,23,2,'#563c2b');round(c,x-5,y-9,10,17,2,gradient(c,x,y-9,0,17,'#fff3b9','#d68640'));for(let k of [-5,5])line(c,x+k,y-10,x+k,y+9,'#986030',2);poly(c,[[x-10,y-12],[x,y-17],[x+10,y-12]],'#ad8554','#48362c');rect(c,x-9,y+9,18,4,'#6e4c32')}
function carpet(c,x,z,w,d){let xx=X(x-w/2),yy=Y(z-d/2),ww=w*U,hh=d*V;round(c,xx,yy,ww,hh,3,'#684c40');rect(c,xx+4,yy+4,ww-8,hh-8,'#bba36d');rect(c,xx+7,yy+7,ww-14,hh-14,'#456c64');rect(c,xx+12,yy+12,ww-24,hh-24,'#577c6e');for(let k=0;k<3;k++){let a=xx+ww*(k+1)/4,b=yy+hh/2;poly(c,[[a,b-9],[a+7,b],[a,b+9],[a-7,b]],'#d2b57b')}for(let j=0;j<ww/6;j++){line(c,xx+j*6,yy,xx+j*6,yy-3,'#c9ad79');line(c,xx+j*6,yy+hh,xx+j*6,yy+hh+3,'#c9ad79')}}
// V2 architectural and material pass. Draw on static background cache, not over actors.
function hd2Architecture(g){
 const left=A,right=X(10),back=B,front=Y(10);
 // Side masonry is a real cutaway edge; capped plinth, shadow line and end pillars.
 for(const xx of [left-16,right+3]){
  rect(g,xx,back-14,13,front-back+19,'#594c42');
  for(let j=0;j<15;j++){const yy=back+j*27;round(g,xx+1,yy+1,11,25,2,['#9b8c7b','#83786b','#74685f'][j%3]);line(g,xx+2,yy+2,xx+11,yy+2,'#c7b49a77');}
  beam(g,xx-2,back-17,17,7);beam(g,xx-2,front-7,17,10);
 }
 for(const x of [left+8,right-24]){
  beam(g,x,back-155,16,151);rect(g,x-3,back-12,22,8,'#51362a');rect(g,x-3,back-14,22,2,'#cf9b65');
  for(const y of [back-142,back-72,back-22]){ellipse(g,x+8,y,3,3,'#4b3529');ellipse(g,x+7,y-1,1,1,'#d9ad6a');}
 }
 // Window sill, beveled interior frame and brass latches.
 const wx=X(4.15),wy=B-141,ww=84,wh=106;
 line(g,wx-4,wy+ww/2,wx-4,wy+wh,'#c49364',2);
 line(g,wx+ww+4,wy+ww/2,wx+ww+4,wy+wh,'#47362e',3);
 round(g,wx+ww/2-5,wy+wh*.62-4,10,8,2,'#b69459','#5b4533');
 // Wall-mounted brass rail, hanging utensils and herb bunches.
 let hx=X(7.4),hy=B-113;beam(g,hx-55,hy-3,109,8);
 for(let j=0;j<4;j++){let x=hx-39+j*23;line(g,x,hy+5,x,hy+25,'#c1a878',2);if(j%2)ellipse(g,x,hy+29,6,9,'#6b7775');else{ellipse(g,x,hy+29,9,10,'#434c4b');ellipse(g,x-1,hy+28,6,7,'#7d8a80');}}
 for(let j=0;j<3;j++){let x=X(3.3)+j*12;line(g,x,B-103,x,B-84,'#a48e57',1.4);for(let k=0;k<4;k++){ellipse(g,x+(k%2?4:-4),B-99+k*5,4,7,['#5e7854','#82985b','#66754c'][j]);}}
 // Joinery and nails on actual floor planks, not random image noise.
 for(let j=0;j<15;j++){let y=B+3.52*V+j*18;if(y>front-6)break;for(let i=0;i<6;i++){let x=left+15+i*82+(j%2)*20;if(x<right-6){ellipse(g,x,y,1,1,'#664b36');ellipse(g,x+3,y,1,1,'#d49d64');}}}
 // Entry threshold and carved front beam.
 for(const x of [X(4.1)-8,X(5.9)+2]){round(g,x,front-12,10,18,2,'#77685b','#483a30');rect(g,x-2,front-15,14,4,'#b9a184');}
 line(g,X(4.1),front+12,X(5.9),front+12,'#d1b793',2);
}
function hd2Details(c){
 // Ceiling hoods visually connect the real stoves to the back wall. No fake new workstations.
 for(const o of room.stoves){let x=X(o.x),y=Y(o.z)-84;round(c,x-9,B-75,18,Math.max(12,y-(B-75)),3,gradient(c,x-9,y,18,0,'#79817a','#414b49'),'#343b39');poly(c,[[x-11,y-12],[x+11,y-12],[x+31,y+13],[x-31,y+13]],gradient(c,x-31,y,62,0,'#777f75','#394542'),'#3d403b');line(c,x-29,y+12,x+29,y+12,'#c3a36f',3);for(const xx of [x-20,x,x+20])ellipse(c,xx,y+10,1.6,1.6,'#d6b783');}
}
function hd2Furniture(c,o,kind){const x=X(o.x),y=Y(o.z);
 if(kind==='table'){// stitched edge, ceramic bowl and carved tabletop corner pins
  const top=y-.83*U;
  for(const dx of [-33,33])for(const dy of [-13,13])ellipse(c,x+dx,top+dy,1.8,1.5,'#d8ac74');
  for(let i=0;i<5;i++){line(c,x-8,top-16+i*7,x-6,top-16+i*7,'#c9bc82',1);line(c,x+6,top-16+i*7,x+8,top-16+i*7,'#c9bc82',1);}
  ellipse(c,x,top-3,8,4,'#f0dab4');ellipse(c,x,top-4,5,2.6,'#92794f');
 }else if(kind==='counter'){for(let j=0;j<3;j++){let xx=x-57+j*57;line(c,xx-21,y-30,xx+19,y-30,'#bd8b5d88');line(c,xx-21,y-30,xx-21,y-11,'#c69b6b55');}
  for(let j=0;j<3;j++)ellipse(c,x+46,y-.94*U-j*3,9,2.3,'#a99c81');
 }else if(kind==='stove'){line(c,x-29,y-14,x+29,y-14,'#d1bca3aa',1.5);for(const dx of [-23,23])ellipse(c,x+dx,y+4,2,2,'#c0a784');}
}

let bg=null,bgNight=null,bgHD2=null;
function background(c){if(!bg||bgNight!==S.night||bgHD2!==S.hd2){bg=document.createElement('canvas');bg.width=W;bg.height=H;const g=bg.getContext('2d');bgNight=S.night;bgHD2=S.hd2;
rect(g,0,0,W,H,gradient(g,0,0,0,H,'#20282c','#34302d'));
shadow(g,5,9.7,254,35,.65);
rect(g,A-9,B-166,10*U+18,166,'#4b4039');
for(let row=0;row<6;row++)for(let col=-1;col<12;col++){let xx=A+col*48+(row%2)*24;if(xx<A||xx+48>A+10*U)continue;stone(g,xx,B-161+row*27,48,27,row*13+col)}
beam(g,A-9,B-172,10*U+18,16);beam(g,A-9,B-159,13,159);beam(g,A+10*U-4,B-159,13,159);beam(g,A,B-10,10*U,10);
windowArt(g,X(4.15),B-141,84,106);
for(let row=0;row<17;row++){let yy=B+row*24;for(let col=-1;col<8;col++){const start=A+col*82+(row%2)*41,xx=Math.max(A,start),end=Math.min(A+10*U,start+82);if(end>xx)plank(g,xx,yy,end-xx,24,row*17+col)}}
g.save();g.beginPath();g.rect(A,B,10*U,3.52*V);g.clip();for(let row=0;row<6;row++)for(let col=-1;col<12;col++){stone(g,A+col*48+(row%2)*24,B+row*25,48,25,row*17+col)}g.restore();
for(const side of [-1,1]){const xx=side<0?A-12:A+10*U;poly(g,[[xx,B-8],[xx+12,B-8],[xx+12,Y(10)],[xx,Y(10)]],'#4a3931');for(let j=0;j<16;j++)stone(g,xx,B+j*25,12,25,j);}
carpet(g,5,8.95,1.55,1.36);carpet(g,5,5.65,1.4,1.6);
if(!S.night){g.save();g.beginPath();g.moveTo(X(4.15),B);g.lineTo(X(5.76),B);g.lineTo(X(9.2),Y(7.6));g.lineTo(X(6.4),Y(7.6));g.closePath();g.clip();rect(g,A,B,10*U,10*V,gradient(g,0,B,0,10*V,'#ffe2a34a','#ffe2a300'));g.restore();}
rect(g,A-9,Y(10),10*U+18,12,'#4c3a32');for(let j=0;j<11;j++)stone(g,A-9+j*49,Y(10)+10,49,14,j);
for(const [a,b] of [[0,4.1],[5.9,10]]){beam(g,X(a),Y(10)-5,(b-a)*U,10)}
for(let j=0;j<3;j++)stone(g,X(4.1)-2,Y(10)+j*9,1.8*U+4,11,j);
if(S.hd2)hd2Architecture(g);
}c.drawImage(bg,0,0);}
function pot(c,x,y,r){ellipse(c,x,y+10,r+5,9,'#302d2d');round(c,x-r,y-16,r*2,31,8,gradient(c,x-r,y,r*2,0,'#8b9d96','#3f5554'),C.ink);ellipse(c,x,y-16,r,7,'#a6b4a6');ellipse(c,x,y-17,r-3,5,'#617b73');round(c,x-4,y-25,8,6,2,'#c4a479');for(const s of [-1,1]){round(c,x+s*r-4,y-9,8,9,2,'#a48d68',C.ink)}line(c,x-r+5,y-9,x-r+5,y+5,'#d3dbc080',2)}
function stove(c,o,t){let {x,z,type}=o,px=X(x),py=Y(z);shadow(c,x,z,57,18);box(c,x,z,1.48,1.04,.57,'#a79a87','#6b6057','#504842');for(let k=0;k<4;k++)stone(c,px-35+k*18,py-9,18,13,k);round(c,px-18,py-3,36,16,4,'#342b27');let pulse=.5+.5*Math.sin(t*8);ellipse(c,px,py+4,14,6,'#d05b32');ellipse(c,px-3,py+3,7+pulse*3,4,'#f0a94d');ellipse(c,px-3,py+2,3,3,'#fff1a4');
const yy=py-39;if(type==='pot')pot(c,px,yy,20);else{ellipse(c,px,yy+6,25,12,'#333535');ellipse(c,px,yy,26,12,'#b6b8a6');ellipse(c,px,yy,23,9,'#435551');line(c,px+19,yy-1,px+40,yy-14,'#4b3529',8);line(c,px+21,yy-2,px+38,yy-12,'#b78c59',3);for(let i=0;i<9;i++){let a=i*2.4;ellipse(c,px+Math.cos(a)*(6+i%3*4),yy+Math.sin(a)*4,3,2,['#d69a46','#80a46a','#bc6242'][i%3]);}}
for(let j=0;j<4;j++){let age=(t*.55+j*.25)%1;ellipse(c,px+Math.sin(age*6+j)*7,yy-20-age*34,3+age*7,5+age*8,'rgba(233,222,199,'+((1-age)*.13)+')')}}
function chair(c,x,z){shadow(c,x,z,17,7);for(const k of [-.19,.19])woodBox(c,x+k,z,.08,.35,.29);woodBox(c,x,z,.48,.45,.09,.28);box(c,x,z,.39,.34,.045,'#6b8370','#3e6158','#42594e',.37)}
function table(c,o){let {x,z}=o;shadow(c,x,z,61,20);for(const sign of [-1,1])chair(c,x+sign*1.13,z+.12);for(const dx of [-.53,.53])for(const dz of [-.33,.33])woodBox(c,x+dx,z+dz,.13,.13,.69);let q=woodBox(c,x,z,1.55,1.04,.14,.69);const [l,y]=q.a,[r,bt]=q.e;rect(c,l+3,y+3,r-l-6,2,'#e5b57e');for(let j=1;j<4;j++)line(c,l+3,y+(bt-y)*j/4,r-3,y+(bt-y)*j/4,'#91613c');let mx=X(x),my=Y(z)-.83*U;rect(c,mx-10,y+1,20,bt-y+9,'#416f68');rect(c,mx-8,y+1,2,bt-y+9,'#c5ae77');rect(c,mx+6,y+1,2,bt-y+9,'#c5ae77');ellipse(c,mx,my-2,8,5,'#edcf96');ellipse(c,mx,my-3,5,3,'#6c8c68');}
function counter(c,o){let {x,z}=o;shadow(c,x,z,99,17);const q=woodBox(c,x,z,3.42,.65,.84);let [l,y]=q.f,[r,b]=q.g;for(let i=0;i<3;i++){let xx=l+6+i*(r-l-12)/3,ww=(r-l-12)/3-4;round(c,xx,y+5,ww,b-y-11,2,'#7d5035','#583c2e');rect(c,xx+4,y+9,ww-8,b-y-19,'#9b6842');ellipse(c,xx+ww-7,y+15,2,2,'#e0b57a');}woodBox(c,x,z,3.52,.72,.10,.84);for(let k=0;k<3;k++)jar(c,X(x)-52+k*15,Y(z)-.94*U,k);for(let k=0;k<3;k++)ellipse(c,X(x)+46,Y(z)-.94*U-k*3,13,5,'#d9caaa');}
// Original chef evolution. Discrete 32x44 grid, no generated images or antialiasing.
const heroCanvas=document.createElement('canvas');heroCanvas.width=32;heroCanvas.height=44;
const hc=heroCanvas.getContext('2d');
const sp={ink:'#283137',hat:'#f6e9ce',hatMid:'#d6c5aa',hatDark:'#9e9588',shine:'#fff7e1',skin:'#d49b70',skinLit:'#f3c69b',skinShadow:'#aa694d',hair:'#78503a',hairLit:'#a5734b',blue:'#477a91',blueLit:'#719fb0',blueDark:'#2e536a',apron:'#e7d4a7',apronLit:'#f7e7c5',apronDark:'#b8a480',red:'#c45c46',redLit:'#ee8766',shoe:'#59483b',shoeLit:'#8b6c4e'};
function sr(x,y,w,h,k){hc.fillStyle=sp[k]||k;hc.fillRect(x,y,w,h)}
function rows(y,x,lines,k){for(let j=0;j<lines.length;j++){const a=lines[j];for(let i=0;i<a.length;i++)if(a[i]==='#')sr(x+i,y+j,1,1,k)}}
function drawChefSprite(t){
 hc.clearRect(0,0,32,44);
 const back=S.facing==='back',side=S.facing==='left'||S.facing==='right',step=S.moving?Math.round(Math.sin(t*12)*2):0;
 // Feet alternate without moving the sprite anchor. Wide short legs retain original chibi proportions.
 for(const [x,d] of [[8,step],[19,-step]]){sr(x,35+d,6,7,'ink');sr(x+1,36+d,4,4,'blueDark');sr(x-1,40+d,8,3,'ink');sr(x,40+d,6,2,'shoe');sr(x,40+d,4,1,'shoeLit');}
 // Rounded silhouette made of connected pixel clusters.
 sr(9,23,14,15,'ink');sr(7,25,18,11,'ink');sr(10,24,12,12,'blue');sr(8,26,2,8,'blueDark');sr(22,26,2,8,'blueDark');
 sr(11,24,8,2,'blueLit');sr(10,34,12,2,'blueDark');
 const swing=S.moving?Math.round(Math.sin(t*12+1)*1):0;
 for(const [x,d] of [[4,-swing],[24,swing]]){sr(x,25+d,5,10,'ink');sr(x+1,26+d,3,6,'blue');sr(x+1,26+d,2,2,'blueLit');sr(x+1,32+d,3,2,'skin');}
 if(back){sr(11,27,10,2,'apronDark');sr(12,29,2,6,'apron');sr(18,29,2,6,'apron');sr(10,33,12,2,'apronDark');sr(14,32,4,3,'apronLit');}
 else if(side){sr(15,27,7,9,'apronDark');sr(16,27,5,7,'apron');sr(16,27,4,2,'apronLit');sr(19,30,2,3,'apronDark');sr(17,24,5,2,'red');}
 else {sr(10,27,12,10,'apronDark');sr(11,27,10,9,'apron');sr(11,28,3,6,'apronLit');sr(15,31,5,4,'apronDark');sr(16,31,3,3,'apron');sr(9,33,14,2,'apronDark');sr(12,24,8,2,'red');sr(15,25,3,4,'red');sr(15,25,2,1,'redLit');}
 // Face and warm hair; the silhouette is still the white-hatted blue chef.
 sr(7,11,18,13,'ink');sr(9,10,14,16,'ink');sr(8,12,16,11,'hair');sr(10,23,12,2,'skinShadow');
 if(back){sr(9,13,14,9,'hair');sr(10,13,8,2,'hairLit');sr(11,20,10,3,'hairLit');sr(13,23,6,1,'skinShadow');}
 else if(side){sr(12,13,11,10,'skin');sr(13,14,9,7,'skinLit');sr(22,18,3,3,'skin');sr(20,16,2,3,'ink');sr(21,16,1,1,'shine');sr(17,20,3,1,'skinShadow');sr(8,12,5,7,'hair');sr(10,12,3,2,'hairLit');}
 else{sr(9,13,14,10,'skin');sr(10,14,12,7,'skinLit');sr(7,17,2,4,'skinShadow');sr(23,17,2,4,'skinShadow');sr(10,16,2,3,'ink');sr(20,16,2,3,'ink');sr(10,16,1,1,'shine');sr(20,16,1,1,'shine');sr(15,19,2,1,'skinShadow');sr(14,21,4,1,'skinShadow');sr(10,20,2,1,'#e7a386');sr(20,20,2,1,'#e7a386');sr(8,12,4,4,'hair');sr(20,12,4,4,'hair');}
 // Puffy chef hat: deliberately shaped clusters rather than a square cap.
 sr(6,9,20,5,'ink');sr(5,5,22,5,'ink');sr(7,3,7,7,'ink');sr(11,1,10,9,'ink');sr(20,3,6,7,'ink');
 sr(6,6,20,5,'hatMid');sr(8,4,6,6,'hat');sr(12,2,8,8,'hat');sr(21,4,4,6,'hat');sr(7,7,17,3,'hat');sr(8,5,3,3,'shine');sr(13,3,4,4,'shine');sr(18,6,2,4,'hatMid');sr(23,6,2,3,'hatMid');sr(7,10,18,3,'hatMid');sr(8,10,16,1,'shine');sr(8,12,16,1,'hatDark');
}
function actor(c,t){let {x,z}=S.hero,px=X(x),py=Y(z);shadow(c,x,z,19,7);
 if(S.chefV3){paintChefV3(c,S.chefV3,S.facing,S.moving?'walk':'idle',Math.floor(t*(S.moving?9:2)),px,py,1.85);return;}
 if(!S.newHero){pixelActor(c,'chef',px,py-19,1.65,{face:S.facing==='left'?-1:1,walk:S.moving?t:0});return;}
 drawChefSprite(t);
 c.save();c.imageSmoothingEnabled=false;const sc=1.5;c.translate(Math.round(px),Math.round(py));if(S.facing==='left')c.scale(-1,1);c.drawImage(heroCanvas,-16*sc,-43*sc,32*sc,44*sc);c.restore();
}
function drawHD(t){const dpr=Math.min(devicePixelRatio||1,2),r=view.getBoundingClientRect(),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}ctx.setTransform(w/W,0,0,h/H,0,0);background(ctx);if(S.hd2)hd2Details(ctx);pantry(ctx);
const draws=[...room.stoves.map(o=>({z:o.z,fn:()=>{stove(ctx,o,t);if(S.hd2)hd2Furniture(ctx,o,'stove');}})),...room.counter.map(o=>({z:o.z,fn:()=>{counter(ctx,o);if(S.hd2)hd2Furniture(ctx,o,'counter');}})),...room.tables.map(o=>({z:o.z,fn:()=>{table(ctx,o);if(S.hd2)hd2Furniture(ctx,o,'table');}})),{z:S.hero.z,fn:()=>actor(ctx,t)}];draws.sort((a,b)=>a.z-b.z).forEach(o=>o.fn());
for(const q of [[2.15,B-100],[7.8,B-100]])lantern(ctx,X(q[0]),q[1],t);
if(S.night){ctx.fillStyle='#24304b58';ctx.fillRect(A,B-165,10*U,10*V+165);for(const q of [[2.15,B-100],[7.8,B-100]])lantern(ctx,X(q[0]),q[1],t);for(const o of room.stoves){let g=ctx.createRadialGradient(X(o.x),Y(o.z),4,X(o.x),Y(o.z),70);g.addColorStop(0,'#f9b95d43');g.addColorStop(1,'#f9b95d00');ellipse(ctx,X(o.x),Y(o.z),70,70,g);}}
}
// 3D and Pixel3D share the identical model graph and simulation.
async function createThree(){
const T=await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
const r=new T.WebGLRenderer({antialias:true,alpha:false});r.shadowMap.enabled=true;r.shadowMap.type=T.PCFSoftShadowMap;r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.25;r.domElement.style.position='absolute';r.domElement.style.inset='0';r.domElement.style.width='100%';r.domElement.style.height='100%';r.domElement.style.touchAction='none';r.domElement.hidden=true;view.insertBefore(r.domElement,msg);
const scene=new T.Scene();scene.background=new T.Color('#282b2b');
const camera=new T.OrthographicCamera(-6.7,6.7,8,-8,.1,70);camera.position.set(5,14,18);camera.lookAt(5,1.0,4.4);
const mat=(color,roughness=.8,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
const wood=mat('#9f6944'),woodTop=mat('#c18a56'),dark=mat('#55372a'),stone=mat('#827c73'),mortar=mat('#564d48'),brass=mat('#c09b5d',.43,.45),iron=mat('#3f5352',.45,.45),cream=mat('#e4d4b1'),teal=mat('#486f65'),red=mat('#a85843'),green=mat('#638359');
const floorMats=['#a9744d','#b47d52','#946341','#bb8859'].map(x=>mat(x));
function mesh(geo,m,x,y,z,parent=scene){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function box3(x,y,z,w,h,d,m,parent=scene){return mesh(new T.BoxGeometry(w,h,d),m,x,y,z,parent)}
function cyl(x,y,z,rt,rb,h,m,parent=scene,n=20){return mesh(new T.CylinderGeometry(rt,rb,h,n),m,x,y,z,parent)}
function ball(x,y,z,sx,sy,sz,m,parent=scene){const o=mesh(new T.SphereGeometry(1,16,12),m,x,y,z,parent);o.scale.set(sx,sy,sz);return o}
box3(5,-.17,5,10.5,.34,10.5,mortar);
for(let z=0;z<20;z++)for(let x=0;x<7;x++){const left=x*1.55+(z%2?-.775:0),a=Math.max(0,left),b=Math.min(10,left+1.55);if(b>a+.02)box3((a+b)/2,.015,z*.5+.25,b-a-.018,.03,.48,floorMats[(x+z*3)%4]);}
for(let z=0;z<7;z++)for(let x=0;x<14;x++)box3(x*.714+.357,.044,z*.5+.25,.69,.035,.477,stone);
box3(5,1.55,-.12,10.4,3.1,.32,mortar);
for(let j=0;j<7;j++)for(let i=0;i<15;i++){let x=i*.67+.33+(j%2?.15:0);if(x<4.12||x>5.9||j<2||j>5)box3(x,j*.43+.21,.065,.64,.40,.14,stone);}
for(const x of [0,10]){box3(x,1.55,.05,.22,3.1,.43,dark);box3(x,.25,5,.28,.5,10,stone);}
box3(5,3.12,.04,10.4,.2,.42,wood);box3(5,.12,.14,10.4,.19,.23,dark);
box3(5,1.73,.115,1.7,1.6,.10,mat('#a0c4bd'));for(const x of [4.15,5,5.85])box3(x,1.73,.2,.11,1.72,.14,dark);for(const y of [.93,1.73,2.53])box3(5,y,.2,1.82,.12,.16,dark);box3(5,.85,.29,1.94,.12,.42,woodTop);
for(const [x,z,w,d] of [[5,8.95,1.55,1.36],[5,5.65,1.4,1.6]]){box3(x,.062,z,w,.027,d,cream);box3(x,.08,z,w-.13,.018,d-.13,teal);}
for(const o of room.tables){const {x,z}=o;for(const dx of [-.55,.55])for(const dz of [-.33,.33])box3(x+dx,.37,z+dz,.13,.74,.13,dark);box3(x,.81,z,1.55,.15,1.04,woodTop);box3(x,.897,z,.34,.02,1.08,teal);cyl(x,.95,z,.13,.09,.16,cream);for(const sign of [-1,1]){let xx=x+sign*1.13;for(const dx of [-.16,.16])for(const dz of [-.15,.15])box3(xx+dx,.18,z+.12+dz,.08,.36,.08,dark);box3(xx,.39,z+.12,.48,.1,.45,wood);box3(xx,.455,z+.12,.42,.04,.37,teal);}}
for(const o of room.counter){const {x,z}=o;box3(x,.44,z,3.42,.88,.65,wood);for(let i=0;i<3;i++){let xx=x-1.1+i*1.1;box3(xx,.43,z+.34,.99,.65,.045,dark);box3(xx,.43,z+.373,.88,.53,.045,wood);box3(xx+.32,.58,z+.41,.11,.05,.07,brass);}box3(x,.94,z,3.52,.12,.74,woodTop);for(let j=0;j<3;j++)cyl(x-.9+j*.25,1.15,z,.085,.1,.27,[red,green,brass][j]);for(let j=0;j<4;j++)cyl(x+.9,1.02+j*.035,z,.24,.22,.04,cream);}
const flames=[],lights=[];
const fire=mat('#e68735');fire.emissive.set('#ff802b');fire.emissiveIntensity=2.5;
for(const o of room.stoves){let {x,z,type}=o;box3(x,.3,z,1.48,.6,1.04,stone);box3(x,.24,z+.53,.65,.28,.055,dark);box3(x,.64,z,1.6,.12,1.16,mortar);cyl(x,.77,z,.48,.48,.16,iron);if(type==='pot'){cyl(x,1.08,z,.42,.39,.50,iron);cyl(x,1.35,z,.45,.45,.08,brass);ball(x,1.41,z,.07,.06,.07,dark);for(const q of [-1,1])box3(x+q*.47,1.1,z,.16,.10,.18,brass)}else{const bowl=mesh(new T.LatheGeometry([new T.Vector2(.04,0),new T.Vector2(.22,.04),new T.Vector2(.40,.18),new T.Vector2(.48,.28)],28),new T.MeshStandardMaterial({color:'#455e59',side:T.DoubleSide,metalness:.4,roughness:.5}),x,.87,z);box3(x+.61,1.13,z,.37,.08,.08,dark);for(let i=0;i<7;i++)ball(x+Math.cos(i*2.4)*.22,1.03,z+Math.sin(i*2.4)*.22,.075,.05,.07,[red,green,brass][i%3]);}for(let i=0;i<3;i++)flames.push(ball(x+(i-1)*.16,.22,z+.56,.10,.09,.06,fire));const l=new T.PointLight('#ffad55',3,3,1.7);l.position.set(x,.7,z+.6);scene.add(l);lights.push(l);}
const sx=room.shelf.x,sz=room.shelf.z;box3(sx,1.1,sz,1.65,2.2,.5,dark);for(let j=0;j<3;j++){box3(sx,.68+j*.52,sz+.04,1.59,.08,.57,woodTop);for(let i=0;i<5;i++){let x=sx-.63+i*.31;cyl(x,.83+j*.52,sz+.1,.10,.12,.23,[red,green,brass][(i+j)%3]);cyl(x,.96+j*.52,sz+.1,.09,.09,.045,cream);}}
const hero=new T.Group();scene.add(hero);for(const k of [-1,1])box3(k*.11,.12,0,.16,.23,.20,dark,hero);ball(0,.48,0,.24,.28,.17,teal,hero);box3(0,.43,.14,.27,.34,.07,cream,hero);ball(0,.83,0,.19,.19,.18,mat('#dfae84'),hero);cyl(0,.99,0,.20,.20,.12,cream,hero);for(const k of [-1,0,1])ball(k*.11,1.08,0,.13,.13,.15,cream,hero);
const hemi=new T.HemisphereLight('#d9e4d0','#73543c',2);scene.add(hemi);const sun=new T.DirectionalLight('#ffe2b0',3.2);sun.position.set(-3,10,1);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.5,far:35});sun.shadow.bias=-.0005;sun.shadow.normalBias=.02;sun.target.position.set(5,0,5);scene.add(sun,sun.target);
for(const x of [2.15,7.8]){box3(x,2.08,.35,.17,.26,.17,brass);ball(x,2.08,.35,.12,.13,.12,fire);const l=new T.PointLight('#ffc078',5,5,1.7);l.position.set(x,2.1,.7);scene.add(l);lights.push(l)}
const ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0),pt=new T.Vector3();r.domElement.addEventListener('pointerdown',e=>{if(S.mode==='hd')return;const b=r.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-b.left)/b.width*2-1,-((e.clientY-b.top)/b.height*2-1)),camera);if(ray.ray.intersectPlane(plane,pt))setTarget(pt.x,pt.z)});
let oldW=0,oldH=0,oldMode='';
return {element:r.domElement,draw(t){const b=view.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.8),w=Math.max(1,Math.round(b.width*d)),h=Math.max(1,Math.round(b.height*d));if(w!==oldW||h!==oldH||oldMode!==S.mode){r.setSize(w,h,false);r.domElement.style.imageRendering='auto';const a=b.width/b.height;camera.left=-8*a;camera.right=8*a;camera.updateProjectionMatrix();oldW=w;oldH=h;oldMode=S.mode;}
hero.position.set(S.hero.x,S.moving?Math.abs(Math.sin(t*12))*.045:0,S.hero.z);hemi.intensity=S.night?.65:2;sun.intensity=S.night?.16:3.2;sun.color.set(S.night?'#9aafe0':'#ffe2b0');flames.forEach((o,i)=>o.scale.y=.07+.04*Math.sin(t*8+i));lights.forEach((l,i)=>l.intensity=(S.night?5:2.1)+.4*Math.sin(t*6+i));r.render(scene,camera);}};
}
async function switchMode(mode){const token=++revision;S.mode=mode;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));msg.textContent='';canvas.hidden=mode!=='hd';if(renderer)renderer.element.hidden=mode==='hd';document.querySelector('#label').textContent=mode==='hd'?'原创 Canvas 路径、材质、光影':'Three.js · 实时光影';
document.querySelector('#hd-options').hidden=mode!=='hd';if(mode==='hd')return;try{if(!renderer){msg.textContent='加载 Three.js…';loading??=createThree();renderer=await loading;}if(token!==revision){renderer.element.hidden=S.mode==='hd';return;}renderer.element.hidden=false;msg.textContent='';}catch(e){loading=null;if(token===revision){await switchMode('hd');msg.textContent='3D 加载失败，已回到 Canvas HD：'+e.message;}}}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>switchMode(b.dataset.mode)));
document.querySelector('#hd-version').addEventListener('click',e=>{S.hd2=!S.hd2;e.currentTarget.textContent=S.hd2?'环境 V2':'环境 V1';e.currentTarget.setAttribute('aria-pressed',String(S.hd2));});
document.querySelector('#sprite-version').addEventListener('click',e=>{if(S.chefV3){S.chefV3=null;S.newHero=true;}else S.newHero=!S.newHero;e.currentTarget.textContent=S.newHero?'角色 V2':'原版角色';e.currentTarget.setAttribute('aria-pressed',String(S.newHero));});
document.querySelector('#night').addEventListener('click',e=>{S.night=!S.night;e.currentTarget.textContent=S.night?'☾ 夜晚':'☀ 白天';e.currentTarget.setAttribute('aria-pressed',String(S.night));});
canvas.addEventListener('pointerdown',e=>{const b=canvas.getBoundingClientRect();setTarget(((e.clientX-b.left)/b.width*W-A)/U,((e.clientY-b.top)/b.height*H-B)/V);});
function frame(ms){const t=ms/1000,dt=Math.min(.05,(ms-(last||ms))/1000);last=ms;move(dt);if(S.mode==='hd')drawHD(t);else if(renderer)renderer.draw(t);frames++;if(ms-stat>1000){fps.textContent=Math.round(frames*1000/(ms-stat))+' FPS';frames=0;stat=ms;}requestAnimationFrame(frame);}
requestAnimationFrame(frame);
if(S.chefV3){document.querySelector('#sprite-version').textContent='角色 V3-'+S.chefV3;}
