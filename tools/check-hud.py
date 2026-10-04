"""Verify corner overlays and their live counters in the compiled GBC ROM."""
import runpy, json
from pathlib import Path
api=runpy.run_path(str(Path(__file__).with_name('verify-game.py')))
Game,SYMBOLS,ROOT=api['Game'],api['SYMBOLS'],api['ROOT']
checks=[]
def check(name,condition):
    assert condition,name
    checks.append(name)
def objects(g):
    result=[]
    for i in range(40):
        a=0xfe00+i*4;y=g.gb.memory[a]-16;x=g.gb.memory[a+1]-8
        if 0<=x<160 and 0<=y<144:
            result.append((x,y,g.gb.memory[a+2],g.gb.memory[a+3]))
    return result
def counter(g):
    digits=sorted((x,tile-117) for x,y,tile,pal in objects(g) if x<48 and y==6 and 117<=tile<127)
    return int(''.join(str(n) for x,n in digits))
def stars(g):
    return [(x,tile==182) for x,y,tile,pal in objects(g) if y==6 and x>=124 and tile in (182,183)]
def place(g,x,y=96):
    g.put8('state',5);g.tick(5)
    g.put16('player_x',x*16);g.put16('player_y',y*16);g.put16('player_vy',0)
    g.put8('grounded',1);g.put8('invulnerable',255)
    for i in range(5):g.gb.memory[SYMBOLS['officers']+i*8+5]=255
    g.put8('state',4);g.tick(20)
def refresh(g):
    g.tap('start');g.tick(40);g.tap('start');g.tick(40)

g=Game();g.start()
check('fresh game has empanada total zero',counter(g)==0)
check('three gold life stars at upper right',stars(g)==[(124,True),(136,True),(148,True)])
check('corner HUD has a transparent empanada sprite',any(x==4 and y==6 and pal==4 for x,y,tile,pal in objects(g)))
check('permanent window bar is disabled',not (g.gb.memory[0xff40]&32) and g.gb.memory[0xff4a]==24)
check('bottom sixteen lines show terrain',any(g.gb.screen.ndarray[130,x,0]>160 for x in range(160)))
g.shot('corner-hud')
place(g,80)
check('one pickup increments the visible total',counter(g)==1 and g.u16('total_empanadas')==1)
place(g,24);place(g,80)
check('already collected item leaves total unchanged',counter(g)==1)
g.put16('total_empanadas',49);g.put8('empanadas',49);refresh(g)
check('counter displays forty-nine',counter(g)==49)
place(g,192)
check('extra-life threshold does not reset visible total',counter(g)==50 and g.u8('empanadas')==0 and g.u8('lives')==4)
check('extra life shows three stars and a plus-one badge',all(active for x,active in stars(g)) and (104,6,127,5) in objects(g) and (112,6,118,5) in objects(g))
g.shot('corner-hud-extra-life')
g.put16('total_empanadas',99);refresh(g);place(g,296,64)
check('total grows to three digits on the hundredth pickup',counter(g)==100)
for n in (3,2,1,0):
    g.put8('lives',n);g.tick(5)
    check(str(n)+' lives match filled/hollow stars',sum(active for x,active in stars(g))==n and len(stars(g))==3)
g.shot('corner-hud-no-lives')
g.put8('lives',3)
for x in (344,320,848):
    place(g,x)
    check('HUD stays fixed while camera scrolls '+str(x),stars(g)==[(124,True),(136,True),(148,True)] and all(y==6 for px,y,tile,pal in objects(g) if px<48 and 117<=tile<127))
    check('HUD respects hardware object budget '+str(x),g.oam_max()<=10 and g.u8('last_oam_count')<=40)
# Observe the window's actual enable bit at LCD-interrupt boundaries. The
# temporary message must end at line 40, leaving the entire lower scene clear.
events=[]
def lcd(context):events.append((g.gb.memory[0xff45],bool(g.gb.memory[0xff40]&32)))
g.gb.hook_register(0,SYMBOLS['parallax_lcd'],lcd,None)
place(g,448);g.tick(5)
check('checkpoint message uses only the upper two-row popup',g.u8('dialog_visible')==1 and (23,False) in events and (39,True) in events and (47,False) in events)
check('dialogue leaves bottom bar disabled',not (g.gb.memory[0xff40]&32))
g.shot('corner-hud-checkpoint')
saved=counter(g);place(g,552)
check('pickup during checkpoint message updates total and keeps popup',counter(g)==saved+1 and g.u8('dialog_visible')==1)
g.tick(120)
check('temporary message expires',g.u8('dialog_visible')==0)
g.gb.hook_deregister(0,SYMBOLS['parallax_lcd'])
g.put8('invulnerable',0);g.put16('player_y',145*16);g.tick(7)
check('actual death removes one gold star',g.u8('state')==6 and sum(active for x,active in stars(g))==2)
g.shot('corner-hud-life-lost');g.tick(100)
check('total and life overlay survive checkpoint respawn',counter(g)==saved+1 and sum(active for x,active in stars(g))==2)
g.close()
g=Game();g.start(True);place(g,448)
check('Spanish checkpoint popup uses localized glyphs',g.gb.memory[0,0x9c00+2]==g.gb.memory[SYMBOLS['font_lut']+ord('P')] and g.u8('dialog_visible')==1)
g.shot('corner-hud-checkpoint-es');g.close()
(ROOT/'build/hud-validation.json').write_text(json.dumps({'passed':True,'checks':checks,'count':len(checks)},indent=2))
print('PASS:',len(checks),'ROM overlay HUD checks')
