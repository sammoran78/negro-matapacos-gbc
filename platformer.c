/* Negro Matapacos: GBC-only, GBDK-2020 4.5.0.
 * World positions use signed 12.4 fixed point. A 16x16 actor occupies four
 * 8x8 objects; collision samples every tile along each leading edge.
 * No heap, floating point, printf, or framebuffer is used.
 */
#include <gb/gb.h>
#include <gb/cgb.h>
#include "game.h"
#include <gbdk/metasprites.h>
#define FP 16
#define PLAYER_SIZE 16
#define WALK_SPEED 24
#define RUN_SPEED 40
#define JUMP_SPEED (-72)
#define GRAVITY 4
#define MAX_FALL 64
#define FONT_BASE 128u
#define HUD_DIGIT_BASE 117u
#define HUD_STAR_BASE 182u
#define RUN_TILE_BASE 184u
#define BARRIER_TILE_BASE 208u
#define BUS_TILE_BASE 224u
#define BARK_RANGE 24
#define CHECKPOINT_X 448
#define BARRIER_X 944
#define GOAL_X 976
#define CAMERA_MAX 864
#define STUN_TICKS 90u
#define COYOTE_TICKS 5u
#define BUFFER_TICKS 5u
#define STOMP_SPEED (-56)
#define RESCUE_BARK_RANGE 40
typedef struct { int16_t x, home; uint8_t y, stunned, left, type; } Officer;
uint8_t state, language, selected, unlocked, lives, empanadas, completed;
uint8_t buttons, pressed, font_lut[256], text_buffer[64], ui_timer, ending_beat;
/* Global symbols are intentionally available to the emulator regression suite. */
int16_t player_x, player_y, player_vx, player_vy, camera_x;
uint8_t grounded, facing_left, sprinting, coyote, jump_buffer, bark_ticks, bark_cooldown;
uint8_t invulnerable, checkpoint_flags, barrier_open, rescue_ticks, death_ticks;
uint16_t coin_flags[5], total_empanadas, simulation_frame;
uint8_t current_stage, dog_frame, max_scanline_objects, last_oam_count;
uint8_t update_phase;
Officer officers[ENEMY_COUNT];
uint8_t officer_health[ENEMY_COUNT],officer_hit_ticks[ENEMY_COUNT];
uint8_t defeated_flags[5],reward_collected_flags[5],reward_active[ENEMY_COUNT],reward_delay[ENEMY_COUNT];
int16_t reward_x[ENEMY_COUNT],reward_y[ENEMY_COUNT];
int8_t reward_vy[ENEMY_COUNT];
uint8_t stomp_bounce;
uint8_t hud_digits[3],dialog_visible;
volatile uint8_t parallax_enabled,scroll_far,scroll_city,scroll_foreground;
static volatile uint8_t pending_far,pending_city,pending_foreground;
static volatile uint8_t pending_dialog;
static int16_t previous_player_bottom,last_far_tile,last_city_tile;
static uint8_t previous_buttons, clock_tick, tap_timer, tap_direction, message_timer, message_id;
static uint8_t sprite_frames[128], sprite_palettes[32], icon_tiles[3], oam_next, scanlines[18];
static uint8_t column_tiles[18], column_attributes[18], hud_tiles[40], hud_attributes[40];
static uint8_t hud_dirty, hud_mode, hud_pending, ending_timer, ending_row, barrier_redraw, hazard_tick;
static uint8_t coin_cursor, render_coin_cursor;
static uint8_t streamed;
static int16_t last_camera_tile, bus_x, previous_bus_x;
static const StageAsset *stage;
static const uint8_t run_frames[8]={2,12,3,13,4,14,5,15};
static const uint16_t coin_bits[16]={1,2,4,8,16,32,64,128,256,512,1024,2048,4096,8192,16384,32768};

/* All interrupt code stays in fixed ROM. Switch during the preceding HBlank,
 * so line 48/80 starts with its correct SCX before background pixel fetch. */
void parallax_vblank(void) NONBANKED {
 if(parallax_enabled){scroll_far=pending_far;scroll_city=pending_city;scroll_foreground=pending_foreground;SCX_REG=scroll_far;HIDE_WIN;dialog_visible=pending_dialog;LYC_REG=dialog_visible?23u:47u;}
}
void parallax_lcd(void) NONBANKED {
 if(!parallax_enabled)return;
 while(STAT_REG&3u){};
 if(LYC_REG==23u){SHOW_WIN;LYC_REG=39;}
 else if(LYC_REG==39u){HIDE_WIN;LYC_REG=47;}
 else if(LYC_REG==47u){SCX_REG=scroll_city;LYC_REG=79;}
 else{SCX_REG=scroll_foreground;LYC_REG=47;}
}
static void stop_parallax(void){
 CRITICAL {parallax_enabled=pending_dialog=dialog_visible=0;STAT_REG&=~STATF_LYC;LYC_REG=255;}
}

/* Arithmetic division avoids implementation-defined signed right shifts. */
static int16_t pixel(int16_t value){
 if(value>=0)return (uint16_t)value>>4;
 return -(int16_t)(((uint16_t)(-(value+1))+16u)>>4);
}
static uint8_t overlap(int16_t ax,int16_t ay,uint8_t aw,uint8_t ah,int16_t bx,int16_t by,uint8_t bw,uint8_t bh){
 return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
}
void fetch_text(uint8_t id) NONBANKED {
 uint8_t saved=CURRENT_BANK,i=0;const uint8_t *src=game_text[language][id];
 SWITCH_ROM(2);
 while(src[i] && i<63u){text_buffer[i]=src[i];++i;}text_buffer[i]=0;
 SWITCH_ROM(saved);
}
void map_marker(uint8_t x,uint8_t y) NONBANKED {
 uint8_t q;for(q=0;q<4u;++q){set_sprite_tile(q,sprite_frames[44u+q]);set_sprite_prop(q,0);move_sprite(q,x+(q&1u)*8u,y+(q>>1)*8u);}
}
void screen_load(uint8_t which) NONBANKED {
 const ScreenAsset *s=&screen_assets[which];uint8_t saved=CURRENT_BANK,i;
 stop_parallax();DISPLAY_OFF;HIDE_WIN;HIDE_SPRITES;
 for(i=0;i<40u;++i)hide_sprite(i);
 SWITCH_ROM(s->bank);
 VBK_REG=1;set_bkg_data(0,s->count,s->tiles);VBK_REG=0;
 set_bkg_palette(0,8,s->palettes);
 set_bkg_tiles(0,0,20,18,s->map);
 // Menu art resides in VRAM bank 1; all localized font overlays use bank 0.
 {uint8_t y,x,attrs[20];for(y=0;y<18u;++y){for(x=0;x<20u;++x)attrs[x]=s->attributes[(uint16_t)y*20u+x]|8u;set_bkg_attributes(0,y,20,1,attrs);}}
 move_bkg(0,0);SHOW_BKG;DISPLAY_ON;SWITCH_ROM(saved);
}
static void init_art(void){
 uint16_t i;SWITCH_ROM(2);
 VBK_REG=0;set_sprite_data(0,SPRITES_TILE_COUNT,sprites_tiles);
 set_sprite_data(HUD_DIGIT_BASE,11,hud_digit_tiles);set_sprite_data(HUD_STAR_BASE,2,hud_star_tiles);
 set_sprite_data(RUN_TILE_BASE,16,rescue_run_tiles);
 set_sprite_data(BUS_TILE_BASE,4,bus_tiles);
 set_sprite_palette(0,8,sprites_palettes);set_sprite_palette(7,1,bus_palette);
 set_bkg_data(FONT_BASE,FONT_TILE_COUNT,font_tiles);
 set_bkg_data(BARRIER_TILE_BASE,8,barricade_tiles);
 set_bkg_data(200,8,foreground_tiles);
 for(i=0;i<256u;++i)font_lut[i]=FONT_BASE;
 for(i=0;i<FONT_TILE_COUNT;++i)font_lut[font_character_codes[i]]=FONT_BASE+i;
 for(i=0;i<128u;++i)sprite_frames[i]=sprites_frame_tiles[i];
 for(i=0;i<32u;++i)sprite_palettes[i]=sprites_frame_palettes[i];
 for(i=0;i<3u;++i)icon_tiles[i]=sprites_icon_tiles[i];
 SWITCH_ROM(1);
}
static uint8_t terrain_at(int16_t tx,int16_t ty){
 if(tx<0 || tx>=LEVEL_WIDTH || ty<0)return 4;
 if(ty>=LEVEL_HEIGHT)return 0;
 {uint8_t t=stage->terrain[(uint16_t)ty*LEVEL_WIDTH+(uint16_t)tx];if(t==6u && barrier_open)return 0;return t;}
}
static uint8_t solid_at(int16_t x,int16_t y){
 uint8_t t;if(y<0 || x<0 || x>=1024)return 1;if(y>=144)return 0;
 t=terrain_at(x/8,y/8);return t>=1u && t<=4u || t==6u;
}
/* Leading edges span two or three tiles, depending on sub-tile alignment. */
static uint8_t vertical_edge(int16_t x,int16_t top){
 int16_t end=top+15,y=top;
 if(solid_at(x,y))return 1;
 y=(top<0?0:(top/8+1)*8);
 while(y<=end){if(solid_at(x,y))return 1;y+=8;}
 return 0;
}
static uint8_t horizontal_edge(int16_t left,int16_t y){
 int16_t end=left+15,x=left;
 if(solid_at(x,y))return 1;
 x=(left<0?0:(left/8+1)*8);
 while(x<=end){if(solid_at(x,y))return 1;x+=8;}
 return 0;
}
static void move_horizontal(void){
 int16_t target=player_x+player_vx,old=pixel(player_x),dest=pixel(target),y=pixel(player_y);
 // Configured speed is below one tile per tick: the destination leading edge
 // cannot skip a solid tile. Check every tile along that edge, then snap.
 if(dest>old && vertical_edge(dest+15,y)){player_x=(((uint16_t)(dest+15)>>3)*8u-16u)*FP;player_vx=0;return;}
 if(dest<old && vertical_edge(dest,y)){player_x=(dest<0?0:(((uint16_t)dest>>3)+1u)*8u)*FP;player_vx=0;return;}
 player_x=target;
}
static void move_vertical(void){
 int16_t target=player_y+player_vy,old=pixel(player_y),dest=pixel(target),x=pixel(player_x);
 grounded=0;
 if(player_vy>=0){
  if(horizontal_edge(x,dest+16)){player_y=(((uint16_t)(dest+16)>>3)*8u-16u)*FP;player_vy=0;grounded=1;return;}
  if(current_stage==2u && old+16<=88 && dest+16>=88 && x<bus_x+32 && x+16>bus_x){player_y=72*FP;player_vy=0;grounded=1;return;}
 }else if(dest<old && horizontal_edge(x,dest)){player_y=(dest<0?0:(((uint16_t)dest>>3)+1u)*8u)*FP;player_vy=0;return;}
 player_y=target;
}
static void sound(uint8_t kind){
 if(kind==1u){
  // A short, low square voice plus a rough noise burst makes an audible woof.
  // CH4 is separate from pickup/jump tones, so those cannot silence the bark.
  NR21_REG=0xac;NR22_REG=0xb1;NR23_REG=0x30;NR24_REG=0xc6;
  NR41_REG=44;NR42_REG=0xf1;NR43_REG=0x54;NR44_REG=0xc0;return;
 }
 NR21_REG=0x80;NR22_REG=0x92;
 NR23_REG=kind==0?0xb0:kind==2?0xe0:kind==4?0x60:0x00;
 NR24_REG=kind==3?0x84:0x87;
}
static void say(uint8_t id){message_id=id;message_timer=100;hud_dirty=1;}
static void kill_player(void){
 if(state!=PLAY || invulnerable)return;
 state=DYING;death_ticks=40;player_vx=0;player_vy=0;dog_frame=10;
 if(lives)--lives;hud_dirty=1;sound(3);
}
static uint8_t bark_unblocked(int16_t from,int16_t to,int16_t y){
 int16_t x;if(to>=from){for(x=from;x<=to;x+=4)if(solid_at(x,y))return 0;}
 else{for(x=from;x>=to;x-=4)if(solid_at(x,y))return 0;}return 1;
}
static void bark(void){
 uint8_t i;int16_t x=pixel(player_x),y=pixel(player_y),front=facing_left?x-1:x+16;
 if(pressed&J_B && !bark_cooldown){bark_ticks=8;bark_cooldown=30;sound(1);}
 if(!bark_ticks)return;
 // A contextual rescue bark works from either side, even after jumping over
 // the barrier and reaching the students at the right-hand level boundary.
 if(!barrier_open && x+16>=BARRIER_X-RESCUE_BARK_RANGE && x<=BARRIER_X+32+RESCUE_BARK_RANGE && y+16>=80 && y<=112){
  barrier_open=1;say(TXT_STUDENT_FOLLOW);
  // The terrain query and the streamed tile columns share the same open state.
  barrier_redraw=4;
 }
 for(i=0;i<ENEMY_COUNT;++i){
  Officer *o=&officers[i];int16_t dx=o->x+8-front;
  if(officer_health[i] && !o->stunned && (facing_left?dx<=0 && dx>=-BARK_RANGE:dx>=0 && dx<=BARK_RANGE) && y<o->y+16 && y+16>o->y && bark_unblocked(front,o->x+8,y+8))o->stunned=STUN_TICKS;
 }
}
static void award_empanada(void){
 ++empanadas;++total_empanadas;if(empanadas==50u){empanadas=0;if(lives<9u)++lives;}hud_dirty=1;sound(2);
}
static void collect(void){
 uint8_t i;int16_t x=pixel(player_x),y=pixel(player_y);
 while(coin_cursor<COIN_COUNT && stage->coin_x[coin_cursor]+8<=x)++coin_cursor;
 while(coin_cursor && stage->coin_x[coin_cursor-1u]+8>x)--coin_cursor;
 for(i=coin_cursor;i<COIN_COUNT && stage->coin_x[i]<x+16;++i){
  if(!(coin_flags[current_stage]&coin_bits[i]) && stage->coin_y[i]<y+16 && stage->coin_y[i]+8>y){
   coin_flags[current_stage]|=coin_bits[i];award_empanada();
  }
 }
 if(!(checkpoint_flags&(1u<<current_stage)) && x>=CHECKPOINT_X){checkpoint_flags|=1u<<current_stage;say(TXT_CHECKPOINT);}
 if(x>880 && !barrier_open && !message_timer)say(TXT_RESCUE_PROMPT);
 if(barrier_open && x+16>=GOAL_X){state=RESCUING;rescue_ticks=110;dog_frame=11;say(TXT_STUDENTS_SAFE);sound(2);}
}
static void update_officers(void){
 uint8_t i;int16_t x=pixel(player_x),y=pixel(player_y);
 for(i=0;i<ENEMY_COUNT;++i){
  Officer *o=&officers[i];
  if(!officer_health[i])continue;
  if(o->x+32<camera_x || o->x>camera_x+192)continue;
  if(officer_hit_ticks[i])--officer_hit_ticks[i];
  if(o->stunned)--o->stunned;
  else if(!(clock_tick&1u)){
   if(o->type){o->y+=o->left?-1:1;if(o->y<=64u)o->left=0;if(o->y>=96u)o->left=1;}
   else{int16_t next=o->x+(o->left?-1:1),edge=o->left?next:next+15;
    if(next<o->home-24 || next>o->home+24 || solid_at(edge,o->y+8) || !solid_at(edge,o->y+16))o->left^=1u;
    else o->x=next;
   }
  }
  if(o->x<x+16 && o->x+16>x && o->y<y+16 && o->y+16>y){
   if(player_vy>0 && previous_player_bottom<=o->y+4 && !officer_hit_ticks[i]){
    --officer_health[i];officer_hit_ticks[i]=16;o->stunned=STUN_TICKS;
    player_y=(o->y-16u)*FP;y=o->y-16u;player_vy=STOMP_SPEED;grounded=0;stomp_bounce=8;sound(4);
    if(!officer_health[i]){defeated_flags[current_stage]|=1u<<i;reward_active[i]=1;reward_delay[i]=12;reward_x[i]=o->x+4;reward_y[i]=o->y*FP;reward_vy[i]=-32;}
   }else if(!o->stunned && !officer_hit_ticks[i])kill_player();
  }
 }
}
static void update_rewards(void){
 uint8_t i;int16_t x=pixel(player_x),y=pixel(player_y),ry;
 for(i=0;i<ENEMY_COUNT;++i)if(reward_active[i]){
  if(reward_delay[i])--reward_delay[i];
  if(reward_vy[i]<64)reward_vy[i]+=4;reward_y[i]+=reward_vy[i];ry=pixel(reward_y[i]);
  if(reward_vy[i]>=0 && solid_at(reward_x[i]+4,ry+8)){reward_y[i]=(((uint16_t)(ry+8)>>3)*8u-8u)*FP;reward_vy[i]=0;ry=pixel(reward_y[i]);}
  if(ry>=144){reward_active[i]=0;continue;}
  if(!reward_delay[i] && reward_x[i]<x+16 && reward_x[i]+8>x && ry<y+16 && ry+8>y){reward_active[i]=0;reward_collected_flags[current_stage]|=1u<<i;award_empanada();}
 }
}
static void update_hazards(void){
 int16_t x=pixel(player_x),y=pixel(player_y);uint8_t tx,ty;
 if(y>=144){invulnerable=0;kill_player();return;}
 if(current_stage==3u)for(ty=y<0?0:(uint16_t)y>>3;ty<18u && ty<=(uint16_t)(y+15)>>3;++ty)for(tx=(uint16_t)x>>3;tx<128u && tx<=(uint16_t)(x+15)>>3;++tx)if(terrain_at(tx,ty)==5u){invulnerable=0;kill_player();return;}
 // The guanaco's pulsing spray is telegraphed by a visible 16x16 effect.
 if(current_stage==2u && hazard_tick>=110u && hazard_tick<150u && overlap(x,y,16,16,504,96,32,16))kill_player();
}
static void physics(void){
 int8_t direction=0;
 if((buttons&(J_LEFT|J_RIGHT))==J_LEFT)direction=-1;
 if((buttons&(J_LEFT|J_RIGHT))==J_RIGHT)direction=1;
 if(tap_timer)--tap_timer;
 if(pressed&(J_LEFT|J_RIGHT)){
  uint8_t d=direction<0?1u:2u;
  if(direction && tap_timer && tap_direction==d)sprinting=1;
  else sprinting=0;
  tap_direction=d;tap_timer=12;
 }
 if(!direction)sprinting=0;
 if(direction)facing_left=direction<0;
 player_vx=direction*(sprinting?RUN_SPEED:WALK_SPEED);
 if(grounded)coyote=COYOTE_TICKS;else if(coyote)--coyote;
 if(pressed&J_A)jump_buffer=BUFFER_TICKS;else if(jump_buffer)--jump_buffer;
 if(jump_buffer && coyote){player_vy=JUMP_SPEED;grounded=0;coyote=0;jump_buffer=0;sound(0);}
 if(stomp_bounce)--stomp_bounce;
 if(!(buttons&J_A) && !stomp_bounce && player_vy<-32)player_vy=-32;
 if(player_vy<MAX_FALL)player_vy+=GRAVITY;
 if(player_vy>MAX_FALL)player_vy=MAX_FALL;
 if(current_stage==2u && grounded && pixel(player_y)+16==88 && overlap(pixel(player_x),pixel(player_y),16,17,previous_bus_x,88,32,8))player_x+=(bus_x-previous_bus_x)*FP;
 previous_player_bottom=pixel(player_y)+16;move_horizontal();move_vertical();
 if(bark_cooldown)--bark_cooldown;if(bark_ticks)--bark_ticks;
 if(invulnerable)--invulnerable;
 update_phase=11;bark();update_phase=12;update_officers();if(state!=PLAY)return;
 update_phase=13;update_hazards();if(state!=PLAY)return;update_phase=14;update_rewards();collect();update_phase=15;
 if(bark_ticks)dog_frame=8u+((bark_ticks>>1)&1u);
 else if(!grounded)dog_frame=player_vy<0?6u:7u;
 else if(direction)dog_frame=run_frames[(clock_tick/(sprinting?3u:5u))&7u];
 else dog_frame=(clock_tick>>5)&1u;
}
static void column(uint16_t world_column){
 uint8_t y,i=0;const uint8_t *tiles=stage->visual+1280u+world_column,*attrs=stage->attributes+1280u+world_column;
 for(y=10;y<18u;++y,++i){
  if(world_column>=128u){column_tiles[i]=206u+(world_column&1u);column_attributes[i]=6;}
  else{column_tiles[i]=*tiles;column_attributes[i]=*attrs;}
  if(barrier_open && world_column>=118u && world_column<122u && y>=12u && y<14u){column_tiles[i]=stage->library[0];column_attributes[i]=stage->cell_palettes[0];}
  tiles+=128u;attrs+=128u;
 }
 set_bkg_tiles(world_column&31u,10,1,8,column_tiles);
 set_bkg_attributes(world_column&31u,10,1,8,column_attributes);
}
static void scenic_column(uint16_t world_column,uint8_t city){
 uint8_t i,first=city?6u:0u,count=city?4u:6u;uint16_t index=(uint16_t)first*20u+world_column%20u;
 for(i=0;i<count;++i){column_tiles[i]=stage->depth_map[index];column_attributes[i]=stage->depth_attributes[index];index+=20u;}
 set_bkg_tiles(world_column&31u,first,1,count,column_tiles);set_bkg_attributes(world_column&31u,first,1,count,column_attributes);
}
static void commit_scroll(void){
 CRITICAL {pending_far=(uint16_t)camera_x>>2;pending_city=(uint16_t)camera_x>>1;pending_foreground=(uint8_t)camera_x;}
}
static void fill_camera(void){
 uint16_t first=(uint16_t)camera_x>>3,i;for(i=first;i<first+32u;++i)column(i);last_camera_tile=first;
 first=(uint16_t)camera_x>>5;for(i=first;i<first+32u;++i)scenic_column(i,0);last_far_tile=first;
 first=(uint16_t)camera_x>>4;for(i=first;i<first+32u;++i)scenic_column(i,1);last_city_tile=first;commit_scroll();
}
static void erase_barrier_column(uint8_t world_column){
 uint8_t tiles[2],attrs[2];tiles[0]=tiles[1]=stage->library[0];attrs[0]=attrs[1]=stage->cell_palettes[0];
 set_bkg_tiles(world_column&31u,12,1,2,tiles);set_bkg_attributes(world_column&31u,12,1,2,attrs);
}
static void scroll_camera(void){
 int16_t next=pixel(player_x)-72,tile;
 streamed=0;
 if(next<0)next=0;if(next>CAMERA_MAX)next=CAMERA_MAX;camera_x=next;tile=next/8;
 if(last_camera_tile<0)fill_camera();
 else if(tile>last_camera_tile){while(last_camera_tile<tile){++last_camera_tile;column(last_camera_tile+31);streamed=1;}}
 else if(tile<last_camera_tile){while(last_camera_tile>tile){--last_camera_tile;column(last_camera_tile);streamed=1;}}
 tile=(uint16_t)camera_x>>5;
 while(last_far_tile<tile){++last_far_tile;scenic_column(last_far_tile+31,0);streamed=1;}
 while(last_far_tile>tile){--last_far_tile;scenic_column(last_far_tile,0);streamed=1;}
 tile=(uint16_t)camera_x>>4;
 while(last_city_tile<tile){++last_city_tile;scenic_column(last_city_tile+31,1);streamed=1;}
 while(last_city_tile>tile){--last_city_tile;scenic_column(last_city_tile,1);streamed=1;}
 if(barrier_redraw && !streamed){erase_barrier_column(122u-barrier_redraw);--barrier_redraw;}
 commit_scroll();
}
static void hud(void){
 uint8_t i,row=0,col=0;
 if(!hud_dirty && !hud_pending)return;
 if(hud_dirty){hud_dirty=0;
  // Total is monotonic; the separate modulo-50 counter still awards lives.
  hud_digits[0]=total_empanadas/100u;hud_digits[1]=(total_empanadas/10u)%10u;hud_digits[2]=total_empanadas%10u;
  if(!message_timer){pending_dialog=0;hud_pending=0;hud_mode=0;return;}
  if(hud_mode==message_id+1u)return;
  pending_dialog=0;
  for(i=0;i<40u;++i)hud_tiles[i]=FONT_BASE;
  fetch_text(message_id);for(i=0;text_buffer[i] && i<38u;++i){if(col==19u){row=1;col=0;}hud_tiles[row*20u+col++]=font_lut[text_buffer[i]];}
  hud_mode=message_id+1u;hud_pending=2;
 }
 // Only transient messages use the window, clipped to lines 24..39 by LYC.
 row=2u-hud_pending;set_win_tiles(0,row,20,1,&hud_tiles[row*20u]);--hud_pending;
 if(!hud_pending)pending_dialog=1;
}
static void oam_begin(void){uint8_t i;for(i=0;i<18u;++i)scanlines[i]=0;oam_next=0;max_scanline_objects=0;}
static uint8_t object(int16_t x,int16_t y,uint8_t tile,uint8_t properties){
 uint8_t top,bottom;OAM_item_t *item;
 if(oam_next>=40u || x<=-8 || x>=160 || y<=-8 || y>=144)return 0;
 // Conservative eight-line bands cap OAM demand with at most two checks.
 top=y<0?0:(uint16_t)y>>3;bottom=y+7>143?17u:(uint16_t)(y+7)>>3;
 if(scanlines[top]>=10u || scanlines[bottom]>=10u)return 0;
 ++scanlines[top];if(top!=bottom)++scanlines[bottom];
 if(scanlines[top]>max_scanline_objects)max_scanline_objects=scanlines[top];
 if(scanlines[bottom]>max_scanline_objects)max_scanline_objects=scanlines[bottom];
 item=&shadow_OAM[oam_next++];item->x=x+8;item->y=y+16;item->tile=tile;item->prop=properties;return 1;
}
static void pose(int16_t x,int16_t y,uint8_t frame,uint8_t left){
 uint8_t q,p=sprite_palettes[frame]|(left?S_FLIPX:0),top,bottom,b,base=frame*4u;int16_t xx,yy;OAM_item_t *item;
 if(x<=-16 || x>=160 || y<=-16 || y>=144)return;
 if(oam_next>36u)return;
 // A complete 16x16 pose uses two objects per scanline. Reserve the group
 // once instead of repeating the same budget work for four quadrants.
 top=y<0?0:(uint16_t)y>>3;bottom=y+15>143?17:(uint16_t)(y+15)>>3;
 for(b=top;b<=bottom;++b)if(scanlines[b]>8u)return;
 for(b=top;b<=bottom;++b){scanlines[b]+=2u;if(scanlines[b]>max_scanline_objects)max_scanline_objects=scanlines[b];}
 for(q=0;q<4u;++q){
  xx=x+(q&1u)*8u;yy=y+(q>>1)*8u;if(xx<=-8 || xx>=160 || yy<=-8 || yy>=128)continue;
  item=&shadow_OAM[oam_next++];item->x=xx+8;item->y=yy+16;item->tile=sprite_frames[base+(left?(q^1u):q)];item->prop=p;
 }
}
static void run_student(int16_t x,uint8_t color){
 uint8_t q,base=RUN_TILE_BASE+color*8u+((clock_tick>>3)&1u)*4u;
 for(q=0;q<4u;++q)object(x+(q&1u)*8,96+(q>>1)*8,base+q,2u+color);
}
static void render(void){
 uint8_t i,hx=16;int16_t x=pixel(player_x)-camera_x,y=pixel(player_y);
 oam_begin();
 // Transparent corner overlays have fixed screen positions and OAM priority.
 object(4,6,icon_tiles[0],4);
 if(hud_digits[0]){object(hx,6,HUD_DIGIT_BASE+hud_digits[0],5);hx+=8;}
 if(hud_digits[0] || hud_digits[1]){object(hx,6,HUD_DIGIT_BASE+hud_digits[1],5);hx+=8;}
 object(hx,6,HUD_DIGIT_BASE+hud_digits[2],5);
 for(i=0;i<3u;++i)object(124u+i*12u,6,HUD_STAR_BASE+(lives<=i),4);
 if(lives>3u){object(104,6,HUD_DIGIT_BASE+10u,5);object(112,6,HUD_DIGIT_BASE+lives-3u,5);}
 if(state!=PLAY || !invulnerable || (clock_tick&4u))pose(x,y,dog_frame,facing_left);
 if(state==RESCUING){
  int16_t run=110u-rescue_ticks;
  run_student(GOAL_X+run-camera_x,0);run_student(GOAL_X+20+run-camera_x,1);
 }else{
  for(i=0;i<ENEMY_COUNT;++i){Officer *o=&officers[i];if(officer_health[i] && o->x+16>camera_x && o->x<camera_x+160){pose(o->x-camera_x,o->y,o->stunned?18u:o->type?19u:16u+((clock_tick>>3)&1u),o->left);if(o->stunned || officer_health[i]==1u)object(o->x+4-camera_x,o->y-8,icon_tiles[2],officer_health[i]==1u?4u:5u);}}
  pose(GOAL_X-camera_x,96,20u+((clock_tick>>4)&1u),0);pose(GOAL_X+20-camera_x,96,22u+((clock_tick>>4)&1u),0);
 }
 if(bark_ticks)pose(x+(facing_left?-16:16),y,28u+((bark_ticks>>1)&1u),facing_left);
 pose(CHECKPOINT_X-camera_x,96,26,0);
 if(current_stage==2u){for(i=0;i<4u;++i)object(bus_x-camera_x+i*8u,88,BUS_TILE_BASE+i,7);
  if(hazard_tick>=110u && hazard_tick<150u)pose(504-camera_x,96,29,0);
 }
 while(render_coin_cursor<COIN_COUNT && stage->coin_x[render_coin_cursor]+8<=camera_x)++render_coin_cursor;
 while(render_coin_cursor && stage->coin_x[render_coin_cursor-1u]+8>camera_x)--render_coin_cursor;
 for(i=render_coin_cursor;i<COIN_COUNT && stage->coin_x[i]<camera_x+160;++i)if(!(coin_flags[current_stage]&coin_bits[i]))object(stage->coin_x[i]-camera_x,stage->coin_y[i],icon_tiles[0],4);
 for(i=0;i<ENEMY_COUNT;++i)if(reward_active[i]){object(reward_x[i]-camera_x,pixel(reward_y[i]),icon_tiles[0],4);if(reward_delay[i])pose(reward_x[i]-4-camera_x,officers[i].y,30,0);}
 last_oam_count=oam_next;while(oam_next<40u)shadow_OAM[oam_next++].y=0;
}
void render_complete(void) NONBANKED {update_phase=0;}
static void reset_officers(void){
 uint8_t i;static const uint16_t starts[5]={184,360,536,704,888};
 for(i=0;i<ENEMY_COUNT;++i){officers[i].x=officers[i].home=starts[i];officers[i].y=96;officers[i].stunned=0;officers[i].left=i&1u;officers[i].type=current_stage==1u && i==2u;
  officer_health[i]=defeated_flags[current_stage]&(1u<<i)?0u:2u;officer_hit_ticks[i]=0;
  reward_active[i]=!officer_health[i] && !(reward_collected_flags[current_stage]&(1u<<i));reward_x[i]=starts[i]+4;reward_y[i]=104*FP;reward_vy[i]=reward_delay[i]=0;
 }
}
static void spawn(void){
 player_x=(checkpoint_flags&(1u<<current_stage)?CHECKPOINT_X:24)*FP;player_y=96*FP;
 player_vx=player_vy=0;grounded=1;facing_left=sprinting=coyote=jump_buffer=bark_ticks=bark_cooldown=0;
 invulnerable=90;dog_frame=0;tap_timer=stomp_bounce=0;barrier_open=0;camera_x=pixel(player_x)-72;if(camera_x<0)camera_x=0;
 reset_officers();bus_x=previous_bus_x=624;message_timer=barrier_redraw=hazard_tick=coin_cursor=render_coin_cursor=0;hud_dirty=1;
}
static void load_stage(uint8_t restart){
 uint8_t i;
 current_stage=selected;stage=&stage_assets[current_stage];SWITCH_ROM(stage->bank);
 stop_parallax();DISPLAY_OFF;HIDE_SPRITES;HIDE_WIN;
 VBK_REG=0;set_bkg_data(0,stage->tile_count,stage->tiles);
 VBK_REG=1;set_bkg_data(0,stage->depth_count,stage->depth_tiles);VBK_REG=0;
 set_bkg_palette(0,8,stage->palettes);
 if(restart)spawn();fill_camera();SCY_REG=0;SCX_REG=pending_far;
 for(i=0;i<40u;++i)hide_sprite(i);
 move_win(7,24);hud_dirty=1;hud_mode=255;hud_pending=0;
 for(i=0;i<40u;++i)hud_attributes[i]=7u;
 VBK_REG=1;set_win_tiles(0,0,20,2,hud_attributes);VBK_REG=0;hud();if(hud_pending)hud();
 CRITICAL {parallax_enabled=1;scroll_far=pending_far;scroll_city=pending_city;scroll_foreground=pending_foreground;LYC_REG=47;STAT_REG=STATF_LYC;}
 HIDE_WIN;SHOW_BKG;SHOW_SPRITES;DISPLAY_ON;state=PLAY;
}
static void new_game(void){
 uint8_t i;unlocked=1;selected=0;completed=checkpoint_flags=empanadas=0;total_empanadas=0;lives=3;
 for(i=0;i<5u;++i){coin_flags[i]=0;defeated_flags[i]=reward_collected_flags[i]=0;}state=CONTROLS;ui_show(state);
}
static void transition(uint8_t action){
 switch(action){
 case ACT_LANGUAGE:state=TITLE;ui_show(state);break;
 case ACT_NEW_GAME:new_game();break;
 case ACT_WORLD:state=WORLD;ui_show(state);break;
 case ACT_PLAY:load_stage(1);break;
 case ACT_RESUME:load_stage(0);break;
 case ACT_RETRY:lives=3;load_stage(1);break;
 case ACT_TITLE:state=TITLE;ui_show(state);break;
 }
}
static void stage_complete(void){
 completed|=1u<<current_stage;
 if(current_stage<4u){if(unlocked<current_stage+2u)unlocked=current_stage+2u;selected=current_stage+1u;state=CLEAR;ui_show(state);}
 else{ending_beat=0;ending_timer=0;state=ENDING;ui_show(state);}
}
static void raise_flag(uint8_t row){
 uint8_t saved=CURRENT_BANK,i,x,y,tiles[12],attrs[12];
 SWITCH_ROM(14);
 // Restore the former 4x3 area, including its per-tile palettes.
 for(y=0;y<3u;++y)for(x=0;x<4u;++x){i=y*4u+x;tiles[i]=runtime_flag_map[(uint16_t)(ending_row+y)*20u+10u+x];attrs[i]=runtime_flag_attributes[(uint16_t)(ending_row+y)*20u+10u+x]|8u;}
 set_bkg_tiles(10,ending_row,4,3,tiles);set_bkg_attributes(10,ending_row,4,3,attrs);
 VBK_REG=1;set_bkg_data(224,12,presidential_standard_tiles);VBK_REG=0;
 for(i=0;i<12u;++i){tiles[i]=224u+presidential_standard_map[i];attrs[i]=presidential_standard_attributes[i]|8u;}
 set_bkg_tiles(10,row,4,3,tiles);set_bkg_attributes(10,row,4,3,attrs);
 ending_row=row;SWITCH_ROM(saved);
}
static void ending_update(void){
 ++ending_timer;
 if(ending_beat<2u){
  if(ending_timer>=150u || (pressed&J_A)){
   ++ending_beat;ending_timer=0;ui_show(ENDING);if(ending_beat==2u){ending_row=7;raise_flag(7);}
  }
 }else{if(ending_timer%12u==0u && ending_row>3u)raise_flag(ending_row-1u);if(ending_timer>=180u){state=FINISHED;ui_show(state);}}
}
void main(void){
 uint8_t action;
 DISPLAY_OFF;cpu_fast();SPRITES_8x8;LCDC_REG=LCDCF_BGON|LCDCF_OBJON|LCDCF_BG8000|LCDCF_WIN9C00;
 // GBDK's signed BG addressing separates OBJ 0..127 from BG 0..127.
 LCDC_REG&=~LCDCF_BG8000;
 NR52_REG=0x80;NR50_REG=0x77;NR51_REG=0xaa;
 CRITICAL {add_VBL(parallax_vblank);add_LCD(parallax_lcd);add_LCD(nowait_int_handler);}
 set_interrupts(VBL_IFLAG|LCD_IFLAG);
 init_art();language=0;state=LANGUAGE;ui_show(state);
 while(1){
  wait_vbl_done();buttons=joypad();pressed=buttons&~previous_buttons;previous_buttons=buttons;++clock_tick;
  if(state==PLAY){
   if(pressed&J_START){state=PAUSED;ui_show(state);continue;}
   ++simulation_frame;previous_bus_x=bus_x;if(++hazard_tick==180u)hazard_tick=0;
   if(!(clock_tick&3u))bus_x+=((clock_tick>>7)&1u)?-1:1;
   update_phase=1;physics();if(message_timer && !--message_timer)hud_dirty=1;
   update_phase=2;scroll_camera();update_phase=3;if(!streamed)hud();update_phase=4;render();render_complete();
  }else if(state==DYING){
   if(message_timer && !--message_timer)hud_dirty=1;hud();render();if(!--death_ticks){if(lives)load_stage(1);else{state=GAME_OVER;ui_show(state);}}
  }else if(state==RESCUING){
   if(barrier_redraw){erase_barrier_column(122u-barrier_redraw);--barrier_redraw;}
   render();if(message_timer && !--message_timer)hud_dirty=1;hud();if(!--rescue_ticks)stage_complete();
  }else if(state==ENDING)ending_update();
  else{action=ui_update();if(action)transition(action);}
 }
}
