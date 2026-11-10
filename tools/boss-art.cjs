/* Hand-authored native 2bpp boss art; no paid image service or runtime bitmap. */
module.exports=({encode,cArray,vehicle})=>{
 const obj=[],previews=[],labels={};
 const canvas=(w,h,fill=0)=>({w,h,p:Array(w*h).fill(fill)});
 const rect=(a,x,y,w,h,c)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(xx>=0&&xx<a.w&&yy>=0&&yy<a.h)a.p[yy*a.w+xx]=c;};
 const tiles=a=>{const bytes=[];for(let y=0;y<a.h;y+=8)for(let x=0;x<a.w;x+=8)bytes.push(...encode(Array.from({length:64},(_,n)=>a.p[(y+(n>>3))*a.w+x+n%8])));return bytes;};
 const add=(label,a)=>{if(label)labels[label]=17+obj.length/16;obj.push(...tiles(a));};
 const officer=[];
 for(let frame=0;frame<2;frame++){
  const a=canvas(24,24);
  rect(a,7,1,12,4,1);rect(a,8,2,10,2,2);rect(a,6,4,15,2,1);
  rect(a,10,6,8,4,3);rect(a,13,6,5,1,1);rect(a,16,8,2,1,1);
  rect(a,7,10,12,9,1);rect(a,8,10,10,7,2);rect(a,14,10,1,6,1);
  rect(a,3,11,5,4,1);rect(a,4,12,4,2,2);rect(a,19,11,3,6,1);rect(a,20,12,1,3,2);
  rect(a,8,17,11,2,1);rect(a,15,17,2,1,3);
  rect(a,8-frame,19,4,4,1);rect(a,15+frame,19,4,4,1);
  rect(a,7-frame,22,6,2,1);rect(a,15+frame,22,6,2,1);
  add(frame?null:'OFFICER',a);officer.push(a);
 }
 previews.push({name:'boss-net-officer',w:48,h:24,p:Array.from({length:48*24},(_,n)=>officer[n%48<24?0:1].p[(n/48|0)*24+n%24])});
 const raised=canvas(16,16);
 for(let y=0;y<13;y++)for(let x=1;x<14;x++){
  const edge=x===1||x===13||y===0||y===12;
  raised.p[y*16+x]=edge?2:(x+y)%3===0?3:0;
 }
 rect(raised,11,12,2,4,2);add('NET_RAISED',raised);
 const swing=canvas(24,16);
 for(let y=1;y<15;y++)for(let x=0;x<20;x++){
  const edge=x===0||x===19||y===1||y===14;
  swing.p[y*24+x]=edge?2:(x+y)%4===0?3:0;
 }
 rect(swing,20,7,4,2,2);add('NET_SWING',swing);
 previews.push({...swing,name:'boss-net-swing',palette:'metal'});
 for(let frame=0;frame<3;frame++){
  const a=canvas(16,8);rect(a,11,5,4,3,1);rect(a,10,4,6,2,2);
  rect(a,1,frame===2?0:2,13,4,1);rect(a,2,frame===2?1:3,11,2,3);
  rect(a,0,frame===2?0:1,3,6,1);rect(a,0,frame===2?1:2,2,3,2);
  add(frame?null:'CANNON',a);
 }
 for(let frame=0;frame<4;frame++){
  const a=canvas(8,8);
  for(let y=0;y<8;y++)for(let x=0;x<8;x++)if(Math.abs(y-x)<2 || (x+y+frame)%7===0)a.p[y*8+x]=(x+y+frame)%3?2:3;
  add(frame?null:'WATER',a);
 }
 for(let hp=0;hp<=10;hp++){
  const a=canvas(24,8);
  for(let y=0;y<8;y++)for(let x=0;x<24;x++){
   const border=y===0||y===7||x===0||x===23;
   a.p[y*24+x]=border?1:y>=2&&y<=5&&x>=2&&x<22&&x-2<hp*2?(y===2?3:2):0;
  }
  add(hp===0?'METER':null,a);
 }
 const warning=canvas(8,8);rect(warning,3,0,2,5,2);rect(warning,3,6,2,2,2);add('WARNING',warning);
 const hurt=canvas(8,8);
 ['01100110','12211221','12212221','01221210','00122100','00011000','00000000','00000000'].forEach((s,y)=>[...s].forEach((c,x)=>hurt.p[y*8+x]=+c));add('HURT',hurt);
 add('TRUCK',vehicle);previews.push({...vehicle,name:'boss-water-cannon'});
 for(let frame=0;frame<2;frame++){
  const a=canvas(16,8);
  for(let y=0;y<8;y++)for(let x=0;x<16;x++){
   const splash=y>=5&&x>0&&x<15 || y===4&&(x<5||x>10) || y===3&&(x===2+frame||x===13-frame) || y===1&&(x===4-frame||x===11+frame);
   if(splash)a.p[y*16+x]=(x+y+frame)%3?2:3;
  }
  add(frame?null:'SPLASH',a);
 }
 if(17+obj.length/16>128)throw Error('Boss OBJ patterns overlap signed BG storage');
 const header=Object.entries(labels).map(([n,id])=>`#define BOSS_${n}_TILE ${id}u\n`).join('')+`#define BOSS_OBJ_TILE_COUNT ${obj.length/16}u\nextern const uint8_t boss_obj_tiles[${obj.length}];\nextern const uint16_t boss_normal_palette[4],boss_hurt_palette[4],boss_water_palette[4],boss_default_water_palette[4];\n`;
 const source='#pragma bank 15\n#include "game_assets.h"\n'+cArray('boss_obj_tiles',obj)+cArray('boss_normal_palette',[0x5f9e,0x1483,0x62b3,0x213d],'uint16_t')+cArray('boss_hurt_palette',[0x5f9e,0x1483,0x213d,0x213d],'uint16_t')+cArray('boss_water_palette',[0x5f9e,0x5145,0x7f65,0x73be],'uint16_t')+cArray('boss_default_water_palette',[0x5f9e,0x5145,0x213d,0x73be],'uint16_t');
 return {header,source,previews};
};
