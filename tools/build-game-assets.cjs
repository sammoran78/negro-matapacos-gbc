/* Compile existing art and authored level data into banked GBDK resources. */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'generated');
fs.mkdirSync(out, {recursive:true});
const manifest = JSON.parse(fs.readFileSync(path.join(root,'assets/manifest.json')));
const loc = JSON.parse(fs.readFileSync(path.join(root,'assets/localization.json')));
const stages = ['alameda','campus','plaza','mapocho','moneda'];
const textIds = Object.keys(loc.strings);
const cArray = (name, data, type='uint8_t') => `const ${type} ${name}[${data.length}] = {\n${Array.from({length:Math.ceil(data.length/24)},(_,i)=>'  '+data.slice(i*24,i*24+24).join(',')+',').join('\n')}\n};\n`;
const include = name => `#include "../assets/gbdk/${name}.c"\n`;
const ids = name => name.toUpperCase();
function encode(indices){const bytes=[];for(let y=0;y<8;y++){let a=0,b=0;for(let x=0;x<8;x++){const p=indices[y*8+x];a|=(p&1)<<(7-x);b|=(p>>1)<<(7-x);}bytes.push(a,b);}return bytes;}
// Tiny transparent HUD artwork is authored directly as native 2bpp patterns.
// Outlined digits reuse the game's 5x7 shapes, with cream fill / navy edges.
const fontPatterns=parseArray('font','font_tiles'),fontCodes=parseArray('font','font_character_codes');
const hudDigits=[];
for(const code of [...'0123456789+'].map(c=>c.charCodeAt(0))){
 const mask=Array(64).fill(false),pixels=Array(64).fill(0),base=fontCodes.indexOf(code)*16;
 if(code===43){for(let n=2;n<7;n++){mask[n*8+4]=true;mask[4*8+n]=true;}}
 else for(let y=0;y<8;y++)for(let x=0;x<8;x++)mask[y*8+x]=!!(fontPatterns[base+y*2]&(1<<(7-x)));
 for(let y=0;y<8;y++)for(let x=0;x<8;x++)if(mask[y*8+x]){
  for(let yy=Math.max(0,y-1);yy<=Math.min(7,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(7,x+1);xx++)pixels[yy*8+xx]=1;
 }
 for(let n=0;n<64;n++)if(mask[n])pixels[n]=3;
 hudDigits.push(...encode(pixels));
}
const starShape=['00011000','00013000','11133111','13333331','01333310','01333310','13211231','11000011'];
const hudStars=[...encode(starShape.join('').split('').map(c=>c==='3'?2:c==='2'?3:Number(c))),...encode(starShape.join('').split('').map(c=>c==='1'?1:0))];
// Steel gate: one tall post, wire panels, Spanish PARE sign, warning base.
// Upper pieces use the otherwise free OBJ area of VRAM bank 1, so the gate
// remains attached to the street across the two scenic parallax splits.
const gateShapes=[];
const shape=f=>Array.from({length:64},(_,n)=>f(n%8,n>>3));
gateShapes.push(shape((x,y)=>x===0||x===5?1:x>0&&x<5?(x===1?3:2):0));
for(let side=0;side<2;side++)gateShapes.push(shape((x,y)=>x===(side?7:0)||y===0||y===7?1:(x+y)%4===0?3:0));
for(let side=0;side<2;side++)gateShapes.push(shape((x,y)=>y===0||y===7?1:((x+side*8+y)>>2)&1?1:2));
for(let side=0;side<2;side++)gateShapes.push(shape((x,y)=>y===0||y===7||x===(side?7:0)?1:y===1?3:2));
const letters=['111101111100100','010101111101101','111101110101101','111100110100111'];
for(let side=0;side<2;side++)gateShapes.push(shape((x,y)=>{
 const xx=x+side*8;if(y===0||y===7)return 1;
 return y>=2&&y<7&&xx%4<3&&letters[xx>>2][(y-2)*3+xx%4]==='1'?1:2;
}));
for(let strength=3;strength>=0;strength--)for(let side=0;side<2;side++)gateShapes.push(shape((x,y)=>{
 const xx=x+side*8;if(y===0||y===7||xx===0||xx===15)return 1;
 if(y<2||y>5||xx<2||xx>13)return 0;
 return xx-2<strength*4?(y===2?3:2):0;
}));
const gateObjects=gateShapes.flatMap(encode);
const gateBackground=gateShapes.slice(1,3).concat(gateShapes.slice(1,7)).flatMap(p=>encode(p.map(c=>[3,0,2,3][c])));
const foreground=[];
for(let kind=0;kind<8;kind++){
 const pixels=[];
 for(let y=0;y<8;y++)for(let x=0;x<8;x++){
  let p=1;
  if(kind<2 || kind===4 || kind===5){p=y===0?0:y===1?3:y===2?2:y===7?0:1;if(y>2 && y<7 && x===(kind&1?0:4))p=0;}
  else{p=(y===0 || y===4 || x===((y<4?0:4)+(kind&1)*4)%8)?0:1;if(y===1||y===5)p=2;}
  if(kind>=6 && (x===0||x===7))p=0;
  pixels.push(p);
 }foreground.push(...encode(pixels));
}
const word=rgb=>rgb.map(v=>Math.round(v)).reduce((n,v,c)=>n|(Math.max(0,Math.min(31,v))<<(c*5)),0);
const rgb=w=>[w&31,(w>>5)&31,(w>>10)&31];
function backdrop(name){
 const patterns=parseArray(name+'_depth',name+'_depth_tiles'),map=parseArray(name+'_depth',name+'_depth_map'),attrs=parseArray(name+'_depth',name+'_depth_attributes');
 const original=parseArray(name+'_scene',name+'_scene_palettes').map(rgb);
 // Reserve palette 6 for high-contrast interactive terrain. Distant scenery
 // uses six palettes, with a small atmospheric tint; HUD remains palette 7.
 const colors=original.slice(0,24).map(c=>c.map((v,i)=>Math.round(v*.88+[24,26,29][i]*.12)));
 const paletteWords=[...colors.map(word),...[[3,4,8],[28,10,2],[31,23,3],[31,31,25]].map(word),...parseArray('font','font_palettes')];
 const packed=[],tiles=[],attributes=[],lookup=new Map();
 for(let y=0;y<10;y++)for(let x=0;x<20;x++){
  const pos=(y+2)*20+x,base=map[pos]*16,sourcePalette=(attrs[pos]&7)*4,pixels=[];
  for(let yy=0;yy<8;yy++)for(let xx=0;xx<8;xx++){
   const mask=1<<(7-xx),index=(patterns[base+yy*2]&mask?1:0)+(patterns[base+yy*2+1]&mask?2:0);pixels.push(original[sourcePalette+index]);
  }
  let best=Infinity,choice=0,indices;
  for(let pal=0;pal<6;pal++){
   let error=0;const ix=pixels.map(c=>{let distance=Infinity,chosen=0;for(let p=0;p<4;p++){const d=c.reduce((n,v,i)=>n+(v-colors[pal*4+p][i])**2,0);if(d<distance){distance=d;chosen=p;}}error+=distance;return chosen;});
   if(error<best){best=error;choice=pal;indices=ix;}
  }
  const bytes=encode(indices),key=bytes.join(',');let id=lookup.get(key);
  if(id===undefined){id=packed.length/16;lookup.set(key,id);packed.push(...bytes);}tiles.push(id);attributes.push(choice|8);
 }
 return {patterns:packed,map:tiles,attrs:attributes,palettes:paletteWords};
}
// Remove the raised flag from the finale map so the existing standard can move
// up its pole. The palace pixels come from the approved medal tableau.
const flagPatterns=parseArray('ceremony_flag_screen','ceremony_flag_screen_tiles');
const flagMap=parseArray('ceremony_flag_screen','ceremony_flag_screen_map');
const flagAttrs=parseArray('ceremony_flag_screen','ceremony_flag_screen_attributes');
const medalPatterns=parseArray('ceremony_medal_screen','ceremony_medal_screen_tiles');
const medalMap=parseArray('ceremony_medal_screen','ceremony_medal_screen_map');
const medalAttrs=parseArray('ceremony_medal_screen','ceremony_medal_screen_attributes');
for(let y=3;y<6;y++)for(let x=10;x<14;x++){
 const pos=y*20+x,pattern=medalPatterns.slice(medalMap[pos]*16,medalMap[pos]*16+16);let tile=-1;
 for(let i=0;i<flagPatterns.length/16;i++)if(pattern.every((b,j)=>b===flagPatterns[i*16+j])){tile=i;break;}
 if(tile<0){tile=flagPatterns.length/16;flagPatterns.push(...pattern);}flagMap[pos]=tile;flagAttrs[pos]=medalAttrs[pos];
}
if(flagPatterns.length/16>224)throw Error('Finale overlaps flag tile reservation');
let header = `/* Generated by tools/build-game-assets.cjs. */\n#ifndef GAME_ASSETS_H\n#define GAME_ASSETS_H\n#include <stdint.h>\n#include "../assets/gbdk/sprites.h"\n#include "../assets/gbdk/font.h"\n#define LEVEL_WIDTH 128u\n#define LEVEL_HEIGHT 18u\n#define COIN_COUNT 16u\n#define ENEMY_COUNT 5u\n`;
textIds.forEach((id,i)=>header+=`#define TXT_${ids(id)} ${i}u\n`);
header += `typedef struct {\n uint8_t bank, tile_count, depth_count;\n const uint8_t *tiles, *library, *cell_palettes, *depth_tiles, *depth_map, *depth_attributes, *terrain, *visual, *attributes;\n const uint16_t *palettes;\n const uint16_t *coin_x;\n const uint8_t *coin_y;\n uint8_t ground, fill, platform, wall, hazard, ladder, barrier_palette;\n} StageAsset;\ntypedef struct { uint8_t bank, count; const uint8_t *tiles, *map, *attributes; const uint16_t *palettes; } ScreenAsset;\nextern const StageAsset stage_assets[5];\nextern const ScreenAsset screen_assets[14];\nextern const uint8_t * const game_text[2][${textIds.length}];\nextern const uint8_t rescue_run_tiles[256];\nextern const uint8_t barricade_tiles[128];\nextern const uint8_t bus_tiles[64];\nextern const uint16_t bus_palette[4];\nextern const uint8_t runtime_flag_tiles[], runtime_flag_map[360], runtime_flag_attributes[360];\nextern const uint16_t runtime_flag_palettes[32];\nextern const uint8_t presidential_standard_tiles[192], presidential_standard_map[12], presidential_standard_attributes[12];\n#define SCREEN_LANGUAGE 0u\n#define SCREEN_TITLE 1u\n#define SCREEN_CONTROLS 2u\n#define SCREEN_PAUSE 3u\n#define SCREEN_GAME_OVER 4u\n#define SCREEN_CLEAR 5u\n#define SCREEN_WORLD 6u\n#define SCREEN_RESCUE 11u\n#define SCREEN_MEDAL 12u\n#define SCREEN_FLAG 13u\n#endif\n`;
header=header.replace('#endif\n','extern const uint8_t foreground_tiles[128],hud_digit_tiles[176],hud_star_tiles[32],gate_obj_tiles[272],gate_bkg_tiles[128];\n#endif\n');
fs.writeFileSync(path.join(out,'game_assets.h'),header);
let tables = '#include "game_assets.h"\n';
let stageRows = [];
const settings = [
 {g:4,f:5,p:6,w:2,h:11,l:3,b:0,pits:[[28,31],[76,80]],platforms:[[18,23,11],[37,42,10],[66,71,11]],walls:[[48,2],[100,2]]},
 {g:4,f:5,p:6,w:8,h:5,l:9,b:1,pits:[[30,34],[78,83]],platforms:[[18,25,11],[39,47,10],[61,69,11],[85,92,10]],walls:[[50,2],[102,2]]},
 {g:2,f:3,p:6,w:13,h:14,l:0,b:4,pits:[[29,33],[77,82]],platforms:[[17,23,11],[39,44,10],[65,72,11]],walls:[[49,2],[102,2]]},
 {g:2,f:3,p:8,w:7,h:14,l:12,b:3,pits:[[28,34],[76,84]],platforms:[[18,24,11],[38,44,10],[64,70,11]],walls:[[50,2],[102,2]]},
 {g:2,f:3,p:4,w:6,h:11,l:0,b:3,pits:[[31,35],[79,83]],platforms:[[18,24,11],[38,44,10],[66,71,11]],walls:[[49,2],[101,2]]}
];
for(let i=0;i<5;i++) {
 const name=stages[i],s=settings[i],t=Array(128*18).fill(0);
 for(let y=14;y<18;y++)for(let x=0;x<128;x++)t[y*128+x]=y===14?1:2;
 for(const [a,b] of s.pits)for(let x=a;x<b;x++)for(let y=14;y<18;y++)t[y*128+x]=i===3?5:0;
 for(const [a,b,y] of s.platforms)for(let x=a;x<b;x++)t[y*128+x]=3;
 for(const [x,h] of s.walls)for(let y=14-h;y<14;y++)for(let xx=x;xx<x+2;xx++)t[y*128+xx]=4;
 for(let y=0;y<14;y++)for(let x=118;x<120;x++)t[y*128+x]=6;
 if(i===1)for(let y=10;y<14;y++)for(let x=64;x<66;x++)t[y*128+x]=7;
 // Decorative props are non-solid; physics is driven by semantic terrain IDs.
 const decors = i===0?[[8,8,12],[9,10,12],[14,58,10]]:i===1?[[14,8,10],[15,10,10]]:i===2?[[8,58,12],[9,60,12],[10,62,12]]:i===3?[[6,8,10],[6,10,10],[13,58,12]]:[[14,8,12],[15,60,10]];
 for(const [cell,x,y] of decors)for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++)if(!t[(y+yy)*128+x+xx])t[(y+yy)*128+x+xx]=16+cell;
 const cx=[88,144,200,296,328,408,472,552,608,640,720,808,856,904,936,984];
 const cy=cx.map((x,j)=>j===3||j===4||j===9?64:90);
 const pals=manifest.sheets[name].cells.map(c=>c.palette_slot ?? c.palette ?? 0);
 // The manifest uses palette attributes, not palette names, in native cells.
 for(let j=0;j<16;j++)if(typeof pals[j]!=='number')throw Error('Invalid palette '+name);
 const library=parseArray(name+'_scene',name+'_scene_library_tiles');
 const depth=backdrop(name),depthMap=depth.map,depthAttrs=depth.attrs;
 const visual=[],attributes=[];
 for(let y=0;y<18;y++)for(let x=0;x<128;x++){
  const kind=t[y*128+x],q=(y&1)*2+(x&1);
  if(!kind || y<10){visual.push(y<10?depthMap[y*20+x%20]:library[0]);attributes.push(y<10?depthAttrs[y*20+x%20]|8:pals[0]);}
  else if(kind>=1 && kind<=4){visual.push(200+(kind===1?0:kind===2?2:kind===3?4:6)+(x&1));attributes.push(6);}
  else if(kind===6){visual.push(216+(y===13?6:y===12?4:(y&1)*2)+(x&1));attributes.push(6);}
  else {const cell=kind>=16?kind-16:kind===1?s.g:kind===2?s.f:kind===3?s.p:kind===4?s.w:kind===5?s.h:s.l;visual.push(library[cell*4+(kind===3?x&1:q)]);attributes.push(pals[cell]);}
 }
 let code=`#pragma bank ${i+3}\n#include "game_assets.h"\n`+include(name+'_scene');
 code+=cArray(name+'_runtime_depth_tiles',depth.patterns)+cArray(name+'_runtime_depth_map',depth.map)+cArray(name+'_runtime_depth_attributes',depth.attrs)+cArray(name+'_runtime_palettes',depth.palettes,'uint16_t');
 code+=cArray(name+'_cell_palettes',pals)+cArray(name+'_terrain',t)+cArray(name+'_visual',visual)+cArray(name+'_attributes',attributes)+cArray(name+'_coin_x',cx,'uint16_t')+cArray(name+'_coin_y',cy);
 fs.writeFileSync(path.join(out,name+'.c'),code);
 const decl=`extern const uint8_t ${name}_cell_palettes[16], ${name}_terrain[2304], ${name}_visual[2304], ${name}_attributes[2304], ${name}_coin_y[16], ${name}_runtime_depth_tiles[${depth.patterns.length}], ${name}_runtime_depth_map[200], ${name}_runtime_depth_attributes[200];\nextern const uint16_t ${name}_coin_x[16], ${name}_runtime_palettes[32];\n`;
 tables+=`#include "../assets/gbdk/${name}_scene.h"\n#include "../assets/gbdk/${name}_depth.h"\n`+decl;
 stageRows.push(` {${i+3},${ids(name)}_SCENE_TILE_COUNT,${depth.patterns.length/16},${name}_scene_tiles,${name}_scene_library_tiles,${name}_cell_palettes,${name}_runtime_depth_tiles,${name}_runtime_depth_map,${name}_runtime_depth_attributes,${name}_terrain,${name}_visual,${name}_attributes,${name}_runtime_palettes,${name}_coin_x,${name}_coin_y,${s.g},${s.f},${s.p},${s.w},${s.h},${s.l},6}`);
}
tables+=`const StageAsset stage_assets[5] = {\n${stageRows.join(',\n')}\n};\n`;
const screenNames=['language_select_screen','title_screen','controls_screen','pause_screen','game_over_screen','stage_clear_screen','world_map_screen','world_map_2_screen','world_map_3_screen','world_map_4_screen','world_map_5_screen','ceremony_rescue_screen','ceremony_medal_screen','ceremony_flag_screen'];
const screenBanks=[8,8,8,15,8,8,9,10,11,12,13,14,14,14];
for(const bank of new Set(screenBanks))fs.writeFileSync(path.join(out,`screens_${bank}.c`),`#pragma bank ${bank}\n`+screenNames.filter((n,i)=>screenBanks[i]===bank&&n!=='ceremony_flag_screen').map(include).join('')+(bank===14?include('presidential_standard')+cArray('runtime_flag_tiles',flagPatterns)+cArray('runtime_flag_map',flagMap)+cArray('runtime_flag_attributes',flagAttrs)+cArray('runtime_flag_palettes',parseArray('ceremony_flag_screen','ceremony_flag_screen_palettes'),'uint16_t'):''));
screenNames.forEach(n=>tables+=`#include "../assets/gbdk/${n}.h"\n`);
tables+=`const ScreenAsset screen_assets[14] = {\n${screenNames.map((n,i)=>i===13?` {14,${flagPatterns.length/16},runtime_flag_tiles,runtime_flag_map,runtime_flag_attributes,runtime_flag_palettes}`:` {${screenBanks[i]},${ids(n)}_TILE_COUNT,${n}_tiles,${n}_map,${n}_attributes,${n}_palettes}`).join(',\n')}\n};\n`;
let common='#pragma bank 2\n#include "game_assets.h"\n'+include('sprites')+include('font')+cArray('foreground_tiles',foreground)+cArray('hud_digit_tiles',hudDigits)+cArray('hud_star_tiles',hudStars)+cArray('gate_obj_tiles',gateObjects)+cArray('gate_bkg_tiles',gateBackground);
for(let lang=0;lang<2;lang++)for(let i=0;i<textIds.length;i++)common+=cArray(`text_${lang}_${i}`,[...Buffer.from(loc.strings[textIds[i]][lang?'es':'en'],'latin1'),0]);
for(let lang=0;lang<2;lang++)for(let i=0;i<textIds.length;i++)tables+=`extern const uint8_t text_${lang}_${i}[];\n`;
tables+=`const uint8_t * const game_text[2][${textIds.length}] = {\n${[0,1].map(lang=>` {${textIds.map((_,i)=>`text_${lang}_${i}`).join(',')}}`).join(',\n')}\n};\n`;
fs.writeFileSync(path.join(out,'game_tables.c'),tables);
function parseArray(file,name){const c=fs.readFileSync(path.join(root,'assets/gbdk',file+'.c'),'utf8');return c.match(new RegExp('const uint(?:8|16)_t '+name+'\\[\\d+\\] = \\{([\\s\\S]*?)\\};'))[1].match(/0x[0-9a-f]+|\d+/gi).map(Number);}
const alamedaTiles=parseArray('alameda_scene','alameda_scene_tiles'),lib=parseArray('alameda_scene','alameda_scene_library_tiles');
common+=cArray('barricade_tiles',lib.slice(40,48).flatMap(t=>alamedaTiles.slice(t*16,t*16+16)));
fs.writeFileSync(path.join(out,'common.c'),common);
// Runtime extras reuse the approved native sheets; nearest palette conversion is deterministic.
async function extras(){
 let sharp;try{sharp=require('sharp');}catch{sharp=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));}
 const rgba=async n=>(await sharp(path.join(root,'assets/native',n)).ensureAlpha().raw().toBuffer({resolveWithObject:true}));
 function tile(data,width,x,y,pal,transparent){const out=[];for(let yy=0;yy<8;yy++){let a=0,b=0;for(let xx=0;xx<8;xx++){const k=((y+yy)*width+x+xx)*4;let ix=0;if(!transparent||data[k+3]>127){let best=Infinity;for(let p=transparent?1:0;p<4;p++){const d=pal[p].reduce((n,v,c)=>n+(v-data[k+c])**2,0);if(d<best){best=d;ix=p;}}}a|=(ix&1)<<(7-xx);b|=(ix>>1)<<(7-xx);}out.push(a,b);}return out;}
 const palette=n=>manifest.sprite_palettes[n].colors.map(h=>h.slice(1).match(/../g).map(v=>parseInt(v,16)));
 const actor=await rgba('ceremony-actors.png');let runs=[];
 for(let i=0;i<4;i++){
   const frame=await sharp(actor.data,{raw:{width:actor.info.width,height:actor.info.height,channels:4}}).extract({left:i*24,top:24,width:24,height:24}).resize(16,16,{kernel:'nearest'}).raw().toBuffer();
   for(let y=0;y<16;y+=8)for(let x=0;x<16;x+=8)runs.push(...tile(frame,16,x,y,palette(i<2?2:3),true));
 }
 const plaza=await rgba('plaza-tiles.png');const busPal=[[248,232,192],[24,32,44],[240,184,80],[88,168,156]];let bus=[];
 // A 32x8 bus top uses four sprites and can act as a moving platform.
 for(let x=0;x<32;x+=8)bus.push(...tile(plaza.data,64,x,16,busPal,true));
 fs.appendFileSync(path.join(out,'common.c'),cArray('rescue_run_tiles',runs)+cArray('bus_tiles',bus)+cArray('bus_palette',busPal.map(p=>p.map(v=>v>>3).reduce((n,v,c)=>n|(v<<(c*5)),0)),'uint16_t'));
}
extras().then(()=>console.log('Generated 16-bank game resources and five 1024-pixel levels.')).catch(e=>{console.error(e);process.exitCode=1;});
