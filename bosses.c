/* Boss logic and native sprite rendering use bank 15, away from fixed-ROM
 * collision/interrupt code. No stage-bank pointers are read from this bank. */
#pragma bank 15
#include "game.h"
#include <gbdk/metasprites.h>

uint8_t boss_kind,boss_health,boss_phase,boss_timer,boss_left,boss_aim;
uint8_t boss_active,boss_defeated,player_hurt,capture_ticks,boss_hit_ticks;
uint8_t boss_drive_left;
int16_t boss_x;
static uint8_t water_colors;
static const uint8_t arc_y[4][6]={
 {88,80,72,80,88,96},{88,72,64,72,88,96},
 {88,80,64,64,72,80},{88,72,56,56,64,80}
};
static uint8_t splash_y(void){return !boss_left && boss_x>=920?80u:104u;}
static uint8_t arc_row(void){return (splash_y()==80u?2u:0u)+(boss_aim==80u);}
static int16_t jet_x(uint8_t i){return boss_left?boss_x-8-i*10u:boss_x+48+i*4u;}
static int16_t splash_x(void){return boss_left?boss_x-72:boss_x+72;}
static uint8_t water_hits(int16_t x,int16_t y,int16_t wx,uint8_t wy,uint8_t width){
 return x+3<wx+width && x+13>wx && y+6<wy+8u && y+15>wy;
}

/* A movable solid body is resolved independently of the static tile map.
 * Its exact pixel edges must never be snapped to eight-pixel tile boundaries. */
static void truck_body(int8_t motion){
 int16_t x=player_x/16,y=player_y/16,old=boss_x-motion;
 if(previous_player_bottom==95 && player_vy>=0 && x+16>old && x<old+48){player_x+=motion*16;x=player_x/16;}
 if(x+16<=boss_x || x>=boss_x+48 || y+16<96 || y>=112)return;
 if(player_vy>=0 && previous_player_bottom<=96){player_y=80*16;player_vy=0;grounded=1;return;}
 if(y+16==96)return;
 player_x=(x+8<boss_x+24?boss_x-16:boss_x+48)*16;player_vx=0;
}

static void hurt_player(void){
 int16_t x;
 if(invulnerable || state!=PLAY)return;
 if(player_hurt){kill_player();return;}
 player_hurt=1;invulnerable=90;capture_ticks=12;player_vy=-24;
 x=player_x+(boss_left?-128:128);if(x<0)x=0;if(x>1008*16)x=1008*16;player_x=x;
 set_sprite_palette(0,1,boss_hurt_palette);say(TXT_BOSS_HURT);sound(3);
}

void boss_load(uint8_t restart) BANKED {
 boss_kind=current_stage==3u?BOSS_NET:current_stage==4u?BOSS_TANK:BOSS_NONE;
 if(restart){
  player_hurt=capture_ticks=boss_hit_ticks=boss_active=0;
  boss_phase=BOSS_REST;boss_timer=75;boss_left=boss_drive_left=1;boss_aim=96;
  boss_x=boss_kind==BOSS_NET?944:936;
  boss_health=boss_kind && !(boss_defeated&(1u<<current_stage))?(boss_kind==BOSS_NET?5u:10u):0u;
  if(boss_kind)barrier_open=!boss_health;
 }
 set_sprite_palette(0,1,player_hurt?boss_hurt_palette:boss_normal_palette);
 // Palette 6 also draws Chilean checkpoint flags. Cyan is needed only near
 // the final cannon; restore red before a retreat brings the flag into view.
 water_colors=boss_kind==BOSS_TANK && boss_active && boss_health && player_x>=768*16;
 set_sprite_palette(6,1,water_colors?boss_water_palette:boss_default_water_palette);
 if(boss_kind){
  VBK_REG=1;set_sprite_data(17,BOSS_OBJ_TILE_COUNT,boss_obj_tiles);VBK_REG=0;
 }
}

void boss_bark(void) BANKED {
 int16_t x=player_x/16,y=player_y/16,center;uint8_t width;
 if(!boss_active || !boss_health || capture_ticks)return;
 if(boss_kind==BOSS_TANK && boss_phase!=BOSS_REST && boss_phase!=BOSS_RECOVER)return;
 width=boss_kind==BOSS_NET?24u:48u;
 if(x+16<boss_x-24 || x>boss_x+width+24 || y+16<88 || y>=112)return;
 center=boss_x+(width>>1);
 if((facing_left && x+8<center) || (!facing_left && x+8>=center))return;
 --boss_health;boss_hit_ticks=8;
 // Hit feedback never resets phase/timer: the net officer cannot be stunned.
 if(!boss_health){boss_defeated|=1u<<current_stage;finish_boss();}
}

void boss_update(void) BANKED {
 int16_t x=player_x/16,y=player_y/16,left,right;
 uint8_t i,row;int8_t motion=0;
 uint8_t cyan=boss_kind==BOSS_TANK && boss_health && x>=768;
 if(cyan!=water_colors){water_colors=cyan;set_sprite_palette(6,1,cyan?boss_water_palette:boss_default_water_palette);}
 if(capture_ticks)--capture_ticks;if(boss_hit_ticks)--boss_hit_ticks;
 if(!boss_kind || !boss_health)return;
 if(!boss_active){
  if(x<832)return;
  boss_active=1;say(boss_kind==BOSS_NET?TXT_BOSS_NET:TXT_BOSS_TANK);
 }
 if((boss_phase==BOSS_REST || boss_phase==BOSS_RECOVER) && boss_kind==BOSS_NET){
  boss_left=x+8<boss_x+12;
  if(!(clock_tick&1u)){
   if(boss_left && boss_x>912)--boss_x;
   else if(!boss_left && boss_x<960)++boss_x;
  }
 }
 if(boss_kind==BOSS_TANK){
  if(boss_phase==BOSS_REST || boss_phase==BOSS_RECOVER){
   boss_left=x+8<boss_x+24;
   if(!(clock_tick&1u)){
    if(boss_x<=904)boss_drive_left=0;else if(boss_x>=936)boss_drive_left=1;
    motion=boss_drive_left?-1:1;boss_x+=motion;
   }
  }
  truck_body(motion);x=player_x/16;y=player_y/16;
 }
 if(boss_timer)--boss_timer;
 if(!boss_timer){
  if(boss_phase==BOSS_REST){
   boss_phase=BOSS_WARN;boss_timer=48;
   boss_left=x+8<boss_x+(boss_kind==BOSS_NET?12:24);boss_aim=y+15<88?80u:96u;
   say(boss_kind==BOSS_NET?TXT_BOSS_NET_WARN:TXT_BOSS_TANK_WARN);
  }else if(boss_phase==BOSS_WARN){boss_phase=BOSS_ATTACK;boss_timer=boss_kind==BOSS_NET?24u:36u;say(TXT_BOSS_DODGE);}
  else if(boss_phase==BOSS_ATTACK){boss_phase=BOSS_RECOVER;boss_timer=90;say(TXT_BOSS_OPEN);}
  else{boss_phase=BOSS_REST;boss_timer=75;}
 }
 if(boss_phase!=BOSS_ATTACK)return;
 if(boss_kind==BOSS_NET){
  if(boss_timer>14u){if(boss_left && boss_x>896)--boss_x;else if(!boss_left && boss_x<976)++boss_x;}
  left=boss_left?boss_x-24:boss_x+28;right=left+20;
  if(x+3<right && x+13>left && y+6<104 && y+15>88)hurt_player();
 }else{
  row=arc_row();
  for(i=0;i<6u;++i)if(water_hits(x,y,jet_x(i),arc_y[row][i],8)){hurt_player();return;}
  if(water_hits(x,y,splash_x(),splash_y(),16))hurt_player();
 }
}

/* Reserve a whole metasprite once. Boss parts stay above the ground and use
 * the same conservative ten-object bands as normal actors. */
static void stamp(int16_t x,uint8_t y,uint8_t cols,uint8_t rows,uint8_t base,uint8_t prop){
 uint8_t b,top,bottom,q,xx,yy,limit=10u-cols,count=cols*rows;OAM_item_t *item;
 if(x<0 || x>=160 || oam_next+count>40u)return;
 top=y>>3;bottom=(y+rows*8u-1u)>>3;
 for(b=top;b<=bottom;++b)if(scanlines[b]>limit)return;
 for(b=top;b<=bottom;++b){scanlines[b]+=cols;if(scanlines[b]>max_scanline_objects)max_scanline_objects=scanlines[b];}
 item=&shadow_OAM[oam_next];
 for(yy=0;yy<rows;++yy)for(xx=0;xx<cols;++xx){
  q=yy*cols+((prop&S_FLIPX)?cols-1u-xx:xx);
  item->x=(uint8_t)x+xx*8u+8u;item->y=y+yy*8u+16u;item->tile=base+q;item->prop=prop;++item;
 }
 oam_next+=count;
}

void boss_render(void) BANKED {
 int16_t x,net;uint8_t i,y,p,hp,tile;
 if(player_hurt)object(76,6,BOSS_HURT_TILE,10);
 if(!boss_kind || !boss_health || !boss_active)return;
 x=boss_x-camera_x;
 hp=boss_kind==BOSS_NET?boss_health*2u:boss_health;
 stamp(x+(boss_kind==BOSS_NET?0:12),40,3,1,BOSS_METER_TILE+hp*3u,boss_hit_ticks?13u:15u);
 if(boss_kind==BOSS_NET){
  p=9u+(boss_left?0u:S_FLIPX);
  stamp(x,88,3,3,BOSS_OFFICER_TILE+((clock_tick>>3)&1u)*9u,p);
  if(boss_phase==BOSS_ATTACK){net=boss_left?x-24:x+24;stamp(net,88,3,2,BOSS_NET_SWING_TILE,15u+(boss_left?0u:S_FLIPX));}
  else{net=boss_left?x-8:x+16;y=boss_phase==BOSS_WARN&&clock_tick&8u?64u:72u;stamp(net,y,2,2,BOSS_NET_RAISED_TILE,15u+(boss_left?0u:S_FLIPX));}
 }else{
  stamp(x,96,6,2,BOSS_TRUCK_TILE,9u+(boss_left?S_FLIPX:0u));
  y=88;if(boss_phase==BOSS_WARN && (clock_tick&8u))y-=2u;
  tile=BOSS_CANNON_TILE+(boss_phase==BOSS_ATTACK?2u:boss_phase==BOSS_WARN?1u:0u)*2u;
  stamp(boss_left?x-8:x+40,y,2,1,tile,9u+(boss_left?0u:S_FLIPX));
  if(boss_phase==BOSS_ATTACK){
   p=arc_row();
   stamp(splash_x()-camera_x,splash_y(),2,1,BOSS_SPLASH_TILE+((clock_tick>>2)&1u)*2u,14);
   for(i=0;i<6u;++i)object(jet_x(i)-camera_x,arc_y[p][i],BOSS_WATER_TILE+((clock_tick+i)&3u),14u+(boss_left?S_FLIPX:0u));
  }else if(boss_phase==BOSS_WARN){
   stamp(splash_x()-camera_x,splash_y(),2,1,BOSS_SPLASH_TILE,13);
  }
 }
 if(boss_phase==BOSS_WARN && (clock_tick&8u))object(x+8,56,BOSS_WARNING_TILE,10);
}
