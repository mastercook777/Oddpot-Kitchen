// Optional prompts for the first loop. A missing field means an existing save.
export function firstDayGuide(s){
 if(!s.onboarding?.enabled)return null;
 if(!s.onboarding.replay&&(s.cycle!==1||s.day!==1))return null;
 const phase=s.phase;
 if(phase==='forecast')return {title:'第一天，从这间小厨房开始',body:'先看看食材与便当，再出门采集。回来研发料理、编菜单，晚上亲自开店。',action:'点「出门取材」开始'};
 if(phase==='field'&&!s.field)return {title:'去找今晚的食材',body:'采集路线偏地面原料；狩猎路线偏怪物掉落。每次三段，可随时带着背包回店。',action:'选区域与路线出发'};
 if(phase==='field')return null; // Keep the joystick and encounter controls clear.
 if(phase==='research'&&!s.cook&&!s.researchReceipt)return {title:'试做一道新菜',body:'挑 2–3 种食材和锅具；亲手下料、掌勺、起锅，品质和适配工艺会影响售价。也可先用已有菜。',action:'研发或点「去上架」'};
 if(phase==='menu')return {title:'把料理写进今晚菜单',body:'三道菜决定顾客能点什么。比较售价、制作时间和可做份数，高价菜也要考虑食客口味。',action:'检查菜单后去备餐'};
 if(phase==='prep')return {title:'开门前再检查一次',body:'确认原料、厨位和员工。开门后主厨到锅边做菜，去出餐台取盘，再送到对应餐桌。',action:'准备妥当就开门'};
 if(phase==='report')return {title:'第一晚，看看真实账本',body:'收入只来自成功上桌的订单。看顾客评价和缺料，再决定明天研究什么、升级什么。',action:'看完日报继续成长'};
 return null;
}
