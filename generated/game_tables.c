#include "game_assets.h"
#include "../assets/gbdk/alameda_scene.h"
#include "../assets/gbdk/alameda_depth.h"
extern const uint8_t alameda_cell_palettes[16], alameda_terrain[2304], alameda_visual[2304], alameda_attributes[2304], alameda_coin_y[16], alameda_runtime_depth_tiles[2224], alameda_runtime_depth_map[200], alameda_runtime_depth_attributes[200];
extern const uint16_t alameda_coin_x[16], alameda_runtime_palettes[32];
#include "../assets/gbdk/campus_scene.h"
#include "../assets/gbdk/campus_depth.h"
extern const uint8_t campus_cell_palettes[16], campus_terrain[2304], campus_visual[2304], campus_attributes[2304], campus_coin_y[16], campus_runtime_depth_tiles[2864], campus_runtime_depth_map[200], campus_runtime_depth_attributes[200];
extern const uint16_t campus_coin_x[16], campus_runtime_palettes[32];
#include "../assets/gbdk/plaza_scene.h"
#include "../assets/gbdk/plaza_depth.h"
extern const uint8_t plaza_cell_palettes[16], plaza_terrain[2304], plaza_visual[2304], plaza_attributes[2304], plaza_coin_y[16], plaza_runtime_depth_tiles[2816], plaza_runtime_depth_map[200], plaza_runtime_depth_attributes[200];
extern const uint16_t plaza_coin_x[16], plaza_runtime_palettes[32];
#include "../assets/gbdk/mapocho_scene.h"
#include "../assets/gbdk/mapocho_depth.h"
extern const uint8_t mapocho_cell_palettes[16], mapocho_terrain[2304], mapocho_visual[2304], mapocho_attributes[2304], mapocho_coin_y[16], mapocho_runtime_depth_tiles[2496], mapocho_runtime_depth_map[200], mapocho_runtime_depth_attributes[200];
extern const uint16_t mapocho_coin_x[16], mapocho_runtime_palettes[32];
#include "../assets/gbdk/moneda_scene.h"
#include "../assets/gbdk/moneda_depth.h"
extern const uint8_t moneda_cell_palettes[16], moneda_terrain[2304], moneda_visual[2304], moneda_attributes[2304], moneda_coin_y[16], moneda_runtime_depth_tiles[3184], moneda_runtime_depth_map[200], moneda_runtime_depth_attributes[200];
extern const uint16_t moneda_coin_x[16], moneda_runtime_palettes[32];
const StageAsset stage_assets[5] = {
 {3,ALAMEDA_SCENE_TILE_COUNT,139,alameda_scene_tiles,alameda_scene_library_tiles,alameda_cell_palettes,alameda_runtime_depth_tiles,alameda_runtime_depth_map,alameda_runtime_depth_attributes,alameda_terrain,alameda_visual,alameda_attributes,alameda_runtime_palettes,alameda_coin_x,alameda_coin_y,4,5,6,2,11,3,6},
 {4,CAMPUS_SCENE_TILE_COUNT,179,campus_scene_tiles,campus_scene_library_tiles,campus_cell_palettes,campus_runtime_depth_tiles,campus_runtime_depth_map,campus_runtime_depth_attributes,campus_terrain,campus_visual,campus_attributes,campus_runtime_palettes,campus_coin_x,campus_coin_y,4,5,6,8,5,9,6},
 {5,PLAZA_SCENE_TILE_COUNT,176,plaza_scene_tiles,plaza_scene_library_tiles,plaza_cell_palettes,plaza_runtime_depth_tiles,plaza_runtime_depth_map,plaza_runtime_depth_attributes,plaza_terrain,plaza_visual,plaza_attributes,plaza_runtime_palettes,plaza_coin_x,plaza_coin_y,2,3,6,13,14,0,6},
 {6,MAPOCHO_SCENE_TILE_COUNT,156,mapocho_scene_tiles,mapocho_scene_library_tiles,mapocho_cell_palettes,mapocho_runtime_depth_tiles,mapocho_runtime_depth_map,mapocho_runtime_depth_attributes,mapocho_terrain,mapocho_visual,mapocho_attributes,mapocho_runtime_palettes,mapocho_coin_x,mapocho_coin_y,2,3,8,7,14,12,6},
 {7,MONEDA_SCENE_TILE_COUNT,199,moneda_scene_tiles,moneda_scene_library_tiles,moneda_cell_palettes,moneda_runtime_depth_tiles,moneda_runtime_depth_map,moneda_runtime_depth_attributes,moneda_terrain,moneda_visual,moneda_attributes,moneda_runtime_palettes,moneda_coin_x,moneda_coin_y,2,3,4,6,11,0,6}
};
#include "../assets/gbdk/language_select_screen.h"
#include "../assets/gbdk/title_screen.h"
#include "../assets/gbdk/controls_screen.h"
#include "../assets/gbdk/pause_screen.h"
#include "../assets/gbdk/game_over_screen.h"
#include "../assets/gbdk/stage_clear_screen.h"
#include "../assets/gbdk/world_map_screen.h"
#include "../assets/gbdk/world_map_2_screen.h"
#include "../assets/gbdk/world_map_3_screen.h"
#include "../assets/gbdk/world_map_4_screen.h"
#include "../assets/gbdk/world_map_5_screen.h"
#include "../assets/gbdk/ceremony_rescue_screen.h"
#include "../assets/gbdk/ceremony_medal_screen.h"
#include "../assets/gbdk/ceremony_flag_screen.h"
const ScreenAsset screen_assets[14] = {
 {8,LANGUAGE_SELECT_SCREEN_TILE_COUNT,language_select_screen_tiles,language_select_screen_map,language_select_screen_attributes,language_select_screen_palettes},
 {8,TITLE_SCREEN_TILE_COUNT,title_screen_tiles,title_screen_map,title_screen_attributes,title_screen_palettes},
 {8,CONTROLS_SCREEN_TILE_COUNT,controls_screen_tiles,controls_screen_map,controls_screen_attributes,controls_screen_palettes},
 {15,PAUSE_SCREEN_TILE_COUNT,pause_screen_tiles,pause_screen_map,pause_screen_attributes,pause_screen_palettes},
 {8,GAME_OVER_SCREEN_TILE_COUNT,game_over_screen_tiles,game_over_screen_map,game_over_screen_attributes,game_over_screen_palettes},
 {8,STAGE_CLEAR_SCREEN_TILE_COUNT,stage_clear_screen_tiles,stage_clear_screen_map,stage_clear_screen_attributes,stage_clear_screen_palettes},
 {9,WORLD_MAP_SCREEN_TILE_COUNT,world_map_screen_tiles,world_map_screen_map,world_map_screen_attributes,world_map_screen_palettes},
 {10,WORLD_MAP_2_SCREEN_TILE_COUNT,world_map_2_screen_tiles,world_map_2_screen_map,world_map_2_screen_attributes,world_map_2_screen_palettes},
 {11,WORLD_MAP_3_SCREEN_TILE_COUNT,world_map_3_screen_tiles,world_map_3_screen_map,world_map_3_screen_attributes,world_map_3_screen_palettes},
 {12,WORLD_MAP_4_SCREEN_TILE_COUNT,world_map_4_screen_tiles,world_map_4_screen_map,world_map_4_screen_attributes,world_map_4_screen_palettes},
 {13,WORLD_MAP_5_SCREEN_TILE_COUNT,world_map_5_screen_tiles,world_map_5_screen_map,world_map_5_screen_attributes,world_map_5_screen_palettes},
 {14,CEREMONY_RESCUE_SCREEN_TILE_COUNT,ceremony_rescue_screen_tiles,ceremony_rescue_screen_map,ceremony_rescue_screen_attributes,ceremony_rescue_screen_palettes},
 {14,CEREMONY_MEDAL_SCREEN_TILE_COUNT,ceremony_medal_screen_tiles,ceremony_medal_screen_map,ceremony_medal_screen_attributes,ceremony_medal_screen_palettes},
 {14,208,runtime_flag_tiles,runtime_flag_map,runtime_flag_attributes,runtime_flag_palettes}
};
extern const uint8_t text_0_0[];
extern const uint8_t text_0_1[];
extern const uint8_t text_0_2[];
extern const uint8_t text_0_3[];
extern const uint8_t text_0_4[];
extern const uint8_t text_0_5[];
extern const uint8_t text_0_6[];
extern const uint8_t text_0_7[];
extern const uint8_t text_0_8[];
extern const uint8_t text_0_9[];
extern const uint8_t text_0_10[];
extern const uint8_t text_0_11[];
extern const uint8_t text_0_12[];
extern const uint8_t text_0_13[];
extern const uint8_t text_0_14[];
extern const uint8_t text_0_15[];
extern const uint8_t text_0_16[];
extern const uint8_t text_0_17[];
extern const uint8_t text_0_18[];
extern const uint8_t text_0_19[];
extern const uint8_t text_0_20[];
extern const uint8_t text_0_21[];
extern const uint8_t text_0_22[];
extern const uint8_t text_0_23[];
extern const uint8_t text_0_24[];
extern const uint8_t text_0_25[];
extern const uint8_t text_0_26[];
extern const uint8_t text_0_27[];
extern const uint8_t text_0_28[];
extern const uint8_t text_0_29[];
extern const uint8_t text_0_30[];
extern const uint8_t text_0_31[];
extern const uint8_t text_0_32[];
extern const uint8_t text_0_33[];
extern const uint8_t text_0_34[];
extern const uint8_t text_0_35[];
extern const uint8_t text_0_36[];
extern const uint8_t text_0_37[];
extern const uint8_t text_0_38[];
extern const uint8_t text_0_39[];
extern const uint8_t text_0_40[];
extern const uint8_t text_0_41[];
extern const uint8_t text_0_42[];
extern const uint8_t text_1_0[];
extern const uint8_t text_1_1[];
extern const uint8_t text_1_2[];
extern const uint8_t text_1_3[];
extern const uint8_t text_1_4[];
extern const uint8_t text_1_5[];
extern const uint8_t text_1_6[];
extern const uint8_t text_1_7[];
extern const uint8_t text_1_8[];
extern const uint8_t text_1_9[];
extern const uint8_t text_1_10[];
extern const uint8_t text_1_11[];
extern const uint8_t text_1_12[];
extern const uint8_t text_1_13[];
extern const uint8_t text_1_14[];
extern const uint8_t text_1_15[];
extern const uint8_t text_1_16[];
extern const uint8_t text_1_17[];
extern const uint8_t text_1_18[];
extern const uint8_t text_1_19[];
extern const uint8_t text_1_20[];
extern const uint8_t text_1_21[];
extern const uint8_t text_1_22[];
extern const uint8_t text_1_23[];
extern const uint8_t text_1_24[];
extern const uint8_t text_1_25[];
extern const uint8_t text_1_26[];
extern const uint8_t text_1_27[];
extern const uint8_t text_1_28[];
extern const uint8_t text_1_29[];
extern const uint8_t text_1_30[];
extern const uint8_t text_1_31[];
extern const uint8_t text_1_32[];
extern const uint8_t text_1_33[];
extern const uint8_t text_1_34[];
extern const uint8_t text_1_35[];
extern const uint8_t text_1_36[];
extern const uint8_t text_1_37[];
extern const uint8_t text_1_38[];
extern const uint8_t text_1_39[];
extern const uint8_t text_1_40[];
extern const uint8_t text_1_41[];
extern const uint8_t text_1_42[];
const uint8_t * const game_text[2][43] = {
 {text_0_0,text_0_1,text_0_2,text_0_3,text_0_4,text_0_5,text_0_6,text_0_7,text_0_8,text_0_9,text_0_10,text_0_11,text_0_12,text_0_13,text_0_14,text_0_15,text_0_16,text_0_17,text_0_18,text_0_19,text_0_20,text_0_21,text_0_22,text_0_23,text_0_24,text_0_25,text_0_26,text_0_27,text_0_28,text_0_29,text_0_30,text_0_31,text_0_32,text_0_33,text_0_34,text_0_35,text_0_36,text_0_37,text_0_38,text_0_39,text_0_40,text_0_41,text_0_42},
 {text_1_0,text_1_1,text_1_2,text_1_3,text_1_4,text_1_5,text_1_6,text_1_7,text_1_8,text_1_9,text_1_10,text_1_11,text_1_12,text_1_13,text_1_14,text_1_15,text_1_16,text_1_17,text_1_18,text_1_19,text_1_20,text_1_21,text_1_22,text_1_23,text_1_24,text_1_25,text_1_26,text_1_27,text_1_28,text_1_29,text_1_30,text_1_31,text_1_32,text_1_33,text_1_34,text_1_35,text_1_36,text_1_37,text_1_38,text_1_39,text_1_40,text_1_41,text_1_42}
};
