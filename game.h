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
extern int16_t player_x,player_y,player_vx,player_vy,camera_x;
extern int16_t previous_player_bottom;
extern uint8_t grounded;
extern uint8_t invulnerable,facing_left,bark_ticks,bark_cooldown,dog_frame,clock_tick;
extern uint8_t barrier_open,barrier_redraw,hud_dirty,hud_pending,hud_mode;
extern uint8_t hud_lives_cache,hud_object_count,message_id,message_timer,icon_tiles[3],hud_tiles[40];
extern uint16_t total_empanadas;
extern volatile uint8_t pending_dialog;
enum { BOSS_NONE, BOSS_NET, BOSS_TANK };
enum { BOSS_REST, BOSS_WARN, BOSS_ATTACK, BOSS_RECOVER };
extern uint8_t boss_kind,boss_health,boss_phase,boss_timer,boss_left,boss_aim;
extern uint8_t boss_active,boss_defeated,player_hurt,capture_ticks,boss_hit_ticks;
extern uint8_t boss_drive_left;
extern int16_t boss_x;
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
void hud(void) BANKED;
void boss_load(uint8_t restart) BANKED;
void boss_update(void) BANKED;
void boss_bark(void) BANKED;
void boss_render(void) BANKED;
void kill_player(void) NONBANKED;
void sound(uint8_t kind) BANKED;
void say(uint8_t id) NONBANKED;
void finish_boss(void) NONBANKED;
uint8_t ui_update(void) BANKED;
#endif
