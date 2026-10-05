"""Boundary/state regressions in the actual ROM. RAM placement sets up edge cases;
movement, contacts, input edges and transitions still execute the compiled C.
"""
import runpy,json,re
from pathlib import Path
api=runpy.run_path(str(Path(__file__).with_name('verify-game.py')))
Game,SYMBOLS,ROOT=api['Game'],api['SYMBOLS'],api['ROOT']
checks=[]
def check(name,condition):
    assert condition,name
    checks.append(name)
def quiet(g):
    base=SYMBOLS['officers']
    for i in range(5):g.gb.memory[base+i*8+5]=255
    g.put8('invulnerable',255)
def place(g,x,y=96,vy=0,ground=1):
    # Freeze before arranging RAM so a mid-frame C local cannot overwrite it.
    g.put8('state',5)
    for button in ('a','b','left','right','up','down','start','select'):g.gb.button_release(button)
    g.tick(5)
    for _ in range(60):
        if g.u8('update_phase')==0:break
        g.tick()
    else:raise AssertionError('Previous graphics update did not finish before RAM placement')
    g.put16('player_x',x*16);g.put16('player_y',y*16);g.put16('player_vy',vy)
    g.put8('grounded',ground);g.put8('coyote',0);g.put8('jump_buffer',0)
    quiet(g)
    g.put8('state',4)
def target(g,i,x,stun=0):
    a=SYMBOLS['officers']+i*8
    g.gb.memory[a]=x&255;g.gb.memory[a+1]=x>>8
    g.gb.memory[a+2]=x&255;g.gb.memory[a+3]=x>>8
    g.gb.memory[a+4]=96;g.gb.memory[a+5]=stun;g.gb.memory[a+6]=0;g.gb.memory[a+7]=0
def held(g,key,frames,simulation=False):
    g.gb.button_press(key)
    if simulation:g.steps(frames)
    else:g.tick(frames)
    g.gb.button_release(key);g.tick(2)

def break_gate(g):
    g.tick(20) # Let an artificial camera warp finish before input edge tests.
    for _ in range(3):g.tap('b');g.tick(32)

# Explicit language confirmation and input-edge gating.
g=Game();check('boot shows language selector',g.u8('state')==0)
g.gb.button_press('start');g.tick(70);check('Start cannot bypass language choice',g.u8('state')==0)
g.gb.button_release('start');g.tick(3)
held(g,'a',90);check('held A stops at title',g.u8('state')==1)
held(g,'start',90);check('held Start stops at controls',g.u8('state')==2)
g.tap('start');g.tick(40);check('world map precedes first stage',g.u8('state')==3)
g.tap('right');g.tick(4);check('locked level rejects navigation',g.u8('selected')==0 and g.u8('unlocked')==1)
g.close()

for spanish in (False,True):
    g=Game();g.start(spanish)
    check(('Spanish' if spanish else 'English')+' selection retained in gameplay',g.u8('language')==int(spanish))
    g.tap('start');g.tick(45)
    check('pause paragraph wraps '+str(spanish),g.line(6)==('LOS ESTUDIANTES TE' if spanish else 'STUDENTS NEED YOU'))
    frozen=(g.s16('player_x'),g.s16('player_y'),g.u16('simulation_frame'))
    g.tick(150)
    check('pause freezes simulation '+str(spanish),g.u8('state')==5 and frozen==(g.s16('player_x'),g.s16('player_y'),g.u16('simulation_frame')))
    g.shot('pause-'+('es' if spanish else 'en'))
    g.tap('start');g.tick(35);check('resume preserves locale '+str(spanish),g.u8('state')==4 and g.u8('language')==int(spanish))
    g.put8('lives',1);g.put8('invulnerable',0);g.put16('player_y',145*16);g.tick(100)
    check('last life reaches game over '+str(spanish),g.u8('state')==9 and g.u8('lives')==0)
    g.shot('game-over-'+('es' if spanish else 'en'))
    g.tap('a');g.tick(40);check('retry restores lives and locale '+str(spanish),g.u8('state')==4 and g.u8('lives')==3 and g.u8('language')==int(spanish))
    g.close()

g=Game();g.start();quiet(g)
x=g.s16('player_x');g.gb.button_press('left');g.gb.button_press('right');g.tick(12)
check('opposite directions cancel',g.s16('player_x')==x)
g.gb.button_release('left');g.gb.button_release('right');g.tick(2)
g.tap('right');g.gb.button_press('right');g.tick(5)
check('double tap starts sprint',g.u8('sprinting')==1 and g.s16('player_vx')==40)
g.gb.button_release('right');g.tick(3);check('release stops sprint',g.u8('sprinting')==0 and g.s16('player_vx')==0)
place(g,24);g.gb.button_press('a');ys=[]
for _ in range(90):g.tick();ys.append(g.s16('player_y'))
check('jump rises above floor',min(ys)<70*16)
check('held A does not auto-hop',g.u8('grounded')==1 and g.s16('player_y')==96*16)
g.gb.button_release('a');g.tick(2)
place(g,24);g.gb.button_press('a');g.tick(3);g.gb.button_release('a');g.tick(3)
check('early release cuts upward speed',g.s16('player_vy')>=-32)
g.tick(50)
place(g,368);held(g,'right',16,True);check('right wall stops player',g.s16('player_x')==368*16)
place(g,400);held(g,'left',16,True);check('left wall stops player',g.s16('player_x')==400*16)
place(g,304);g.gb.button_press('a');ys=[]
for _ in range(15):g.tick();ys.append(g.s16('player_y'))
g.gb.button_release('a');g.tick(25);check('ceiling bump prevents penetration',min(ys)>=88*16)
place(g,24,48,64,0);g.steps(18);check('maximum fall speed lands on floor',g.u8('grounded')==1 and g.s16('player_y')==96*16)
place(g,179,64,64,0);g.steps(5);check('misaligned box lands on platform corner',g.u8('grounded')==1 and g.s16('player_y')==72*16)
place(g,220);g.gb.button_press('right');g.steps(6);g.gb.button_press('a');g.steps(2)
check('coyote jump after walking off edge',g.s16('player_vy')<0)
g.gb.button_release('right');g.gb.button_release('a');g.tick(40)
place(g,24,88,32,0);g.gb.button_press('a');g.steps(7)
check('buffered jump triggers after landing',g.s16('player_vy')<0)
g.gb.button_release('a');g.tick(45)
place(g,220);held(g,'right',10,True);check('walking off ledge starts falling',g.s16('player_y')>96*16 or not g.u8('grounded'))
g.close()

g=Game();g.start();place(g,32)
target(g,0,60);target(g,1,64);g.tap('b');base=SYMBOLS['officers']
check('bark stuns multiple nearby officers',g.gb.memory[base+5]>80 and g.gb.memory[base+13]>80)
check('bark starts cooldown',g.u8('bark_cooldown')>0)
g.gb.button_press('b');g.tick(100);check('holding B cannot repeatedly bark',g.u8('bark_cooldown')==0 and g.u8('bark_ticks')==0)
g.gb.button_release('b');g.tick(2);check('stun expires',g.gb.memory[base+5]==0)
place(g,368);target(g,0,400);g.put8('bark_cooldown',0);g.put8('facing_left',0);g.tap('b')
check('solid wall blocks bark',g.gb.memory[base+5]==0)
place(g,920);g.put8('bark_cooldown',0);g.put8('facing_left',0);break_gate(g)
check('three barks open rescue barricade',g.u8('barrier_open')==1 and g.u8('barrier_strength')==0)
place(g,960);g.tick(120);g.tick(40)
check('rescue completes and unlocks exactly next stage',g.u8('state')==8 and g.u8('unlocked')==2 and g.u8('completed')==1)
g.tap('start');g.tick(40);g.tap('left');g.tick(5);g.tap('a');g.tick(40)
check('replaying a completed stage preserves unlocks',g.u8('state')==4 and g.u8('unlocked')==2 and g.u8('completed')==1)
g.tap('start');g.tick(40);g.tap('b');g.tick(40);g.tap('b');g.tick(40)
check('world map can return to title',g.u8('state')==1)
g.tap('start');g.tick(40)
check('new game resets route and counters',g.u8('state')==2 and g.u8('unlocked')==1 and g.u8('completed')==0 and g.u8('checkpoint_flags')==0 and g.u8('lives')==3)
g.close()

g=Game();g.start();place(g,80);g.put8('empanadas',49);g.tick(4)
check('50th empanada grants one life',g.u8('empanadas')==0 and g.u8('lives')==4)
flag=g.u16('coin_flags');place(g,24);g.tick(4);place(g,80);g.tick(4)
check('collectible cannot be collected twice',g.u16('coin_flags')==flag and g.u8('empanadas')==0 and g.u8('lives')==4)
place(g,448);g.tick(5);check('checkpoint activates',g.u8('checkpoint_flags')&1)
g.put8('invulnerable',0);g.put16('player_y',145*16);g.tick(100)
check('death respawns at checkpoint',g.u8('state')==4 and g.s16('player_x')==448*16)
check('death preserves collectibles',g.u16('coin_flags')==flag)
# Verify tile IDs and palette/bank attributes on both sides of SCX wrap.
source=(ROOT/'generated/alameda.c').read_text()
arrays={n:list(map(int,re.findall(r'\d+',re.search(r'const uint8_t alameda_'+n+r'\[2304\] = \{(.*?)\};',source,re.S)[1]))) for n in ('visual','attributes')}
for x in (344,320):
    place(g,x);g.tick(20);camera=g.s16('camera_x')
    positions=g.gb.screen.tilemap_position_list
    check('quarter/half/full scanline scrolling '+str(x),all(positions[y][0]==((camera//(4 if y<48 else 2 if y<80 else 1))&255) for y in range(128)))
    ok=True
    for y in range(16):
        first=camera//(32 if y<6 else 16 if y<10 else 8)
        for col in range(first,first+20):
            address=0x9800+y*32+(col&31);idx=y*128+col
            ok &= g.gb.memory[0,address]==arrays['visual'][idx] and g.gb.memory[1,address]==arrays['attributes'][idx]
    check('streamed tile and attribute agreement '+str(x),ok)
# Margins let all three bands stream at different times without stale tiles.
place(g,520);g.tick(20);visible_ok=True;steps_ok=True
for key,count in (('right',24),('left',32),('right',24),('left',16)):
    g.gb.button_press(key)
    for _ in range(count):
        before=g.u16('simulation_frame');g.tick();camera=g.s16('camera_x')
        steps_ok &= ((g.u16('simulation_frame')-before)&65535)==1
        for y in range(18):
            first=camera//(32 if y<6 else 16 if y<10 else 8)
            for col in range(first,first+21):
                address=0x9800+y*32+(col&31);idx=y*128+col
                visible_ok &= g.gb.memory[0,address]==arrays['visual'][idx] and g.gb.memory[1,address]==arrays['attributes'][idx]
    g.gb.button_release(key);g.tick(2)
check('staggered band streaming remains correct on direction reversals',visible_ok)
check('reversals and HUD updates stay within one frame',steps_ok)
g.close()

# Stomps, reward persistence and the actual right-side barricade failure.
g=Game();g.start();place(g,64,78,32,0);target(g,0,64)
hp=SYMBOLS['officer_health'];hit=SYMBOLS['officer_hit_ticks']
g.steps(4)
check('first descending stomp damages and bounces',g.gb.memory[hp]==1 and g.s16('player_vy')<0 and g.u8('state')==4)
check('first stomp gives a brief hit grace',g.gb.memory[hit]>0)
check('stunned officer remains stompable',g.gb.memory[SYMBOLS['officers']+5]>0)
g.shot('officer-first-hit')
place(g,64,78,32,0);g.steps(3)
check('one contact cannot consume both hit points',g.gb.memory[hp]==1)
g.tick(20);place(g,64,78,32,0);g.steps(4)
check('second stomp removes officer',g.gb.memory[hp]==0 and g.u8('defeated_flags')&1)
check('second stomp spawns empanada prize',g.u8('reward_active')==1 and g.u8('reward_delay')>0)
g.shot('officer-defeated')
before=g.u16('total_empanadas');g.tick(70)
check('dropped prize is collected once',g.u8('reward_active')==0 and g.u8('reward_collected_flags')&1 and g.u16('total_empanadas')==before+1)
g.put8('invulnerable',0);g.put16('player_y',145*16);g.tick(100)
check('defeated officer stays gone after death',g.gb.memory[hp]==0)
check('collected prize cannot be farmed after death',g.u8('reward_active')==0 and g.u16('total_empanadas')==before+1)
g.tap('start');g.tick(40);g.tap('b');g.tick(40);g.tap('a');g.tick(40)
check('defeat and collected reward persist on level revisit',g.gb.memory[hp]==0 and g.u8('reward_active')==0)
place(g,64);target(g,1,64);g.put8('invulnerable',0);g.tick(4)
check('active officer side contact still damages player',g.u8('state')==6)
g.close()

g=Game();g.start();place(g,32);target(g,0,60);g.tap('b')
check('bark stuns without removing hit points',g.gb.memory[hp]==2)
g.close()

for x,left in ((916,1),(976,0),(1008,0),(976,1)):
    g=Game();g.start();place(g,x);g.put8('facing_left',left);break_gate(g);g.tick(160)
    check('three rescue barks reach barricade from either side '+str((x,left)),g.u8('barrier_open')==1)
    if x>=976:check('students-side bark completes stage '+str((x,left)),g.u8('state')==8 and g.u8('unlocked')==2)
    g.close()

g=Game();g.start();result=g.drive_stage(late_rescue=True)
check('controller replay cannot jump closed gate and completes three-bark rescue',result['barricade_stop_seen'] and not result['reached_students_before_bark'] and result['max_closed_x']<=928 and g.u8('state')==8 and g.u8('unlocked')==2)
check('closed-gate rescue replay keeps frame budget',result['overruns']==0)
g.close()
report={'passed':True,'checks':checks,'count':len(checks)}
(ROOT/'build/game-validation.json').write_text(json.dumps(report,indent=2))
print('PASS:',len(checks),'ROM boundary and state checks')
