// Y6: a reusable physical serving, built from the real recipe. All dishes
// use the same factory at the pass, in transit and on the table.
import {dishPlan} from './three_y6_life.js?v=y6';
export function makeDishFactory(T,rounded,recipes){
 const mat=(color,roughness=.72)=>new T.MeshStandardMaterial({color,roughness});
 const ceramic=mat('#e9d4a9',.32),rim=mat('#799e91',.38),wood=mat('#ad8050'),skewer=mat('#735338'),broth=[mat('#ad894e',.26),mat('#9b5939',.26),mat('#93a16e',.26)];
 const colors={beef:'#8f4a33',chicken:'#dcac70',mushroom:'#9d8265',leaf:'#709a43',garlic:'#f0d6a2',onion:'#e6b983',potato:'#d6a14f',pepper:'#c64a30',rice:'#f6ead4',egg:'#efe2c1',berry:'#8273a8',nectar:'#e8bb58',crystal:'#76b7b3'};
 const materials=Object.fromEntries(Object.entries(colors).map(([k,c])=>[k,mat(c)]));
 const cream=mat('#eee0b5'),sear=mat('#714832'),leafDark=mat('#456c38'),gold=mat('#db9b43');
 const sphere=new T.SphereGeometry(1,12,8),block=rounded(.1,.07,.085,.014),leafGeo=new T.SphereGeometry(1,9,7),pepperGeo=new T.ConeGeometry(1,1,9),ringGeo=new T.TorusGeometry(1,.22,8,18),gem=new T.OctahedronGeometry(1),plateGeo=new T.LatheGeometry([[0,0],[.13,0],[.215,.02],[.233,.048],[.226,.064],[.202,.067],[.155,.036],[0,.035]].map(p=>new T.Vector2(...p)),32),bowlGeo=new T.LatheGeometry([[0,0],[.13,0],[.18,.05],[.208,.14],[.198,.16],[.18,.155],[.16,.06],[0,.04]].map(p=>new T.Vector2(...p)),32);
 const brothGeo=new T.CylinderGeometry(.174,.174,.012,32),stickGeo=rounded(.018,.018,.37,.003),basketGeo=new T.CylinderGeometry(.206,.191,.07,28),basketRim=new T.TorusGeometry(.198,.012,8,32),stripe=rounded(.054,.006,.014,.002);
 const group=(p,x=0,y=0,z=0)=>{const o=new T.Group();o.position.set(x,y,z);p.add(o);return o;};
 function mesh(p,g,m,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
 const scale=(o,a,b,c)=>o.scale.set(a,b,c);
 function create(parent,x,y,z){
  const root=group(parent,x,y,z),plate=mesh(root,plateGeo,ceramic),bowl=mesh(root,bowlGeo,ceramic),liquid=mesh(root,brothGeo,broth[0],0,.142,0),basket=mesh(root,basketGeo,wood,0,.048,0),br=mesh(root,basketRim,rim,0,.082,0);br.rotation.x=-Math.PI/2;
  const sticks=[-.076,.076].map(x=>mesh(root,stickGeo,skewer,x,.055,0)),pieces=Array.from({length:12},()=>{const p=group(root);return {p,main:mesh(p,sphere,cream),detail:mesh(p,sphere,cream),detail2:mesh(p,sphere,cream)};});
  let prevId=null,prevPortion=null,stats={kind:'stir',count:0};
  function shape(o,p,method){
   const {main,detail,detail2}=o,kind=p.shape;
   o.p.position.set(p.x,p.y,p.z);o.p.rotation.y=p.angle;for(const m of [main,detail,detail2]){m.position.set(0,0,0);m.rotation.set(0,0,0);m.scale.setScalar(1);m.visible=m===main;m.geometry=sphere;m.material=materials[kind]||gold;}
   if(kind==='beef'||kind==='chicken'||kind==='potato'){main.geometry=block;scale(main,kind==='beef'?1.05:.85,.69,.91);main.rotation.y=.35;detail.geometry=stripe;detail.material=sear;detail.visible=true;detail.position.y=.027;detail.rotation.y=.55;detail2.geometry=stripe;detail2.material=kind==='potato'?gold:cream;detail2.visible=method!=='soup';detail2.position.set(0,.028,.017);detail2.rotation.y=.55;}
   else if(kind==='mushroom'){main.material=cream;scale(main,.021,.035,.021);detail.visible=true;detail.material=materials.mushroom;detail.position.y=.025;scale(detail,.048,.021,.041);detail2.visible=true;detail2.material=cream;detail2.position.set(.013,.044,.004);scale(detail2,.013,.006,.011);}
   else if(kind==='leaf'){main.geometry=leafGeo;scale(main,.052,.016,.039);main.rotation.z=.26;detail.visible=true;detail.geometry=leafGeo;detail.material=leafDark;detail.position.set(.013,.016,-.004);scale(detail,.032,.011,.021);detail.rotation.z=-.42;}
   else if(kind==='onion'){main.geometry=ringGeo;main.rotation.x=Math.PI/2;scale(main,.032,.032,.032);detail.visible=true;detail.geometry=ringGeo;detail.material=cream;detail.rotation.x=Math.PI/2;detail.position.y=.008;scale(detail,.021,.021,.021);}
   else if(kind==='pepper'){main.geometry=pepperGeo;scale(main,.021,.075,.021);main.rotation.z=1.2;detail.visible=true;detail.material=leafDark;detail.position.set(-.031,.013,0);scale(detail,.012,.010,.011);}
   else if(kind==='garlic'){scale(main,.028,.035,.023);main.rotation.z=.35;detail.visible=true;detail.material=cream;detail.position.set(.02,-.005,.003);scale(detail,.020,.027,.019);}
   else if(kind==='crystal'){main.geometry=gem;scale(main,.032,.037,.031);}
   else if(kind==='egg'){scale(main,.043,.021,.033);detail.visible=true;detail.material=gold;detail.position.y=.018;scale(detail,.020,.010,.017);}
   else{scale(main,.027,.019,.025);detail.visible=true;detail.material=materials[kind]||cream;detail.position.set(.026,.005,-.018);scale(detail,.023,.019,.022);}
  }
  root.userData.setDish=(id,portion=1)=>{const p=dishPlan(recipes[id],portion);if(id!==prevId){prevId=id;prevPortion=null;const spicy=recipes[id]?.ids?.some(x=>x==='chili'||x==='ember_pepper'),greens=recipes[id]?.ids?.some(x=>x==='cabbage'||x==='sky_moss');liquid.material=broth[spicy?1:greens?2:0];for(const [i,q] of p.pieces.entries())shape(pieces[i],q,p.kind);}
   if(prevPortion===p.portion)return stats;prevPortion=p.portion;plate.visible=p.kind!=='soup'&&p.kind!=='steam';bowl.visible=p.kind==='soup';liquid.visible=p.broth;liquid.position.y=.095+.047*p.portion;basket.visible=br.visible=p.kind==='steam';for(const stick of sticks)stick.visible=p.kind==='skewer';let count=0;for(let i=0;i<pieces.length;i++){pieces[i].p.visible=!!p.pieces[i]?.visible;if(pieces[i].p.visible)count++;}stats={kind:p.kind,count};return stats;};
  root.userData.setDish(null);return root;
 }
 return {create};
}
