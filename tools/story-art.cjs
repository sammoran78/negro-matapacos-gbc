/* Compile the title-inspired cutscene paintings into native GBC backgrounds.
 * Illustration sources are retained in assets/source; this build is offline.
 * Only the empty speech balloon is drawn here. The ROM localizes its text. */
const path=require('path');
module.exports=async ({encode,cArray})=>{
 let sharp;try{sharp=require('sharp');}catch{sharp=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));}
 const root=path.resolve(__dirname,'..'),paper=[31,29,24],ink=[3,4,5],red=[29,7,7];
 // Seven illustration palettes plus the bank-0 font's cream/navy palette.
 // Fur, red fabric, warm stone, sky, distant city and flags retain their own
 // shades instead of forcing the whole painting through the sprite palette.
 const basePalettes=[
  [ink,[7,9,12],[12,15,18],paper],
  [ink,[19,4,6],red,[12,15,18]],
  [paper,[29,22,14],[20,14,10],ink],
  [paper,[31,23,16],[28,18,14],[25,16,14]],
  [[5,10,12],[9,15,17],[14,21,20],[21,24,20]],
  [[30,26,19],[25,20,15],[17,16,14],[6,11,14]],
  [[31,30,29],[5,10,20],red,ink],
  [paper,ink,red,[27,19,12]]
 ];
 const scenes=[],names=['campus','plaza','mapocho','moneda','medal'];
 for(let scene=0;scene<names.length;scene++){
  const name=scene===4?'ending_final':'story_'+names[scene],palettes=basePalettes.map(p=>p.map(c=>c.slice()));
  // The palace shares the warm masonry palette; this slot shades olive armor.
  if(scene===3)palettes[5]=[[4,7,5],[8,10,7],[14,16,10],[30,26,19]];
  // Award, red bandana and bright ribbon share a gold/red/ink palette.
  if(scene===4){
   palettes[5]=[red,[20,12,3],[31,23,3],[31,31,22]];
   palettes[7]=[paper,ink,[12,15,18],[22,14,8]];
  }
  const matchingPalettes=palettes.map(p=>p.map(c=>c.slice()));
  // Match the source's dark fur, then give the native highlights the same
  // stronger contrast as the approved title's portrait/bandana palettes.
  palettes[0][1]=[11,13,16];palettes[0][2]=[19,21,24];palettes[1][3]=[19,21,24];
  if(scene===4)palettes[7][2]=[19,21,24];
  const data=await sharp(path.join(root,'assets/source','story-'+names[scene]+'.png')).resize(160,96,{fit:'fill',kernel:'lanczos3'}).removeAlpha().raw().toBuffer();
  const pixels=Array.from({length:160*144},()=>paper);
  for(let y=0;y<96;y++)for(let x=0;x<160;x++){
   const p=(y*160+x)*3;pixels[(y+8)*160+x]=[data[p],data[p+1],data[p+2]].map(v=>Math.round(v*31/255));
  }
  const dot=(x,y,c)=>{if(x>=0&&x<160&&y>=0&&y<144)pixels[y*160+x]=c;};
  const rect=(x,y,w,h,c)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)dot(xx,yy,c);};
  // Native comic balloon: the student speaks; 18x3 bank-0 font tiles fit in
  // its interior. Rows 0 and 17 are reserved for location and continue text.
  rect(3,100,154,34,ink);rect(5,102,150,30,paper);
  for(const [x,y] of [[3,100],[155,100],[3,132],[155,132]])rect(x,y,2,2,paper);
  const tail=scene===4?112:76;
  for(let y=94;y<100;y++)for(let x=tail;x<=tail+(y-94);x++)dot(x,y,ink);
  for(let y=96;y<102;y++)for(let x=tail+1;x<tail+1+(y-95);x++)dot(x,y,paper);
  const patterns=[],map=[],attributes=[],output=[],lookup=new Map();
  const flipped=(p,h,v)=>Array.from({length:64},(_,n)=>p[(v?7-(n>>3):n>>3)*8+(h?7-n%8:n%8)]);
  for(let ty=0;ty<18;ty++)for(let tx=0;tx<20;tx++){
   const tile=Array.from({length:64},(_,n)=>pixels[(ty*8+(n>>3))*160+tx*8+n%8]);
   let best=Infinity,pal=0,indices;
   // National flags share red, blue and white within their native tile cells;
   // reserve their actual flag palette rather than recoloring blue as fur gray.
   const flagRegion=scene===0&&tx>=16&&tx<=17&&ty>=1&&ty<=3 || scene===1&&tx>=15&&ty>=1&&ty<=7 || scene===3&&tx<=1&&ty>=3&&ty<=6 || scene===4&&((tx>=1&&tx<=2&&ty>=4&&ty<=6)||(tx===10&&ty<=2)||(tx>=18&&ty>=5&&ty<=7));
   const flag=flagRegion&&tile.filter(c=>c[2]>8&&c[2]>c[1]*1.32&&c[0]<c[2]*.65).length>=6;
   for(let p=0;p<8;p++){
    if(flag&&p!==6)continue;
    if(scene===4&&tx===7&&ty===10&&p!==5)continue;
    if(scene===3&&p===5&&(tx<14||ty<4))continue;
    let error=0;
    const ix=tile.map(rgb=>{let d=Infinity,chosen=0;for(let c=0;c<4;c++){const e=rgb.reduce((v,x,k)=>v+(x-matchingPalettes[p][c][k])**2,0);if(e<d){d=e;chosen=c;}}error+=d;return chosen;});
    if(error<best){best=error;pal=p;indices=ix;}
   }
   const bytes=encode(indices),key=bytes.join(',');let entry=lookup.get(key);
   if(!entry){entry={id:patterns.length/16,flip:0};patterns.push(...bytes);
    // GBC tile flips reuse native patterns without altering the illustration.
    for(let v=0;v<2;v++)for(let h=0;h<2;h++){
     const k=encode(flipped(indices,h,v)).join(',');if(!lookup.has(k))lookup.set(k,{id:entry.id,flip:h*32+v*64});
    }
   }
   map.push(entry.id);attributes.push(pal|entry.flip);
   for(let n=0;n<64;n++)output[(ty*8+(n>>3))*160+tx*8+n%8]=palettes[pal][indices[n]];
  }
  // ScreenAsset.count is uint8_t. Its entire 256-pattern signed BG region is
  // separate from bank-1 OBJ; leave one pattern unused to avoid count wrap.
  if(patterns.length/16>255)throw Error(name+' exceeds the 255-pattern native screen budget: '+patterns.length/16);
  // Validate native previews against the encoded patterns and hardware flip
  // attributes, including reused blank/edge patterns with different palettes.
  for(let y=0;y<144;y++)for(let x=0;x<160;x++){
   const t=(y>>3)*20+(x>>3),attr=attributes[t],xx=attr&32?7-x%8:x%8,yy=attr&64?7-y%8:y%8;
   const offset=map[t]*16+yy*2,mask=1<<(7-xx),ix=(patterns[offset]&mask?1:0)+(patterns[offset+1]&mask?2:0);
   if(palettes[attr&7][ix].some((c,k)=>c!==output[y*160+x][k]))throw Error(name+' 2bpp/flip round-trip mismatch');
  }
  const bank=9+scene,paletteWords=palettes.flat().map(c=>c[0]|c[1]<<5|c[2]<<10);
  const source='#pragma bank '+bank+'\n#include "game_assets.h"\n'+cArray(name+'_tiles',patterns)+cArray(name+'_map',map)+cArray(name+'_attributes',attributes)+cArray(name+'_palettes',paletteWords,'uint16_t');
  scenes.push({name,bank,count:patterns.length/16,source,pixels:output,textId:name,sourceImage:'source/story-'+names[scene]+'.png',references:['title-chile.png','title-screen-4x.png']});
 }
 return {scenes:scenes.slice(0,4),ending:scenes[4],header:scenes.map(s=>`extern const uint8_t ${s.name}_tiles[${s.count*16}],${s.name}_map[360],${s.name}_attributes[360];\nextern const uint16_t ${s.name}_palettes[32];\n`).join('')};
};
