#ifndef GAME_H
#define GAME_H
#include <gb/gb.h>
#include <gb/cgb.h>
#include <gbdk/platform.h>
#include "generated/game_assets.h"
enum { LANGUAGE, TITLE, CONTROLS, WORLD, PLAY, PAUSED, DYING, RESCUING, CLEAR, GAME_OVER, ENDING, FINISHED };
enum { ACT_NONE, ACT_LANGUAGE, ACT_NEW_GAME, ACT_WORLD, ACT_PLAY, ACT_RESUME, ACT_RETRY, ACT_TITLE };
typedef struct { int16_t x, home; uint8_t y, stunned, left, type; } Officer;
extern uint8_t state, language, selected, unlocked, lives, empanadas, completed;
extern uint8_t buttons, pressed, font_lut[256], text_buffer[64], ui_timer, ending_beat;
extern uint8_t hud_digits[3];
extern uint8_t current_stage,officer_health[5],officer_hit_ticks[5];
extern uint8_t defeated_flags[5],reward_collected_flags[5],reward_active[5],reward_delay[5];
extern int16_t reward_x[5],reward_y[5];
extern int8_t reward_vy[5];
extern Officer officers[5];
extern uint8_t oam_next,scanlines[18],max_scanline_objects;
extern uint8_t sprite_frames[128];
void screen_load(uint8_t screen) NONBANKED;
void fetch_text(uint8_t id) NONBANKED;
void map_marker(uint8_t x,uint8_t y) BANKED;
void ui_show(uint8_t new_state) BANKED;
void format_dialog(uint8_t id,uint8_t *tiles) BANKED;
uint8_t draw_corner_hud(uint8_t empanada_tile) BANKED;
uint8_t object(int16_t x,int16_t y,uint8_t tile,uint8_t properties) NONBANKED;
void render_gate(int16_t x,uint8_t strength,uint8_t flash) BANKED;
void reset_officers(void) BANKED;
void run_student(int16_t x,uint8_t color,uint8_t frame) BANKED;
uint8_t ui_update(void) BANKED;
#endif
