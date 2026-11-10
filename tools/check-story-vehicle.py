"""ROM checks for localized comic interludes and the mobile guanaco encounter."""
import runpy,json
from pathlib import Path
api=runpy.run_path(str(Path(__file__).with_name('verify-game.py')))
Game,SYMBOLS,ROOT=api['Game'],api['SYMBOLS'],api['ROOT']
checks=[]
def check(name,condition):
    assert condition,name
    checks.append(name)
def freeze(g):
    g.put8('state',5);g.tick(5)
    for _ in range(60):
        if g.u8('update_phase')==0:break
        g.tick()
    else:raise AssertionError('Graphics frame did not finish')
    for b in ('a','b','left','right','start'):g.gb.button_release(b)
def enter_final(g):
    g.start();g.put8('unlocked',5);g.tap('start');g.tick(40);g.tap('b');g.tick(40)
    for _ in range(4):g.tap('right')
    g.tap('a');g.tick(40)
def place(g,x,y=96):
    freeze(g);g.put16('player_x',x*16);g.put16('player_y',y*16);g.put16('player_vy',0)
    g.put8('grounded',1);g.put8('coyote',5);g.put8('invulnerable',255)
    g.put8('boss_active',1);g.put8('boss_phase',0);g.put8('boss_timer',250)
    g.put16('boss_x',936);g.put8('boss_left',1);g.put8('boss_drive_left',1)
    for i in range(5):g.gb.memory[SYMBOLS['officers']+i*8+5]=255
    g.put8('state',4);g.tick(20)
def objects(g,first,last):
    return [(g.gb.memory[0xfe01+i*4]-8,g.gb.memory[0xfe00+i*4]-16,g.gb.memory[0xfe02+i*4])
            for i in range(40) if first<=g.gb.memory[0xfe02+i*4]<=last and g.gb.memory[0xfe03+i*4]&8 and g.gb.memory[0xfe00+i*4]]

loc=json.loads((ROOT/'assets/localization.json').read_text(encoding='utf8'))['strings']
names=['campus','plaza','mapocho','moneda']
for spanish in (False,True):
    g=Game();g.start(spanish)
    for stage,name in enumerate(names):
        # Arrange a completed rescue; the full controller replay also verifies it.
        freeze(g);g.put8('barrier_open',1);g.put8('boss_health',0)
        g.put16('player_x',976*16);g.put16('player_y',96*16);g.put16('player_vy',0)
        g.put8('state',4);g.gb.button_press('a');g.tick(150)
        check('held jump cannot skip story '+str((name,spanish)),g.u8('state')==8)
        speech=' '.join(s for s in (g.line(r,left=1,width=18) for r in range(13,16)) if s)
        check('complete localized speech bubble '+str((name,spanish)),speech==loc['story_'+name]['es' if spanish else 'en'])
        check('speech text uses separate font bank '+str((name,spanish)),all(g.gb.memory[1,0x9800+r*32+x]==7 for r in range(13,16) for x in range(1,19)))
        check('story rescue unlocks only the next node '+str((name,spanish)),g.u8('unlocked')==stage+2 and g.u8('selected')==stage+1)
        g.shot('story-'+name+('-es' if spanish else '-en'))
        g.gb.button_release('a');g.tick(2);g.gb.button_press('start');g.tick(55)
        check('held continue stops on world map '+str((name,spanish)),g.u8('state')==3)
        g.gb.button_release('start');g.tick(2);g.tap('a');g.tick(40)
    freeze(g);g.put8('barrier_open',1);g.put8('boss_health',0)
    g.put16('player_x',976*16);g.put16('player_y',96*16);g.put16('player_vy',0)
    g.put8('state',4);g.tick(200)
    check('final ceremony follows palace rescue '+str(spanish),g.u8('state')==10 and g.u8('completed')==31)
    g.gb.button_press('a');g.tick(2)
    for _ in range(350):
        if g.u8('ending_beat')==2:break
        g.tick()
    check('flag raising precedes illustrated end card '+str(spanish),g.u8('state')==10 and g.u8('ending_beat')==2)
    g.tick(200)
    check('held jump cannot dismiss illustrated end card '+str(spanish),g.u8('state')==11 and g.u8('completed')==31)
    speech=' '.join(s for s in (g.line(r,left=1,width=18) for r in range(13,16)) if s)
    lang='es' if spanish else 'en'
    check('final caption and president thanks follow language '+lang,g.line(0)==loc['ending_complete'][lang] and speech==loc['ending_final'][lang])
    check('final painting and speech use separate tile banks '+lang,all(g.gb.memory[1,0x9800+2*32+x]&8 for x in range(20)) and all(g.gb.memory[1,0x9800+r*32+x]==7 for r in range(13,16) for x in range(1,19)))
    g.shot('ending-final-'+lang)
    g.gb.button_release('a');g.tick(2);g.tap('start');g.tick(40)
    check('end card continue preserves completed route '+lang,g.u8('state')==3 and g.u8('unlocked')==5 and g.u8('completed')==31)
    g.close()

g=Game();enter_final(g);place(g,856)
positions=[]
for _ in range(160):g.tick();positions.append(g.s16('boss_x'))
check('idle vehicle drives forward and backward within arena',min(positions)==904 and max(positions)==936 and any(b<a for a,b in zip(positions,positions[1:])) and any(b>a for a,b in zip(positions,positions[1:])))
g.tap('start');g.tick(40);bx=g.s16('boss_x');g.tick(30)
check('pause stops vehicle motion',g.s16('boss_x')==bx)
g.tap('start');g.tick(2)
check('resume keeps vehicle position and energy',abs(g.s16('boss_x')-bx)<=2 and g.u8('boss_health')==10)
place(g,992,72)
check('idle vehicle can turn to face its other side',not g.u8('boss_left'))
freeze(g);g.put8('boss_phase',1);g.put8('boss_timer',40);g.put8('boss_left',0);g.put8('state',4)
bx=g.s16('boss_x');place_x=856
freeze(g);g.put16('player_x',place_x*16);g.put8('state',4);g.tick(10)
check('warning locks vehicle position and direction',g.s16('boss_x')==bx and not g.u8('boss_left'))
freeze(g);g.put16('player_x',904*16);g.put16('player_y',96*16);g.put16('player_vy',0)
g.put16('boss_x',936);g.put8('boss_left',1);g.put8('boss_aim',96)
g.put8('boss_phase',2);g.put8('boss_timer',100);g.put8('invulnerable',0);g.put8('state',4);g.tick(15)
jet=objects(g,51,54);splash=objects(g,102,105)
check('firing holds vehicle still and keeps its aim',g.s16('boss_x')==936 and g.u8('boss_left')==1)
check('spray follows six visible arc segments',len(jet)==6 and sorted(y for x,y,t in jet)==[72,80,80,88,88,96])
check('ground impact renders a two-tile splash',len(splash)==2 and all(y==104 for x,y,t in splash))
check('space beneath the arc is safe',not g.u8('player_hurt') and g.u8('lives')==3)
g.shot('cannon-water-arc')
freeze(g);g.put16('player_x',878*16);g.put16('player_y',96*16);g.put16('player_vy',0)
g.put8('state',4);g.tick(3)
check('visible descending water segment wounds the dog',g.u8('player_hurt')==1 and g.u8('lives')==3)
check('spray and splash fit hardware sprite limits',g.oam_max()<=10 and g.u8('last_oam_count')<=40)
g.close()

# Jump across the moving body using controller input from the left platform.
g=Game();enter_final(g);place(g,888,72)
g.tap('right');g.gb.button_press('right');g.gb.button_press('a')
frames=[];crossed=False
for _ in range(60):
    g.tick();frames.append(g.gb.screen.image.copy())
    if g.s16('player_x')//16>=g.s16('boss_x')+48:crossed=True;break
g.gb.button_release('right');g.gb.button_release('a');g.tick(25)
check('controller jump clears moving vehicle to its other side',crossed and g.u8('state')==4 and g.u8('lives')==3)
check('live boss still blocks rescue after jumping past it',g.u8('boss_health')==10 and not g.u8('barrier_open') and not g.u8('completed'))
g.tap('left');g.tap('b');g.tick(4)
check('barking from the other side damages an idle vehicle',g.u8('boss_health')==9 and g.u8('facing_left'))
g.shot('cannon-other-side')
enlarged=[im.resize((480,432),resample=0) for im in frames]
enlarged[0].save(ROOT/'build/cannon-jump-over.gif',save_all=True,append_images=enlarged[1:],duration=17,loop=0)
g.close()

scenes=json.loads((ROOT/'assets/story-scenes.json').read_text())
check('four unique native story scenes fit the tile budgets',len(scenes)==4 and len({s['name'] for s in scenes})==4 and all(s['tiles']<=255 for s in scenes))
ending=json.loads((ROOT/'assets/final-screen.json').read_text())
check('final medal painting fits native screen budget',ending['name']=='ending_final' and ending['tiles']<=255 and ending['bank']==13)
(ROOT/'build/story-vehicle-validation.json').write_text(json.dumps({'passed':True,'checks':checks,'count':len(checks)},indent=2))
print('PASS:',len(checks),'ROM story and moving vehicle checks')
