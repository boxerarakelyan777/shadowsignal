// src/config/components.js
// Centralized component registry + prefab builders.
// Change defaults/styles/sprite paths here to update globally.

const COMPONENT_LIBRARY = Object.freeze({
  defaults: Object.freeze({
    level: Object.freeze({
      floorVariant: "default",
      wallVariant: "default",
    }),
    player: Object.freeze({
      componentType: "player",
      w: 22,
      h: 22,
      drawW: 64,
      drawH: 64,
      speed: 220,
    }),
    // Guard geometry/render defaults only.
    // Guard behavior tuning lives in TUNING.guard.
    guard: Object.freeze({
      componentType: "guard",
      w: 28,
      h: 28,
      drawW: 64,
      drawH: 64,
    }),
    wall: Object.freeze({
      componentType: "wall",
      variant: "default",
    }),
    hideSpot: Object.freeze({
      componentType: "hideSpot",
      variant: "default",
      occupied: false,
    }),
    keycard: Object.freeze({
      componentType: "keycard",
      variant: "default",
      w: 26,
      h: 26,
    }),
    terminal: Object.freeze({
      componentType: "terminal",
      variant: "default",
      w: 40,
      h: 30,
    }),
    lockedDoor: Object.freeze({
      componentType: "lockedDoor",
      variant: "locked",
      locked: true,
      state: "LOCKED",
      motionType: "auto",
      slideAxis: "auto",
      slideDirection: "auto",
      openDuration: 0.3,
      openProgress: 0,
    }),
    exitZone: Object.freeze({
      componentType: "exitZone",
      variant: "default",
    }),
  }),

  visuals: Object.freeze({
    floor: Object.freeze({
      default: Object.freeze({
        spritePath: "./assets/sprites/shadow_signal_environment_kit/final/floors/base/concrete/floor_concrete_base_02.png",
        tileSpritePaths: Object.freeze([
          "./assets/sprites/shadow_signal_environment_kit/final/floors/base/concrete/floor_concrete_base_02.png",
          "./assets/sprites/shadow_signal_environment_kit/final/floors/base/concrete/floor_concrete_base_01.png",
          "./assets/sprites/shadow_signal_environment_kit/final/floors/base/concrete/floor_concrete_base_03.png",
          "./assets/sprites/shadow_signal_environment_kit/final/floors/base/concrete/floor_concrete_base_04.png",
        ]),
        tileMode: "repeat",
        tileW: 128,
        tileH: 128,
        tileAnchorX: 0,
        tileAnchorY: 0,
        spritePixelSnap: true,
        variantClusterTiles: 2,
        forceSingleTile: false,
        tileAllowFlip: false,
        tileAllowRotate: false,
        spriteAlpha: 1,
        macroSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/floors/macro/concrete/floor_macro_concrete_01.png",
        macroTileSpritePaths: Object.freeze([
          "./assets/sprites/shadow_signal_environment_kit/final/floors/macro/concrete/floor_macro_concrete_01.png",
          "./assets/sprites/shadow_signal_environment_kit/final/floors/macro/concrete/floor_macro_concrete_02.png",
        ]),
        macroTileW: 512,
        macroTileH: 512,
        macroAlpha: 0.09,
        macroBlend: "soft-light",
        macroTileAnchorX: 0,
        macroTileAnchorY: 0,
        transitionSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/floors/transitions/floor_transition_ops_to_concrete.png",
        transitionTileW: 512,
        transitionTileH: 512,
        transitionAlpha: 0,
        transitionBlend: "soft-light",
        transitionTileAnchorX: 0,
        transitionTileAnchorY: 0,
        decalSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/floors/decals/floor_decals_common.png",
        decalTileW: 1024,
        decalTileH: 1024,
        decalAlpha: 0,
        decalBlend: "soft-light",
        decalTileAnchorX: 0,
        decalTileAnchorY: 0,
        markingSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/floors/markings/floor_markings_hazard.png",
        markingTileW: 512,
        markingTileH: 512,
        markingAlpha: 0,
        markingBlend: "overlay",
        markingTileAnchorX: 0,
        markingTileAnchorY: 0,
        gradientStops: Object.freeze(["rgba(26, 38, 50, 0.19)", "rgba(9, 16, 24, 0.28)"]),
        gradientAxis: "diag",
        overlay: "rgba(5, 10, 16, 0.035)",
        gridSize: 64,
        gridColor: false,
        ambientDepth: 0.035,
        toneBreakupStrength: 0,
        toneBreakupCell: 640,
      }),
      concrete: Object.freeze({
        spritePath: "./assets/sprites/shadow_signal_environment_kit/final/floors/base/concrete/floor_concrete_base_02.png",
        tileSpritePaths: Object.freeze([
          "./assets/sprites/shadow_signal_environment_kit/final/floors/base/concrete/floor_concrete_base_02.png",
          "./assets/sprites/shadow_signal_environment_kit/final/floors/base/concrete/floor_concrete_base_01.png",
          "./assets/sprites/shadow_signal_environment_kit/final/floors/base/concrete/floor_concrete_base_03.png",
          "./assets/sprites/shadow_signal_environment_kit/final/floors/base/concrete/floor_concrete_base_04.png",
        ]),
        tileMode: "repeat",
        tileW: 128,
        tileH: 128,
        tileAnchorX: 0,
        tileAnchorY: 0,
        spritePixelSnap: true,
        variantClusterTiles: 2,
        forceSingleTile: false,
        tileAllowFlip: false,
        tileAllowRotate: false,
        spriteAlpha: 1,
        macroSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/floors/macro/concrete/floor_macro_concrete_01.png",
        macroTileSpritePaths: Object.freeze([
          "./assets/sprites/shadow_signal_environment_kit/final/floors/macro/concrete/floor_macro_concrete_01.png",
          "./assets/sprites/shadow_signal_environment_kit/final/floors/macro/concrete/floor_macro_concrete_02.png",
        ]),
        macroTileW: 512,
        macroTileH: 512,
        macroAlpha: 0.09,
        macroBlend: "soft-light",
        macroTileAnchorX: 0,
        macroTileAnchorY: 0,
        transitionTileSpritePaths: Object.freeze([
          "./assets/sprites/shadow_signal_environment_kit/final/floors/transitions/floor_transition_ops_to_concrete.png",
          "./assets/sprites/shadow_signal_environment_kit/final/floors/transitions/floor_transition_concrete_to_secure.png",
        ]),
        transitionTileW: 512,
        transitionTileH: 512,
        transitionAlpha: 0,
        transitionBlend: "soft-light",
        transitionTileAnchorX: 0,
        transitionTileAnchorY: 0,
        decalSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/floors/decals/floor_decals_common.png",
        decalTileW: 1024,
        decalTileH: 1024,
        decalAlpha: 0,
        decalBlend: "soft-light",
        decalTileAnchorX: 0,
        decalTileAnchorY: 0,
        markingSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/floors/markings/floor_markings_hazard.png",
        markingTileW: 512,
        markingTileH: 512,
        markingAlpha: 0,
        markingBlend: "overlay",
        markingTileAnchorX: 0,
        markingTileAnchorY: 0,
        gradientStops: Object.freeze(["rgba(12, 21, 30, 0.2)", "rgba(6, 11, 18, 0.32)"]),
        gradientAxis: "diag",
        overlay: "rgba(4, 8, 13, 0.04)",
        gridSize: 64,
        gridColor: false,
        ambientDepth: 0.035,
        toneBreakupStrength: 0,
        toneBreakupCell: 700,
      }),
      ops: Object.freeze({
        spritePath: "./assets/sprites/shadow_signal_environment_kit/final/floors/base/ops/floor_ops_base_01.png",
        tileSpritePaths: Object.freeze([
          "./assets/sprites/shadow_signal_environment_kit/final/floors/base/ops/floor_ops_base_01.png",
          "./assets/sprites/shadow_signal_environment_kit/final/floors/base/ops/floor_ops_base_02.png",
          "./assets/sprites/shadow_signal_environment_kit/final/floors/base/ops/floor_ops_base_03.png",
          "./assets/sprites/shadow_signal_environment_kit/final/floors/base/ops/floor_ops_base_04.png",
        ]),
        tileMode: "repeat",
        tileW: 128,
        tileH: 128,
        tileAnchorX: 0,
        tileAnchorY: 0,
        spritePixelSnap: true,
        variantClusterTiles: 2,
        forceSingleTile: false,
        tileAllowFlip: false,
        tileAllowRotate: false,
        spriteAlpha: 1,
        macroSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/floors/macro/ops/floor_macro_ops_01.png",
        macroTileSpritePaths: Object.freeze([
          "./assets/sprites/shadow_signal_environment_kit/final/floors/macro/ops/floor_macro_ops_01.png",
          "./assets/sprites/shadow_signal_environment_kit/final/floors/macro/ops/floor_macro_ops_02.png",
        ]),
        macroTileW: 512,
        macroTileH: 512,
        macroAlpha: 0.08,
        macroBlend: "soft-light",
        macroTileAnchorX: 0,
        macroTileAnchorY: 0,
        transitionSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/floors/transitions/floor_transition_ops_to_concrete.png",
        transitionTileW: 512,
        transitionTileH: 512,
        transitionAlpha: 0,
        transitionBlend: "soft-light",
        transitionTileAnchorX: 0,
        transitionTileAnchorY: 0,
        decalSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/floors/decals/floor_decals_common.png",
        decalTileW: 1024,
        decalTileH: 1024,
        decalAlpha: 0,
        decalBlend: "soft-light",
        decalTileAnchorX: 0,
        decalTileAnchorY: 0,
        markingSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/floors/markings/floor_markings_hazard.png",
        markingTileW: 512,
        markingTileH: 512,
        markingAlpha: 0,
        markingBlend: "overlay",
        markingTileAnchorX: 0,
        markingTileAnchorY: 0,
        gradientStops: Object.freeze(["rgba(18, 33, 46, 0.22)", "rgba(8, 15, 23, 0.34)"]),
        gradientAxis: "diag",
        overlay: "rgba(6, 10, 16, 0.05)",
        gridSize: 64,
        gridColor: false,
        ambientDepth: 0.045,
        toneBreakupStrength: 0,
        toneBreakupCell: 640,
      }),
      secure: Object.freeze({
        spritePath: "./assets/sprites/shadow_signal_environment_kit/final/floors/base/secure/floor_secure_base_02.png",
        tileSpritePaths: Object.freeze([
          "./assets/sprites/shadow_signal_environment_kit/final/floors/base/secure/floor_secure_base_02.png",
          "./assets/sprites/shadow_signal_environment_kit/final/floors/base/secure/floor_secure_base_01.png",
          "./assets/sprites/shadow_signal_environment_kit/final/floors/base/secure/floor_secure_base_03.png",
          "./assets/sprites/shadow_signal_environment_kit/final/floors/base/secure/floor_secure_base_04.png",
        ]),
        tileMode: "repeat",
        tileW: 128,
        tileH: 128,
        tileAnchorX: 0,
        tileAnchorY: 0,
        spritePixelSnap: true,
        variantClusterTiles: 2,
        forceSingleTile: false,
        tileAllowFlip: false,
        tileAllowRotate: false,
        spriteAlpha: 1,
        macroSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/floors/macro/secure/floor_macro_secure_01.png",
        macroTileSpritePaths: Object.freeze([
          "./assets/sprites/shadow_signal_environment_kit/final/floors/macro/secure/floor_macro_secure_01.png",
          "./assets/sprites/shadow_signal_environment_kit/final/floors/macro/secure/floor_macro_secure_02.png",
        ]),
        macroTileW: 512,
        macroTileH: 512,
        macroAlpha: 0.1,
        macroBlend: "soft-light",
        macroTileAnchorX: 0,
        macroTileAnchorY: 0,
        transitionSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/floors/transitions/floor_transition_concrete_to_secure.png",
        transitionTileW: 512,
        transitionTileH: 512,
        transitionAlpha: 0,
        transitionBlend: "soft-light",
        transitionTileAnchorX: 0,
        transitionTileAnchorY: 0,
        decalSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/floors/decals/floor_decals_common.png",
        decalTileW: 1024,
        decalTileH: 1024,
        decalAlpha: 0,
        decalBlend: "soft-light",
        decalTileAnchorX: 0,
        decalTileAnchorY: 0,
        markingSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/floors/markings/floor_markings_hazard.png",
        markingTileW: 512,
        markingTileH: 512,
        markingAlpha: 0,
        markingBlend: "overlay",
        markingTileAnchorX: 0,
        markingTileAnchorY: 0,
        gradientStops: Object.freeze(["rgba(14, 23, 32, 0.22)", "rgba(6, 11, 18, 0.38)"]),
        gradientAxis: "diag",
        overlay: "rgba(5, 8, 12, 0.06)",
        gridSize: 64,
        gridColor: false,
        ambientDepth: 0.055,
        toneBreakupStrength: 0,
        toneBreakupCell: 720,
      }),
    }),

    wall: Object.freeze({
      default: Object.freeze({
        spritePath: "./assets/sprites/shadow_signal_environment_kit/final/walls/base/default/wall_panel_default_01.png",
        tileSpritePaths: Object.freeze([
          "./assets/sprites/shadow_signal_environment_kit/final/walls/base/default/wall_panel_default_01.png",
          "./assets/sprites/shadow_signal_environment_kit/final/walls/base/default/wall_panel_default_02.png",
          "./assets/sprites/shadow_signal_environment_kit/final/walls/base/default/wall_panel_default_03.png",
        ]),
        tileMode: "repeat",
        tileW: 64,
        tileH: 64,
        tileAnchorX: 0,
        tileAnchorY: 0,
        spritePixelSnap: true,
        variantClusterTiles: 2,
        forceSingleTile: false,
        tileAllowFlip: false,
        tileAllowRotate: false,
        spriteAlpha: 1,
        gradientStops: Object.freeze(["rgba(181, 208, 229, 0.44)", "rgba(54, 76, 98, 0.68)"]),
        gradientAxis: "y",
        overlay: "rgba(5, 9, 14, 0.08)",
        borderColor: "rgba(230, 245, 255, 0.3)",
        borderWidth: 0.95,
        decalSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/walls/decals/wall_decals_industrial.png",
        decalTileW: 1024,
        decalTileH: 1024,
        decalAlpha: 0,
        decalBlend: "overlay",
        decalTileAnchorX: 0,
        decalTileAnchorY: 0,
        trimSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/walls/trim/wall_trim_light_dark.png",
        trimAlpha: 0.16,
        groundingSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/walls/grounding/wall_base_shadow_strip.png",
        groundingAlpha: 0.17,
        aoSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/walls/ao/corner_ao_set.png",
        aoAlpha: 0.09,
      }),
      bulkhead: Object.freeze({
        spritePath: "./assets/sprites/shadow_signal_environment_kit/final/walls/base/bulkhead/wall_panel_bulkhead_01.png",
        tileSpritePaths: Object.freeze([
          "./assets/sprites/shadow_signal_environment_kit/final/walls/base/bulkhead/wall_panel_bulkhead_01.png",
          "./assets/sprites/shadow_signal_environment_kit/final/walls/base/bulkhead/wall_panel_bulkhead_02.png",
          "./assets/sprites/shadow_signal_environment_kit/final/walls/base/bulkhead/wall_panel_bulkhead_03.png",
        ]),
        tileMode: "repeat",
        tileW: 64,
        tileH: 64,
        tileAnchorX: 0,
        tileAnchorY: 0,
        spritePixelSnap: true,
        variantClusterTiles: 2,
        forceSingleTile: false,
        tileAllowFlip: false,
        tileAllowRotate: false,
        spriteAlpha: 1,
        gradientStops: Object.freeze(["rgba(168, 198, 221, 0.42)", "rgba(49, 70, 92, 0.7)"]),
        gradientAxis: "y",
        overlay: "rgba(6, 10, 16, 0.085)",
        borderColor: "rgba(230, 245, 255, 0.3)",
        borderWidth: 0.95,
        decalSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/walls/decals/wall_decals_industrial.png",
        decalTileW: 1024,
        decalTileH: 1024,
        decalAlpha: 0,
        decalBlend: "overlay",
        decalTileAnchorX: 0,
        decalTileAnchorY: 0,
        trimSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/walls/trim/wall_trim_light_dark.png",
        trimAlpha: 0.17,
        groundingSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/walls/grounding/wall_base_shadow_strip.png",
        groundingAlpha: 0.18,
        aoSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/walls/ao/corner_ao_set.png",
        aoAlpha: 0.1,
      }),
      reinforced: Object.freeze({
        spritePath: "./assets/sprites/shadow_signal_environment_kit/final/walls/base/reinforced/wall_panel_reinforced_01.png",
        tileSpritePaths: Object.freeze([
          "./assets/sprites/shadow_signal_environment_kit/final/walls/base/reinforced/wall_panel_reinforced_01.png",
          "./assets/sprites/shadow_signal_environment_kit/final/walls/base/reinforced/wall_panel_reinforced_02.png",
          "./assets/sprites/shadow_signal_environment_kit/final/walls/base/reinforced/wall_panel_reinforced_03.png",
        ]),
        tileMode: "repeat",
        tileW: 64,
        tileH: 64,
        tileAnchorX: 0,
        tileAnchorY: 0,
        spritePixelSnap: true,
        variantClusterTiles: 2,
        forceSingleTile: false,
        tileAllowFlip: false,
        tileAllowRotate: false,
        spriteAlpha: 1,
        gradientStops: Object.freeze(["rgba(160, 188, 212, 0.4)", "rgba(44, 63, 85, 0.72)"]),
        gradientAxis: "y",
        overlay: "rgba(6, 10, 16, 0.09)",
        borderColor: "rgba(220, 238, 252, 0.28)",
        borderWidth: 0.9,
        decalSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/walls/decals/wall_decals_industrial.png",
        decalTileW: 1024,
        decalTileH: 1024,
        decalAlpha: 0,
        decalBlend: "overlay",
        decalTileAnchorX: 0,
        decalTileAnchorY: 0,
        trimSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/walls/trim/wall_trim_light_dark.png",
        trimAlpha: 0.16,
        groundingSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/walls/grounding/wall_base_shadow_strip.png",
        groundingAlpha: 0.17,
        aoSpritePath: "./assets/sprites/shadow_signal_environment_kit/final/walls/ao/corner_ao_set.png",
        aoAlpha: 0.09,
      }),
    }),

    hideSpot: Object.freeze({
      default: Object.freeze({
        spritePath: "./assets/sprites/shadowsignal_v2/world/hide/hide_pad_idle_64.png",
        spriteOnly: true,
        spriteMode: "contain",
        spritePixelSnap: true,
        spriteInset: 0,
        spriteOffsetY: 0,
        spriteAlpha: 1,
        borderWidth: 0,
      }),
      occupied: Object.freeze({
        spritePath: "./assets/sprites/shadowsignal_v2/world/hide/hide_pad_occupied_64.png",
        spriteOnly: true,
        spriteMode: "contain",
        spritePixelSnap: true,
        spriteInset: 0,
        spriteOffsetY: 0,
        spriteAlpha: 1,
        borderWidth: 0,
      }),
    }),

    terminal: Object.freeze({
      default: Object.freeze({
        spritePath: "./assets/sprites/shadowsignal_v2/world/terminal/terminal_idle_80x60.png",
        spriteMode: "contain",
        spritePixelSnap: true,
        spriteOffsetY: -1,
        spriteAlpha: 1,
        gradientStops: Object.freeze(["#ffd182", "#bd7a2d"]),
        gradientAxis: "diag",
        borderColor: "rgba(255,255,255,0.4)",
        borderWidth: 1.5,
      }),
      complete: Object.freeze({
        spritePath: "./assets/sprites/shadowsignal_v2/world/terminal/terminal_complete_80x60.png",
        spriteMode: "contain",
        spritePixelSnap: true,
        spriteOffsetY: -1,
        spriteAlpha: 1,
        gradientStops: Object.freeze(["#7ff3bf", "#2f8e62"]),
        gradientAxis: "diag",
        borderColor: "rgba(255,255,255,0.4)",
        borderWidth: 1.5,
      }),
    }),

    keycard: Object.freeze({
      default: Object.freeze({
        fill: "rgba(255, 220, 82, 0.92)",
        borderColor: "rgba(255, 247, 209, 0.92)",
        borderWidth: 1.25,
      }),
    }),

    lockedDoor: Object.freeze({
      locked: Object.freeze({
        spritePath: "./assets/sprites/shadowsignal_v2/world/doors/door_locked_tile_64.png",
        tileMode: "repeat",
        tileW: 32,
        tileH: 32,
        spritePixelSnap: true,
        spriteAlpha: 1,
        gradientStops: Object.freeze(["#b36a3a", "#7e3f1f"]),
        gradientAxis: "y",
        borderColor: "rgba(255, 219, 179, 0.45)",
        borderWidth: 2,
      }),
      open: Object.freeze({
        spritePath: "./assets/sprites/shadowsignal_v2/world/doors/door_open_track_tile_64.png",
        tileMode: "repeat",
        tileW: 32,
        tileH: 32,
        spritePixelSnap: true,
        spriteAlpha: 1,
        gradientStops: Object.freeze(["rgba(134, 222, 164, 0.9)", "rgba(55, 153, 96, 0.62)"]),
        gradientAxis: "y",
        borderColor: "rgba(176, 255, 211, 0.5)",
        borderWidth: 2,
      }),
    }),

    exitZone: Object.freeze({
      default: Object.freeze({
        spritePath: "./assets/sprites/shadowsignal_v2/world/exit/extract_pad_64.png",
        spriteOnly: true,
        spriteMode: "contain",
        spritePixelSnap: true,
        spriteInset: 4,
        spriteMaxScale: 1,
        spriteAlpha: 1,
        borderWidth: 0,
      }),
    }),
  }),
});

const UI_ASSETS = Object.freeze({
  splashBackground: "./assets/ui/splash-background.jpg",
  menuBackground: "./assets/ui/menu-background.jpg",
});

const ART_PACK = Object.freeze({
  basePath: "./assets/sprites/shadowsignal_v2",
  uiIcons: Object.freeze({
    interact: Object.freeze({
      path: "./assets/sprites/shadowsignal_v2/ui/icons/interact_32_strip.png",
      frameW: 32,
      frameH: 32,
      frames: 4,
      fps: 8,
      loop: true,
    }),
    objective: Object.freeze({
      path: "./assets/sprites/shadowsignal_v2/ui/icons/objective_32_strip.png",
      frameW: 32,
      frameH: 32,
      frames: 4,
      fps: 8,
      loop: true,
    }),
    keycard: Object.freeze({
      path: "./assets/sprites/shadowsignal_v2/ui/icons/keycard_32_strip.png",
      frameW: 32,
      frameH: 32,
      frames: 4,
      fps: 8,
      loop: true,
    }),
    battery: Object.freeze({
      path: "./assets/sprites/shadowsignal_v2/ui/icons/battery_32_strip.png",
      frameW: 32,
      frameH: 32,
      frames: 4,
      fps: 8,
      loop: true,
    }),
    pause: Object.freeze({
      path: "./assets/sprites/shadowsignal_v2/ui/icons/pause_32_strip.png",
      frameW: 32,
      frameH: 32,
      frames: 4,
      fps: 8,
      loop: true,
    }),
    warning: Object.freeze({
      path: "./assets/sprites/shadowsignal_v2/ui/icons/warning_32_strip.png",
      frameW: 32,
      frameH: 32,
      frames: 4,
      fps: 8,
      loop: true,
    }),
    door_locked: Object.freeze({
      path: "./assets/sprites/shadowsignal_v2/ui/icons/door_locked_32_strip.png",
      frameW: 32,
      frameH: 32,
      frames: 4,
      fps: 8,
      loop: true,
    }),
    door_unlocked: Object.freeze({
      path: "./assets/sprites/shadowsignal_v2/ui/icons/door_unlocked_32_strip.png",
      frameW: 32,
      frameH: 32,
      frames: 4,
      fps: 8,
      loop: true,
    }),
    eye: Object.freeze({
      path: "./assets/sprites/shadowsignal_v2/ui/icons/eye_32_strip.png",
      frameW: 32,
      frameH: 32,
      frames: 4,
      fps: 8,
      loop: true,
    }),
    noise: Object.freeze({
      path: "./assets/sprites/shadowsignal_v2/ui/icons/noise_32_strip.png",
      frameW: 32,
      frameH: 32,
      frames: 4,
      fps: 8,
      loop: true,
    }),
  }),
  worldPrompts: Object.freeze({
    interact: Object.freeze({
      path: "./assets/sprites/shadowsignal_v2/prompts/world_prompt_interact_64.png",
      frameW: 64,
      frameH: 64,
      frames: 3,
      fps: 8,
      loop: true,
    }),
  }),
  pickups: Object.freeze({
    keycard: Object.freeze({
      path: "./assets/sprites/shadowsignal_v2/pickups/pickup_keycard_32.png",
      frameW: 32,
      frameH: 32,
      frames: 4,
      fps: 8,
      loop: true,
    }),
    gem: Object.freeze({
      path: "./assets/sprites/shadowsignal_v2/pickups/pickup_datachip_32.png",
      frameW: 32,
      frameH: 32,
      frames: 4,
      fps: 8,
      loop: true,
    }),
  }),
  vfx: Object.freeze({
    sparkle: Object.freeze({
      path: "./assets/sprites/shadowsignal_v2/vfx/vfx_sparkle_64.png",
      frameW: 64,
      frameH: 64,
      frames: 6,
      fps: 14,
      loop: false,
    }),
    hit: Object.freeze({
      path: "./assets/sprites/shadowsignal_v2/vfx/vfx_hit_64.png",
      frameW: 64,
      frameH: 64,
      frames: 5,
      fps: 16,
      loop: false,
    }),
    dust: Object.freeze({
      path: "./assets/sprites/shadowsignal_v2/vfx/vfx_dust_64.png",
      frameW: 64,
      frameH: 64,
      frames: 6,
      fps: 12,
      loop: false,
    }),
  }),
});

function getComponentDefaults(typeId) {
  const defaults = COMPONENT_LIBRARY.defaults[typeId];
  return defaults ? { ...defaults } : {};
}

function getComponentVisual(typeId, variant = "default") {
  const group = COMPONENT_LIBRARY.visuals[typeId];
  if (!group) return null;
  if (variant && group[variant]) return group[variant];
  return group.default || null;
}

function listComponentSpritePaths() {
  const unique = new Set();
  const visuals = COMPONENT_LIBRARY.visuals;

  const addPath = value => {
    if (typeof value === "string" && value) unique.add(value);
  };

  const addMaybeList = value => {
    if (Array.isArray(value)) {
      for (const item of value) addPath(item);
    } else {
      addPath(value);
    }
  };

  for (const typeId of Object.keys(visuals)) {
    const variants = visuals[typeId];
    for (const variantId of Object.keys(variants)) {
      const visual = variants[variantId];
      if (!visual) continue;
      addPath(visual.spritePath);
      addMaybeList(visual.tileSpritePaths);
      addPath(visual.macroSpritePath);
      addMaybeList(visual.macroTileSpritePaths);
      addPath(visual.transitionSpritePath);
      addMaybeList(visual.transitionTileSpritePaths);
      addPath(visual.decalSpritePath);
      addMaybeList(visual.decalTileSpritePaths);
      addPath(visual.markingSpritePath);
      addMaybeList(visual.markingTileSpritePaths);
      addPath(visual.trimSpritePath);
      addPath(visual.groundingSpritePath);
      addPath(visual.aoSpritePath);
    }
  }

  return Array.from(unique);
}

function listArtPackSpritePaths() {
  const unique = new Set();
  if (!ART_PACK) return [];

  for (const icon of Object.values(ART_PACK.uiIcons || {})) {
    if (icon?.path) unique.add(icon.path);
  }

  for (const prompt of Object.values(ART_PACK.worldPrompts || {})) {
    if (prompt?.path) unique.add(prompt.path);
  }

  for (const pickup of Object.values(ART_PACK.pickups || {})) {
    if (pickup?.path) unique.add(pickup.path);
  }

  for (const vfx of Object.values(ART_PACK.vfx || {})) {
    if (vfx?.path) unique.add(vfx.path);
  }

  return Array.from(unique);
}

function getArtPackVfxSpec(typeId) {
  if (!ART_PACK || !ART_PACK.vfx || !typeId) return null;
  return ART_PACK.vfx[typeId] || null;
}

function getArtPackUiIconSpec(iconId) {
  if (!ART_PACK || !ART_PACK.uiIcons || !iconId) return null;
  return ART_PACK.uiIcons[iconId] || null;
}

function getArtPackPickupSpec(pickupId) {
  if (!ART_PACK || !ART_PACK.pickups || !pickupId) return null;
  return ART_PACK.pickups[pickupId] || null;
}

function getArtPackPromptSpec(promptId) {
  if (!ART_PACK || !ART_PACK.worldPrompts || !promptId) return null;
  return ART_PACK.worldPrompts[promptId] || null;
}

function createComponent(typeId, overrides = {}) {
  const base = getComponentDefaults(typeId);
  const component = { ...base, ...(overrides || {}) };
  if (!component.componentType) component.componentType = typeId;
  return component;
}

function createWall(overrides = {}) {
  return createComponent("wall", overrides);
}

function createWalls(rects = [], sharedOverrides = {}) {
  return rects.map(rect => createWall({ ...sharedOverrides, ...rect }));
}

function createHideSpot(overrides = {}) {
  return createComponent("hideSpot", overrides);
}

function createKeycard(overrides = {}) {
  return createComponent("keycard", overrides);
}

function createTerminal(overrides = {}) {
  return createComponent("terminal", overrides);
}

function createLockedDoor(overrides = {}) {
  const door = createComponent("lockedDoor", overrides);
  if (!door.state) {
    door.state = door.locked === false ? "OPEN" : "LOCKED";
  }

  const width = Number(door.w);
  const height = Number(door.h);
  const safeWidth = Number.isFinite(width) ? Math.max(1, width) : 1;
  const safeHeight = Number.isFinite(height) ? Math.max(1, height) : 1;

  if (door.slideAxis !== "x" && door.slideAxis !== "y") {
    // Slide along the door's long side.
    door.slideAxis = safeWidth >= safeHeight ? "x" : "y";
  }

  if (door.motionType !== "split" && door.motionType !== "single") {
    door.motionType = Math.max(safeWidth, safeHeight) >= 96 ? "split" : "single";
  }

  const progress = Number(door.openProgress);
  const fallbackProgress = (door.state === "OPEN" || door.locked === false) ? 1 : 0;
  if (Number.isFinite(progress)) {
    door.openProgress = Math.max(0, Math.min(1, progress));
  } else {
    door.openProgress = fallbackProgress;
  }

  const openDuration = Number(door.openDuration);
  if (!Number.isFinite(openDuration) || openDuration <= 0) {
    door.openDuration = door.motionType === "split" ? 0.36 : 0.24;
  }

  if (door.slideDirection !== "left" && door.slideDirection !== "right" && door.slideDirection !== "up" && door.slideDirection !== "down") {
    const direction = Number(door.slideDirection);
    if (Number.isFinite(direction) && direction !== 0) {
      door.slideDirection = direction > 0 ? 1 : -1;
    } else {
      door.slideDirection = "auto";
    }
  }

  return door;
}

function createExitZone(overrides = {}) {
  return createComponent("exitZone", overrides);
}

function createGuard(overrides = {}) {
  const guard = createComponent("guard", overrides);
  if (Array.isArray(guard.waypoints)) {
    guard.waypoints = guard.waypoints.map(p => ({ x: Number(p.x), y: Number(p.y) }));
  }
  return guard;
}

function createOuterWalls(width, height, thickness = 20) {
  return createWalls([
    { x: 0, y: 0, w: width, h: thickness },
    { x: 0, y: height - thickness, w: width, h: thickness },
    { x: 0, y: 0, w: thickness, h: height },
    { x: width - thickness, y: 0, w: thickness, h: height },
  ]);
}

function normalizeLevelComponents(level) {
  if (!level || typeof level !== "object") return level;

  if (!level.floorVariant) {
    level.floorVariant = getComponentDefaults("level").floorVariant;
  }
  if (!level.wallVariant) {
    level.wallVariant = getComponentDefaults("level").wallVariant;
  }

  if (Array.isArray(level.walls)) {
    level.walls = level.walls.map(wall => {
      if (!wall) return wall;
      if (wall.componentType === "lockedDoor") return createLockedDoor(wall);
      return createWall(wall);
    });
  }

  if (Array.isArray(level.hideSpots)) {
    level.hideSpots = level.hideSpots.map(spot => createHideSpot(spot));
  }

  if (level.keycard) level.keycard = createKeycard(level.keycard);
  if (Array.isArray(level.pickups)) {
    level.pickups = level.pickups.map(pickup => createKeycard(pickup));
  }
  if (level.terminal) level.terminal = createTerminal(level.terminal);
  if (level.lockedDoor) level.lockedDoor = createLockedDoor(level.lockedDoor);
  if (Array.isArray(level.lockedDoors)) {
    level.lockedDoors = level.lockedDoors.map(door => createLockedDoor(door));
  }
  if (level.exitZone) level.exitZone = createExitZone(level.exitZone);

  if (!level.keycard && Array.isArray(level.pickups) && level.pickups.length) {
    const legacyKeycard = level.pickups.find(pickup => {
      if (!pickup) return false;
      if (pickup.grantsFlag === "hasKeycard") return true;
      return Array.isArray(pickup.grantsFlags) && pickup.grantsFlags.includes("hasKeycard");
    });
    if (legacyKeycard) level.keycard = legacyKeycard;
  }

  if (!Array.isArray(level.lockedDoors)) level.lockedDoors = [];
  if (level.lockedDoor && !level.lockedDoors.some(door => door && door.x === level.lockedDoor.x && door.y === level.lockedDoor.y && door.w === level.lockedDoor.w && door.h === level.lockedDoor.h)) {
    level.lockedDoors.unshift(level.lockedDoor);
  }
  if (!level.lockedDoor && level.lockedDoors.length) {
    level.lockedDoor = level.lockedDoors[0];
  }

  if (Array.isArray(level.guards)) {
    level.guards = level.guards.map(guard => createGuard(guard));
  } else if (level.guard) {
    level.guards = [createGuard(level.guard)];
  }

  if (!level.guard && Array.isArray(level.guards) && level.guards.length) {
    level.guard = level.guards[0];
  }

  return level;
}
