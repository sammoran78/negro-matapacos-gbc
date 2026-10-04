"""Open the actual GBC ROM in a local SDL2 emulator window."""
from pathlib import Path
import sys,argparse
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools/pyboy'))
from pyboy import PyBoy
parser=argparse.ArgumentParser()
parser.add_argument('--scale',type=int,default=4)
parser.add_argument('--mute',action='store_true')
args=parser.parse_args()
rom=ROOT/'build/matapacos.gbc'
if not rom.exists():raise SystemExit('Build the ROM first: node tools/build-rom.cjs')
print('Arrows: move/select | X: A/jump/confirm | Z: B/bark | Enter: Start/pause')
game=PyBoy(str(rom),window='SDL2',scale=args.scale,sound_emulated=not args.mute)
game.set_emulation_speed(1)
try:
    while game.tick():pass
finally:game.stop(save=False)
