# 《怪味食堂》START_HERE · 新对话 / Codex / 开发接续入口

> **2026-10-22 新插入 P0 · v0.15-H**：玩家纠正原店航运委托的物资来源，云港不该直接领取当地能探索到的食材。已在 [v0.15-H 先行规格](V0.15H_HEARTH_EXPORT_AND_CLOUD_FUSION_SPEC.md) 与 [开发 PR #91](https://github.com/mastercook777/Oddpot-Kitchen/pull/91) 改为边境旧料三箱+五道云港融合菜；保留旧菜跨章只读、唯一券结算。**PR 未合并，main 仍为 alpha.7**；已获 549/549 Node、16/16 PR Actions（Chrome/离线含于其中），接下来处理 PR 合并、Pages 线上核验及玩家真机验收，再回 v0.15-D 长期经济审计。

> **最新核对：2026-10-22｜`main` 版本 `0.15.0-alpha.7`**  
> **代码状态：v0.15.0-alpha.7 已合并 main；545/545 Node、16/16 PR CI 全绿；Pages 当前线上版本无法独立核验，玩家 iPhone/Android 上四根彩柱消失及新航运补给体验仍待验收。**  
> 仓库：https://github.com/mastercook777/Oddpot-Kitchen · [线上试玩](https://mastercook777.github.io/Oddpot-Kitchen/)  
> 本文是**入口而非版本流水账**；具体已实装读 [PROJECT_STATE](PROJECT_STATE.md)，下一步优先级读 [ROADMAP](ROADMAP.md)。旧版设计与更新历史可从文档索引、Git 记录回溯。

## 30 秒了解现况

- **第一世界已完成三星与首门**：经营、配方研发、探索、星章、四桌、第三厨位＋员工、烧烤和三席万味会宴构成可玩的章节。第三星与首个可玩传送门在 v0.15 联合落地，不再是未来任务。
- **第二章节「云港浮岛」已能玩首个经营闭环**：新食材、风道与风暴首领、云汽蒸笼、当地客群、独立材料/现金/星章与本地首星目标。它不是第二周目，也不清空原食堂。
- **玩家在 v0.15.0-alpha.1 指出六项严重问题**：新世界换皮、员工直接沿用、两厨位三厨具、旧菜误上架、图鉴缺厨具分类、返回旧世界缺乏意义。
- **v0.15.0-alpha.3 / [PR #84](https://github.com/mastercook777/Oddpot-Kitchen/pull/84)** 已按 [返工规格 v0.15-C](V0.15C_CLOUD_HARBOR_REWORK_SPEC.md) 修改实际代码：浮岛环境与差异化攻击；阿岚/小羽/小栖当地雇佣与独立 XP；真实厨具覆盖；跨章旧菜只读；图鉴按锅具分类；原店真实营业生成航运委托并在云港换当地普通材料。旧 v0.15 云港存档迁移。记录的测试为 515 项 Node、16/16 CI、Chrome 320/375/390 与离线入口通过；[后续部署记录 #85](https://github.com/mastercook777/Oddpot-Kitchen/pull/85) 确认 Pages 关键入口。
- **仍未验收**：玩家真机对“真浮空岛感觉”、攻击辨识、中文显示、操作流畅度以及原店委托是否有策略价值的反馈。不要说“用户已经满意”；也不要把云港二星、三星或第二扇门说成已开发。

## 当前阅读顺序（新代理不要从 v0.12 开始）
**最新已完成源码修复（2026-10-22，alpha.7）**：[v0.15-G 精准定位与补给优化](V0.15G_FERRY_CARGO_AND_SCENE_PROP_FIX.md)，[PR #90](https://github.com/mastercook777/Oddpot-Kitchen/pull/90) 已合并 `main`。图片中的左上四根彩色竖块**不是炉具**，真实来源为两个餐馆共享的 `src/scenes_v04.js` y=.185 装饰循环；本次已精准移除，v0.15-F 对烤架的更改不能视为该问题已解决。旧店真正卖菜获得一张委托后，以前在云港只能换 `cloud_rice×2 + sky_moss×1`（三份），现在云港市场可三选一兑换**八份当地普通材**，按主食/蒸羹/酸铃需求选择；云港每天最多一次，旧账本不会重兑。**545/545 Node、16/16 Actions 通过**；Pages 当时网页工具访问失败、手机真实反馈待验收。下一步仍是 P0 手机复查、P1 双世界实际营业经济审计。


**最新玩法交付（2026-10-21，alpha.6）**：[v0.15-F 图鉴/烤架/双跑堂](V0.15F_RESEARCH_ATLAS_CLOUD_DUAL_WAITERS_SPEC.md)，[PR #89](https://github.com/mastercook777/Oddpot-Kitchen/pull/89) 已合并 `main`。图鉴按本章库存/厨具判断一键进入真实研发，地区筛选与旧世界图鉴只读边界保留；两世界去掉高彩竖柱并绘制低矮烤架；云港首枚当地星章后可付费聘第二跑堂「小澜」，两人独立传餐和计资历/工资。**536/536 Node、16/16 Actions 成功**，但 Pages 当前线上实时版和玩家真实手机观感/经营节奏**未验收**。下一步是手机验证这三项实际操作与双章经济审计，不能重新回到“只有一名云港跑堂”的旧设计。


**最新特色化已实现（2026-10-21，alpha.5）**：用户要求补蒸笼付费升级、云港独立经营素材和第四探索武器。已按 [v0.15-E](V0.15E_CLOUD_STEAMER_WEAPON_AND_ASSETS_SPEC.md) / [PR #88](https://github.com/mastercook777/Oddpot-Kitchen/pull/88) 合并 `main`：STEAM 95币 Lv2/每单 -2 秒、云汽脉冲+原地减速雾域、独立帆索货吊/晶石六角桌/蒸笼和武器特效。528/528 Node 与16/16 PR Actions 通过；**Pages 发布和玩家 iPhone 视觉、控场手感均未由用户验收**。v0.15-B「蒸笼暂不对应探索武器」已过时；下一步仍是 P0 真机验收及 P1 双章经济审计。

**最新补丁（已合并 main，待 Pages/玩家验收）**：[v0.15-C.1 蒸笼研发复盘反馈修复](V0.15C1_STEAM_TECHNIQUE_RECAP_FIX.md)，[PR #87](https://github.com/mastercook777/Oddpot-Kitchen/pull/87)。截图中 `seal / vent` 被误标黄是复盘漏识别动作，**实际出锅的云汽匀蒸品质 80 一直正确**。现在封笼/排汽中文显示、实际 +8/过早 -7 提示、蒸笼可达满分一致，`0.15.0-alpha.4` 已合并，520/520 Node 与 16/16 PR CI 通过、离线包同步；**Pages 线上实际发布与玩家 iPhone 复测另行确认**。下一任务仍是 P0 云港真机验收与 P1 双章经济审计。


1. [ROADMAP.md](ROADMAP.md) —— **当前任务队列**：P0 云港真机验收／P1 双章回归与经济实证／P2 云港差异化经营候选／P3 云港二星／P4 云港三星与第二门。
2. [PROJECT_STATE.md](PROJECT_STATE.md) —— **已实现事实**、关键代码入口、存档与已知边界；旧“当前”段落为历史。
3. [V0.15C_CLOUD_HARBOR_REWORK_SPEC.md](V0.15C_CLOUD_HARBOR_REWORK_SPEC.md) —— 最新玩家六项返工规格，**高于 v0.15-B 的同行员工和旧菜可上架旧假设**。
4. [V0.15B_THIRD_STAR_CLOUD_HARBOR_SPEC.md](V0.15B_THIRD_STAR_CLOUD_HARBOR_SPEC.md) 和 [V0.15A_THIRD_STAR_FEAST_SPEC.md](V0.15A_THIRD_STAR_FEAST_SPEC.md) —— 三星＋首门的历史实施背景，不得将其旧“未实装”声明当作现状。
5. 仓库根目录 [AGENTS.md](../AGENTS.md) 开头的工作规则、当前 `package.json`、实际 `src/` 和 `tests/`；如有冲突，以当前代码事实和更新的开发规格复核，而非跟随旧段落。
6. 影响经济/烤架/旧世界探索时再读 [v0.14-F 经济审计](V0.14F_P1_ECONOMY_RESULTS.md)、[v0.14-E 厨具返工](V0.14E_EQUIPMENT_AND_ORDERING_SPEC.md) 与 [v0.11 探索](V0.11_EXPLORATION_2_0.md)。完整版本索引在 ROADMAP 底部。

## 下一张任务：v0.15-D（**拟定工作包，不是已实装版本**）

**先按 ROADMAP 的 P0/P1 开始**：核查云港六项返工在玩家真机上的效果；跑新档、两星旧档、原 v0.15 已进入云港旧档，核对章节往返、菜单/厨位约束、员工、委托的单次发放与兑换；再基于真实订单/库存/探索材料证明云港与旧世界经营策略是否存在差异。若发现阻断 Bug 先修，不跳去做第二门。

准备经济审计时，必须区分：**已通过 Node/Chrome 自动测试**、**GitHub Pages 部署**、**真实手机主观验收**、**多日经营经济样本**；尤其不能把 `v0.14-F` 的旧世界静态地图材料潜力冒称为 `v0.15` 云港实际战斗收益。新的经营规则、内容和大 UI 改动须先提交版本化规格；小型纯 bug 可以直接用精简修复记录。

## 开发与验收工作法

**全迭代强制交付规则：见仓库根目录 [AGENTS.md](../AGENTS.md#-每一次迭代的文档交付规则2026-10-20-起强制执行)。** 无论新玩法、Bug 修复、数据/平衡、UI、兼容或发布修复，每轮都必须留版本化规格/精简修复记录及实际实现与测试交付；复核 `PROJECT_STATE.md`、`ROADMAP.md`、`START_HERE.md` 并同步有变化的内容；无需修改的文档须在交付记录里说明。**没有可追溯的 GitHub 文档交接，就不能称迭代已完整交付。**


1. 读最新 `main`、`package.json`、`src/`、`tests/`，核对当前存档 schema 和相关规格；不要推测功能未开发，也不要复制以前的仓库或覆盖现有玩家存档。
2. 新内容先用 [FEATURE_SPEC_TEMPLATE.md](FEATURE_SPEC_TEMPLATE.md) 写入 `docs/`：玩家体验、受影响规则、UI、库存/现金/订单 ledger、迁移、测试、玩家验收。提交后再做玩法代码；代码 PR 引用该规格。
3. 按当前项目已有脚本运行 `npm test`、`npm run build`，并进行 320/375/390px 浏览器触控和离线单文件核验；要记录**实际执行**的结果，不能复制以前的 515/16 数字代替新版本测试。更新本页、ROADMAP 和 PROJECT_STATE 中实际变化。
4. 继续保持：餐馆经营 × 料理研发 × 奇幻取材探索三者联动；真正的订单、扣料、工位、员工、顾客和资金结算；新世界必须有能影响操作与经营的机制，不只是更换颜色与地名。
5. 保留玩家决定：**偏强制新手引导暂缓**。已有短提示可用，不借新章节扩展强行添加教程门槛；不以无意义刷日或虚构收入延长进度。

## 发布基线与历史

- `main`：**0.15.0-alpha.7**，v0.15-G 已合并；历史 v0.15-F 已合并；历史 v0.15-E 已合并；历史 v0.15-C 云港返工 [PR #84](https://github.com/mastercook777/Oddpot-Kitchen/pull/84) 和发布确认 [PR #85](https://github.com/mastercook777/Oddpot-Kitchen/pull/85)。这只是**最新核对时**的版本；每次任务重新读取 `package.json` 与提交。
- v0.15-B 关于“携带原店员工并共享经验”“旧菜只靠缺料自然淘汰”的叙述**被 v0.15-C 覆盖**；不可重新实现旧规则。
- 原文以逐版本追加的形式累积到 v0.12/v0.13/v0.14，容易让新对话选择过期方向。现改为短交接入口，原历史仍在 [Git 历史](https://github.com/mastercook777/Oddpot-Kitchen/commits/main/docs/START_HERE.md)，配套设计稿链接见 [ROADMAP 索引](ROADMAP.md#五版本与设计资料索引历史不是活跃待办)。
