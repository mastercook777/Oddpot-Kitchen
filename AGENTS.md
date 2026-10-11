## v0.7.5 主线经营体验重构已提交（2026-10-11）

- 最新实现交接：docs/V0.7.5_MAINLINE_IMPLEMENTATION.md。此前 v0.7.4 被用户拒收，新 v0.7.5 是对应的重绘/简化版，**仍须真机玩家体验验收**；下方较旧段落仅保留历史，不应据此恢复原交互。
- 角色、桌椅、厨房灶台和交互点必须共用 src/restaurant_scene_v075.js 中 DINER_FLOOR；src/walkable_restaurant_v07.js 仅为兼容适配器。src/scenes_v04.js 统一绘制新移动经营 Canvas 场景，不能再叠加旧 DOM 锅、固定主厨或透明桌位按钮。
- 新版经营 UI 在 src/app.js 的 service()，旧 serviceLegacy() 只服务旧存档兼容。新 UI **没有**“选择顾客 / 优先出餐 / 经营事件 / 继续迎客”底部按钮。事件自动出现并一次有效选择后直接 resumeBreak()；点击开门直接开始。
- 主角、阿火、小芽与顾客必须使用相同 DINER_ACTOR_SCALE=1.13；人物工作状态仅图标。人物沿真实通道连续移动；取盘和上菜须有短暂读条，不能立即瞬移订单。
- 仅 src/engine.js 管理真实 orderId、顾客耐心、制作进度和唯一 sale-orderId 事务。新营业由 RAF 单时钟驱动移动、交互与整数生产 tick；不得恢复旧 750ms 模拟时钟驱动新移动经营。
- **游戏内版本号必须与浏览器标题/package 一致**，当前 v0.7.5；变动时记得调整 index.html 的 app.js 缓存参数，避免发布代码但用户仍加载旧脚本。
- 回归测试包含 tests/v075_restaurant_refactor.test.js；仍需 iPhone 真机测试单人首日晚餐、员工路径、双人桌、事件流程、存档以及 320×568 小屏。
## v0.7.4 经营升级验收不通过；以 v0.7.5 重构审查为准（2026-10-11）

- **最高优先级：** `docs/V0.7.5_RESTAURANT_REDESIGN_AUDIT_v0.1.md`（用户明确拒收正式 v0.7.4）；已合并到代码不等于体验通过。禁止继续在旧选顾客/优先级/波次三按钮底栏上打零散补丁。
- **必须整体重做：** 正式餐厅实体厨房/通道/柜台/桌位的单一布局与可走动场景；新营业专属 UI（移除旧顾客选择、订单优先级、金币招待和大底栏）；波次事件自动出现、点击一次有效选择后自动恢复营业，不再让玩家点“继续”。
- **已确认代码缺陷：** `tableSeatState()` 漏掉 `pickup/carried/delivering` 等新阶段；`src/app.js` 750ms 推进 1 模拟秒，而 `walkServiceHero()` 吃 RAF 现实秒；正式主线取盘和上菜没有实验版短动作时间，员工与主角路径/反馈未统一；旧 DOM 厨房/桌位与 Canvas 双层绘制、透明 hit-map 冲突。
- **保持硬性约束：** 主角/员工/顾客 1.13 同尺度，不可放大主角；所有角色真实通道连续移动、不会瞬移或穿家具；主角工作状态 indicator **只图标不带文字**。正常工作自动且零精力，只有玩家主动点技能才扣精力；同一真实订单只发生一次送达/销售。
- 重构应先在独立可玩场景/分支完成视觉和操作整合再一次性切正式 SERVICE，验收覆盖 320×568/375×667/390×844、四种员工配置、事件一次选择、双人桌、订单取消/收入/存档。现有单元测试绿灯**不足以证明 UI/体验通过**。
- 历史 `docs/V0.7.4_MAINLINE_WALKABLE_MERGE.md` 只可用作上一轮代码记录，其中「已合并」不代表「已验收」。

## v0.7.4 可移动经营已经合并正式主线（2026-10-11）

- **权威交接：** `docs/V0.7.4_MAINLINE_WALKABLE_MERGE.md`。与本文件较早的“v0.7 仅 Lab、未进入正式经营”描述不同，当前 `src/app.js` 新开业实际调用 `createService(game,{walkable:true})`，移动餐馆已进主线。旧存档如果正在进行一场 `walkable:false` 的营业，当前场保持旧规则，直到下一次新开业再切换。
- **人物一致比例：** 主厨、阿火、小芽、顾客都沿用 `DINER_ACTOR_SCALE=1.13` 与 `pixelActor`。切勿再次额外放大主厨，或绘制旧固定主厨和新移动主厨两个人；工作状态头顶 indicator **仅小图标，不附带状态文字**。
- **无瞬移：** `src/walkable_restaurant_v07.js` 负责世界坐标移动、桌椅/柜台碰撞、小芽 `PASS→通道→桌位→PASS` 串行送餐；地图现有 `drawDiner` 自带 translate/scale，不能把 CSS 屏幕坐标直接混入 Canvas 世界坐标。主角复用探索 `joystickVector`。
- **账本唯一：** `src/engine.js` 负责真实厨房订单、备菜、加工原料、`pickup→carried/delivering→flying→eating` 交付。手动上菜和小芽自动送菜不能同时为同一 `orderId` 记收入；通过旧 `sale-orderId` 一次性记入。新 walkable 模式不绘制空中抛盘。
- **精力按玩家意愿：** 正常站厨位做菜/移动/拿盘/上菜零精力，只有主动点击临时图标技能才会扣。端盘不分身做菜，无人负责的厨位停火，阿火只照看指定厨位。
- 正式 H5 入口 `index.html`、可离线 `standalone.html`、生成脚本 `scripts/build-standalone.py` 均已加入新模块。测试 `tests/v074_mainline_walkable.test.js`，此外旧 `v07/v072/v073` Lab 为纯对照，不再是正式实现的唯一来源。
- 仍需要玩家真机验收人流、帧率/触摸和首日经济节奏；主厨工作餐新 Buff 和装备未实施。

## v0.7.3 精力系统玩家自主权（2026-10-11，独立 Lab 已实装）

- 现行 v0.7.3 独立实验 `experiments/v07-walkable-diner-lab.html`：**站着普通煮菜、移动、取盘和上菜全部自动且 0 精力**。旧 v0.7/v0.7.2 靠近厨位 0.6s 自动消耗 2 精力加速、靠近桌位自动消耗 1 精力安抚的规则 **已撤销**。
- 真正消耗精力的动作必须由玩家明确点击仅在条件合适时出现的 `#special` 情境按钮：`serviceSpecialAction` 只读判断，`activateServiceSpecial` 在点击时重新验证并一次性扣精力。厨位全力加速（2 精力、该单 -2s）；顾客剩余耐心 ≤12s 时紧急安抚（1 精力、+4s）。端盘状态不允许释放额外技能。
- 恢复机制：工作/端菜时 12 秒恢复 1 精力；空闲时 7 秒恢复 1；上限 6，暂停不恢复，0 精力也能正常经营。当前只是实验数值，未同步 `src/engine.js` 正式主线。
- 设计与测试：`docs/V0.7.3_EXPLICIT_STAMINA_ACTIONS.md`、`tests/v073_stamina_intent.test.js`，原 v07/v072 测试也已更新。今后**绝不可**靠站立持续时间推断玩家愿意消耗精力，避免玩家想正常烹饪却被迫“全力”。

## v0.7.2 独立餐厅实验：取餐、上菜优先、安抚救场（2026-10-11）

- 正式经营主线 `src/engine.js` **未被 v0.7.2 实验改动**。只改了 `experiments/v07-service-lab-engine.js` 与 `experiments/v07-walkable-diner-lab.html`；设计细节：[v0.7.2 上菜和安抚双功能](docs/V0.7.2_SERVING_AND_COMFORT_DUAL_INTERACTION.md)。
- 真实动线：厨位做熟菜 → 出餐台 `PASS` 出盘 → 玩家靠近出餐台 0.38s 自动拿起**一个**盘子 → 靠近**正确餐桌** 0.50s 自动上菜；端着别桌的菜不能给错桌服务，也不能同时在另一口锅干活。
- **餐桌区有两种功能且明确优先级：携正确餐盘时上菜，不携盘且订单等待时安抚（+4s 耐心、精力 -1、每订单一次）**。取餐/上菜/日常煮菜不消耗精力，额外厨位加速才消耗精力。单人离开无人看管的厨房会停工。
- 无跑堂小芽时，已出锅料理长时间未被玩家领取，客人约 8s 后自取兜底；雇小芽可约 1.25s 自动送达。同一 `orderId` 只有一次成功交付，主厨抢先端走后小芽不再重复配送；客人离开会取消主厨手中的过期餐盘。
- 屏幕显示唯一的主角与手上餐盘图标，出餐台显示真正已做好等待送达的盘子；独立 Lab 固定客流、无真实金币/存档。回归：`tests/v072_serving_lab.test.js`（还检查可玩 HTML module 语法）。
- 正式接入时必须从现有飞盘落桌/收入账本迁移到明确的交付状态机，**不可同时存在自动落桌和手动落桌两次记钱**。原 `src/scenes_v04.js` 固定厨师也要替换为同一移动角色，避免视觉重影。

## v0.7 服务实验与单人值守设计（2026-10-11，尚未改正式餐馆）

- 已提交 `experiments/v07-walkable-diner-lab.html` 和纯逻辑 `experiments/v07-service-lab-engine.js`。使用与野外探索相同的 `src/controls_v041.js` 动态摇杆计算和 `src/pixels_v041.js` 角色资源，移动到真实厨位/餐桌附近停留 0.6 秒自动交互。对照四种配置：仅主角、阿火、小芽、全员。
- **重要变更：** 单人开店时主角必须实际值守厨位才做饭；离开后厨去安抚餐桌时，无员工负责的厨位没有“幽灵做菜”。阿火自动料理左锅（右锅只有实验性的缓慢余温），小芽负责前厅等待/上菜效率。这让招聘带来岗位卸载而非单纯数值 Buff。
- 当前实验采用固定同批 8 单的简化客流，**没有连接正式金币、真实订单账本、员工购买、存档或正式厨房引擎**。不要误以为 v0.7-A 已发布到正式营业。回归测试：`tests/v07_walkable_lab.test.js`。
- 最新设计权威文档：`docs/V0.7.1_STAFFING_AND_SOLO_OPERATION.md`。旧 `docs/V0.7_WALKABLE_RESTAURANT_DESIGN_v0.1.md` 中“即使只有主角也全自动两锅”的假设已废止。
- 将来接正式主线时，`src/engine.js tick()` 应成为唯一订单进度/扣款权威；现有 `src/scenes_v04.js paintDinerStaff` 旧固定主厨必须替换成移动主角，不能绘制双主角；注意既有餐厅 Canvas 的 translate/scale 与碰撞坐标对齐；旧存档不能无提示地从全自动切成无员工即停工。
- 主厨工作餐强化和装备保持后续阶段，不要将标签做成全菜通用收益；真正效果须有菜谱×工艺配对。手机 Safari 真机移动/帧率/安全区需要人工验收。

## v0.6.3-C 正式研发四动作动效已实装 / v0.7 可移动餐馆仅设计（2026-10-11）

- 炒锅翻炒、颠勺；深锅轻搅、收汁，已在 `src/cook_motion_v063.js` 和 `src/app.js` 使用「**同一真实食材元素 × 模拟时钟确定性运动**」实现，不要通过复制 emoji/DOM 贴图或 CSS transform 动画叠加重影；详见 `docs/V0.6.3C_COOK_ANIMATION_HANDOFF.md`。
- `src/cooking_v063.css` 只保留锅体、汤水、水纹、光效等常驻层。动作反馈不修改真实料理品质、经济收益或订单规则。
- 下一阶段可移动主厨与 active-idle 经营 **尚未开发**；仅有 `docs/V0.7_WALKABLE_RESTAURANT_DESIGN_v0.1.md` 草案。核心约束是不移动仍可自动营业；优先围绕现有两厨位、两张桌子设计四个近身自动互动点，主角体力与料理强化/装备后置，维持现有顾客、工时、库存与账本唯一结算。
- 新动效覆盖 `tests/v063c_motion.test.js`，正式/离线 H5 均须包含 motion helper；手机 Safari 真机仍待人工试玩。

## v0.6.3-B 已实施：菜谱工艺→经营/员工/探索 + 研发结算（2026-10-11）

- 正式主线开发文件与已通过自动测试详见 `docs/V0.6.3B_FULL_LOOP_AND_RESEARCH_RECEIPT.md`。**后续勿再声称工艺只收藏不生效**；已研发工艺会通过 `recipeCraftSnapshot` 确实改变顾客适配、具体菜工时、菜价、真实消耗的原料及品质，但**仅对匹配的菜谱×工艺配对**生效，通用词条不拥有 Universal Buff。
- 顾客通过 `selectArrivalDish` 锁定 `order.craft` 快照，销售仍落桌后 `sale-orderId` 一次性入账，评价滞后；中途换菜单/选工艺不改既有订单。预制食物另存 `prepVariants` 快照，不能将不同工艺的预制菜变成订单中的新工艺。
- 阿火/小芽根据所选菜品工艺真实投喂扣料，只有专属 `crewSpecific` 配对才有额外收益，仍保留帮厨省时≤4s、跑堂耐心≤12s 旧上限。
- 每日 forecast（或还没进入探索时的 field）可以通过已解锁特色菜制作一份便当，`bento` 扣料事务每日一次；`field_v04.js` 负责一次性采集加量、条件减伤和危险路线小幅加速，受原背包容量与 `settleField` 唯一入仓约束。非所有菜都有专属便当。
- 起锅后专属 `researchReceipt` 全屏结算页，呈现菜名/失败原因、真实投料和动作事件、品质/工艺适配、营业/员工/探索用途、所耗材料；点击返回研发/再试/图鉴/去上架。
- 兼容老存档 `oddpot-prototype-v04` 的数值品质字段及 `legacy` 标准工艺。继续跑 `npm test`（含 Vite 实际构建、离线脚本和 `tests/v063b_chain.test.js`），涉及 UI/手势需真机 Safari 验收。

## v0.6.3-A 已实施（2026-10-11）：连续实时烹饪 + 料理工艺图鉴

- 主线 `index.html` 已改用 `src/cooking_v063.js` 的自由下料实时研发，而不是 3×3/三拍热量研发；后者保留是为了旧存档及旧测试兼容，不应重新将它接回研发 UI。
- `src/data.js` 保留原先 12 道菜的 recipeId 并扩展 168 种厨具×组合签名（167 个唯一菜 ID，`chili_meat` 含替代食材）；人工配置 18 道重点菜见 `src/recipe_profiles_v063.js`。通用组合兜底有菜名，不代表 168 道人工平衡完成。
- 玩法：开火前只选 2–3 种食材及炒锅/深锅，玩家实时亲手投料；炒锅翻炒/颠勺，深锅轻搅/收汁；夹生/漏料/严重焦糊失败且扣材料，成功建立工艺版本。
- `s.recipeVariants` 与 `s.activeVariantIds` 通过 `ensureRecipeVariants` 做非破坏式老存档迁移。`s.recipes` 仍是旧经营依赖的数字品质，保存键 `oddpot-prototype-v04`、版本 4 不变。
- **v0.6.3-A 仅工艺识别/收藏，不对营业修改售价、生产时间、顾客适配、员工餐或探索便当。** 将来这几类收益由具体 `recipeId×variant.style` 配对决定，严禁 Universal「爆炒-1秒／收汁+2金币」规则。
- 重要债务：`chili_meat` 研究可用牛肉或鸡肉，但旧营业原料表仍可能固定扣鸡肉；v0.6.3-B 必须在订单快照/生产扣料中使用变体真实 `ingredientIds`。
- 同步更新 `standalone.html` 和 `scripts/build-standalone.py`；验证 `npm test` 会运行实际 Vite 构建及离线 H5 语法检查。视觉画面要在真实 iPhone 上人工验收。
- 交接文档：`docs/V0.6.3A_MAINLINE_IMPLEMENTATION.md`；配对方案：`docs/V0.6.3A_RECIPE_TECHNIQUE_MATRIX_v0.1.md`；后续设计：`docs/V0.6.3_RECIPE_VARIANTS_CLOSED_LOOP_PROPOSAL.md`。

## v0.5A 最新实现边界
- 双物理厨位的字段位于 `s.kitchen.slots[0/1]`（类型 WOK/POT，等级 1/2）；`s.service.stations.WOK/POT` 仍作为**左/右物理槽的历史键**，不要把键名当成当前锅具类型。
- 调度需调用 `kitchenHasMenuCoverage`、`stationDuration`、`ensureKitchen`，不得绕开库存账本、波次或双工位互斥。
- 旧 `upgrade` 布尔值升级映射左厨位 Lv2；不可重复给原升级扣款。
- 任何变更先跑 `npm test`，特别是 `tests/v05a.test.js` 与旧版 51 项。

# Oddpot Kitchen — Agent / Codex instructions

## Goal and source precedence
The current executable prototype is **v0.4.4**. Read `docs/GDD_v0.4.2_PLAYABLE.md` first, then `docs/GDD_v0.4_PLAYABLE.md` and `docs/GDD_v0.3_PROTOTYPE.md` for changes explicitly authorized by the player; then read `docs/SOURCES.md` for the original v0.2 GDD and Codex handoff. v0.3 experiments override the *number of ingredients/recipes* and *default manual cooking in the restaurant*, not the original accounting / challenge invariants.

## Do not destroy the working prototype
- The `prototype/v0.2-baseline` branch preserves the previous approach.
- Do not copy recipes from older superseded GDDs unless new v0.3 rules explicitly permit them.
- Main game is served by `index.html` and JS/CSS from `src/`; `standalone.html` is generated by `python3 scripts/build-standalone.py`.
- The main game must fit **one mobile viewport without page scrolling**; sheets may scroll internally.
- Only `src/engine.js` may mutate economic state, reservations, order state or permanent progress; the UI sends player actions and renders results.

## Non-negotiable invariants
1. Materials are acquired into the bag while exploring; only `settleField()` books them into persistent inventory, with one transaction ID per day.
2. A cooking experiment consumes genuine ingredients, including failures. Standard dishes also consume them when service jobs really start.
3. Restaurant uses WOK serial and POT serial, but the two types run in parallel. No auto-cooked recipe unless discovered.
4. One customer order is settled once. Guests who leave do not generate sales. Hospitality costs 5 coins once per service and separately affects patience.
5. Manual cooking never creates zero-time work. For v0.3, avoid requiring manual cooking in regular service altogether.
6. Day 3 boss replaces evening service, not doubles it. Reward can be claimed once.
7. Saved inventory, recipes and permanent upgrades persist between cycles, while temporary events re-roll deterministically.
8. Reset and mobile Safari backgrounding must not silently duplicate rewards.

## Iteration workflow
- `npm test` before committing. Add targeted tests to `tests/` for any change to cooking, economy, exploration or time.
- For visual fixes, inspect on representative 390×844 and 375×667 viewports; check 320×568 small phone where practical.
- Test at least one path from ingredient pickup → new recipe → menu selection → completed restaurant service → report. Avoid menu-only static demonstrations.
- Preserve test evidence and note deviations from the design contract in docs.


## v0.4 boundaries (2026-10-09)
- See `docs/GDD_v0.4_PLAYABLE.md` for explicitly delivered behaviors and caveats.
- Do NOT replace lightweight real-time exploration with tile clicking or pretend static hazard squares are enemy AI.
- Do NOT pick all tonight's menu items before guests arrive: actual arrivals determine recipes, so intermission swaps matter.
- Service event / swap / emergency prep is a mutually exclusive intermission decision; no double transactions.
- Preserve keyboard accessibility and touch joystick, save-before-background, and no scrollable body on iPhone.
- Canvas is presentation, while engine owns deterministic settlement, cost and stock.
- v0.4 remains subject to user validation, avoid claiming full Kairosoft-style simulation.

## v0.4.2 input and graphics

- `src/controls_v041.js`: single source for analog dead-zone and radius mapping. Do not reintroduce fixed bottom-left controls.
- `src/pixels_v041.js`: reusable low-resolution original sprite primitives; scene animations only read authoritative engine combat/order flags.
- `src/field_v04.js`: preserve deterministic damage/reward events; visual timers cannot grant loot or alter economics.
- Mobile controls must preserve secondary-touch skill use and `touch-action: none` on the playfield.
- Rebuild `standalone.html` using `python scripts/build-standalone.py` after source edits.

## v0.4.2 rules

- Two distinct source maps with safe/risk variants; do not merge into static tile-path clicking.
- Backpack permanently upgrades 6→7→8 at real gold cost; full bags can discard expedition-only stacks, never persistent restaurant ingredients.
- Intermission/service animation progress must be derived from authoritative `service.time` and frozen when paused. Never use `clock % 1` to restart enter/serve effects.
- Prep panel must remain clickable above the diner canvas/hitmap; verify all three dishes and the open-restaurant button on 390×844, 375×667, and 320×568.
- Keep the zoomed-out restaurant and compact labels; customers, not UI overlays, are the scene focus.

## v0.4.3 mobile UX invariants

- Keep stage, toast, and dock in a fixed viewport; do not reintroduce document-body scrolling or overlapping fixed coordinate cards for route selection.
- In `src/mobile_ux_043.css`, prefer at least 12px secondary copy, 14px primary list labels, 44px decision tap targets, distinct selected states and high contrast.
- Test short phone 320×568 as well as 375×667 and 390×844. The three menu slots, kitchen split, and synergy need to remain visible, not clipped behind the toast.
- Intermission four decisions must stay usable without tiny squeezed labels. Event cards must expose **all** options on short screens (or have clearly usable internal scrolling).
- Keep scroll position for horizontal ingredient chips and long recipe/library sheets across `render()` state updates.
- `src/mobile_ux_043.css` is part of the production layout: both `index.html` and `scripts/build-standalone.py` must include it.
- This release is UX-only: retain existing v0.4 saves and engine settlement behavior.

## v0.4.4 HUD rules

- `src/hud_044.css` is required in `index.html` and standalone build. No permanent exposition banners on live field or restaurant.
- Forest HUD should only surface HP / bag count / elapsed time; active skillet skill lives bottom-right of the **scene**, joystick stays floating where touched.
- Second finger presses must work during the first finger's floating movement; use pointerdown, not synthetic click alone. Preserve stick visual after app render updates.
- Restaurant HTML overlay only annotates interactive pots and seats; guest graphics, actual work and serving should stay unobstructed. Don't re-add event text across tables or the chef.
- Short-lived HUD notifications must never mutate economy or timers; restaurant animations stay frozen on pause.
- Check all 3 viewport sizes and click both kitchen and table targets after every HUD change.

## v0.5B crew rules
- Staff are optional: one helper and one waiter at most; hire once, persist across days. Keep their pixel actors connected to service state.
- Feed each role only one unlocked standard recipe per day; consume shared inventory through a unique ledger transaction. Save per-day meal buffs and cap familiarity.
- Snapshot the active crew at service creation. Helper modifies duration of the selected physical kitchen position, waiter modifies customer patience on actual arrival.
- Report real helper seconds / waiter patience changes, subtract staff-meal ingredient costs exactly once; do not duplicate a sale or touch third-day challenge payout.
- Keep SAVE_KEY/version-4 compatibility; migrate active v0.5A service gracefully. Run all Node tests and mobile 320px/375px/390px smoke checks after changes.

## v0.5C 约束
- Two fixed physical tables, each with two real seat indices (0,1). No two active orders may share `(tableId,seatId)`.
- Scene actor scale must stay unified; waiters move along aisles and chef throw is event-driven, not clock modulo.
- No displayed plated food before `plateFlight(simTime,servedAt).landed`.
- Crowd plan, daily goal and each break event are deterministic from seed, cycle, day, reputation, saved with service state and not rerolled per UI render.
- Daily goal reputation reward is idempotent. The per-order revenue/ingredient ledger remains authoritative.
- Manual cooking research behavior is intentionally not redesigned here; reserve its gameplay redesign for v0.6.

## v0.5D 经营状态一致性
- 角色离席/跑堂动画由 service 时间和事件派生，不得以 modulo 或最新到店事件直接改变角色位置。
- 顾客已 served 后仍占座至离席动画结束；实际出餐收入只在 engine 结算。
- `serviceSupplyStatus` 只读共享库存、预制、排队订单，缺料警示不能自行扣料或改变订单。
- 经营主题选择不能使用 `rand(key)%5`（LCG 低位与模5互相抵消）；修改后需多 seed 测试五种主题及各自客流规则。


## v0.5E 客户行为不可破坏的约束
顾客的完整有序链：waiting → entering → ordering → queued → cooking → flying → eating → review → served/离店；缺料/超时直接 rejected/left。必须保留事务幂等：落桌才 sale、吃完才 reviewed、同订单只结算一次；只有已落座顾客可以点单；暂停时所有行为使用营业模拟时间。透明两座位点击热区是允许的，但不允许恢复四个可见座位方块。先运行 `npm test` 再提交。