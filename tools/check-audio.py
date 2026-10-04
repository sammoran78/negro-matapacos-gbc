"""Verify and record the actual ROM's sound output, including overlapping SFX."""
import runpy, json, wave
from pathlib import Path
import numpy as np
api=runpy.run_path(str(Path(__file__).with_name('verify-game.py')))
Game,ROOT=api['Game'],api['ROOT']
g=Game(audio=True);g.start();g.tick(110)
checks=[];recording=[]
def check(name,condition):
    assert condition,name
    checks.append(name)
def sample(n):
    chunks=[]
    for _ in range(n):
        g.tick();chunks.append(g.gb.sound.ndarray.copy())
    result=np.concatenate(chunks)
    recording.append(result)
    return result
check('idle sound is silent',not np.any(sample(8)))
for bark in range(3):
    g.gb.button_press('b');a=sample(8);g.gb.button_release('b')
    check('bark '+str(bark+1)+' produces audio',np.ptp(a)>10)
    check('bark '+str(bark+1)+' ends within eight frames',not (g.gb.memory[0xff26]&8))
    sample(30)
# Trigger a pickup tone on the same simulation frame as a rescue bark. Channel
# 4 must keep the bark audible when the medal/rescue/pickup voice uses channel 2.
g.put8('state',5);sample(5);g.put16('player_x',976*16);g.put16('player_y',96*16)
g.put8('bark_cooldown',0);g.put8('state',4);g.gb.button_press('b');a=sample(4)
check('rescue bark remains audible beside students',g.u8('barrier_open')==1 and np.ptp(a)>10 and g.gb.memory[0xff26]&8)
check('bark noise is routed to both speakers',g.gb.memory[0xff25]&0x88==0x88)
g.gb.button_release('b');sample(10)
with wave.open(str(ROOT/'build/bark.wav'),'wb') as out:
    out.setnchannels(2);out.setsampwidth(2);out.setframerate(g.gb.sound.sample_rate)
    out.writeframes((np.concatenate(recording).astype(np.int16)*512).tobytes())
(ROOT/'build/audio-validation.json').write_text(json.dumps({'passed':True,'checks':checks,'count':len(checks)},indent=2))
g.close();print('PASS:',len(checks),'ROM sound checks')
