"""Compiled-ROM checks for swapped map markers, boss attacks and two-hit damage."""
import runpy,json,re
from pathlib import Path
api=runpy.run_path(str(Path(__file__).with_name('verify-game.py')))
Game,SYMBOLS,ROOT=api['Game'],api['SYMBOLS'],api['ROOT']
checks=[]

def check(name,condition):
    assert condition,name
    checks.append(name)

def enter(g,stage,spanish=False):
    g.start(spanish);g.put8('unlocked',5);g.tap('start');g.tick(40);g.tap('b');g.tick(40)
    for _ in range(stage):g.tap('right')
    g.tap('a');g.tick(40)
    check('enter boss stage '+str((stage,spanish)),g.u8('current_stage')==stage and g.u8('boss_health')==(5 if stage==3 else 10))

def freeze(g):
    g.put8('state',5);g.tick(5)
    for _ in range(60):
        if g.u8('update_phase')==0:break
        g.tick()
    else:raise AssertionError('Previous graphics frame did not complete')
    for b in ('a','b','left','right','start'):g.gb.button_release(b)

def place(g,x,y=96,phase=0):
    freeze(g)
    g.put16('player_x',x*16);g.put16('player_y',y*16);g.put16('player_vy',0)
    g.put8('grounded',1);g.put8('invulnerable',255);g.put8('facing_left',0);g.put8('bark_cooldown',0)
    g.put8('boss_active',1);g.put8('boss_phase',phase);g.put8('boss_timer',250);g.put8('boss_left',1);g.put8('boss_aim',96)
    for i in range(5):g.gb.memory[SYMBOLS['officers']+i*8+5]=255
    g.put8('state',4);g.tick(20)

def meter(g):
    return sorted(g.gb.memory[0xfe02+i*4] for i in range(40)
                  if g.gb.memory[0xfe00+i*4]==56 and g.gb.memory[0xfe03+i*4]&8 and 55<=g.gb.memory[0xfe02+i*4]<88)

def bark_near(g):
    if g.u8('current_stage')==4:
        freeze(g);g.put16('player_x',(g.s16('boss_x')-16)*16)
        g.put16('player_y',96*16);g.put16('player_vy',0);g.put8('facing_left',0);g.put8('state',4)
    g.tap('b')

def hurt_badge(g):
    return any(g.gb.memory[0xfe00+i*4]==22 and g.gb.memory[0xfe01+i*4]==84 and g.gb.memory[0xfe02+i*4]==89 for i in range(40))

def sprite_color(g,palette,index):
    g.gb.memory[0xff6a]=palette*8+index*2;low=g.gb.memory[0xff6b]
    g.gb.memory[0xff6a]=palette*8+index*2+1
    return low|(g.gb.memory[0xff6b]<<8)

g=Game();g.start();g.tap('start');g.tick(40);g.tap('b');g.tick(40)
check('first map marker moved to former second position',g.gb.memory[0xfe01]==24 and g.gb.memory[0xfe00]==76)
g.put8('unlocked',2);g.tap('right')
check('second map marker moved to former first position',g.gb.memory[0xfe01]==44 and g.gb.memory[0xfe00]==112)
g.close()
manifest=json.loads((ROOT/'assets/manifest.json').read_text(encoding='utf8'))
check('map artwork metadata agrees with selection markers',[(n['x'],n['y']) for n in manifest['world_map']['nodes'][:2]]==[(24,76),(44,112)])

for stage,hits in ((3,5),(4,10)):
    g=Game();enter(g,stage);place(g,904)
    check('boss has full energy meter '+str(stage),meter(g)==[85,86,87])
    g.shot('net-boss-ready' if stage==3 else 'cannon-boss-ready')
    g.gb.button_press('b');g.tick(70)
    check('holding bark damages boss once '+str(stage),g.u8('boss_health')==hits-1)
    g.gb.button_release('b');g.tick(2)
    check('energy bar diminishes on a successful bark '+str(stage),meter(g)==[55+(hits-1)*(6 if stage==3 else 3)+i for i in range(3)])
    bark_near(g);g.tap('b')
    check('cooldown rejects immediate repeat boss damage '+str(stage),g.u8('boss_health')==hits-2)
    g.tick(35)
    remaining=g.u8('boss_health')
    # The net boss stays dangerous in its wind-up; barks do not stun him.
    if stage==3:
        g.put8('boss_phase',1);g.put8('boss_timer',40);g.tap('b')
        check('net boss takes bark damage without stun or phase reset',g.u8('boss_health')==remaining-1 and g.u8('boss_phase')==1 and 0<g.u8('boss_timer')<40)
        g.tick(35);remaining-=1
    else:
        for phase in (1,2):
            g.put8('boss_phase',phase);g.put8('boss_timer',100);g.put8('bark_cooldown',0);bark_near(g)
            check('cannon is protected while aiming/firing '+str(phase),g.u8('boss_health')==remaining)
        g.put8('boss_phase',3);g.put8('boss_timer',200);g.put8('bark_cooldown',0)
        bark_near(g);g.tick(35);remaining-=1
        check('cannon can be damaged during recovery',g.u8('boss_health')==remaining)
    g.put8('boss_phase',0);g.put8('boss_timer',250)
    for n in range(remaining):
        bark_near(g);g.tick(32)
        check('distinct boss bark '+str((stage,hits-remaining+n+1)),g.u8('boss_health')==remaining-n-1)
    check('exact bark count defeats boss and opens rescue '+str(stage),g.u8('boss_health')==0 and g.u8('barrier_open')==1 and g.u8('boss_defeated')&(1<<stage))
    check('defeated boss gauge disappears '+str(stage),not meter(g))
    g.close()

# Bark damage is short range and directional. Attack hitboxes leave room to jump.
for stage in (3,4):
    g=Game();enter(g,stage);place(g,864);hp=g.u8('boss_health')
    g.tap('b')
    check('distant bark cannot damage boss '+str(stage),g.u8('boss_health')==hp)
    place(g,904);g.put8('facing_left',1);g.tap('b')
    check('barking away cannot damage boss '+str(stage),g.u8('boss_health')==hp)
    place(g,904);freeze(g);g.put16('player_y',32*16);g.put16('player_vy',0);g.put8('state',4);g.tap('b')
    check('barking high above cannot damage boss '+str(stage),g.u8('boss_health')==hp)
    place(g,920 if stage==3 else 904)
    freeze(g)
    g.put16('player_y',(64 if stage==3 else 48)*16);g.put16('player_vy',0)
    g.put16('boss_x',944 if stage==3 else 936);g.put8('boss_left',1)
    g.put8('boss_phase',2);g.put8('boss_timer',12);g.put8('invulnerable',0);g.put8('state',4);g.tick(3)
    check('jump height clears the net or low spray '+str(stage),not g.u8('player_hurt') and g.u8('lives')==3)
    g.close()

g=Game();enter(g,4);place(g,904);freeze(g)
g.put16('player_y',48*16);g.put16('player_vy',0);g.put8('boss_timer',1);g.put8('state',4);g.tick(3)
check('cannon warns with a high aim for an airborne dog',g.u8('boss_phase')==1 and g.u8('boss_aim')==80 and g.u8('boss_left'))
freeze(g)
g.put16('player_y',96*16);g.put16('player_vy',0);g.put8('invulnerable',0)
g.put8('boss_phase',2);g.put8('boss_timer',12);g.put8('state',4);g.tick(3)
check('cannon arc keeps its warned aim and leaves space beneath it',g.u8('boss_aim')==80 and not g.u8('player_hurt'))
place(g,988);g.put8('boss_timer',1);g.tick(3)
check('cannon warns toward a dog on its right',g.u8('boss_phase')==1 and not g.u8('boss_left') and g.u8('boss_aim')==96)
freeze(g)
# Move into the actual warned landing marker rather than assuming a fixed
# truck position or a rectangular stream; the truck now patrols continuously.
marker=next(i for i in range(40) if g.gb.memory[0xfe02+i*4]==102 and g.gb.memory[0xfe00+i*4])
g.put16('player_x',(g.gb.memory[0xfe01+marker*4]-12+g.s16('camera_x'))*16)
g.put16('player_y',(g.gb.memory[0xfe00+marker*4]-24)*16);g.put16('player_vy',0)
g.put8('boss_phase',2);g.put8('boss_timer',12);g.put8('invulnerable',0);g.put8('state',4);g.tick(3)
check('right-facing spray can wound the dog',g.u8('player_hurt')==1 and g.u8('lives')==3)
g.close()

# Largest corner HUD plus wound badge, bark and eight spray objects remain safe.
g=Game();enter(g,4);place(g,904)
g.put16('total_empanadas',105);g.put8('lives',9);g.put8('player_hurt',1);g.put8('hud_dirty',1)
g.put8('boss_phase',2);g.put8('boss_timer',100);g.put8('boss_left',1);g.tap('b')
maximum=0;missed=0;previous=g.u16('simulation_frame')
for _ in range(20):
    g.tick();maximum=max(maximum,g.oam_max());now=g.u16('simulation_frame')
    missed+=int(now==previous);previous=now
check('largest corner HUD fits with wounded badge and cannon effects',g.u8('hud_object_count')==9 and hurt_badge(g) and maximum<=10 and g.u8('last_oam_count')<=40)
check('crowded boss frame stays within one update per VBlank',missed==0)
g.shot('cannon-boss-crowded');g.close()

# The checkpoint retains Chilean red; cyan water uses that slot only far away.
for stage in (3,4):
    g=Game();enter(g,stage);place(g,448)
    check('boss-stage checkpoint flag retains Chilean red '+str(stage),sprite_color(g,6,2)==0x213d)
    if stage==4:
        place(g,904)
        check('cannon arena enables cyan spray colors',sprite_color(g,6,2)==0x7f65)
        place(g,448)
        check('retreat restores the checkpoint flag colors',sprite_color(g,6,2)==0x213d)
    g.close()

# First actual attack contact wounds; the next distinct contact costs one life.
for stage in (3,4):
    g=Game();enter(g,stage);place(g,920 if stage==3 else 856)
    g.put16('boss_x',944 if stage==3 else 936);g.put8('boss_left',1);g.put8('boss_phase',2);g.put8('boss_timer',12);g.put8('invulnerable',0);g.tick(3)
    check('first boss contact wounds without consuming life '+str(stage),g.u8('player_hurt')==1 and g.u8('lives')==3 and g.u8('state')==4)
    check('hurt contact has a visible badge and recovery grace '+str(stage),hurt_badge(g) and g.u8('invulnerable')>80 and g.u8('capture_ticks')>0)
    g.shot('net-boss-hurt' if stage==3 else 'cannon-boss-hurt');g.tick(25)
    check('one sustained attack cannot consume both hits '+str(stage),g.u8('lives')==3 and g.u8('player_hurt')==1)
    hp=g.u8('boss_health');g.tap('start');g.tick(40);timer=g.u8('boss_timer');g.tick(20)
    check('pause freezes boss phase timer '+str(stage),g.u8('boss_timer')==timer)
    g.tap('start');g.tick(30)
    check('resume preserves wound and boss energy '+str(stage),g.u8('player_hurt')==1 and g.u8('boss_health')==hp)
    place(g,920 if stage==3 else 856)
    g.put16('boss_x',944 if stage==3 else 936);g.put8('boss_left',1);g.put8('boss_phase',2);g.put8('boss_timer',12);g.put8('invulnerable',0);g.tick(3)
    check('second distinct boss contact consumes one life '+str(stage),g.u8('state')==6 and g.u8('lives')==2)
    g.tick(100)
    check('death restores dog health and resets undefeated boss '+str(stage),g.u8('state')==4 and not g.u8('player_hurt') and g.u8('boss_health')==(5 if stage==3 else 10))
    g.close()

g=Game();enter(g,4);place(g,856)
g.put16('player_x',1000*16);g.put8('boss_phase',0);g.put8('boss_timer',200);g.tick(25)
check('jumping past a live boss cannot complete the stage',g.u8('state')==4 and not g.u8('barrier_open') and not g.u8('completed'))
g.close()

g=Game();enter(g,4,True);place(g,904)
g.put8('boss_phase',0);g.put8('boss_timer',1);g.tick(12)
check('Spanish boss attack warning is localized',g.line(0,window=True)=='¡CAÑÓN APUNTANDO!')
g.shot('cannon-boss-warning-es')
g.put8('boss_health',1);g.put8('boss_phase',3);g.put8('boss_timer',200);g.put8('bark_cooldown',0);bark_near(g);g.tick(12)
check('final boss defeat persists on a level revisit',g.u8('boss_defeated')&16 and g.u8('barrier_open'))
g.tap('start');g.tick(40);g.tap('b');g.tick(40);g.tap('a');g.tick(40)
check('revisited defeated boss stays cleared',not g.u8('boss_health') and g.u8('barrier_open'))
g.close()

(ROOT/'build/boss-validation.json').write_text(json.dumps({'passed':True,'checks':checks,'count':len(checks)},indent=2))
print('PASS:',len(checks),'ROM map and boss encounter checks')
