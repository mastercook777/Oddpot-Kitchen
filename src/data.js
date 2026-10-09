// v0.3 prototype content — expanded, configurable, not final balance values.
export const ING = {
  beef:{name:'野牛肉',emoji:'🥩',tags:['鲜','肉','厚重'],lo:5,hi:8,cost:8},
  chicken:{name:'林地鸡肉',emoji:'🍗',tags:['鲜','肉','温和'],lo:5,hi:8,cost:6},
  chili:{name:'火椒',emoji:'🌶️',tags:['辣'],lo:3,hi:6,cost:4},
  garlic:{name:'蒜瓣',emoji:'🧄',tags:['香'],lo:3,hi:6,cost:2},
  mushroom:{name:'幽光蘑菇',emoji:'🍄',tags:['菌香','鲜'],lo:4,hi:7,cost:3},
  cabbage:{name:'卷心菜',emoji:'🥬',tags:['清爽'],lo:3,hi:6,cost:2},
  onion:{name:'琥珀洋葱',emoji:'🧅',tags:['甜香','温和'],lo:3,hi:6,cost:3},
  potato:{name:'地精土豆',emoji:'🥔',tags:['饱腹','温和'],lo:5,hi:8,cost:4}
};
export const RECIPES = {
  chili_meat:{name:'辣椒炒肉',emoji:'🌶️',ids:['chicken','chili'],also:[['beef','chili']],method:'stir',station:'WOK',time:8,price:28,tags:['辣','肉','鲜'],cost:12,hint:'肉类 + 火椒，尝试爆炒'},
  mushroom_stir:{name:'菌香小炒',emoji:'🍄',ids:['mushroom','garlic'],method:'stir',station:'WOK',time:6,price:18,tags:['菌香','鲜','香'],cost:6,hint:'森林蘑菇需要一味香料'},
  chicken_stew:{name:'蘑菇焖鸡',emoji:'🍲',ids:['chicken','mushroom'],method:'stew',station:'POT',time:12,price:24,tags:['温和','菌香','鲜'],cost:9,hint:'鸡肉与森林鲜味，慢火焖煮'},
  veg_stir:{name:'清炒双蔬',emoji:'🥬',ids:['cabbage','mushroom'],method:'stir',station:'WOK',time:6,price:16,tags:['清爽','菌香'],cost:5,hint:'清爽蔬菜与蘑菇快速翻炒'},
  flame_beef:{name:'爆炎牛肉',emoji:'🔥',ids:['beef','chili','garlic'],method:'stir',station:'WOK',time:10,price:34,tags:['辣','肉','香','爆香'],cost:15,hidden:true,hint:'牛肉与辣椒贴近两拍，蒜瓣到锅心爆香'},
  garlic_beef:{name:'焦香蒜牛',emoji:'🥩',ids:['beef','garlic'],method:'stir',station:'WOK',time:9,price:32,tags:['肉','香','鲜'],cost:10,hint:'野牛肉和蒜瓣，爆炒出焦香'},
  spicy_mushroom:{name:'火山菌菇',emoji:'🍄',ids:['chili','mushroom'],method:'stir',station:'WOK',time:7,price:21,tags:['辣','菌香'],cost:7,hint:'辣椒与蘑菇不一定需要肉'},
  onion_chicken:{name:'洋葱烩鸡',emoji:'🍗',ids:['chicken','onion'],method:'stew',station:'POT',time:11,price:26,tags:['温和','肉','甜香'],cost:9,hint:'甜香洋葱，试着与鸡肉同炖'},
  potato_stew:{name:'地精土豆煲',emoji:'🥔',ids:['potato','onion'],method:'stew',station:'POT',time:11,price:20,tags:['饱腹','温和'],cost:7,hint:'两种田野作物慢慢焖煮'},
  chili_potato:{name:'爆辣脆薯',emoji:'🍟',ids:['potato','chili'],method:'stir',station:'WOK',time:7,price:23,tags:['辣','饱腹'],cost:8,hint:'火椒配上能扛高温的根茎'},
  woodland_pot:{name:'森林浓汤',emoji:'🥣',ids:['mushroom','potato'],method:'stew',station:'POT',time:13,price:23,tags:['菌香','温和','饱腹'],cost:7,hint:'蘑菇与土豆，慢煮出浓郁'},
  harvest_stir:{name:'丰收三拼',emoji:'🥘',ids:['cabbage','onion','potato'],method:'stir',station:'WOK',time:10,price:29,tags:['清爽','温和','饱腹'],cost:9,hint:'卷心菜、洋葱和土豆，考验三种不同耐热'}
};
export const CUSTOMERS={adventurer:{name:'冒险者',emoji:'⚔️',likes:['辣','肉','饱腹'],budget:40,patience:24},family:{name:'家庭食客',emoji:'👨‍👩‍👧',likes:['温和','菌香','甜香'],budget:28,patience:32},regular:{name:'街坊客人',emoji:'🙂',likes:['清爽','菌香','鲜'],budget:26,patience:27},critic:{name:'美食评论家',emoji:'⭐',likes:['辣','香','爆香'],budget:50,patience:26}};
export const FORECAST=[
  {name:'温暖家常',hint:'家庭食客爱温和菜，菌香与炖煮受欢迎',segments:['family','regular','family','adventurer','regular','family','critic']},
  {name:'勇者集会',hint:'冒险者涌入小镇，辛辣肉食和饱腹菜热卖',segments:['adventurer','family','adventurer','adventurer','regular','adventurer','critic']},
  {name:'爆炎厨王挑战',hint:'最后一桌是评委！辛辣或爆香的高品质料理更出彩',segments:['adventurer','family','adventurer','adventurer','regular','adventurer','critic']}
];
export const DEFAULT_INVENTORY={beef:3,chicken:10,chili:2,garlic:9,mushroom:12,cabbage:8,onion:5,potato:5};
export const ROUTES=[{id:'safe',name:'晨露林间',subtitle:'安全路线 · 菌菇、蔬菜、调料',emoji:'🌿'}, {id:'risk',name:'野牛草场',subtitle:'危险路线 · 肉类、辣椒与更多惊喜',emoji:'🦬'}];