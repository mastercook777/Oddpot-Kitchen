import {ING} from './data.js?v=0.15.0-alpha.1';
import {fieldTilePath} from './field_rules_v011a.js';
// v0.8.1 base biomes; v0.11-A adds safe, seed-varying actual obstacle layouts.
// The physical layout, resource concentration and color identity live together.
const STYLE={
 meadow:{label:'林地草甸',region:'forest',floor:'#51764e',grain:'#67925b',accent:'#ebd38f',
  count:4,primary:'garlic',resources:[['garlic',5],['cabbage',5],['onion',2],['potato',1],['mushroom',1]],
  spots:[[4,6],[1,6],[2,6],[1,5],[2,5],[6,4],[7,4],[6,2],[7,2],[3,2]],
  obstacles:[[2,2],[6,7],[1,3]],hazards:[],enemyMix:['chicken','boar'],enemyCount:1},
 glow:{label:'幽光菌沼',region:'forest',floor:'#284a52',grain:'#336775',accent:'#92f1db',
  count:3,primary:'mushroom',resources:[['mushroom',8],['chicken',2],['onion',1]],
  spots:[[1,4],[1,3],[2,4],[2,3],[3,5],[6,2],[6,3],[7,7]],
  obstacles:[[4,5],[5,4],[2,7]],hazards:[],enemyMix:['chicken'],enemyCount:1},
 roots:{label:'古树孢巢',region:'forest',floor:'#393c47',grain:'#565165',accent:'#d8a0ee',
  count:2,primary:'mushroom',resources:[['mushroom',9],['beef',3],['chicken',2]],
  spots:[[5,6],[5,5],[6,6],[6,5],[2,3],[3,3],[7,2],[1,7]],
  obstacles:[[2,5],[3,5],[4,3],[6,7],[7,4]],hazards:[[5,3],[6,4]],
  enemyMix:['sporeling','boar','chicken'],enemyCount:3},
 garden:{label:'野蔬采集圃',region:'forest',floor:'#72835a',grain:'#98a46c',accent:'#f3d78a',
  count:5,primary:'cabbage',resources:[['cabbage',8],['potato',5],['garlic',4],['onion',2]],
  spots:[[3,6],[2,5],[3,5],[4,5],[2,6],[4,6],[6,3],[6,4],[7,4],[1,3],[1,4]],
  obstacles:[[5,7],[5,2]],hazards:[],enemyMix:['chicken'],enemyCount:1},
 spring:{label:'热泉浅滩',region:'spring',floor:'#a38a66',grain:'#c1a276',accent:'#b2e8d7',
  count:4,primary:'potato',resources:[['potato',6],['chili',5],['garlic',2],['onion',1]],
  spots:[[2,8],[1,8],[3,8],[2,7],[1,7],[7,3],[7,4],[6,3],[5,2]],
  obstacles:[[4,8],[5,5],[1,5]],hazards:[[3,4],[6,6]],
  enemyMix:['steam_crab','pepper'],enemyCount:1},
 steam:{label:'蒸汽裂隙',region:'spring',floor:'#686f6c',grain:'#929489',accent:'#e4ece1',
  count:3,primary:'chili',resources:[['chili',5],['beef',3],['onion',3],['potato',1]],
  spots:[[6,5],[6,4],[7,5],[7,4],[5,6],[1,3],[2,3],[3,2]],
  obstacles:[[4,5],[4,6],[3,8],[1,5],[7,8]],hazards:[[5,3],[2,6],[6,7]],
  enemyMix:['steam_crab','pepper','chicken'],enemyCount:2},
 ember:{label:'赤焰断坡',region:'spring',floor:'#553f3e',grain:'#805149',accent:'#f2aa5c',
  count:2,primary:'chili',resources:[['chili',9],['beef',4],['garlic',1]],
  spots:[[6,6],[6,5],[7,6],[7,5],[2,3],[3,3],[5,2],[2,7]],
  obstacles:[[3,5],[4,5],[5,4],[1,6],[7,3]],hazards:[[5,6],[2,5],[6,2]],
  enemyMix:['pepper','steam_crab','boar'],enemyCount:3},
 oasis:{label:'矿泉晶池',region:'spring',floor:'#8e9681',grain:'#b2b79c',accent:'#b9f6ed',
  count:5,primary:'potato',resources:[['potato',6],['onion',4],['chili',3],['garlic',3]],
  spots:[[1,7],[2,7],[3,7],[1,6],[2,6],[3,6],[6,3],[7,3],[6,4],[7,4]],
  obstacles:[[5,7],[4,4]],hazards:[[5,3]],enemyMix:['steam_crab','chicken'],enemyCount:1},
 cloud:{label:'云港风道',region:'cloud',floor:'#6c93a6',grain:'#8bb8ba',accent:'#f4e8bd',
  count:5,primary:'cloud_rice',resources:[['cloud_rice',7],['sky_moss',5],['onion',2],['sour_bell',2]],
  spots:[[2,7],[3,7],[2,6],[6,4],[7,4],[6,3],[1,3],[2,3],[7,7]],
  obstacles:[[4,5],[5,5],[4,2]],hazards:[[5,3]],enemyMix:['gust_moth','chicken'],enemyCount:2},
 cloud_roost:{label:'雷羽巢缘',region:'cloud',floor:'#526e91',grain:'#829eb2',accent:'#f7d47c',
  count:4,primary:'storm_egg',resources:[['storm_egg',6],['sky_moss',4],['sour_bell',3]],
  spots:[[2,7],[2,6],[3,6],[7,4],[6,4],[6,2],[1,3],[2,3]],
  obstacles:[[4,6],[5,4],[3,3]],hazards:[[5,2],[6,6]],enemyMix:['gust_moth','chicken'],enemyCount:3}
};
const ZONES={
 herb_path:'meadow',glow_mushroom:'glow',old_tree_edge:'roots',forest_garden:'garden',
 forest_secret:'glow',spore_gate:'roots',spore_roots:'roots',
 hot_spring_shallows:'spring',steam_crack:'steam',ember_edge:'ember',
 steam_lake:'oasis',spring_market:'spring',ember_gate:'ember',ember_side:'ember',
 cloud_dock:'cloud',cloud_pass:'cloud',cloud_garden:'cloud',cloud_roost:'cloud_roost',cloud_gust:'cloud_roost'
};
const SEED=(n)=>(Math.imul(1664525,n>>>0)+1013904223)>>>0;
const hash=(name)=>[...String(name)].reduce((n,c)=>SEED(n+c.charCodeAt(0)),2166136261);
export function getFieldBiome(zoneId,route='safe'){
 const style=ZONES[zoneId]||(route.startsWith('cloud')?'cloud':route.startsWith('spring')?'spring':'meadow');
 const base=STYLE[style];
 // The two entrances to the same mini-boss must have meaningful food ecology,
 // not just a flipped copy of the same rocks and enemy roster.
 const specialties={
  spore_roots:{resources:[['mushroom',5],['beef',8],['chicken',2]],
   enemyMix:['boar','boar','sporeling']},
  ember_side:{resources:[['potato',5],['chili',5],['beef',4]],
   enemyMix:['steam_crab','boar','steam_crab','pepper']}
 };
 return {...base,...(specialties[zoneId]||{}),style,zoneId:zoneId||style,
  // Adjacent exits share broad regional ecology, but their landmarks and
  // harvest pockets never look like the same copied board.
  flipped:['forest_secret','spore_roots','spring_market','ember_side'].includes(zoneId)};
}
function weightedIngredient(items,seed){
 const total=items.reduce((sum,item)=>sum+item[1],0);let p=seed%total;
 for(const [id,weight] of items){p-=weight;if(p<0)return id}
 return items[0][0];
}
export function generateBiomeMap(s,route,target){
 const springs=route.startsWith('spring'),id=s.fieldZoneId||(springs?'hot_spring_shallows':'herb_path');
 const biome=getFieldBiome(id,route),turn=biome.flipped,flip=x=>turn?8-x:x;
 const seed=SEED((s.seed||20261009)+s.cycle*301+s.day*37+hash(id)+(route.includes('risk')?991:0));
 const sourceSpots=biome.spots.map(([x,y])=>[flip(x),y]);
 // Different seeds change resource clusters and real blocked geometry, not
 // merely the palette or a horizontal mirror of the same scene.
 const layoutVariant=(seed>>>15)%3;
 const pockets=sourceSpots.slice(1);
 const rotated=layoutVariant===1?pockets.slice().reverse():
   layoutVariant===2?[...pockets.slice(2),...pockets.slice(0,2)]:pockets;
 const spots=[sourceSpots[0],...rotated];
 // Three segments share one eight-slot bag: small concentrated deposits leave
 // room for later high-value ingredients. Seed-based +/-1 richness varies runs.
 // Even a fertile map has only four to six points, boss nests only two or three.
 const variance=((seed>>>7)%3)-1;
 const sourceCount=Math.max(2,Math.min(6,biome.count+(biome.count>=4?variance:Math.min(0,variance))));
 const chosen=[...spots.slice(0,sourceCount)];
 const actualTarget=['SHOP_STAPLE','FIELD_ONLY'].includes(ING[target]?.acquisitionPolicy)?target:biome.primary;
 const first=chosen.shift();
 const nodes=[{key:'target',id:actualTarget,x:first[0],y:first[1],n:2,type:'gather',claimed:false}];
 for(const [i,[x,y]] of chosen.entries()){
  const id=weightedIngredient(biome.resources,SEED(seed+i*737));
  const quantity=i===0?2:i===1&&biome.count>=5?2:1;
  nodes.push({key:'pocket-'+i,id,x,y,n:quantity,type:i===chosen.length-1&&biome.enemyCount>=3?'danger':'gather',claimed:false});
 }
 // Encounters now use a once-per-run plan in engine.js (v0.11-B0).
 // Old seed%5 plus sourceCount>=4 skipped whole biomes and often three full maps.
 // No event belongs to a random gathering pocket; the game must place a real,
 // reachable traveler near the mandatory traversal path in a chosen segment.
 const originalObstacles=biome.obstacles.map(([x,y])=>({x:flip(x),y}));
 const hazards=biome.hazards.map(([x,y])=>({x:flip(x),y}));
 const spawn=springs?{x:2.5,y:10.1}:{x:4.5,y:9.4};
 // Boss lane is kept reachable, including on seed-variant maps.
 const bossSpawn={x:turn?5.5:4.5,y:1.8};
 let obstacles=originalObstacles;
 if(layoutVariant&&originalObstacles.length){
  const occupied=new Set([...sourceSpots,...hazards.map(h=>[h.x,h.y]),
   [Math.floor(spawn.x),Math.floor(spawn.y)],[Math.floor(bossSpawn.x),Math.floor(bossSpawn.y)]]
   .map(p=>p[0]+','+p[1]));
  const shifts=layoutVariant===1?[[1,0],[0,1],[-1,0],[0,-1]]:
    [[-1,0],[0,-1],[1,0],[0,1]];
  search:for(let i=0;i<originalObstacles.length;i++){
   const index=(i+((seed>>>8)%originalObstacles.length))%originalObstacles.length;
   for(const [dx,dy] of shifts){
    const original=originalObstacles[index],x=original.x+dx,y=original.y+dy;
    if(x<1||x>7||y<1||y>9||occupied.has(x+','+y)||
     originalObstacles.some((o,j)=>j!==index&&o.x===x&&o.y===y))continue;
    const candidate=originalObstacles.map((o,j)=>j===index?{x,y}:{...o});
    const testMap={worldW:9,worldH:11,obstacles:candidate,hazards};
    if(!fieldTilePath(testMap,spawn,bossSpawn).length||
       nodes.some(n=>!fieldTilePath(testMap,spawn,n).length))continue;
    obstacles=candidate;
    break search;
   }
  }
 }
 // Fall back to authoritative base obstacles if any seed pattern blocks a
 // collection target or boss route (tests exercise all eight biomes).
 const passable={worldW:9,worldH:11,obstacles,hazards};
 if(!fieldTilePath(passable,spawn,bossSpawn).length||
    nodes.some(n=>!fieldTilePath(passable,spawn,n).length))obstacles=originalObstacles;
 return {region:biome.region,biome:{zoneId:id,style:biome.style,label:biome.label,
  floor:biome.floor,grain:biome.grain,accent:biome.accent,flipped:turn,layoutVariant,
  enemyMix:[...biome.enemyMix],enemyCount:biome.enemyCount,encounterSeed:SEED(seed+8277)},
  spawn,x:Math.floor(spawn.x),y:Math.floor(spawn.y),steps:0,worldW:9,worldH:11,
  visitedHazards:[],nodes,obstacles,hazards,bossSpawn};
}
