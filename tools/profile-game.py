import runpy,re,collections
from pathlib import Path
Game=runpy.run_path(str(Path(__file__).with_name('verify-game.py')))['Game']
g=Game();g.start()
names=['physics','scroll_camera','hud','render','oam_begin','render_complete','collect','update_officers','update_hazards','move_horizontal','move_vertical']
addresses={}
for line in (Path(__file__).resolve().parents[1]/'build/platformer.rst').read_text().splitlines():
 m=re.match(r'\s+([0-9A-F]{8})\s+\d+ _(\w+):',line)
 if m and m[2] in names:addresses[m[2]]=int(m[1],16)
events=[]
def callback(name):events.append((name,g.gb._cycles()))
for name,a in addresses.items():g.gb.hook_register(0,a,callback,name)
g.drive_stage()
stats=collections.defaultdict(list)
for (n,a),(m,b) in zip(events,events[1:]):stats[n+' -> '+m].append(b-a)
for pair,values in stats.items():print(pair,'avg',int(sum(values)/len(values)),'max',max(values))
g.close()
