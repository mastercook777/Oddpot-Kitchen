from pathlib import Path
from html import escape
root=Path(__file__).resolve().parent.parent
css=(root/'src/ingredient_icons_v011g.css').read_text()+'\n'+(root/'src/style.css').read_text()+'\n'+(root/'src/mobile_ux_043.css').read_text()+'\n'+(root/'src/hud_044.css').read_text()+'\n'+(root/'src/kitchen_050.css').read_text()+'\n'+(root/'src/staff_05b.css').read_text()+'\n'+(root/'src/diner_05c.css').read_text()+'\n'+(root/'src/diner_05d.css').read_text()+'\n'+(root/'src/diner_05e.css').read_text()+'\n'+(root/'src/cooking_v063.css').read_text()+'\n'+(root/'src/walkable_restaurant_v07.css').read_text()+'\n'+(root/'src/restaurant_scene_v075.css').read_text()+'\n'+(root/'src/forecast_home_v076.css').read_text()+'\n'+(root/'src/first_day_guide_v013j.css').read_text()+'\n'+(root/'src/diner_polish_v078.css').read_text()+'\n'+(root/'src/field_v08.css').read_text()+'\n'+(root/'src/field_biomes_v081.css').read_text()+'\n'+(root/'src/field_pacing_v082.css').read_text()+'\n'+(root/'src/field_touch_v083.css').read_text()+'\n'+(root/'src/combat_feedback_v084.css').read_text()
css+='\n'+(root/'src/field_encounters_v011c.css').read_text()
css+='\n'+(root/'src/restaurant_star_v012a.css').read_text()
css+='\n'+(root/'src/restaurant_management_v012c.css').read_text()
css+='\n'+(root/'src/crew_appearance_v012d.css').read_text()
css+='\n'+(root/'src/restaurant_growth_v012e.css').read_text()
css+='\n'+(root/'src/third_kitchen_v013a.css').read_text()
css+='\n'+(root/'src/full_game_ui_v014.css').read_text()
css+='\n'+(root/'src/grill_v014b.css').read_text()+'\n'+(root/'src/grill_v014c.css').read_text()
code=[]
for path in ('recipe_profiles_v063.js','data.js','grill_cooking_v014b.js','grill_cooking_v014c.js','cooking_v063.js','cook_motion_v063.js','restaurant_scene_v075.js','home_kitchen_v013j.js','first_day_guide_v013j.js','recipe_value_v013j.js','walkable_restaurant_v07.js','field_rules_v011a.js','field_biomes_v081.js','field_encounter_plan_v011b.js','field_world_v011b1.js','field_camera_v011b1.js','field_combat_feedback_v084.js','field_encounters_v011c.js','restaurant_star_v012a.js','restaurant_second_star_v013d.js','restaurant_management_v012c.js','restaurant_demand_v012e.js','field_target_v012f.js','engine.js','field_bosses_v011g.js','field_ecology_v011b2.js','field_hit_response_v011h.js','field_v04.js','ingredient_icons_v011g.js','field_encounter_ui_v011c.js','pixels_v041.js','crew_portraits_v012d.js','guest_portraits_v104.js','controls_v041.js','diner_ambience_v077.js','outdoor_queue_speech_v012f.js','field_pose_v083.js','field_world_render_v011b1.js','field_pixel_herb_v011c.js','field_hybrid_meadow_v011e.js','field_hybrid_biomes_v011f.js','field_effects_v011e2.js','field_cookware_v014c.js','scenes_v04.js','app.js'):
 s=(root/'src'/path).read_text()
 s='\n'.join(line for line in s.splitlines() if not line.startswith(('import ','export {')))
 s=s.replace('export const ','const ').replace('export function ','function ')
 code.append(s)
script='\n'.join(code).replace('</script>','<\\/script>')
markup='''<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,viewport-fit=cover,user-scalable=no"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="theme-color" content="#1b3c2b"><title>怪味食堂 · v0.14.0-alpha.4 离线版</title><style>'''+css+'''</style></head><body><div id="app"></div><script>'''+script+'''</script></body></html>'''
(root/'standalone.html').write_text(markup)
print('Standalone bytes:',len(markup.encode('utf-8')))
