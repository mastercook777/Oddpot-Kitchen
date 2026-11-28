# 门前整装 HUD 遮挡修复
基线 main 78db51c895f44dc380b3ee14112a1d95fc21d86b；玩家iPhone Safari截图：左侧三行HUD盖住晨露森林，右上设置盖住热泉峡谷。F2.5仅选择forecast/menu/prep/upgrade，遗漏真实scene=departure（phase=field）；原整备padding62px也低于新HUD底部68px。
修复：统一横向金币/星日/背包/44px设置，窄屏沿用F2.5字体与图标；整备场景固定在HUD底部后8px至dock之前，内部可滚动且不进入HUD，地图两地按钮及路线/装备保留。仅整备场景CSS，实际探索、经济、存档及CB3不改。同步standalone原CSS与在线缓存cb3a2b-departure-hud。
验收：真实WebGL原三尺寸脚本新增HUD/地图边界、同排、44px设置、两个地图按钮触控命中、左右地区切换，原路线/装备/渲染测试保留；新增静态合同和离线CSS一致性。代码候选，尚未执行真实Chrome/Node/完整CI、Pages或玩家真机复验，不能视为已上线。短屏保持内部滚动，未改变游戏阶段、规则、数值及资产。三主文档已复核并更新，继续CB3开发不受影响。

## R2 CI修复
首轮真实CI v0.14 full UI在320等尺寸地图高度低于原35%场景要求；WebGL新增点击森林时选择器同时命中canvas与button，非地图交互失败。保留原35%高度和正常三尺寸无滚动断言：整备网格首行minmax(35dvh,1.2fr)，原装备最小112px、路线和安全区保留；WebGL选择器明确button，原几何/命中断言不撤。缓存cb3a2b-departure-hud-r2，离线同步；新CI待核。首轮实际执行Core通过，新增WebGL几何已执行至森林点击，未完成全旅程。未直接核实用户Safari线上资源。

## R3 · 35%地图边界与发布标识
R2实际19/20 CI，WebGL已通过，唯一full UI仍在35%地图高度边界失败；R1 WebGL日志320×568的地图为约198px，阈值198.8px。取整/边框余量是推断，非已测根因。R3直接设置地图及首行min-height/track calc(35dvh + 2px)，不降低原35%和正常三尺寸无滚动合同；full UI显式等待正式boot ready（另PR167曾出现forecast未初始化），打印实际几何。上线候选统一显示 v0.16-CB3-A2b-HUD3：页面title/boot/构建角标/设置/离线title与生成器同步；核心package版本和存档schema不改，app/CSS缓存更新。未自动开放CB3。新增静态合同；真实CI和Pages待核，未声称用户Safari修复。正式发布仍以实际Pages提交为准。

## R4 · 发布标识回归
R3实际完整移动UI workflow success，Core 8项失败均为历史可见版本硬编码（7个测试文件），无新玩法失败证据。R4仅更新这些断言为读取index的明确build并严格核对完整title/设置/离线，保留核心版本、加载入口、原玩法与渲染检查；未改变R3布局代码。待全CI绿后合main及Pages，未发布。

## R5 · 浏览器发布标识回归
R4 实际13/20成功，7失败的原始日志均为 offline.title() 的历史 alpha 格式正则，涉及6个脚本（A/B共用 staffed-third-kitchen）。本轮新增共享 published-build.mjs，从 index.html 明确的 build 声明读取目标标题，逐个浏览器测试保留原动作/玩法检查，将旧正则替换为真实离线页面标题严格相等。R3 HUD及R4核心测试完全不改；不降级回归，不改变存档或激活CB3。待新head 20/20成功后才合main及验证Pages。尚未上线。
