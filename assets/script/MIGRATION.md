# Toast N Roll Cocos Migration

> **状态**: ✅ 迁移已完成（2026-04-26）

This project has been migrated from the Vite prototype into a Cocos Creator host.

Current direction:

- `assets/script/game/session/`: application orchestration for a running match
- `assets/script/view/`: Cocos-facing rendering and interaction components
- `assets/script/domain/`: pure rules ported from the original prototype

Migration rule:

- Keep board rules, match detection, customer logic, and level config as pure TypeScript modules
- Keep scene components thin
- Do not make prefab or scene data the source of truth for gameplay rules

Current status on 2026-04-20:

- `GameSession` already exposes session snapshots and events for host-side rendering
- `BoardView` already handles drag swap and a staged swap timeline: swap -> clear -> merge -> upward refill
- `HudView` is split out from the board and owns top HUD rendering
- `CellView` is the current board-cell view unit and is ready to be replaced by real prefab assets later
- `resources/prefabs/Cell.prefab` is now the first real prefabized board-cell asset, and `BoardView` instantiates it when available
- `resources/prefabs/HudRoot.prefab` and `resources/prefabs/ToolBarRoot.prefab` now provide stable hierarchy skeletons, while the view scripts still own dynamic content and fallback creation
- Cocos host now uses `Loading.scene -> Lobby.scene -> Game.scene` for the main page flow instead of a single-scene page switcher
- `Lobby.scene` owns home / level-select / tutorial / settings overlays, and `Game.scene` focuses on gameplay-only orchestration
- home and level-select overlays now consume progress metadata, including level names, unlock state, stars, and best scores
- level-count truth now comes from `resources/config/game.json`, and settlement no longer exposes a fake next-level action on the final level
- startup now goes through a dedicated `LoadingOverlayView`, so Cocos no longer jumps directly from scene boot to the home overlay without a loading transition
- settings and tutorial are now Cocos-side overlays as well, so the remaining page gap versus the web prototype is no longer on the host UI flow but on prefabization and visual polish
