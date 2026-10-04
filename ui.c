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
