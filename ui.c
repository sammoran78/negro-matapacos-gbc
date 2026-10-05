/* Menus live in ROM bank 1. Asset-copy helpers restore this bank before return. */
#pragma bank 1
#include "game.h"
#include <gbdk/metasprites.h>
static const uint8_t node_x[5] = {44,24,124,104,72};
static const uint8_t node_y[5] = {112,76,84,48,80};
static const uint8_t stage_text[5] = {TXT_STAGE_ALAMEDA,TXT_STAGE_CAMPUS,TXT_STAGE_PLAZA,TXT_STAGE_MAPOCHO,TXT_STAGE_MONEDA};
static uint8_t line_tiles[20], line_attrs[20];
static void ui_line(uint8_t row, const uint8_t *text) {
 uint8_t i, n=0, start;
 while(text[n] && n<20u) ++n;
 start=(20u-n)>>1;
 for(i=0;i<20u;++i){line_tiles[i]=128u;line_attrs[i]=7u;}
 for(i=0;i<n;++i)line_tiles[start+i]=font_lut[text[i]];
 set_bkg_tiles(0,row,20,1,line_tiles);
 set_bkg_attributes(0,row,20,1,line_attrs);
}
static void line_id(uint8_t row,uint8_t id){fetch_text(id);ui_line(row,text_buffer);}
static void paragraph(uint8_t row,uint8_t id){
 uint8_t pos=0,start,end,n,i,part[21];fetch_text(id);
 while(text_buffer[pos] && row<18u){
  start=pos;end=pos;n=0;while(n<20u && text_buffer[end]){++end;++n;}
  if(text_buffer[end]){n=end;while(n>start && text_buffer[n]!=' ')--n;if(n>start)end=n;}
  n=(uint8_t)(end-start);for(i=0;i<n;++i)part[i]=text_buffer[start+i];part[i]=0;ui_line(row++,part);
  pos=end;if(text_buffer[pos]==' ')++pos;
 }
}
static void blank(uint8_t from,uint8_t to){uint8_t y;for(y=from;y<=to;++y)ui_line(y,(const uint8_t *)"");}
/* Prepare a centered two-line window popup without touching scrolling BG RAM. */
void format_dialog(uint8_t id,uint8_t *tiles) BANKED {
 uint8_t i,row,pos=0,n,split,start;fetch_text(id);
 for(i=0;i<40u;++i)tiles[i]=128u;
 for(row=0;row<2u && text_buffer[pos];++row){
  n=0;while(n<20u && text_buffer[pos+n])++n;
  if(text_buffer[pos+n]){split=n;while(split && text_buffer[pos+split]!=' ')--split;if(split)n=split;}
  start=(20u-n)>>1;for(i=0;i<n;++i)tiles[row*20u+start+i]=font_lut[text_buffer[pos+i]];
  pos+=n;if(text_buffer[pos]==' ')++pos;
 }
}
/* Pack active HUD slots first, leaving the full remainder for world actors. */
uint8_t draw_corner_hud(uint8_t empanada_tile) BANKED {
 uint8_t i,x=16,count=1;OAM_item_t *item;
 item=&shadow_OAM[0];item->x=12;item->y=22;item->tile=empanada_tile;item->prop=4;
 for(i=0;i<3u;++i){
  if(i==2u || hud_digits[0] || (i==1u && hud_digits[1])){
   item=&shadow_OAM[count++];item->x=x+8u;item->y=22;item->tile=117u+hud_digits[i];item->prop=5;x+=8u;
  }
 }
 for(i=0;i<3u;++i){item=&shadow_OAM[count++];item->x=132u+i*12u;item->y=22;item->tile=182u+(lives<=i);item->prop=4;}
 if(lives>3u){
  item=&shadow_OAM[count++];item->x=112;item->y=22;item->tile=127;item->prop=5;
  item=&shadow_OAM[count++];item->x=120;item->y=22;item->tile=117u+lives-3u;item->prop=5;
 }
 return count;
}
/* Bank-1 OBJ patterns are independent of the bank-1 signed BG library. */
void render_gate(int16_t x,uint8_t strength,uint8_t flash) BANKED {
 static const uint8_t gate_y[13]={0,8,24,32,40,48,48,56,56,64,64,72,72};
 static const uint8_t gate_x[13]={0,0,0,0,0,0,8,0,8,0,8,0,8};
 static const uint8_t gate_tile[13]={0,0,0,0,0,1,2,1,2,7,8,1,2};
 uint8_t i,y,band,left,tile,prop;OAM_item_t *item;
 // This route's gate remains at x >= 80 once visible (camera max 864).
 // Its rightmost piece can sit just offscreen without wrapping OAM x.
 if(x<0 || x>=160 || oam_next>25u)return;
 left=(uint8_t)x+8u;item=&shadow_OAM[oam_next];
 for(i=0;i<13u;++i){
  y=gate_y[i];band=y>>3;if(scanlines[band]>=10u)continue;
  if(++scanlines[band]>max_scanline_objects)max_scanline_objects=scanlines[band];
  item->x=left+gate_x[i];item->y=y+16;item->tile=gate_tile[i];item->prop=15;++item;++oam_next;
 }
 if(scanlines[2]>8u)return;
 scanlines[2]+=2u;if(scanlines[2]>max_scanline_objects)max_scanline_objects=scanlines[2];
 tile=9u+(3u-strength)*2u;prop=8u+(flash?5u:7u);
 item->x=left;item->y=32;item->tile=tile;item->prop=prop;++item;
 item->x=left+8u;item->y=32;item->tile=tile+1u;item->prop=prop;oam_next+=2u;
}
void reset_officers(void) BANKED {
 uint8_t i;static const uint16_t starts[5]={184,360,536,704,888};
 for(i=0;i<ENEMY_COUNT;++i){
  Officer *o=&officers[i];o->type=current_stage==1u && i==2u;
  o->x=o->home=o->type?512:starts[i];o->y=96;o->stunned=0;o->left=o->type?1u:i&1u;
  officer_health[i]=defeated_flags[current_stage]&(1u<<i)?0u:2u;officer_hit_ticks[i]=0;
  reward_active[i]=!officer_health[i] && !(reward_collected_flags[current_stage]&(1u<<i));
  reward_x[i]=o->home+4;reward_y[i]=104*16;reward_vy[i]=reward_delay[i]=0;
 }
}
void run_student(int16_t x,uint8_t color,uint8_t frame) BANKED {
 uint8_t q,base=184u+color*8u+frame*4u;
 for(q=0;q<4u;++q)object(x+(q&1u)*8,96+(q>>1)*8,base+q,2u+color);
}
static void language_options(void){
 ui_line(3,(const uint8_t *)"LANGUAGE / IDIOMA");
 ui_line(7,(const uint8_t *)(language?"  ENGLISH":" > ENGLISH"));
 ui_line(10,(const uint8_t *)(language?" > ESPA\xd1OL":"  ESPA\xd1OL"));
 ui_line(16,(const uint8_t *)"A - OK");
}
static void world_labels(void){
 line_id(0,TXT_WORLD_MAP);ui_line(1,(const uint8_t *)(language?"B - INICIO":"B - TITLE"));
 line_id(16,stage_text[selected]);line_id(17,TXT_CHOOSE_LEVEL);
 // A dedicated map marker has no overlap with gameplay actors.
 map_marker(node_x[selected],node_y[selected]);
 SHOW_SPRITES;
}
void map_marker(uint8_t x,uint8_t y) BANKED {
 uint8_t q;for(q=0;q<4u;++q){set_sprite_tile(q,sprite_frames[44u+q]);set_sprite_prop(q,0);move_sprite(q,x+(q&1u)*8u,y+(q>>1)*8u);}
}
void ui_show(uint8_t new_state) BANKED {
 switch(new_state){
 case LANGUAGE:
  screen_load(SCREEN_LANGUAGE);blank(0,17);language_options();break;
 case TITLE:
  screen_load(SCREEN_TITLE);blank(15,17);line_id(16,TXT_START_GAME);ui_line(17,(const uint8_t *)(language?"B - IDIOMA":"B - LANGUAGE"));break;
 case CONTROLS:
  screen_load(SCREEN_CONTROLS);blank(0,17);line_id(1,TXT_CONTROLS_TITLE);
  line_id(4,TXT_CONTROLS_MOVE);line_id(6,TXT_CONTROLS_JUMP);line_id(8,TXT_CONTROLS_BARK);
  line_id(10,TXT_CONTROLS_RUN);line_id(12,TXT_CONTROLS_PAUSE);line_id(14,TXT_CONTROLS_STOMP);line_id(16,TXT_CONTINUE);break;
 case WORLD:screen_load(SCREEN_WORLD+unlocked-1u);world_labels();break;
 case PAUSED:
  screen_load(SCREEN_PAUSE);blank(0,4);blank(5,10);blank(15,17);
  line_id(1,TXT_PAUSED);paragraph(6,TXT_PAUSE_MESSAGE);
  ui_line(9,(const uint8_t *)(language?"B - MAPA":"B - MAP"));line_id(16,TXT_CONTINUE);break;
 case GAME_OVER:
  screen_load(SCREEN_GAME_OVER);blank(0,4);blank(10,17);
  line_id(1,TXT_GAME_OVER);line_id(12,TXT_TRY_AGAIN);
  ui_line(16,(const uint8_t *)(language?"A - REINTENTAR":"A - RETRY"));
  ui_line(17,(const uint8_t *)(language?"B - INICIO":"B - TITLE"));break;
 case CLEAR:
  screen_load(SCREEN_CLEAR);blank(0,4);blank(12,17);
  line_id(1,TXT_STUDENTS_SAFE);paragraph(12,TXT_LEVEL_UNLOCKED);line_id(16,TXT_CONTINUE);break;
 case ENDING:
  screen_load(ending_beat==0?SCREEN_RESCUE:ending_beat==1?SCREEN_MEDAL:SCREEN_FLAG);
  blank(0,1);blank(16,17);
  paragraph(0,ending_beat==0?TXT_ENDING_RESCUE:ending_beat==1?TXT_ENDING_MEDAL:TXT_ENDING_FLAG);
  paragraph(16,ending_beat==1?TXT_PRESIDENT_THANKS:TXT_STUDENT_THANKS);break;
 case FINISHED:
  blank(16,17);line_id(16,TXT_ENDING_COMPLETE);line_id(17,TXT_CONTINUE);break;
 }
}
uint8_t ui_update(void) BANKED {
 switch(state){
 case LANGUAGE:
  if(pressed&(J_UP|J_DOWN|J_LEFT|J_RIGHT)){language^=1u;language_options();}
  if(pressed&J_A)return ACT_LANGUAGE;break;
 case TITLE:
  if(pressed&(J_A|J_START))return ACT_NEW_GAME;
  if(pressed&J_B){state=LANGUAGE;ui_show(state);}break;
 case CONTROLS:if(pressed&(J_A|J_START))return ACT_WORLD;break;
 case WORLD:
  if(pressed&J_LEFT){if(selected)--selected;world_labels();}
  if(pressed&J_RIGHT){if(selected+1u<unlocked){++selected;world_labels();}else{line_id(17,TXT_LOCKED);ui_timer=50;}}
  if(ui_timer && !--ui_timer)world_labels();
  if(pressed&J_B)return ACT_TITLE;
  if(pressed&(J_A|J_START))return ACT_PLAY;break;
 case PAUSED:
  if(pressed&J_START)return ACT_RESUME;
  if(pressed&J_B)return ACT_WORLD;break;
 case CLEAR:if(pressed&(J_A|J_START))return ACT_WORLD;break;
 case GAME_OVER:
  if(pressed&J_A)return ACT_RETRY;
  if(pressed&J_B)return ACT_TITLE;break;
 case FINISHED:if(pressed&(J_A|J_START))return ACT_WORLD;break;
 }
 return ACT_NONE;
}
