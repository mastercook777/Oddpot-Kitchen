from pathlib import Path
from html import escape
root=Path(__file__).resolve().parent.parent
css=(root/'src/style.css').read_text()
code=[]
for path in ('data.js','engine.js','field_v04.js','pixels_v041.js','controls_v041.js','scenes_v04.js','app.js'):
 s=(root/'src'/path).read_text()
 s='\n'.join(line for line in s.splitlines() if not line.startswith('import '))
 s=s.replace('export const ','const ').replace('export function ','function ')
 code.append(s)
script='\n'.join(code).replace('</script>','<\\/script>')
markup='''<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,viewport-fit=cover,user-scalable=no"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="theme-color" content="#1b3c2b"><title>怪味食堂 · v0.4.2 离线版</title><style>'''+css+'''</style></head><body><div id="app"></div><script>'''+script+'''</script></body></html>'''
(root/'standalone.html').write_text(markup)
print('Standalone bytes:',len(markup.encode('utf-8')))