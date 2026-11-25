// Authored 24-unit game glyphs. One geometry vocabulary for DOM and Canvas.
export const Z2A2_ICONS=Object.freeze({
 moon:['M16 3A9 9 0 1 0 21 17Q10 20 10 9Q11 5 16 3Z','M19 3V7M17 5H21'],
 plate:['M3 17H21M5 15A7 7 0 0 1 19 15Z','M12 8V6M10 6H14M4 19H20'],
 energy:['M13 2L5 14H11L10 22L19 9H13Z'],
 ledger:['M3 5Q8 3 12 6Q16 3 21 5V19Q16 17 12 20Q8 17 3 19ZM12 6V20','M6 9H9M6 12H9M15 9H18M15 12H18'],
 pause:['M7 5H10V19H7ZM14 5H17V19H14Z'],
 play:['M8 5L19 12L8 19Z'],
 queue:['M5 8A2.3 2.3 0 1 0 9.6 8A2.3 2.3 0 1 0 5 8ZM14 6A2.3 2.3 0 1 0 18.6 6A2.3 2.3 0 1 0 14 6Z','M3 20V16Q3 12 7 12Q11 12 11 16V20M13 18V13Q13 10 16 10Q20 10 20 14V18'],
 heart:['M12 20L4.8 13Q1 9 4.5 5.8Q8 2.5 12 7Q16 2.5 19.5 5.8Q23 9 19.2 13Z'],
 bag:['M8 7V5Q8 2 12 2Q16 2 16 5V7M5 8Q12 5 19 8L21 20Q12 23 3 20ZM7 12H17V18H7ZM12 8V12'],
 route:['M4 18L10 10L14 14L20 5M16 5H20V9','M4 21L2 18L4 15L6 18ZM10 7L8 10L10 13L12 10Z'],
 gear:['M10 3H14L15 6L18 6L20 9L18 12L20 15L18 18L15 18L14 21H10L9 18H6L4 15L6 12L4 9L6 6H9Z','M15 12A3 3 0 1 1 9 12A3 3 0 1 1 15 12Z'],
 shield:['M12 3L20 6V12Q19 18 12 22Q5 18 4 12V6Z','M8 12L11 15L16 9'],
 bento:['M4 7H20L21 18Q12 21 3 18ZM3 11H21M12 11V19','M9 4H15M12 4V7'],
 target:['M12 3L21 12L12 21L3 12ZM12 7L17 12L12 17L7 12Z','M12 10V14M10 12H14'],
 warn:['M12 3L22 20H2Z','M12 9V13M12 16V17'],
 menu:['M5 3H19V21H5Z','M8 7H16M8 11H16M8 15H13'],
 wait:['M7 3H17M7 21H17M8 3V6Q8 9 12 12Q16 15 16 18V21M16 3V6Q16 9 12 12Q8 15 8 18V21','M9 18L12 15L15 18'],
 cutlery:['M6 3V10Q6 13 9 13V21M9 3V10M12 3V10Q12 13 9 13M18 3Q14 7 15 13H18V21'],
 star:['M12 2L15 9L22 10L17 15L18 22L12 18L6 22L7 15L2 10L9 9Z','M9 12L11 14L15 10'],
 cook:['M4 12H17Q16 19 10 19Q4 19 4 12ZM17 12L22 8','M7 9Q4 6 8 3M12 9Q9 6 13 3'],
 carry:['M3 15H21M6 13A6 6 0 0 1 18 13M12 7V5M9 5H15','M5 18H19'],
 wok:['M3 15Q6 22 13 18Q18 15 16 10L22 5','M2 11Q6 4 14 6M5 8Q10 1 18 5M9 11Q13 8 16 11'],
 pot:['M5 10H19L17 21H7ZM3 10H21M8 7H16M12 4V7','M4 13H2M20 13H22M9 2L8 4M16 1L17 4'],
 grill:['M4 20L17 7M15 4L20 9M11 8L16 13M7 12L12 17','M19 3Q20 5 22 5Q22 1 19 1Z'],
 steam:['M4 12H20V19H4ZM3 15H21M7 22H17','M7 9Q4 6 8 3M12 9Q9 6 13 3M17 9Q14 6 18 3'],
 soothe:['M12 18L5 11Q2 7 6 5Q9 3 12 7Q15 3 18 5Q22 7 19 11Z','M4 20H20'],
 move:['M12 2V22M2 12H22M9 5L12 2L15 5M9 19L12 22L15 19M5 9L2 12L5 15M19 9L22 12L19 15'],
 home:['M2 11L12 3L22 11M5 10V21H19V10M10 21V15H14V21'],
 next:['M4 12H20M13 5L20 12L13 19'],
 coin:['M12 3A9 9 0 1 0 12 21A9 9 0 1 0 12 3Z','M12 7L17 12L12 17L7 12Z'],
 rep:['M12 3L15 9L21 10L16 14L17 21L12 17L7 21L8 14L3 10L9 9Z']
});
export function z2a2Icon(name,cls=''){
 const paths=Z2A2_ICONS[name];if(!paths)return '';
 return '<svg class="z2a2-icon '+cls+'" data-game-icon="'+name+'" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+paths.map(d=>'<path d="'+d+'"/>').join('')+'</svg>';
}
const z2a2PathCache=new Map();
export function z2a2DrawIcon(c,name,x,y,size,color){
 const paths=Z2A2_ICONS[name];if(!paths||typeof Path2D==='undefined')return false;
 let geom=z2a2PathCache.get(name);if(!geom){geom=paths.map(d=>new Path2D(d));z2a2PathCache.set(name,geom);}
 c.save();c.translate(x-size/2,y-size/2);c.scale(size/24,size/24);c.strokeStyle=color;c.lineWidth=1.8;c.lineCap='round';c.lineJoin='round';for(const p of geom)c.stroke(p);c.restore();return true;
}
