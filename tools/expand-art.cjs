/* Scenic art, Santiago route and finale. No gameplay or ROM execution. */
module.exports = async function expand(a) {
  const {fs,path,OUT,sharp,manifest,themeDefs,themeAssets,colors,localization,ui,
    canvas,rgba,rect,blit,crop,resize,load,bounds,save,text,centered,
    quantizedScene,packBackground,spriteFrames,sampleSprite,encodeTile,writeC,paletteWords}=a;
  function flagNearby(src,x,y){
    for(let yy=y;yy<Math.min(src.h,y+8);yy++)for(let xx=x;xx<Math.min(src.w,x+8);xx++){
      const i=(yy*src.w+xx)*4,r=src.p[i],g=src.p[i+1],b=src.p[i+2];
      if(r>180&&g<130&&b<130&&r>g*1.5&&r>b*1.5)return true;
    }return false;
  }
  function scenic(src,pals){return quantizedScene(src,pals,()=>null,(p,x,y)=>pals[p]!=='chile_bg'||flagNearby(src,x,y));}
  const names=Object.keys(themeDefs);
  manifest.layered_scenes={};
  const bands=[
    {name:'sky',y:0,height:32,scroll_divisor:8},
    {name:'andes',y:32,height:32,scroll_divisor:4},
    {name:'city',y:64,height:32,scroll_divisor:1}
  ];
  const pics={};
  for(const name of names) {
    const d=themeDefs[name],src=await resize(await load(name+'-depth'),160,96);
    const q=scenic(src,d.paletteNames);
    const packed=packBackground(name+'_depth',q.image,q.attrs.map(p=>p|8),q.palettes);
    // packBackground encodes using palette bits only; attributes retain CGB bank bit 3.
    pics[name]=q.image;
    await save(q.image,'native/'+name+'-depth.png');
    await save(q.image,'previews/'+name+'-depth-4x.png',4);
    for(const band of bands)await save(crop(q.image,0,band.y,160,band.height),'native/'+name+'-'+band.name+'.png');
    manifest.backdrops[name]={path:'native/'+name+'-depth.png',data_file:name+'_depth',
      ...packed,palettes:d.paletteNames,tile_vram_bank:1,bands,
      attribute_bank_bit:8,solid:false};
    const {data}=await sharp(path.join(OUT,manifest.scenes[name].background)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const bg={w:160,h:144,p:data},layered=canvas(160,144);
    blit(layered,q.image,0,0);blit(layered,crop(bg,0,96,160,48),0,96);
    const props={alameda:[[6,48,80],[7,64,80]],campus:[[6,48,80],[7,64,80],[9,64,96]],plaza:[[6,64,88],[6,80,88]],mapocho:[[8,16,88],[9,32,88],[4,48,64],[5,64,64],[7,80,80]],moneda:[[4,32,80],[5,48,80]]};
    // Bank-0 metatiles are opaque; bake their sky into bank-1 composite patterns
    // rather than pretending the GBC has a transparent second background plane.
    for(const [cell,x,y] of props[name])blit(layered,themeAssets[name].cells[cell],x,y);
    blit(layered,crop(bg,0,96,160,48),0,96);
    const composite=scenic(crop(layered,0,0,160,96),d.paletteNames);
    const cp=packBackground(name+'_depth_composite',composite.image,composite.attrs.map(p=>p|8),composite.palettes);
    manifest.backdrops[name+'_composite']={path:'native/'+name+'-depth-composite.png',data_file:name+'_depth_composite',...cp,palettes:d.paletteNames,tile_vram_bank:1,solid:false,bands};
    await save(composite.image,'native/'+name+'-depth-composite.png');
    blit(layered,composite.image,0,0);
    await save(layered,'native/'+name+'-layered-background.png');
    const fullMap=[...cp.map,...manifest.scenes[name].map.slice(240)];
    const fullAttrs=[...cp.attributes,...manifest.scenes[name].attributes.slice(240)];
    writeC(name+'_layered',{map:fullMap,attributes:fullAttrs,palettes:paletteWords(composite.palettes)});
    manifest.layered_scenes[name]={path:'native/'+name+'-layered-background.png',map:fullMap,attributes:fullAttrs,palettes:d.paletteNames,
      dimensions:[20,18],tile_banks:[name+'_scene',name+'_depth_composite'],maps_file:name+'_layered',
      sprite_objects:manifest.scenes[name].oam_objects,max_objects_per_scanline:manifest.scenes[name].max_objects_per_scanline};
    for(let i=0;i<manifest.scenes[name].placements.length;i++){
      const p=manifest.scenes[name].placements[i];
      let frame=i===0?spriteFrames[2].frame:i===1?spriteFrames.find(s=>s.name=== (name==='campus'?'officer_climb':name==='plaza'?'officer_stunned':'officer_patrol_0')).frame:i===2?spriteFrames.find(s=>s.name==='student_red_idle').frame:i===3?spriteFrames.find(s=>s.name==='student_teal_idle').frame:p.objects===1?crop(spriteFrames.find(s=>s.name==='empanada').frame,4,4,8,8):spriteFrames.find(s=>s.name==='bark_small').frame;
      blit(layered,frame,p.x,p.y);
    }
    await save(layered,'native/'+name+'-layered-mockup.png');
    await save(layered,'previews/'+name+'-layered-mockup-4x.png',4);
  }
  const route=['alameda','campus','plaza','mapocho','moneda'];
  const dogSrc=await load('dog-v2'),dogDetail=canvas(96,96),detailBytes=[];
  for(let i=0;i<16;i++){
    const x=Math.round(i%4*dogSrc.w/4),x2=Math.round((i%4+1)*dogSrc.w/4),y=Math.round(Math.floor(i/4)*dogSrc.h/4),y2=Math.round((Math.floor(i/4)+1)*dogSrc.h/4);
    const cell=crop(dogSrc,x,y,x2-x,y2-y),body=crop(cell,...bounds(cell)),scale=Math.min(23/body.w,23/body.h),w=Math.round(body.w*scale),h=Math.round(body.h*scale),frame=canvas(24,24);
    blit(frame,sampleSprite(body,w,h,colors.dog,0),Math.floor((24-w)/2),24-h);
    blit(dogDetail,frame,i%4*24,Math.floor(i/4)*24);
    for(let yy=0;yy<24;yy+=8)for(let xx=0;xx<24;xx+=8)detailBytes.push(...encodeTile(frame,xx,yy,colors.dog,true));
  }
  await save(dogDetail,'native/dog-detail-24.png');await save(dogDetail,'previews/dog-detail-24-8x.png',8);
  writeC('dog_detail_24',{tiles:detailBytes,palettes:paletteWords([colors.dog])});
  fs.writeFileSync(path.join(OUT,'gbdk','dog_detail_24.2bpp'),Buffer.from(detailBytes));
  manifest.sheets.dog_detail_24={path:'native/dog-detail-24.png',width:96,height:96,cell:[24,24],optional:true,objects_per_pose:9,frames:manifest.sheets.dog.frames,
    frame_bytes:144,rom_tiles:144,resident_tiles_with_streaming:9,rendering:'Alternative requiring frame streaming and revised OAM/collision budgets; default remains 16x16'};
  const nodes=[[44,112],[24,76],[124,84],[104,48],[72,80]];
  const segments=[[[44,112],[24,112],[24,76]],[[24,76],[44,76],[44,120],[124,120],[124,84]],[[124,84],[136,84],[136,48],[104,48]],[[104,48],[88,48],[88,80],[72,80]]];
  manifest.world_map={stage_order:route,nodes:route.map((id,i)=>({id,x:nodes[i][0],y:nodes[i][1],text_id:'stage_'+id})),segments,
    initial_unlocked:1,unlock_rule:'Clearing stage i unlocks only i+1; retries and replays never relock nodes.',
    geography:'Schematic Santiago: campus west, river north of Alameda, plaza east, palace central south of river.',
    revisits:true,progress_persistence:'session only'};
  function line(c,p0,p1,col,dotted=false){
    const len=Math.max(Math.abs(p1[0]-p0[0]),Math.abs(p1[1]-p0[1]));
    for(let i=0;i<=len;i++)if(!dotted||i%6<3){
      const x=Math.round(p0[0]+(p1[0]-p0[0])*i/(len||1)),y=Math.round(p0[1]+(p1[1]-p0[1])*i/(len||1));rect(c,x-1,y-1,3,3,col);
    }
  }
  const mapArt=await resize(await load('world-map'),144,80);
  // Load one unlock-state library at a time; the union needlessly exceeds VRAM.
  const maps=[];
  const mapPalettes=['warm','sea','stone','banner','chile_bg','mint','portrait','hud'];
  for(let unlocked=1;unlocked<=5;unlocked++){
    const c=canvas(160,144,rgba(colors.warm[0]));blit(c,mapArt,8,24);
    for(let s=0;s<segments.length;s++)for(let j=1;j<segments[s].length;j++){
      line(c,segments[s][j-1],segments[s][j],rgba(colors.warm[0]));
      line(c,segments[s][j-1],segments[s][j],rgba(s<unlocked-1?colors.sea[2]:colors.stone[2]),s>=unlocked-1);
    }
    nodes.forEach(([x,y],i)=>{
      rect(c,x-5,y-5,11,11,rgba(colors.dog[1]));
      rect(c,x-4,y-4,9,9,rgba(i<unlocked?colors.warm[0]:colors.stone[1]));
      if(i<unlocked)text(c,String(i+1),x-2,y-3,rgba(i===unlocked-1?colors.dog[3]:colors.sea[3]));
      else{rect(c,x-2,y-2,5,4,rgba(colors.stone[3]));rect(c,x-1,y-4,3,3,rgba(colors.stone[3]));rect(c,x,y-3,1,2,rgba(colors.stone[1]));}
    });
    rect(c,0,0,160,16,rgba(colors.hud[0]));centered(c,ui('world_map'),4,rgba(colors.hud[1]));
    centered(c,ui('stage_'+route[unlocked-1])+' / '+ui('choose_level'),132,rgba(colors.hud[1]));
    // Long translations are split into the header and footer in the browser UI.
    rect(c,0,128,160,16,rgba(colors.hud[0]));centered(c,ui('stage_'+route[unlocked-1]),132,rgba(colors.hud[1]));
    const q=quantizedScene(c,mapPalettes);maps.push(q);
    await save(q.image,'native/world_map-'+unlocked+'-screen.png');
    await save(q.image,'previews/world_map-'+unlocked+'-screen-4x.png',4);
    const name=unlocked===1?'world_map':'world_map_'+unlocked;
    const packed=packBackground(name+'_screen',q.image,q.attrs,q.palettes);
    manifest.screens[name]={path:'native/world_map-'+unlocked+'-screen.png',data_file:name+'_screen',...packed,palettes:mapPalettes,preview_language:localization.preview_language,text_ids:['world_map','stage_'+route[unlocked-1]],unlocked};
  }
  manifest.screens.world_map.states=maps.map((_,i)=>({unlocked:i+1,path:'native/world_map-'+(i+1)+'-screen.png',data_file:(i===0?'world_map':'world_map_'+(i+1))+'_screen'}));
  manifest.world_map.current_node_marker={sprite_frame:'celebrate',objects:4,anchor:'node center above marker'};

  // Finale figures are larger BG composites, loaded only during this scene.
  // They are deliberately not placed in the gameplay three-color OBJ bank.
  const src=await load('ceremony-actors'),sheet=canvas(96,48),figures=[];
  const figureNames=['president_stand','president_award_with_dog','president_medal','dog_medal','student_red_run_0','student_red_run_1','student_teal_run_0','student_teal_run_1'];
  const allColors=[...colors.dog.slice(1),...colors.officer.slice(1),...colors.flag.slice(1),...colors.teal.slice(1)];
  for(let i=0;i<8;i++){
    const x=Math.round(i%4*src.w/4),x2=Math.round((i%4+1)*src.w/4),y=Math.round(Math.floor(i/4)*src.h/2),y2=Math.round((Math.floor(i/4)+1)*src.h/2);
    const cell=crop(src,x,y,x2-x,y2-y),body=crop(cell,...bounds(cell)),scale=Math.min(23/body.w,23/body.h),w=Math.round(body.w*scale),h=Math.round(body.h*scale),small=await resize(body,w,h),frame=canvas(24,24);
    for(let p=0;p<w*h;p++){
      if(small.p[p*4+3]<128){small.p[p*4+3]=0;continue;}
      let best=allColors[0],err=Infinity;for(const col of allColors){const e=col.reduce((n,v,k)=>n+(v-small.p[p*4+k])**2,0);if(e<err){best=col;err=e;}}
      small.p.set([...best,255],p*4);
    }
    blit(frame,small,Math.floor((24-w)/2),24-h);blit(sheet,frame,i%4*24,Math.floor(i/4)*24);figures.push(frame);
  }
  await save(sheet,'native/ceremony-actors.png');await save(sheet,'previews/ceremony-actors-6x.png',6);
  manifest.sheets.ceremony={path:'native/ceremony-actors.png',width:96,height:48,cell:[24,24],rendering:'Background-composite source, not gameplay OBJ frames',frames:figureNames};
  const flagSrc=await load('presidential-standard'),flagBody=crop(flagSrc,...bounds(flagSrc)),flag=await resize(flagBody,32,24);
  for(let p=0;p<32*24;p++)flag.p[p*4+3]=flag.p[p*4+3]>=128?255:0;
  const endingPals=['warm','stone','sea','title_ink','chile_bg','heraldry','medal','hud'];
  const flagBackdrop=canvas(32,24,rgba(colors.warm[0]));blit(flagBackdrop,flag,0,0);
  const fq=quantizedScene(flagBackdrop,endingPals),fp=packBackground('presidential_standard',fq.image,fq.attrs,fq.palettes);
  await save(fq.image,'native/presidential-standard.png');await save(fq.image,'previews/presidential-standard-8x.png',8);
  manifest.backdrops.presidential_standard={path:'native/presidential-standard.png',data_file:'presidential_standard',...fp,palettes:endingPals,tile_vram_bank:0,solid:false};
  const endingIds=['ending_rescue','ending_medal','ending_flag'];
  for(let i=0;i<3;i++){
    const c=canvas(160,144,rgba(colors.warm[0]));blit(c,pics.moneda,0,16);
    rect(c,0,16,160,32,rgba(colors.warm[0]));
    rect(c,0,112,160,16,rgba(colors.stone[1]));rect(c,0,112,160,2,rgba(colors.warm[0]));
    rect(c,0,0,160,16,rgba(colors.hud[0]));rect(c,0,128,160,16,rgba(colors.hud[0]));
    centered(c,ui(endingIds[i]),4,rgba(colors.hud[1]));
    centered(c,ui(i===2?'ending_complete':'president_thanks'),132,rgba(colors.hud[1]));
    if(i===0){blit(c,figures[4],20,88);blit(c,figures[6],44,88);blit(c,spriteFrames[2].frame,74,96);blit(c,figures[0],112,88);}
    if(i===1){blit(c,figures[4],16,88);blit(c,figures[6],40,88);blit(c,figures[1],84,88);}
    if(i===2){blit(c,figures[4],16,88);blit(c,figures[6],40,88);blit(c,figures[3],72,88);blit(c,figures[0],108,88);rect(c,80,26,1,44,rgba(colors.stone[3]));blit(c,fq.image,81,26);}
    const q=quantizedScene(c,endingPals,(x,y)=>i===2&&(x===80||x===88)&&(y===96||y===104)?6:null,(p,x,y)=>!['chile_bg','heraldry'].includes(endingPals[p])||flagNearby(c,x,y)||(i===2&&x>=80&&x<120&&y>=24&&y<56)),name='ceremony_'+['rescue','medal','flag'][i],p=packBackground(name+'_screen',q.image,q.attrs,q.palettes);
    await save(q.image,'native/'+name+'-screen.png');await save(q.image,'previews/'+name+'-screen-4x.png',4);
    manifest.screens[name]={path:'native/'+name+'-screen.png',data_file:name+'_screen',...p,palettes:endingPals,preview_language:localization.preview_language,text_ids:[endingIds[i],i===2?'ending_complete':'president_thanks']};
  }
  manifest.ending={trigger:'La Moneda rescue completed',sequence:['students_run_to_president','medal_award','presidential_standard_raised','the_end'],
    president:'Timeless fictional officeholder with tricolor sash',flag:'National design plus simplified central coat of arms',rendering:'BG tableaux; animation and timed tile updates deferred to mechanics'};
  const overview=canvas(480,432,rgba(colors.hud[0]));
  for(let i=0;i<5;i++){const {data}=await sharp(path.join(OUT,'native',names[i]+'-layered-mockup.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});blit(overview,{w:160,h:144,p:data},i%3*160,Math.floor(i/3)*144);}
  blit(overview,maps[4].image,320,144);
  for(let i=0;i<3;i++){const name='ceremony_'+['rescue','medal','flag'][i]+'-screen.png';const {data}=await sharp(path.join(OUT,'native',name)).ensureAlpha().raw().toBuffer({resolveWithObject:true});blit(overview,{w:160,h:144,p:data},i*160,288);}
  await save(overview,'previews/expanded-overview.png',3);
};
