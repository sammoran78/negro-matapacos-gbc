#ifndef GAME_H
#define GAME_H
#include <gb/gb.h>
#include <gb/cgb.h>
#include <gbdk/platform.h>
#include "generated/game_assets.h"
enum { LANGUAGE, TITLE, CONTROLS, WORLD, PLAY, PAUSED, DYING, RESCUING, CLEAR, GAME_OVER, ENDING, FINISHED };
enum { ACT_NONE, ACT_LANGUAGE, ACT_NEW_GAME, ACT_WORLD, ACT_PLAY, ACT_RESUME, ACT_RETRY, ACT_TITLE };
extern uint8_t state, language, selected, unlocked, lives, empanadas, completed;
extern uint8_t buttons, pressed, font_lut[256], text_buffer[64], ui_timer, ending_beat;
void screen_load(uint8_t screen) NONBANKED;
void fetch_text(uint8_t id) NONBANKED;
void map_marker(uint8_t x,uint8_t y) NONBANKED;
void ui_show(uint8_t new_state) BANKED;
void format_dialog(uint8_t id,uint8_t *tiles) BANKED;
uint8_t ui_update(void) BANKED;
#endif
