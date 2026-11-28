# 门前整装 HUD 遮挡修复
基线 main 78db51c895f44dc380b3ee14112a1d95fc21d86b；玩家iPhone Safari截图：左侧三行HUD盖住晨露森林，右上设置盖住热泉峡谷。F2.5仅选择forecast/menu/prep/upgrade，遗漏真实scene=departure（phase=field）；原整备padding62px也低于新HUD底部68px。
修复：统一横向金币/星日/背包/44px设置，窄屏沿用F2.5字体与图标；整备场景固定在HUD底部后8px至dock之前，内部可滚动且不进入HUD，地图两地按钮及路线/装备保留。仅整备场景CSS，实际探索、经济、存档及CB3不改。同步standalone原CSS与在线缓存cb3a2b-departure-hud。
验收：真实WebGL原三尺寸脚本新增HUD/地图边界、同排、44px设置、两个地图按钮触控命中、左右地区切换，原路线/装备/渲染测试保留；新增静态合同和离线CSS一致性。代码候选，尚未执行真实Chrome/Node/完整CI、Pages或玩家真机复验，不能视为已上线。短屏保持内部滚动，未改变游戏阶段、规则、数值及资产。三主文档已复核并更新，继续CB3开发不受影响。

## R2 CI修复
首轮真实CI v0.14 full UI在320等尺寸地图高度低于原35%场景要求；WebGL新增点击森林时选择器同时命中canvas与button，非地图交互失败。保留原35%高度和正常三尺寸无滚动断言：整备网格首行minmax(35dvh,1.2fr)，原装备最小112px、路线和安全区保留；WebGL选择器明确button，原几何/命中断言不撤。缓存cb3a2b-departure-hud-r2，离线同步；新CI待核。首轮实际执行Core通过，新增WebGL几何已执行至森林点击，未完成全旅程。未直接核实用户Safari线上资源。
