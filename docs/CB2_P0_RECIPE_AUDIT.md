# CB2-P0 · 菜谱/配方内容审计与P1交接
**日期**：2026-11-27；设计 v0.1（GDD v0.4 第14节）。**状态**：实际完成静态内容审计、提出可落地清单；非实装、非玩家验收。  
**源**：main src/data.js `794d3d19bf417921462a0513061a5e3080058a8f`、recipe_profiles_v063.js `289d5613add5125ba14c0a06aebbfe152e62b4ca`、engine.js `82df667d3dc12771ac938494440c2984653ac03b`；R1 已合 main 5e4eae3（历史20/20 CI）。
**权威数据候选**：[CB2_P0_RECIPE_CATALOG.json](CB2_P0_RECIPE_CATALOG.json)；同文件含所有旧ID、旧签名、归并/退休结果、全部有效配方、冲突及候选主菜。JSON是内容审计交付，不是游戏运行时数据。P1应转换成可校验的数据模块，禁止自行重做组合自动生成。

## 1. 实际审计
从连接器获取准确源码，执行 data.js 初始化（真实 RECIPE_PROFILES 绑定，移除 ESM import/export 后在 JS 隔离环境执行），枚举 RECIPES、RECIPE_INDEX；按 recipeCookware 的 steam 特判及 engine.js 云港当地料/进口料约束构造章节/厨具集合。对候选白名单做穷举一致性检查（不是正式 Node/Chrome/CI）。
旧 198 主ID、199 签名（火椒噼啪肉原有牛/鸡替代配方导致+1），49人工、50具名生成、99秘制生成。新建议 55 主菜、177 有效配方；保留55、归并80、退休63旧ID。99秘制：归并59、退休40、保留独立0；50具名生成：升格6、归并21、退休23。全部26个旧RECIPE_PROFILES菜ID保留，Boss、奇遇、云港既有独立内容不丢。基线为当前实际数据，不等于此前对话的示例数量。
|章节/厨具|主菜|合法候选组合总数*|保留配方|未匹配|原签名|原签名可归属|
|---|---:|---:|---:|---:|---:|---:|
|hearth:WOK|18|286|63|223|88|63|
|hearth:POT|14|286|50|236|88|50|
|hearth:GRILL|10|286|29|257|10|10|
|cloud:WOK|4|230|10|220|4|4|
|cloud:POT|5|230|15|215|5|5|
|cloud:STEAM|4|230|10|220|4|4|
* 总数为章节材料范围内2/3种不同食材的数学候选，不代表已解锁、库存足够或一定可食；仅列该章节支持厨具，云港不含烤架、边境不含蒸笼。未匹配一律组合失败，既非新图鉴，也非秘制菜。表内原签名计数可核对JSON的全局199条。没有新增自动命名。

## 2. 主菜策略（建议清单）
保留49人工菜；额外六道有独立风味/主料空缺的具名生成菜提升为主菜（沿用其ID，P1显式策划，不再标generated）。菌香牛肉、蒜香炒鸡、煎菌菇土豆、菌香炖牛肉、鸡肉土豆煲、蒜香菜汤分别补齐炒肉/素食与炖菜分支。其他具名生成菜若符合既有核心归并，不为名字保留重复菜；双肉或纯调味料组合等不强行成为独立菜。原有配方的所有显式签名优先于兼容组合，保留原有特色独立菜（例如爆炎牛魔锅）。配方边界由明确白名单制定，未匹配的新增稀有料组合不能借普通配方绕过稀有独立菜。稀有菜首期只保留原配方，不自动加料。
|区域|厨具|主菜ID / 名称|配方数|来源|
|---|---|---|---:|---|
|hearth|WOK|chili_meat · 火椒噼啪肉|10|人工原菜|
|hearth|WOK|mushroom_stir · 幽光菌锅舞|3|人工原菜|
|hearth|POT|chicken_stew · 咕噜菌雾鸡|5|人工原菜|
|hearth|WOK|veg_stir · 月光跳跳蔬|9|人工原菜|
|hearth|WOK|flame_beef · 爆炎牛魔锅|1|人工原菜|
|hearth|WOK|garlic_beef · 焦香蒜牛|5|人工原菜|
|hearth|WOK|spicy_mushroom · 火山菌菇|4|人工原菜|
|hearth|POT|onion_chicken · 洋葱烩鸡|5|人工原菜|
|hearth|POT|potato_stew · 地精咕噜土豆煲|4|人工原菜|
|hearth|WOK|chili_potato · 爆辣脆薯|4|人工原菜|
|hearth|POT|woodland_pot · 森林浓汤|5|人工原菜|
|hearth|WOK|harvest_stir · 丰收三拼|1|人工原菜|
|hearth|WOK|wok_beef_onion · 葱爆牛肉|4|人工原菜|
|hearth|POT|pot_beef_onion · 洋葱炖牛肉|5|人工原菜|
|hearth|WOK|wok_garlic_cabbage · 蒜香包菜|3|人工原菜|
|hearth|POT|pot_beef_potato · 牛肉土豆煲|6|人工原菜|
|hearth|WOK|wok_chicken_mushroom · 山菌炒鸡|4|人工原菜|
|hearth|POT|pot_mushroom_onion · 洋葱菌菇汤|3|人工原菜|
|hearth|WOK|sour_chicken_wok · 逆潮酸爆鸡|1|人工原菜|
|hearth|POT|sour_potato_pot · 潮酸焖薯|1|人工原菜|
|hearth|WOK|nectar_cabbage_wok · 星蜜卷卷脆蔬|1|人工原菜|
|hearth|POT|nectar_chicken_pot · 星露蜜焖鸡|1|人工原菜|
|hearth|WOK|mushroom_heart_wok · 菌心爆香|1|人工原菜|
|hearth|POT|mushroom_heart_pot · 菌王吐息浓汤|1|人工原菜|
|hearth|WOK|ember_pepper_wok · 熔心喷火牛|1|人工原菜|
|hearth|POT|ember_pepper_pot · 火山焖鸡|1|人工原菜|
|hearth|GRILL|grill_beef · 野牛蒜香串|3|人工原菜|
|hearth|GRILL|grill_chicken · 火椒烤鸡串|4|人工原菜|
|hearth|GRILL|grill_vegetable · 林野菌蔬串|1|人工原菜|
|hearth|GRILL|grill_fire_beef · 炭火椒牛串|3|人工原菜|
|hearth|GRILL|grill_sweet_chicken · 琥珀烤鸡串|3|人工原菜|
|hearth|GRILL|grill_garlic_mushroom · 蒜香菌菇串|3|人工原菜|
|hearth|GRILL|grill_fire_potato · 火椒烤薯串|3|人工原菜|
|hearth|GRILL|grill_garlic_cabbage · 蒜香卷卷串|3|人工原菜|
|hearth|GRILL|grill_forest_beef · 幽光牛菌串|3|人工原菜|
|hearth|GRILL|grill_hearty_chicken · 咕咕烤薯串|3|人工原菜|
|cloud|STEAM|steam_cloud_rice · 云汽鸡香饭|3|人工原菜|
|cloud|STEAM|steam_moss_egg · 雷羽浮苔蒸羹|3|人工原菜|
|cloud|POT|cloud_rice_chicken · 云谷鸡香饭|3|人工原菜|
|cloud|POT|moss_egg · 浮苔雷蛋羹|3|人工原菜|
|cloud|WOK|sour_rice · 酸铃炒云米|3|人工原菜|
|cloud|WOK|sky_egg_chicken · 雷羽金鸡|1|人工原菜|
|cloud|POT|moss_soup · 云苔清汤|3|人工原菜|
|cloud|STEAM|gale_core_steam · 风核云汽珍羹|1|人工原菜|
|cloud|WOK|cloud_chili_rice · 火椒云谷饭|3|人工原菜|
|cloud|STEAM|cloud_garlic_egg · 蒜香雷羽蒸蛋|3|人工原菜|
|cloud|POT|cloud_mushroom_moss · 浮苔菌香浓汤|3|人工原菜|
|cloud|WOK|cloud_beef_sour · 酸铃炙牛|3|人工原菜|
|cloud|POT|cloud_potato_rice · 云米薯煲|3|人工原菜|
|hearth|WOK|mix_wok_beef_mushroom · 菌香牛肉|3|具名升格|
|hearth|WOK|mix_wok_chicken_garlic · 蒜香炒鸡|5|具名升格|
|hearth|WOK|mix_wok_mushroom_potato · 煎菌菇土豆|3|具名升格|
|hearth|POT|mix_pot_beef_mushroom · 菌香炖牛肉|4|具名升格|
|hearth|POT|mix_pot_chicken_potato · 鸡肉土豆煲|4|具名升格|
|hearth|POT|mix_pot_garlic_cabbage · 蒜香菜汤|5|具名升格|

## 3. 有边界的开放配方
每个合法配方以唯一签名（厨具 + 排序食材）和 formulaId（主菜ID@排序食材）注册；下料顺序只影响厨艺，不影响身份。原基础配方/显式替代优先，兼容配方只扩展已列出的核心/辅料；本次实际检测 7 个潜在归属重叠，全部在显式表中选定单一归属，不使用运行时排名或随机择菜。优先明确风味身份（例如火椒牛+洋葱仍属火椒肉；牛+蒜+洋葱归焦香蒜牛；三拼、爆炎等明确独立配方优先）。JSON中每个冲突记录其它候选及取舍原因。后续如需修改，应修订显式表并测试。
举例：铁角野牛肉+卷卷魔菜+跳跳蒜瓣；铁角野牛肉+跳跳蒜瓣；铁角野牛肉+跳跳蒜瓣+幽光蘑菇；铁角野牛肉+跳跳蒜瓣+琥珀洋葱；铁角野牛肉+跳跳蒜瓣+地精土豆。同一道菜多配方；实际耗料不同。没有向玩家揭晓尚未发现的配方表。开发审计表仅内部使用。
合法配方不改变蓝以上开放随机词缀池、独立roll或Cost；第三料不能自动获得更高品质。无效组合与未熟/焦糊失败均真实消耗；不能偷偷变成新主菜。新主菜/新配方发现应在保存工艺时登记，白绿也可发现。

## 4. P1 工程实施合同（尚未实装）
- 独立实验状态启用显式表；正式 RECIPES/RECIPE_INDEX 与旧档不改。旧 evaluator 可以通过参数注入确定主菜（注意云港 beginLiveResearch 当前会按旧 liveRecipeId 拒绝尚未知的组合；实验路径改为验证章节材料而非泄露答案），严禁直接将旧 fallback 作为P1后备。真实材料均可用于该区域允许的未知实验，厨具合法、库存足够；出锅再解析，R1 判定同一套真实受热，不符合配方即失败，不学习不抽词。
- 基础属性建议：以主菜基础属性为锚；标准配方保留原 price/time/tags，实际材料成本始终为 ING.cost 之和（已有 cost 字段不一定相等）。非标准配方对原材料增减按差额有限调整售价（建议不高于增料成本的1.2倍，待平衡），新增第三料制作时间增加约1–2秒（测试参数）；替换同数量不默认加时。风味由真实食材 tags 与菜谱固定工艺风味（例如炭香）构成，移除被替换料特有风味；不直接将主菜完整旧标签并集到变体。不要把迁移旧价格当新配方的平衡值。详细每配方数值在P1确定，不虚构已平衡。
- 真正从工艺快照读 formulaId/ingredientIds/basePrice/baseTime/recipeTags；engine.stationDuration 当前以 recipe.time+timeDelta 为基准，P1实验必须读取 craft.baseTime 后再加词缀/员工/厨具；报价、点单、备餐、消耗、返料、在途订单、报告一起审计。主菜身份限制相同recipeId不能重复上架，即使不同配方；工艺签名纳入formulaId及roll，等效技法名不生成垃圾。菜单/收藏不展示任何秘制旧ID，新图鉴按主菜计数。
- 旧档CB3：legacyRecipes/legacySignatures 全量记录旧映射及成本/价/时，保留历史订单快照；退休项保留历史，不可作为新菜继续生产，安全边界引导换菜。原工艺实际配方签名优先于旧菜ID（特别是 chili_meat 牛/鸡），旧相同主菜合并后去重且保护引用；未执行迁移，不删除存档。
- 验收：所有198旧ID、199旧签名均有明确处理；99秘制无独立新主菜；49人工与26 profile ID完整；各章/厨具组合唯一，允许/拒绝与库存真实校验；同主菜基础/三料两条实烹结果、无效组合失败、真实工单时间/价格/风味/扣料对照、3/4槽及完整一晚，三尺寸Chrome和全部旧CI，之后玩家验收。数值平衡、最终美术、迁移暂未完成。

## 5. 实际结果、限制及下一步
实际在 JS 隔离环境运行了原数据初始化与P0候选枚举；检查旧ID与签名数量、唯一显式匹配、食材存在与章节合法性、全部主菜有配方、保护旧profile、秘制无独立保留，全部断言通过。不是实际引擎/Node/浏览器测试；不声称任何新玩法已经上线。未改运行代码、正式存档、版本、经济与渲染。55主菜/配方边界及六道升格是基于现有资产和风味的设计选择，尚未逐项获得玩家确认；价格、时间、风味细化待P1。R2动画及UI仍后续，优先P1连接真实研发、鉴定、收藏、Deck与营业，然后再打磨工作台和烤串。