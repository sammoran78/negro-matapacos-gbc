"""Exercise the compiled ROM in PyBoy, including real controller input."""
from pathlib import Path
import sys, re, json, collections
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools' / 'pyboy'))
from pyboy import PyBoy

SYMBOLS = {}
for line in (ROOT / 'build/matapacos.map').read_text().splitlines():
    m = re.match(r'\s+([0-9A-F]{8})\s+_([A-Za-z]\w*)\s+platformer\s*$', line)
    if m:
        SYMBOLS[m[2]] = int(m[1], 16)

class Game:
    def __init__(self, audio=False):
        self.gb = PyBoy(str(ROOT / 'build/matapacos.gbc'), window='null', sound_emulated=audio)
        self.gb.set_emulation_speed(0)
        self.gb.tick(160)
    def u8(self, name): return self.gb.memory[SYMBOLS[name]]
    def u16(self, name):
        a = SYMBOLS[name]
        return self.gb.memory[a] | (self.gb.memory[a+1]<<8)
    def s16(self, name):
        n = self.u16(name)
        return n-65536 if n&32768 else n
    def put8(self, name, value): self.gb.memory[SYMBOLS[name]] = value
    def put16(self, name, value):
        a=SYMBOLS[name];self.gb.memory[a]=value&255;self.gb.memory[a+1]=(value>>8)&255
    def tick(self, n=1): self.gb.tick(n)
    def steps(self,n):
        start=self.u16('simulation_frame')
        for _ in range(n*20+100):
            self.tick()
            if ((self.u16('simulation_frame')-start)&65535)>=n:return
        raise AssertionError('Simulation did not advance')
    def tap(self, button, n=2):
        self.gb.button_press(button);self.tick(n);self.gb.button_release(button);self.tick(2)
    def shot(self, name): self.gb.screen.image.save(ROOT / 'build' / (name+'.png'))
    def line(self,row,window=False):
        codes=(ROOT/'assets/gbdk/font.c').read_text()
        raw=re.search(r'font_character_codes\[54\] = \{(.*?)\};',codes,re.S)[1]
        chars=[int(n,0) for n in re.findall(r'0x[0-9a-f]+|\d+',raw)]
        reverse={self.gb.memory[SYMBOLS['font_lut']+c]:chr(c) for c in chars}
        base=0x9c00 if window else 0x9800
        return ''.join(reverse.get(self.gb.memory[0,base+row*32+x],'?') for x in range(20)).strip()
    def oam_max(self):
        spans=[0]*145
        for i in range(40):
            y=self.gb.memory[0xfe00+i*4]-16;x=self.gb.memory[0xfe01+i*4]-8
            if x<=-8 or x>=160 or y<=-8 or y>=144:continue
            spans[max(0,y)]+=1;spans[min(144,y+8)]-=1
        current=maximum=0
        for n in spans:current+=n;maximum=max(maximum,current)
        return maximum
    def start(self, spanish=False):
        assert self.u8('state')==0, 'Boot must show language selection'
        if spanish:self.tap('down')
        self.tap('a');self.tick(40)
        assert self.u8('state')==1
        assert self.line(16)==('INICIAR JUEGO' if spanish else 'START GAME')
        self.tap('start');self.tick(40)
        assert self.u8('state')==2
        assert self.line(1)==('CÓMO JUGAR' if spanish else 'HOW TO PLAY')
        assert self.line(14)==('PISA 2 VECES AL POLI' if spanish else 'STOMP TWICE ON COPS')
        self.tap('start');self.tick(40)
        assert self.u8('state')==3
        assert self.line(0)==('RUTA POR SANTIAGO' if spanish else 'SANTIAGO ROUTE')
        self.shot('world-map')
        self.tap('a');self.tick(40)
        assert self.u8('state')==4
    def close(self): self.gb.stop(save=False)
    def drive_stage(self, capture=False, late_rescue=False):
        stage=self.u8('current_stage')
        name=['alameda','campus','plaza','mapocho','moneda'][stage]
        source=(ROOT/'generated'/f'{name}.c').read_text()
        body=re.search(r'const uint8_t '+name+r'_terrain\[2304\] = \{(.*?)\};',source,re.S)[1]
        terrain=list(map(int,re.findall(r'\d+',body)))
        def tile(x,y):
            if x<0 or x>=1024 or y<0:return 4
            if y>=144:return 0
            return terrain[(y//8)*128+x//8]
        held=set();frames=[];deaths=0;maximum=0;hardware_max=0;updates=[];previous_state=4;missed=[];reached_students_before_bark=False;barricade_stop_seen=False;max_closed_x=0
        def set_button(name,on):
            if on and name not in held:self.gb.button_press(name);held.add(name)
            if not on and name in held:self.gb.button_release(name);held.remove(name)
        # Double tap right to sprint; all progress thereafter uses controller input.
        self.tap('right');self.gb.button_press('right');held.add('right')
        last_step=self.u16('simulation_frame')
        for frame in range(2500):
            state=self.u8('state')
            if state in (8,10):
                for b in tuple(held):set_button(b,False)
                self.tick(50)
                if capture and frames:
                    enlarged=[im.resize((480,432),resample=0) for im in frames]
                    enlarged[0].save(ROOT/'build'/'gameplay.gif',save_all=True,append_images=enlarged[1:],duration=34,loop=0)
                return {'language':'es' if self.u8('language') else 'en','stage':name,'frames':frame,'deaths':deaths,'max_objects_per_band':maximum,'hardware_scanline_max':hardware_max,'steps':sum(updates),'overruns':sum(n==0 for n in updates),'max_steps_per_frame':max(updates),'missed':missed,'reached_students_before_bark':reached_students_before_bark,'barricade_stop_seen':barricade_stop_seen,'max_closed_x':max_closed_x}
            if state==9:raise AssertionError('Auto-player exhausted lives in '+name)
            if state==6:
                deaths+=int(previous_state!=6)
                previous_state=state
                for b in tuple(held):set_button(b,False)
                self.tick();continue
            if state==4:
                x=self.s16('player_x')//16;y=self.s16('player_y')//16
                ground=bool(self.u8('grounded'))
                ahead=x+24
                wall=tile(ahead,y+8) in (1,2,3,4,6)
                gap=tile(ahead,y+16) in (0,5) and y>=72
                spray=stage==2 and 476<x<536 and y>72
                # A late rescue runs into the full-height gate before barking.
                bark=x>=(928 if late_rescue else 902)
                if not self.u8('barrier_open'):
                    max_closed_x=max(max_closed_x,x)
                    if x>=928:barricade_stop_seen=True
                    if x>=976:reached_students_before_bark=True
                base=SYMBOLS['officers']
                for i in range(5):
                    addr=base+i*8;ex=self.gb.memory[addr]|self.gb.memory[addr+1]<<8
                    if 0<=ex+8-(x+16)<=26 and self.gb.memory[SYMBOLS['officer_health']+i]:
                        if late_rescue and x>=860:wall=True
                        else:bark=True
                if ground and (wall or gap or spray):set_button('a',True)
                elif self.s16('player_vy')>=0:set_button('a',False)
                set_button('b',bark and self.u8('bark_cooldown')==0)
                set_button('right',True)
            maximum=max(maximum,self.u8('max_scanline_objects'))
            hardware_max=max(hardware_max,self.oam_max())
            if hardware_max>10:
                self.shot('object-overflow-'+name)
                objects=[tuple(self.gb.memory[0xfe00+i*4:0xfe04+i*4]) for i in range(40)]
                raise AssertionError('OAM overflow '+str((name,frame,self.s16('player_x')//16,self.u8('update_phase'),self.u8('last_oam_count'),objects)))
            self.tick()
            now=self.u16('simulation_frame');
            if state==4 and self.u8('state')==4:
                delta=(now-last_step)&65535;updates.append(delta)
                if delta==0:missed.append((self.s16('player_x')//16,self.u8('update_phase')))
            last_step=now;previous_state=state
            if capture and frame%2==0:frames.append(self.gb.screen.image.copy())
            if frame%300==0:print(name,'frame',frame,'x',self.s16('player_x')//16,'state',self.u8('state'),flush=True)
        self.shot('stuck-'+name)
        raise AssertionError('Auto-player stuck in '+name+' at '+str(self.s16('player_x')//16))

if __name__=='__main__':
    g=Game()
    print('Boot state',g.u8('state'), 'symbols',len(SYMBOLS))
    g.shot('language-selector')
    g.start()
    g.shot('alameda-gameplay')
    print('Player',g.s16('player_x'),g.s16('player_y'),'grounded',g.u8('grounded'))
    results=[]
    for stage in range(5):
        assert g.u8('current_stage')==stage
        results.append(g.drive_stage(capture=stage==0))
        g.shot(['alameda','campus','plaza','mapocho','moneda'][stage]+'-rescue')
        if stage<4:
            assert g.u8('unlocked')==stage+2
            g.tap('start');g.tick(40);assert g.u8('state')==3
            g.tap('a');g.tick(40);assert g.u8('state')==4
    g.tick(600);assert g.u8('state')==11 and g.u8('completed')==31
    assert g.line(16)=='THE END'
    g.shot('ending-complete')
    g.close()
    g=Game();g.start(True)
    for stage in range(5):
        results.append(g.drive_stage())
        if stage<4:
            g.tap('start');g.tick(40);g.tap('a');g.tick(40)
    # Check the real ceremony captions and the completed Spanish end state.
    for _ in range(300):
        if g.u8('ending_beat')==1:break
        g.tick()
    g.tick(30);assert g.line(0)=='UNA MEDALLA AL HÉROE'
    g.shot('medal-es')
    g.tick(500);assert g.u8('state')==11 and g.u8('completed')==31
    assert g.line(16)=='FIN';g.shot('ending-es')
    for result in results:
        if result['overruns']:print('Frame budget exceeded:',result,flush=True)
    assert all(r['overruns']==0 for r in results), 'Gameplay dropped an emulated frame'
    print(json.dumps(results,indent=2))
    (ROOT/'build/controller-validation.json').write_text(json.dumps(results,indent=2))
    g.close()
