export const ING = {
  beef:{name:'野牛肉',emoji:'🥩',tags:['鲜','肉','厚重'],lo:5,hi:8,cost:8},
  chicken:{name:'林地鸡肉',emoji:'🍗',tags:['鲜','肉','温和'],lo:5,hi:8,cost:6},
  chili:{name:'火椒',emoji:'🌶️',tags:['辣'],lo:3,hi:6,cost:4},
  garlic:{name:'蒜瓣',emoji:'🧄',tags:['香'],lo:3,hi:6,cost:2},
  mushroom:{name:'幽光蘑菇',emoji:'🍄',tags:['菌香','鲜'],lo:4,hi:7,cost:3},
  cabbage:{name:'卷心菜',emoji:'🥬',tags:['清爽'],lo:3,hi:6,cost:2},
};
export const RECIPES = {
 chili_meat:{name:'辣椒炒肉',emoji:'🌶️',ids:['chicken','chili'],also:[['beef','chili']],method:'stir',station:'WOK',time:8,price:28,tags:['辣','肉','鲜'],cost:12},
 mushroom_stir:{name:'菌香小炒',emoji:'🍄',ids:['mushroom','garlic'],method:'stir',station:'WOK',time:6,price:18,tags:['菌香','鲜','香'],cost:6},
 chicken_stew:{name:'蘑菇焖鸡',emoji:'🍲',ids:['chicken','mushroom'],method:'stew',station:'POT',time:12,price:24,tags:['温和','菌香','鲜'],cost:9},
 veg_stir:{name:'清炒双蔬',emoji:'🥬',ids:['cabbage','mushroom'],method:'stir',station:'WOK',time:6,price:16,tags:['清爽','菌香'],cost:5},
 flame_beef:{name:'爆炎牛肉',emoji:'🔥',ids:['beef','chili','garlic'],method:'stir',station:'WOK',time:10,price:34,tags:['辣','肉','香','爆香'],cost:15,hidden:true}
};
export const CUSTOMERS={adventurer:{name:'冒险者',emoji:'⚔️',likes:['辣','肉'],budget:40,patience:22},family:{name:'家庭食客',emoji:'👨‍👩‍👧',likes:['温和','菌香'],budget:27,patience:30},regular:{name:'普通食客',emoji:'🙂',likes:['清爽','菌香','鲜'],budget:24,patience:25},critic:{name:'美食评论家',emoji:'⭐',likes:['辣','香','爆香'],budget:50,patience:24}};
export const FORECAST=[{name:'温暖家常',hint:'家庭偏多 · 菌香与炖煮受欢迎',segments:['family','regular','family','adventurer','regular','family','critic']},{name:'勇者集会',hint:'冒险者增多 · 辛辣肉食成为热门',segments:['adventurer','family','adventurer','adventurer','regular','adventurer','critic']},{name:'爆炎厨王挑战',hint:'压轴评委看重辛辣或爆香 · 超过 70 分获胜',segments:['adventurer','family','adventurer','adventurer','regular','adventurer','critic']}];
export const DEFAULT_INVENTORY={beef:2,chicken:9,chili:1,garlic:8,mushroom:12,cabbage:8};
export const ROUTES=[{id:'safe',name:'晨露采集线',subtitle:'安全 · 保底采集目标，几乎无损失',emoji:'🌿'}, {id:'risk',name:'野牛狩猎线',subtitle:'危险 · 更多肉类与意外收获',emoji:'🦬'}];