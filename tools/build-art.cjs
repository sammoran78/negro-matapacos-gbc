/* Deterministic raster-to-GBC asset compiler. No game mechanics. */
const fs = require('node:fs');
const path = require('node:path');
let sharp;
try { sharp = require('sharp'); } catch (_) {
  if (!process.env.ART_SHARP_PATH) throw Error('Install sharp locally or set ART_SHARP_PATH to the bundled sharp directory.');
  sharp = require(process.env.ART_SHARP_PATH);
}
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets');
const localization = JSON.parse(fs.readFileSync(path.join(OUT,'localization.json'),'utf8'));
const ui = id => {const entry=localization.strings[id];if(!entry||!entry[localization.preview_language])throw Error('Missing localized string '+id);return entry[localization.preview_language];};
for (const dir of ['native', 'gbdk', 'previews']) fs.mkdirSync(path.join(OUT, dir), {recursive: true});
const hex = c => [1,3,5].map(i => parseInt(c.slice(i,i+2),16));
const gbc = c => hex(c).map(v => Math.round(Math.round(v * 31 / 255) * 255 / 31));
const PAL = {
  dog: ['#f8e8c0','#18202c','#9cacc4','#ee493f'],
  officer: ['#f8e8c0','#18202c','#688454','#e8b884'],
  red: ['#f8e8c0','#18202c','#ee493f','#e8b884'],
  teal: ['#f8e8c0','#18202c','#58a89c','#e8b884'],
  food: ['#f8e8c0','#18202c','#e8b884','#a86c54'],
  effect: ['#f8e8c0','#18202c','#9cacc4','#f8e8c0'],
  flag: ['#f8e8c0','#2854a4','#ee493f','#f8f0e8'],
  chile_bg: ['#304c5c','#2854a4','#f8f0e8','#ee493f'],
  heraldry: ['#e8b884','#2854a4','#f8f0e8','#ee493f'],
  medal: ['#f8e8c0','#18202c','#ee493f','#e8b884'],
  star: ['#f8e8c0','#18202c','#9cacc4','#f8e8c0'],
  warm: ['#f8e8c0','#e8b884','#a86c54','#584c54'],
  sea: ['#f8e8c0','#a8c0ac','#58a89c','#304c5c'],
  stone: ['#f8e8c0','#b8b0a0','#78848c','#304c5c'],
  mint: ['#e0ead0','#a8c0ac','#58a89c','#304c5c'],
  scaffold: ['#e0ead0','#e8b884','#a86c54','#304c5c'],
  banner: ['#f8e8c0','#ee493f','#a86c54','#584c54'],
  dusk: ['#c8c0d4','#9894b4','#686888','#38445c'],
  plaza_stone: ['#c8c0d4','#b8b0a0','#78848c','#38445c'],
  bus: ['#c8c0d4','#a8c0ac','#58a89c','#304c5c'],
  truck: ['#c8c0d4','#a8b088','#688454','#38445c'],
  warning: ['#c8c0d4','#f8e8c0','#ee493f','#38445c'],
  gas: ['#c8c0d4','#e8f0e8','#9cacc4','#586c94'],
  hud: ['#18202c','#f8e8c0','#ee493f','#9cacc4'],
  portrait: ['#f8e8c0','#18202c','#586c84','#9cacc4'],
  bandana: ['#18202c','#ee493f','#a82c3c','#f8e8c0'],
  title_ink: ['#f8e8c0','#ee493f','#18202c','#9cacc4'],
};
const colors = Object.fromEntries(Object.entries(PAL).map(([k,v])=>[k,v.map(gbc)]));
const spritePaletteNames = ['dog','officer','red','teal','food','effect','flag','star'];
const spritePalettes = spritePaletteNames.map(k=>colors[k]);
const manifest = {version:1, source:'Built-in image_gen; exact native dimensions and GBC colors compiled locally.',
  sprite_size:[8,8], player_size:[16,16], resolution:[160,144], sprite_palettes:spritePaletteNames.map((name,i)=>({slot:i,name,colors:PAL[name],transparent_index:0})),
  sheets:{}, scenes:{}, screens:{}, backdrops:{}, animation_sequences:{idle:[0,1],run:[2,12,3,13,4,14,5,15],jump:[6],fall:[7],bark:[8,9],hurt:[10],celebrate:[11]}, animation_timing_ms:{run:80,idle:240,bark:140,jump:160,fall:160,hurt:160,celebrate:240}, checks:[]};
function canvas(w,h,color=[0,0,0,0]) { const a={w,h,p:Buffer.alloc(w*h*4)}; for(let i=0;i<w*h;i++) a.p.set(color,i*4); return a; }
function set(a,x,y,c) {if(x>=0&&x<a.w&&y>=0&&y<a.h)a.p.set(c,(y*a.w+x)*4);}
function rect(a,x,y,w,h,c) {for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)set(a,xx,yy,c);}
function rgba(c) {return [...c,255];}
function blit(dest,src,dx,dy,flip=false) {for(let y=0;y<src.h;y++)for(let x=0;x<src.w;x++){const i=(y*src.w+x)*4;if(src.p[i+3])set(dest,dx+(flip?src.w-1-x:x),dy+y,src.p.subarray(i,i+4));}}
function crop(src,x,y,w,h){const a=canvas(w,h);for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const i=((y+yy)*src.w+x+xx)*4;a.p.set(src.p.subarray(i,i+4),(yy*w+xx)*4);}return a;}
async function save(a,name,scale=1){await sharp(a.p,{raw:{width:a.w,height:a.h,channels:4}}).resize(a.w*scale,a.h*scale,{kernel:'nearest'}).png().toFile(path.join(OUT,name));}
async function load(name) {const {data,info}=await sharp(path.join(OUT,'source',name+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {w:info.width,h:info.height,p:data};}
function nearest(r,g,b,palette,start=0) {let best=start,err=Infinity;for(let i=start;i<4;i++){const c=palette[i],e=(r-c[0])**2+(g-c[1])**2+(b-c[2])**2;if(e<err){best=i;err=e;}}return [best,err];}
function quantize(src,palette,transparent=false){const a=canvas(src.w,src.h);for(let i=0;i<src.w*src.h;i++){if(transparent&&src.p[i*4+3]<100)continue;const idx=nearest(...src.p.subarray(i*4,i*4+3),palette,transparent?1:0)[0];a.p.set([...palette[idx],255],i*4);}return a;}
async function resize(src,w,h){const p=await sharp(src.p,{raw:{width:src.w,height:src.h,channels:4}}).resize(w,h,{kernel:'lanczos3'}).raw().toBuffer();return {w,h,p};}
function bounds(src){let x0=src.w,y0=src.h,x1=-1,y1=-1;for(let y=0;y<src.h;y++)for(let x=0;x<src.w;x++)if(src.p[(y*src.w+x)*4+3]>180){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}if(x1<0)throw Error('Empty sprite cell');return [x0,y0,x1-x0+1,y1-y0+1];}
// Palette-aware area sampling preserves small eyes and bandanas that RGB averaging would erase.
function sampleSprite(src,w,h,pal,palId){const a=canvas(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const counts=[0,0,0,0];let total=0,solid=0;for(let yy=Math.floor(y*src.h/h);yy<Math.ceil((y+1)*src.h/h);yy++)for(let xx=Math.floor(x*src.w/w);xx<Math.ceil((x+1)*src.w/w);xx++){const weight=(Math.min(xx+1,(x+1)*src.w/w)-Math.max(xx,x*src.w/w))*(Math.min(yy+1,(y+1)*src.h/h)-Math.max(yy,y*src.h/h)),p=(yy*src.w+xx)*4;total+=weight;if(src.p[p+3]>128){solid+=weight;counts[nearest(...src.p.subarray(p,p+3),pal,1)[0]]+=weight;}}if(solid/total<.28)continue;let idx=counts.indexOf(Math.max(...counts));if(counts[3]/solid>=(palId===6?.1:.2))idx=3;else if(palId===0&&counts[2]/solid>=.1)idx=2;set(a,x,y,rgba(pal[idx]));}return a;}
const dogNames=['idle_0','idle_1','run_contact','run_passing','run_airborne','run_recoil','jump_rise','jump_fall','bark_0','bark_1','hurt','celebrate','run_lift','run_extend','run_landing','run_push'];
const actorNames=['officer_patrol_0','officer_patrol_1','officer_stunned','officer_climb','student_red_idle','student_red_wave','student_teal_idle','student_teal_wave','empanada','extra_life','checkpoint','stun_star','bark_small','bark_large','dust_small','dust_large'];
const actorPals=[1,1,1,1,2,2,3,3,4,0,6,7,5,5,5,5];
function encodeTile(a,x,y,pal,trans=false){const bytes=[];for(let yy=0;yy<8;yy++){let lo=0,hi=0;for(let xx=0;xx<8;xx++){const i=((y+yy)*a.w+x+xx)*4;const n=trans&&a.p[i+3]===0?0:nearest(...a.p.subarray(i,i+3),pal,trans?1:0)[0];lo|=(n&1)<<(7-xx);hi|=((n>>1)&1)<<(7-xx);}bytes.push(lo,hi);}return bytes;}
function writeC(name,arrays){const guard=name.toUpperCase()+'_H';let h=`/* Generated by tools/build-art.cjs. */\n#ifndef ${guard}\n#define ${guard}\n#include <stdint.h>\n`;
  let c=`/* Generated GBDK-2020 assets. */\n#include "${name}.h"\n`;
  for(const [key,val] of Object.entries(arrays)){const wide=key==='palettes',type=wide?'uint16_t':'uint8_t';if(key==='tiles')h+=`#define ${name.toUpperCase()}_TILE_COUNT ${val.length/16}u\n`;h+=`extern const ${type} ${name}_${key}[${val.length}];\n`;c+=`const ${type} ${name}_${key}[${val.length}] = {\n`;for(let i=0;i<val.length;i+=16)c+='    '+val.slice(i,i+16).map(v=>'0x'+v.toString(16).padStart(wide?4:2,'0')).join(', ')+',\n';c+='};\n';}h+='#endif\n';fs.writeFileSync(path.join(OUT,'gbdk',name+'.h'),h);fs.writeFileSync(path.join(OUT,'gbdk',name+'.c'),c);}
function paletteWords(pals){return pals.flat().map(c=>{const [r,g,b]=c.map(v=>Math.round(v*31/255));return r|(g<<5)|(b<<10);});}
const spriteFrames=[];
async function sprites(name,count,names,palIds,rowFractions){const src=await load(name==='dog'?'dog-v2':name),flagEdit=name==='actors'?await load('actors-chile'):null,sheet=canvas(64,Math.ceil(count/4)*16),frames=[];
  if(flagEdit&&(flagEdit.w!==src.w||flagEdit.h!==src.h))throw Error('Checkpoint revision must retain source dimensions');
  for(let i=0;i<count;i++){const col=i%4,row=Math.floor(i/4),x=Math.round(col*src.w/4),x2=Math.round((col+1)*src.w/4),y=Math.round(rowFractions[row]*src.h),y2=Math.round(rowFractions[row+1]*src.h);
    const cell=crop(flagEdit&&i===10?flagEdit:src,x,y,x2-x,y2-y),b=bounds(cell),body=crop(cell,...b),icon=name==='actors'&&[8,9,11].includes(i),limit=icon?8:name==='dog'?15:14,scale=Math.min(limit/body.w,limit/body.h),w=Math.max(1,Math.round(body.w*scale)),h=Math.max(1,Math.round(body.h*scale));
    const frame=canvas(16,16),native=sampleSprite(body,w,h,spritePalettes[palIds[i]],palIds[i]);
    blit(frame,native,Math.floor((16-w)/2),icon?Math.floor((16-h)/2):(name==='dog'?16:15)-h);blit(sheet,frame,col*16,row*16);frames.push(frame);
    spriteFrames.push({name:names[i],frame,palette:palIds[i],sheet:name,cell:i});
  }
  await save(sheet,'native/'+name+'.png');await save(sheet,'previews/'+name+'-8x.png',8);
  manifest.sheets[name]={path:'native/'+name+'.png',width:sheet.w,height:sheet.h,cell:[16,16],frames:names.map((n,i)=>({name:n,cell:i,palette:palIds[i]}))};return frames;
}
const FONT={
  A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['11111','00100','00100','00100','00100','00100','11111'],J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','10101','01010'],X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],
  0:['01110','10001','10011','10101','11001','10001','01110'],1:['00100','01100','00100','00100','00100','00100','01110'],2:['01110','10001','00001','00010','00100','01000','11111'],3:['11110','00001','00001','01110','00001','00001','11110'],4:['00010','00110','01010','10010','11111','00010','00010'],5:['11111','10000','10000','11110','00001','00001','11110'],6:['01110','10000','10000','11110','10001','10001','01110'],7:['11111','00001','00010','00100','01000','01000','01000'],8:['01110','10001','10001','01110','10001','10001','01110'],9:['01110','10001','10001','01111','00001','00001','01110'],
  '!':['00100','00100','00100','00100','00100','00000','00100'],':':['00000','00100','00100','00000','00100','00100','00000'],'-':['00000','00000','00000','11111','00000','00000','00000'],'/':['00001','00001','00010','00100','01000','10000','10000'],'>':['10000','01000','00100','00010','00100','01000','10000'],' ':['00000','00000','00000','00000','00000','00000','00000']};
Object.assign(FONT,{
  'Ñ':['01010','10001','11001','10101','10011','10001','10001'],
  'Á':['00100','01110','10001','11111','10001','10001','10001'],
  'É':['00100','11111','10000','11110','10000','10000','11111'],
  'Í':['00100','11111','00100','00100','00100','00100','11111'],
  'Ó':['00100','01110','10001','10001','10001','10001','01110'],
  'Ú':['00100','10001','10001','10001','10001','10001','01110'],
  'Ü':['01010','10001','10001','10001','10001','10001','01110'],
  '¡':['00100','00000','00100','00100','00100','00100','00100'],
  '?':['01110','10001','00001','00010','00100','00000','00100'],
  '¿':['00100','00000','00100','01000','10000','10001','01110'],
  ',':['00000','00000','00000','00000','00000','00100','01000'],
  '.':['00000','00000','00000','00000','00000','00000','00100']
});
const glyphOrder=' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!:-/>ÑÁÉÍÓÚÜ¡?¿,.';
function text(a,str,x,y,c,scale=1){for(const ch of str){const rows=FONT[ch];if(!rows)throw Error('Missing glyph '+ch);for(let yy=0;yy<7;yy++)for(let xx=0;xx<5;xx++)if(rows[yy][xx]==='1')rect(a,x+xx*scale,y+yy*scale,scale,scale,c);x+=6*scale;}}
function centered(a,str,y,c,scale=1){text(a,str,Math.floor((a.w-(str.length*6-1)*scale)/2),y,c,scale);}
async function font(){const height=Math.ceil(glyphOrder.length/16)*8,a=canvas(128,height,rgba(colors.hud[0]));for(let i=0;i<glyphOrder.length;i++)text(a,glyphOrder[i],(i%16)*8+1,Math.floor(i/16)*8,rgba(colors.hud[1]));await save(a,'native/font.png');await save(a,'previews/font-6x.png',6);const bytes=[];for(let i=0;i<glyphOrder.length;i++)bytes.push(...encodeTile(a,(i%16)*8,Math.floor(i/16)*8,colors.hud));writeC('font',{tiles:bytes,character_codes:[...glyphOrder].map(ch=>ch.codePointAt(0)),palettes:paletteWords([colors.hud])});fs.writeFileSync(path.join(OUT,'gbdk','font.2bpp'),Buffer.from(bytes));manifest.sheets.font={path:'native/font.png',width:128,height,cell:[8,8],glyph_order:glyphOrder,encoding:'Latin-1 codepoints; runtime maps localized text to glyph indices',full_font_tile_count:glyphOrder.length};return a;}
const themeDefs={
  alameda:{paletteNames:['warm','sea','stone','banner','dog','food','mint','hud'],cellPals:[0,0,0,1,2,2,2,2,0,0,0,0,3,3,1,1],ground:4,fill:5,normalize:{4:4,6:6,7:6},names:['sky','skyline','stucco','window','sidewalk_top','sidewalk_fill','platform_left','platform_right','bench_left','bench_right','barricade_left','barricade_right','mural_left','mural_right','street_lamp','arrow_sign']},
  campus:{paletteNames:['mint','warm','scaffold','banner','dog','food','sea','hud'],cellPals:[0,0,1,6,1,1,2,2,2,2,3,1,1,1,3,3],ground:4,fill:5,normalize:{4:6,6:6,7:6},names:['sky','campus_skyline','brick','library_window','roof_top','brick_fill','scaffold_left','scaffold_right','scaffold_brace','ladder','bookcase','entrance','stairs_up','stairs_down','banner_left','banner_right']},
  plaza:{paletteNames:['dusk','plaza_stone','bus','truck','warning','gas','dog','hud'],cellPals:[0,0,1,1,2,2,2,2,3,3,3,4,1,1,5,5],ground:2,fill:3,normalize:{2:7,6:10},names:['sky','monument_skyline','stone_top','stone_fill','bus_left','bus_right','bus_roof','bus_wheels','guanaco_left','guanaco_right','cannon_nozzle','warning_beacon','monument_steps','plinth','tear_gas','water_jet']}
};
// Reserve a national-flag background palette for the scenic depth layer.
themeDefs.alameda.paletteNames[4]='chile_bg';
themeDefs.campus.paletteNames[4]='chile_bg';
themeDefs.plaza.paletteNames[6]='chile_bg';
Object.assign(themeDefs,{
  mapocho:{paletteNames:['mint','sea','stone','scaffold','chile_bg','warm','banner','hud'],cellPals:[0,1,2,2,2,2,2,2,2,2,3,3,3,2,1,1],ground:2,fill:3,normalize:{2:2,4:5,5:5,8:2,9:2},names:['sky','city_skyline','walkway_top','channel_wall','bridge_left','bridge_right','steel_truss','bridge_pier','channel_ledge_left','channel_ledge_right','barricade_left','barricade_right','service_ladder','drain','water','arrow_sign']},
  moneda:{paletteNames:['warm','sea','stone','banner','chile_bg','mint','portrait','hud'],cellPals:[0,2,2,2,2,2,2,1,0,0,3,3,2,2,1,2],ground:2,fill:3,normalize:{4:7,5:7},names:['sky','palace_roof','paving_top','paving_fill','platform_left','platform_right','palace_column','palace_window','door_left','door_right','barricade_left','barricade_right','stairs_up','stairs_down','hedge','empty_flagpole']}
});
const themeAssets={};
async function theme(name){const d=themeDefs[name],src=await load(name),sheet=canvas(64,64),cells=[];for(let i=0;i<16;i++){const x=Math.round((i%4)*src.w/4),x2=Math.round((i%4+1)*src.w/4),y=Math.round(Math.floor(i/4)*src.h/4),y2=Math.round((Math.floor(i/4)+1)*src.h/4);let cell=quantize(await resize(crop(src,x,y,x2-x,y2-y),16,16),colors[d.paletteNames[d.cellPals[i]]]);
    // Trim source sky padding on solid top surfaces; align the exported edge to y=0.
    if(d.normalize[i]){const shift=d.normalize[i],aligned=canvas(16,16);for(let yy=0;yy<16;yy++)blit(aligned,crop(cell,0,Math.min(yy+shift,15),16,1),0,yy);cell=aligned;}
    if(i===0)rect(cell,0,0,16,16,rgba(colors[d.paletteNames[0]][0]));
    cells.push(cell);blit(sheet,cell,(i%4)*16,Math.floor(i/4)*16);
  }await save(sheet,'native/'+name+'-tiles.png');await save(sheet,'previews/'+name+'-tiles-8x.png',8);
  manifest.sheets[name]={path:'native/'+name+'-tiles.png',width:64,height:64,cell:[16,16],palettes:d.paletteNames,cells:d.names.map((n,i)=>({name:n,cell:i,palette:d.cellPals[i],solid_top_offset:(i===d.ground||i===6||(name!=='plaza'&&i===7))?0:null}))};themeAssets[name]={d,cells,sheet};return themeAssets[name];}
// Tile-local palette selection: evaluate only the eight palettes loaded for this scene.
function quantizedScene(src,paletteNames,paletteAt=()=>null,paletteAllowed=()=>true){const palettes=paletteNames.map(k=>colors[k]),out=canvas(src.w,src.h),attrs=[];for(let y=0;y<src.h;y+=8)for(let x=0;x<src.w;x+=8){let best=0,bestErr=Infinity;for(let p=0;p<palettes.length;p++){if(!paletteAllowed(p,x,y))continue;let err=0;for(let yy=0;yy<8;yy++)for(let xx=0;xx<8;xx++){const i=((y+yy)*src.w+x+xx)*4;err+=nearest(...src.p.subarray(i,i+3),palettes[p])[1];}if(err<bestErr){bestErr=err;best=p;}}const forced=paletteAt(x,y);if(forced!==null)best=forced;const q=quantize(crop(src,x,y,8,8),palettes[best]);blit(out,q,x,y);attrs.push(best);}return {image:out,attrs,palettes};}
function packBackground(name,a,attrs,palettes,extras=[],alternates={}){const tiles=[],lookup=new Map(),map=[],atr=[],library=[],alternateArrays={},alternateMaps={},add=(bytes)=>{const key=Buffer.from(bytes).toString('hex');if(!lookup.has(key)){lookup.set(key,tiles.length);tiles.push(bytes);}return lookup.get(key);};let j=0;for(let y=0;y<a.h;y+=8)for(let x=0;x<a.w;x+=8){const attr=attrs[j++],p=attr&7;map.push(add(encodeTile(a,x,y,palettes[p])));atr.push(attr);}for(const e of extras)library.push(add(e));
  for(const [state,alt] of Object.entries(alternates)){const ids=[];let k=0;for(let y=0;y<alt.image.h;y+=8)for(let x=0;x<alt.image.w;x+=8)ids.push(add(encodeTile(alt.image,x,y,palettes[alt.attrs[k++]&7])));alternateArrays[state+'_map']=ids;alternateArrays[state+'_attributes']=alt.attrs;alternateMaps[state]={map:ids,attributes:alt.attrs};}
  if(tiles.length>256)throw Error(name+' exceeds 256 background tiles: '+tiles.length);
  writeC(name,{tiles:tiles.flat(),map,attributes:atr,...(library.length?{library_tiles:library}:{}),...alternateArrays,palettes:paletteWords(palettes)});
  fs.writeFileSync(path.join(OUT,'gbdk',name+'.2bpp'),Buffer.from(tiles.flat()));
  return {tile_count:tiles.length,tile_bytes:tiles.length*16,map_bytes:map.length,attribute_bytes:atr.length,palette_count:palettes.length,dimensions:[a.w/8,a.h/8],map,attributes:atr,library_tiles:library,alternate_maps:alternateMaps};}
const titlePaletteNames=['title_ink','warm','sea','portrait','bandana','stone','chile_bg','hud'];
// Preserve the national flag's tiny canton and star instead of favoring surrounding scenery colors.
const titleFlagPalette=(x,y)=>((x===0||x===8)&&(y===88||y===96))||(x===136&&(y===96||y===104))?6:null;
async function title(){const src=await resize(await load('title-chile'),160,144);rect(src,0,0,160,40,rgba(colors.warm[0]));centered(src,'NEGRO',5,rgba(colors.dog[1]),2);centered(src,'MATAPACOS',23,rgba(colors.dog[3]),2);rect(src,0,128,160,16,rgba(colors.hud[0]));centered(src,ui('start_game'),132,rgba(colors.hud[1]));const q=quantizedScene(src,titlePaletteNames,titleFlagPalette);await save(q.image,'native/title-screen.png');await save(q.image,'previews/title-screen-4x.png',4);const off=canvas(160,144);blit(off,q.image,0,0);rect(off,0,128,160,16,rgba(colors.hud[0]));const oq=quantizedScene(off,titlePaletteNames,titleFlagPalette),p=packBackground('title_screen',q.image,q.attrs,q.palettes,[],{blink:oq});await save(oq.image,'native/title-screen-blink.png');for(const ext of ['c','h','2bpp']){const stale=path.join(OUT,'gbdk','title_screen_blink.'+ext);if(fs.existsSync(stale))fs.unlinkSync(stale);}manifest.screens.title={path:'native/title-screen.png',...p,palettes:titlePaletteNames,preview_language:localization.preview_language,text_ids:['hero_name','start_game'],available_only_after_language_confirmation:true};return q.image;}
function hud(name){const a=canvas(160,16,rgba(colors.hud[0]));rect(a,0,0,160,1,rgba(colors.hud[3]));text(a,'E 07/50',4,5,rgba(colors.hud[1]));text(a,ui('hud_lives_short')+' 03',61,5,rgba(colors.hud[1]));text(a,name==='plaza'?'PLAZA':name.toUpperCase(),106,5,rgba(colors.hud[1]));return a;}
function scene(name){const {d,cells}=themeAssets[name],a=canvas(160,144,rgba(colors[d.paletteNames[0]][0]));const put=(i,x,y)=>blit(a,cells[i],x,y);
  for(let x=0;x<160;x+=16)put(1,x,40);
  if(name==='alameda'){for(let y=56;y<104;y+=16)for(let x=0;x<160;x+=16)put(2,x,y);put(3,16,56);put(3,64,56);put(3,112,56);put(12,48,88);put(13,64,88);put(8,0,96);put(9,16,96);put(14,96,96);put(10,112,96);put(11,128,96);put(6,48,80);put(7,64,80);}
  if(name==='campus'){for(let y=56;y<112;y+=16)for(let x=0;x<160;x+=16)put(2,x,y);for(let x=16;x<160;x+=48)put(3,x,56);put(14,80,64);put(15,96,64);put(11,128,96);put(8,48,80);put(9,64,80);put(9,64,96);put(6,48,80);put(7,64,80);put(10,0,96);}
  if(name==='plaza'){put(12,16,80);put(13,32,96);put(4,64,88);put(5,80,88);put(6,64,88);put(6,80,88);put(8,112,96);put(9,128,96);put(10,136,80);put(11,112,80);put(14,96,104);}
  if(name==='mapocho'){for(let x=0;x<160;x+=16)put(3,x,96);put(4,48,64);put(5,64,64);put(6,48,80);put(7,80,80);put(8,16,88);put(9,32,88);put(13,96,96);put(10,112,96);put(11,128,96);put(12,144,80);}
  if(name==='moneda'){for(let y=56;y<96;y+=16)for(let x=0;x<160;x+=16)put(6,x,y);for(let x=16;x<160;x+=48)put(7,x,64);put(8,64,80);put(9,80,80);put(4,32,80);put(5,48,80);put(10,112,96);put(11,128,96);put(14,0,96);put(15,144,96);}
  for(let x=0;x<160;x+=16){put(d.ground,x,112);put(d.fill,x,128);}blit(a,hud(name),0,128);return a;}
function spriteScanlines(placements){const lines=Array(144).fill(0);for(const {frame,x,y} of placements){for(const [dx,dy] of frame.w===8?[[0,0]]:[[0,0],[8,0],[0,8],[8,8]]){if(x+dx<=-8||x+dx>=160)continue;for(let yy=Math.max(0,y+dy);yy<Math.min(144,y+dy+8);yy++)lines[yy]++;}}return Math.max(...lines);}
async function stagePreviews(dog,actors,fontSheet){for(const name of Object.keys(themeDefs)){const a=scene(name),d=themeDefs[name],q=quantizedScene(a,d.paletteNames),{cells}=themeAssets[name];const extras=[];
    for(let i=0;i<16;i++)for(const [x,y] of [[0,0],[8,0],[0,8],[8,8]])extras.push(encodeTile(cells[i],x,y,q.palettes[d.cellPals[i]]));
    // Gameplay needs letters, digits and the collectible slash. Menu punctuation loads with menu assets.
    for(let i=0;i<glyphOrder.length;i++)if(/[ A-Z0-9/]/.test(glyphOrder[i]))extras.push(encodeTile(fontSheet,(i%16)*8,Math.floor(i/16)*8,q.palettes[7]));
    const packed=packBackground(name+'_scene',q.image,q.attrs,q.palettes,extras);
    manifest.sheets[name].cells.forEach((cell,i)=>{cell.tile_ids=packed.library_tiles.slice(i*4,i*4+4);});
    manifest.sheets[name].glyph_ids=Object.fromEntries([...glyphOrder].filter(c=>/[ A-Z0-9/]/.test(c)).map((c,i)=>[c,packed.library_tiles[64+i]]));
    if(packed.tile_count>128)throw Error(name+' exceeds conservative 128 BG tile budget: '+packed.tile_count);
    await save(q.image,'native/'+name+'-background.png');
    const render=canvas(160,144);blit(render,q.image,0,0);const placements=[{frame:dog[2],x:34,y:96},{frame:actors[0],x:84,y:97},{frame:actors[4],x:130,y:97},{frame:actors[6],x:146,y:97}];
    if(name==='alameda')placements.push({frame:actors[12],x:50,y:96});
    if(name==='campus')placements[1]={frame:actors[3],x:64,y:83};
    if(name==='plaza')placements[1]={frame:actors[2],x:92,y:97};
    const coins=[{frame:crop(actors[8],4,4,8,8),x:50,y:66},{frame:crop(actors[8],4,4,8,8),x:68,y:66}];placements.push(...coins);
    for(const p of placements)blit(render,p.frame,p.x,p.y);
    const peak=spriteScanlines(placements),objects=placements.reduce((n,p)=>n+(p.frame.w===8?1:4),0);if(peak>10||objects>40)throw Error(name+' violates OAM budgets');
    await save(render,'native/'+name+'-mockup.png');await save(render,'previews/'+name+'-mockup-4x.png',4);
    manifest.scenes[name]={path:'native/'+name+'-mockup.png',background:'native/'+name+'-background.png',palettes:d.paletteNames,...packed,oam_objects:objects,max_objects_per_scanline:peak,placements:placements.map(p=>({x:p.x,y:p.y,objects:p.frame.w===8?1:4}))};
  }}
async function languageSelector(actors){const a=canvas(160,144,rgba(colors.warm[0]));rect(a,0,0,160,3,rgba(colors.dog[3]));centered(a,'IDIOMA / LANGUAGE',12,rgba(colors.dog[1]));centered(a,'ENGLISH',38,rgba(colors.dog[1]));centered(a,'ESPAÑOL',60,rgba(colors.dog[1]));text(a,'>',45,60,rgba(colors.dog[3]));for(let x=0;x<160;x+=16)blit(a,themeAssets.alameda.cells[1],x,104);blit(a,spriteFrames[11].frame,64,108);blit(a,actors[10],88,108);rect(a,0,128,160,16,rgba(colors.hud[0]));centered(a,'A - ELIGE / SELECT',132,rgba(colors.hud[1]));const q=quantizedScene(a,titlePaletteNames),p=packBackground('language_select_screen',q.image,q.attrs,q.palettes);await save(q.image,'native/language_select-screen.png');await save(q.image,'previews/language_select-screen-4x.png',4);manifest.screens.language_select={path:'native/language_select-screen.png',...p,palettes:titlePaletteNames,choices:['en','es'],requires_confirmation:true,start_game_visible:false};}
async function menus(titleImage,actors){const ids={controls:['controls_title','controls_move','controls_jump','controls_bark','controls_run','controls_pause','continue'],pause:['paused','pause_message','continue'],game_over:['game_over','try_again','continue'],stage_clear:['students_safe','alameda_clear','continue'],ending:['thank_you','ending_message','hero_name','continue']};const specs=Object.fromEntries(Object.entries(ids).map(([k,v])=>[k,v.map(ui)]));
  for(const [name,lines] of Object.entries(specs)){const a=canvas(160,144,rgba(colors.warm[0]));for(let x=0;x<160;x+=16)blit(a,themeAssets.alameda.cells[1],x,104);rect(a,0,0,160,3,rgba(colors.dog[3]));rect(a,0,128,160,16,rgba(colors.hud[0]));centered(a,lines[0],12,rgba(colors.dog[1]),name==='controls'||lines[0].length>13?1:2);const body=lines.slice(1,-1);for(let i=0;i<body.length;i++)centered(a,body[i],name==='controls'?32+i*14:44+i*14,rgba(colors.dog[1]));centered(a,lines.at(-1),132,rgba(colors.hud[1]));if(name==='ending'||name==='stage_clear'){blit(a,spriteFrames[11].frame,64,108);blit(a,actors[5],84,108);blit(a,actors[7],102,108);}const q=quantizedScene(a,titlePaletteNames),packed=packBackground(name+'_screen',q.image,q.attrs,q.palettes);await save(q.image,'native/'+name+'-screen.png');await save(q.image,'previews/'+name+'-screen-4x.png',4);manifest.screens[name]={path:'native/'+name+'-screen.png',...packed,palettes:titlePaletteNames,preview_language:localization.preview_language,text_ids:ids[name]};
  }}
// Compact, lossless GIF encoder for four-color animation previews.
function gif(frames,name,palette,scale=6,delay=10){const w=16*scale,h=16*scale,out=[Buffer.from('GIF89a')],u16=n=>[n&255,n>>8];out.push(Buffer.from([...u16(w),...u16(h),0xf1,0,0,...palette.flat()]));out.push(Buffer.from([0x21,0xff,11,...Buffer.from('NETSCAPE2.0'),3,1,0,0,0]));for(const a of frames){out.push(Buffer.from([0x21,0xf9,4,8,...u16(delay),0,0,0x2c,0,0,0,0,...u16(w),...u16(h),0,2]));const codes=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(Math.floor(y/scale)*16+Math.floor(x/scale))*4;codes.push(4,a.p[i+3]?nearest(...a.p.subarray(i,i+3),palette,1)[0]:0);}codes.push(5);const bytes=[];let acc=0,bits=0;for(const c of codes){acc|=c<<bits;bits+=3;while(bits>=8){bytes.push(acc&255);acc>>=8;bits-=8;}}if(bits)bytes.push(acc&255);for(let i=0;i<bytes.length;i+=255)out.push(Buffer.from([Math.min(255,bytes.length-i),...bytes.slice(i,i+255)]));out.push(Buffer.from([0]));}out.push(Buffer.from([0x3b]));fs.writeFileSync(path.join(OUT,'previews',name),Buffer.concat(out));}
async function overview(titleImage){const a=canvas(640,400,rgba(colors.hud[0]));
  const titleLarge=await sharp(titleImage.p,{raw:{width:160,height:144,channels:4}}).resize(320,288,{kernel:'nearest'}).raw().toBuffer();blit(a,{w:320,h:288,p:titleLarge},0,16);
  for(const [j,name] of ['alameda','campus','plaza'].entries()){const img=await sharp(path.join(OUT,'native',name+'-mockup.png')).ensureAlpha().raw().toBuffer();blit(a,{w:160,h:144,p:img},320+(j%2)*160,16+Math.floor(j/2)*144);text(a,name.toUpperCase(),328+(j%2)*160,18+Math.floor(j/2)*144,rgba(colors.hud[1]));}
  centered(a,'NEGRO MATAPACOS - ARTE',3,rgba(colors.hud[1]));rect(a,0,312,640,80,rgba(colors.warm[0]));for(let i=0;i<12;i++){const s=spriteFrames[i],big=await sharp(s.frame.p,{raw:{width:16,height:16,channels:4}}).resize(32,32,{kernel:'nearest'}).raw().toBuffer();blit(a,{w:32,h:32,p:big},16+i*52,328);text(a,String(i).padStart(2,'0'),25+i*52,367,rgba(colors.hud[0]));}await save(a,'previews/art-overview.png',2);}
function reviewHTML(){const gallery=[['title-screen','Title menu after language confirmation'],['language_select-screen','English / Español selector'],['actors','Officers · students · Chilean checkpoint flag'],...Object.keys(themeDefs).flatMap(n=>[[n+'-layered-mockup',n+' · layered stage study'],[n+'-depth',n+' · scenic depth bands'],[n+'-tiles',n+' · playfield tiles']]),['world_map-1-screen','Santiago · first stage unlocked'],['world_map-5-screen','Santiago · complete route unlocked'],['ceremony-actors','Finale figures · 24-pixel BG composites'],['ceremony_rescue-screen','Students run to the president'],['ceremony_medal-screen','Medal award'],['ceremony_flag-screen','Presidential standard raised · ending'],['presidential-standard','Presidential standard · simplified coat of arms'],['controls-screen','Controles'],['pause-screen','Pausa'],['game_over-screen','Fin del juego'],['stage_clear-screen','Rescate']].map(([file,label])=>'<figure><img src="native/'+file+'.png" width="320"><figcaption>'+label+'</figcaption></figure>').join('');let html=fs.readFileSync(path.join(ROOT,'tools','review-template.html'),'utf8');const design={world_map:manifest.world_map,animation_timing_ms:manifest.animation_timing_ms,backdrops:Object.fromEntries(Object.keys(themeDefs).map(n=>[n,{bands:manifest.backdrops[n].bands}]))};for(const [token,value] of Object.entries({__GALLERY__:gallery,__FONT__:JSON.stringify(FONT),__LOCALIZATION__:JSON.stringify(localization),__ANIMATIONS__:JSON.stringify(manifest.animation_sequences),__DESIGN__:JSON.stringify(design)}))html=html.replace(token,value);fs.writeFileSync(path.join(OUT,'review.html'),html);}
async function validate(){const results=[];for(const [name,s] of Object.entries(manifest.scenes)){results.push({name,tiles:s.tile_count,max_tiles:128,palettes:s.palette_count,max_palettes:8,objects:s.oam_objects,max_objects:40,objects_per_line:s.max_objects_per_scanline,max_objects_per_line:10,pass:s.tile_count<=128&&s.palette_count<=8&&s.oam_objects<=40&&s.max_objects_per_scanline<=10});}for(const [name,s] of Object.entries(manifest.screens))results.push({name,tiles:s.tile_count,max_tiles:256,palettes:s.palette_count,max_palettes:8,pass:s.tile_count<=256&&s.palette_count<=8});for(const s of spriteFrames){let opaque=0,red=0;const pal=spritePalettes[s.palette];for(let i=0;i<256;i++){if(![0,255].includes(s.frame.p[i*4+3]))throw Error('Non-binary alpha');if(s.frame.p[i*4+3]){opaque++;if(nearest(...s.frame.p.subarray(i*4,i*4+3),pal,1)[1]!==0)throw Error('Non-palette sprite pixel');if(s.palette===0&&nearest(...s.frame.p.subarray(i*4,i*4+3),pal,1)[0]===3)red++;}}if(opaque===0||(s.sheet==='dog'&&red===0))throw Error('Empty or missing bandana: '+s.name);}
  for(const [id,entry] of Object.entries(localization.strings))for(const lang of Object.keys(localization.languages)){if(typeof entry[lang]!=='string'||!entry[lang])throw Error('Missing '+lang+' translation: '+id);for(const ch of entry[lang].normalize('NFC'))if(!FONT[ch])throw Error('Missing localized glyph '+ch+' in '+id);}
  if(manifest.screens.language_select.start_game_visible||!manifest.screens.language_select.requires_confirmation||!manifest.screens.title.available_only_after_language_confirmation)throw Error('Language-first design contract violated');
  results.push({name:'localization_resources',languages:Object.keys(localization.languages),string_ids:Object.keys(localization.strings).length,missing_translations:0,missing_glyphs:0,pass:true},{name:'language_first_design',first_screen:'language_select',start_game_visible_before_confirmation:false,pass:true});
  const flag=spriteFrames.find(s=>s.name==='checkpoint'),flagCounts=[0,0,0,0];for(let i=0;i<256;i++)if(flag.frame.p[i*4+3])flagCounts[nearest(...flag.frame.p.subarray(i*4,i*4+3),spritePalettes[6],1)[0]]++;if(flagCounts.slice(1).some(n=>n===0))throw Error('Checkpoint must retain blue, red, white');results.push({name:'chilean_checkpoint_palette',blue_pixels:flagCounts[1],red_pixels:flagCounts[2],white_pixels:flagCounts[3],opaque_colors:3,pass:true});
  const spriteBytes=fs.readFileSync(path.join(OUT,'gbdk','sprites.2bpp'));let spriteErrors=0;for(let f=0;f<spriteFrames.length;f++){const s=spriteFrames[f];for(let y=0;y<16;y++)for(let x=0;x<16;x++){const tile=manifest.sprite_frames[f].tile_ids[(y>=8?2:0)+(x>=8?1:0)],off=tile*16+(y%8)*2,bit=7-x%8,idx=((spriteBytes[off]>>bit)&1)|(((spriteBytes[off+1]>>bit)&1)<<1),p=(y*16+x)*4;if(idx===0){if(s.frame.p[p+3]!==0)spriteErrors++;}else if(s.frame.p[p+3]!==255||spritePalettes[s.palette][idx].some((v,k)=>v!==s.frame.p[p+k]))spriteErrors++;}}if(spriteErrors)throw Error('Sprite 2bpp mismatch: '+spriteErrors);results.push({name:'sprites_2bpp_roundtrip',frames:spriteFrames.length,mismatched_pixels:spriteErrors,pass:true});
  // Decode every exported background and compare it pixel-for-pixel to the native PNG.
  const bgChecks=[...Object.entries(manifest.scenes),...Object.entries(manifest.screens),...Object.entries(manifest.backdrops),['title_blink',{...manifest.screens.title,...manifest.screens.title.alternate_maps.blink,path:'native/title-screen-blink.png'}],...Object.entries(manifest.screens.world_map.alternate_maps).map(([state,alt])=>['world_map_'+state,{...manifest.screens.world_map,...alt,path:'native/world_map-'+state.slice(-1)+'-screen.png'}])];
  for(const [name,s] of bgChecks){const file=s.background||s.path,bytes=fs.readFileSync(path.join(OUT,'gbdk',s.data_file?s.data_file+'.2bpp':name.startsWith('title')?'title_screen.2bpp':name in manifest.scenes?name+'_scene.2bpp':name+'_screen.2bpp')),png=await sharp(path.join(OUT,file)).ensureAlpha().raw().toBuffer();const paletteNames=s.palettes;let errors=0;for(let y=0;y<s.dimensions[1]*8;y++)for(let x=0;x<s.dimensions[0]*8;x++){const t=Math.floor(y/8)*s.dimensions[0]+Math.floor(x/8),offset=s.map[t]*16+(y%8)*2,bit=7-x%8,idx=((bytes[offset]>>bit)&1)|(((bytes[offset+1]>>bit)&1)<<1),rgb=colors[paletteNames[s.attributes[t]&7]][idx],p=(y*s.dimensions[0]*8+x)*4;if(rgb.some((v,k)=>v!==png[p+k]))errors++;}if(errors)throw Error(name+' 2bpp round-trip mismatch: '+errors);if(s.tile_count>256||s.palette_count>8)throw Error(name+' scenery budget exceeded');results.push({name:name+'_2bpp_roundtrip',tiles:s.tile_count,palettes:s.palette_count,mismatched_pixels:errors,pass:true});}
  const spriteTileCount=fs.statSync(path.join(OUT,'gbdk','sprites.2bpp')).size/16;if(spriteTileCount>128)throw Error('Sprite tile budget exceeded');
  for(const [name,s] of Object.entries(manifest.layered_scenes)){
    const banks=s.tile_banks.map(file=>fs.readFileSync(path.join(OUT,'gbdk',file+'.2bpp'))),png=await sharp(path.join(OUT,s.path)).ensureAlpha().raw().toBuffer();let errors=0;
    for(let y=0;y<144;y++)for(let x=0;x<160;x++){const t=Math.floor(y/8)*20+Math.floor(x/8),attr=s.attributes[t],bytes=banks[(attr>>3)&1],off=s.map[t]*16+y%8*2,bit=7-x%8,idx=(bytes[off]>>bit&1)|(bytes[off+1]>>bit&1)<<1,p=(y*160+x)*4;
      if(colors[s.palettes[attr&7]][idx].some((v,k)=>v!==png[p+k]))errors++;
    }
    if(errors)throw Error('Layered bank roundtrip mismatch '+name);
    if(manifest.backdrops[name+'_composite'].palettes.join()!==s.palettes.join())throw Error('Layered palette mismatch');
    results.push({name:name+'_mixed_vram_banks',mismatched_pixels:errors,background_palettes:s.palettes.length,pass:true});
  }
  const detail=await sharp(path.join(OUT,'native/dog-detail-24.png')).ensureAlpha().raw().toBuffer(),detailBytes=fs.readFileSync(path.join(OUT,'gbdk/dog_detail_24.2bpp'));let detailErrors=0;
  for(let f=0;f<16;f++)for(let y=0;y<24;y++)for(let x=0;x<24;x++){const tile=f*9+Math.floor(y/8)*3+Math.floor(x/8),off=tile*16+y%8*2,bit=7-x%8,idx=(detailBytes[off]>>bit&1)|(detailBytes[off+1]>>bit&1)<<1,p=((Math.floor(f/4)*24+y)*96+f%4*24+x)*4;
    if(idx===0?detail[p+3]!==0:detail[p+3]!==255||colors.dog[idx].some((v,k)=>v!==detail[p+k]))detailErrors++;
  }
  if(detailErrors)throw Error('24-pixel alternative roundtrip mismatch');
  results.push({name:'dog_24_optional_rom_roundtrip',rom_tiles:144,resident_tiles_with_streaming:9,objects_per_pose:9,mismatched_pixels:detailErrors,pass:true});
  const distinctRun=new Set(manifest.animation_sequences.run.map(i=>spriteFrames[i].frame.p.toString('hex'))).size;
  if(distinctRun!==8)throw Error('Run cycle must contain eight distinct native frames');
  results.push({name:'eight_distinct_run_frames',distinct_frames:distinctRun,pass:true});
  manifest.checks=results;fs.writeFileSync(path.join(OUT,'validation.json'),JSON.stringify({passed:results.every(r=>r.pass),sprite_frames:spriteFrames.length,sprite_tiles:spriteTileCount,max_sprite_tiles:128,checks:results},null,2));}
async function main(){const dog=await sprites('dog',16,dogNames,Array(16).fill(0),[0,.25,.5,.75,1]);const actors=await sprites('actors',16,actorNames,actorPals,[0,390/1254,735/1254,990/1254,1]);const bytes=[],palids=[],frameids=[],tileLookup=new Map();const addSpriteTile=data=>{const key=Buffer.from(data).toString('hex');if(!tileLookup.has(key)){tileLookup.set(key,bytes.length/16);bytes.push(...data);}return tileLookup.get(key);};for(let i=0;i<spriteFrames.length;i++){const s=spriteFrames[i];for(const [x,y] of [[0,0],[8,0],[0,8],[8,8]])frameids.push(addSpriteTile(encodeTile(s.frame,x,y,spritePalettes[s.palette],true)));palids.push(s.palette);}
  const icons=canvas(24,8),iconTileIds=[],iconPalIds=[];manifest.icons=[];for(const [j,index] of [8,9,11].entries()){const icon=crop(actors[index],4,4,8,8),pal=actorPals[index],tile=addSpriteTile(encodeTile(icon,0,0,spritePalettes[pal],true));blit(icons,icon,j*8,0);iconTileIds.push(tile);iconPalIds.push(pal);manifest.icons.push({name:actorNames[index],tile_id:tile,palette:pal,size:[8,8],sheet:'native/icons.png',cell:j,objects:1});}await save(icons,'native/icons.png');await save(icons,'previews/icons-8x.png',8);
  writeC('sprites',{tiles:bytes,frame_tiles:frameids,frame_palettes:palids,icon_tiles:iconTileIds,icon_palettes:iconPalIds,palettes:paletteWords(spritePalettes)});fs.writeFileSync(path.join(OUT,'gbdk','sprites.2bpp'),Buffer.from(bytes));manifest.sprite_frames=spriteFrames.map((s,i)=>({name:s.name,tile_ids:frameids.slice(i*4,i*4+4),palette:s.palette,quadrants:['top_left','top_right','bottom_left','bottom_right'],offsets:[[0,0],[8,0],[0,8],[8,8]]}));
  const f=await font();for(const n of Object.keys(themeDefs))await theme(n);const t=await title();await languageSelector(actors);await stagePreviews(dog,actors,f);await menus(t,actors);
  await require('./expand-art.cjs')({fs,path,OUT,sharp,manifest,themeDefs,themeAssets,colors,localization,ui,canvas,rgba,rect,blit,crop,resize,load,bounds,save,text,centered,quantizedScene,packBackground,spriteFrames,sampleSprite,encodeTile,writeC,paletteWords});
  manifest.localization={languages:localization.languages,preview_language:localization.preview_language,artwork_language:localization.world_artwork_language,string_table:'localization.json',startup_sequence:['language_select','title','controls','world_map','playing']};gif(manifest.animation_sequences.run.map(i=>dog[i]),'dog-run.gif',colors.dog,10,8);gif([dog[8],dog[9]],'dog-bark.gif',colors.dog,10,14);await overview(t);await validate();reviewHTML();fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({sprite_frames:spriteFrames.length,sprite_tiles:bytes.length/16,scenes:Object.fromEntries(Object.entries(manifest.scenes).map(([n,s])=>[n,{tiles:s.tile_count,palettes:s.palette_count,objects:s.oam_objects,peak_scanline:s.max_objects_per_scanline}])),screens:Object.fromEntries(Object.entries(manifest.screens).map(([n,s])=>[n,s.tile_count])),validation:'passed'},null,2));}
main().catch(e=>{console.error(e);process.exitCode=1;});
