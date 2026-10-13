from pathlib import Path
from html import escape
root=Path(__file__).resolve().parent.parent
css=(root/'src/style.css').read_text()+'\n'+(root/'src/mobile_ux_043.css').read_text()+'\n'+(root/'src/hud_044.css').read_text()+'\n'+(root/'src/kitchen_050.css').read_text()+'\n'+(root/'src/staff_05b.css').read_text()+'\n'+(root/'src/diner_05c.css').read_text()+'\n'+(root/'src/diner_05d.css').read_text()+'\n'+(root/'src/diner_05e.css').read_text()+'\n'+(root/'src/cooking_v063.css').read_text()+'\n'+(root/'src/walkable_restaurant_v07.css').read_text()+'\n'+(root/'src/restaurant_scene_v075.css').read_text()+'\n'+(root/'src/forecast_home_v076.css').read_text()+'\n'+(root/'src/diner_polish_v078.css').read_text()+'\n'+(root/'src/field_v08.css').read_text()+'\n'+(root/'src/field_biomes_v081.css').read_text()+'\n'+(root/'src/field_pacing_v082.css').read_text()+'\n'+(root/'src/field_touch_v083.css').read_text()+'\n'+(root/'src/combat_feedback_v084.css').read_text()
code=[]
for path in ('recipe_profiles_v063.js','data.js','cooking_v063.js','cook_motion_v063.js','restaurant_scene_v075.js','walkable_restaurant_v07.js','field_biomes_v081.js','field_combat_feedback_v084.js','engine.js','field_v04.js','pixels_v041.js','controls_v041.js','diner_ambience_v077.js','field_pose_v083.js','scenes_v04.js','app.js'):
 s=(root/'src'/path).read_text()
 s='\n'.join(line for line in s.splitlines() if not line.startswith('import '))
 s=s.replace('export const ','const ').replace('export function ','function ')
 code.append(s)
script='\n'.join(code).replace('</script>','<\\/script>')
markup='''<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,viewport-fit=cover,user-scalable=no"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="theme-color" content="#1b3c2b"><title>怪味食堂 · v0.10.2 离线版</title><style>'''+css+'''</style></head><body><div id="app"></div><script>'''+script+'''</script></body></html>'''
(root/'standalone.html').write_text(markup)
print('Standalone bytes:',len(markup.encode('utf-8')))