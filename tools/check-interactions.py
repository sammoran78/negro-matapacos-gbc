"""ROM regressions for precise police contacts and the three-bark gate."""
import runpy, json, re
from pathlib import Path
api=runpy.run_path(str(Path(__file__).with_name('verify-game.py')))
Game,SYMBOLS,ROOT=api['Game'],api['SYMBOLS'],api['ROOT']
checks=[]

def check(name,condition):
    assert condition,name
    checks.append(name)

def place(g,x,y=96):
    g.put8('state',5);g.tick(5)
    for _ in range(60):
        if g.u8('update_phase')==0:break
        g.tick()
    else:raise AssertionError('Previous frame did not complete')
    for b in ('a','b','left','right','start'):g.gb.button_release(b)
    g.put16('player_x',x*16);g.put16('player_y',y*16);g.put16('player_vy',0)
    g.put8('grounded',1);g.put8('invulnerable',255)
    for i in range(5):g.gb.memory[SYMBOLS['officers']+i*8+5]=255
    g.put8('state',4);g.tick(20)

def gate_meter(g):
    return sorted(g.gb.memory[0xfe02+i*4] for i in range(40)
                  if g.gb.memory[0xfe00+i*4]==32 and g.gb.memory[0xfe03+i*4]&8)

def officer(g,stun=0):
    a=SYMBOLS['officers'];g.gb.memory[a:a+8]=[64,0,64,0,96,stun,1,1]

g=Game();g.start();place(g,872)
g.tap('b');g.tick(35)
check('distant bark cannot damage gate',g.u8('barrier_strength')==3)
place(g,920)
check('closed gate displays a full strength meter',gate_meter(g)==[9,10])
g.shot('barricade-full')
g.gb.button_press('right');g.gb.button_press('a');g.tick(65)
check('jumping and running cannot cross closed gate',g.s16('player_x')==928*16 and g.u8('barrier_open')==0)
g.gb.button_release('right');g.gb.button_release('a');g.tick(3)
g.gb.button_press('b');g.tick(70)
check('one held bark removes exactly one strength segment',g.u8('barrier_strength')==2 and not g.u8('barrier_open'))
check('meter displays two segments after first bark',gate_meter(g)==[11,12])
g.shot('barricade-two-thirds')
g.gb.button_release('b');g.tick(2);g.tap('b');g.tick(5)
check('second bark leaves gate closed with one segment',g.u8('barrier_strength')==1 and not g.u8('barrier_open') and gate_meter(g)==[13,14])
g.shot('barricade-one-third')
g.tap('b');g.tick(4)
check('a press during cooldown cannot remove another segment',g.u8('barrier_strength')==1)
g.tick(35);g.tap('start');g.tick(40);g.tap('start');g.tick(40)
check('pause and resume preserve partial gate damage',g.u8('barrier_strength')==1 and gate_meter(g)==[13,14])
g.tap('b');g.tick(12)
check('third accepted bark removes gate and its gauge',g.u8('barrier_open')==1 and g.u8('barrier_strength')==0 and not gate_meter(g))
check('all lower gate tiles are erased',all(g.gb.memory[0,0x9800+y*32+x]==g.gb.memory[0,0x9800+y*32+25] for y in range(10,14) for x in (22,23)))
g.gb.button_press('right');g.tick(160);g.gb.button_release('right')
check('opened passage completes rescue and unlocks campus',g.u8('state')==8 and g.u8('unlocked')==2)
g.close()

# Keep x fixed with a climbing actor while testing one-pixel body boundaries.
for x,damage in ((55,False),(56,True),(72,True),(73,False)):
    g=Game();g.start();place(g,x);officer(g);g.put8('invulnerable',0);g.tick(4)
    check('precise police body contact at dog x='+str(x),(g.u8('state')==6)==damage)
    g.close()
for x,hit in ((53,False),(64,True),(75,False)):
    g=Game();g.start();place(g,x);officer(g,200)
    g.put16('player_y',78*16);g.put16('player_vy',32);g.put8('grounded',0);g.put8('coyote',0)
    g.tick(6)
    check('helmet stomp excludes transparent sprite margins at x='+str(x),(g.u8('officer_health')==1)==hit)
    g.close()

g=Game();g.start();g.put8('unlocked',2);g.tap('start');g.tick(40);g.tap('b');g.tick(40);g.tap('right');g.tap('a');g.tick(40)
check('campus fixture enters the second stage',g.u8('current_stage')==1)
place(g,480);a=SYMBOLS['officers']+16;g.gb.memory[a+5]=0
positions=[];budgets=[]
for _ in range(100):
    g.tick();positions.append((g.gb.memory[a]|g.gb.memory[a+1]<<8,g.gb.memory[a+4]));budgets.append(g.oam_max())
check('climber stays centered on sixteen-pixel ladder',all(x==512 for x,y in positions))
check('climber remains within visible ladder height',min(y for x,y in positions)==80 and max(y for x,y in positions)==96)
source=(ROOT/'generated/campus.c').read_text();body=re.search(r'campus_terrain\[2304\] = \{(.*?)\};',source,re.S)[1];terrain=list(map(int,re.findall(r'\d+',body)))
check('both ladder columns extend across the climbing route',all(terrain[y*128+x]==7 for y in range(10,14) for x in (64,65)))
check('climbing scene respects the hardware object limit',max(budgets)<=10)
g.shot('campus-ladder-aligned');g.close()

(ROOT/'build/interaction-validation.json').write_text(json.dumps({'passed':True,'checks':checks,'count':len(checks)},indent=2))
print('PASS:',len(checks),'ROM precise contact and barricade checks')
