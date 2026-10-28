# 部品どうしのつながり

`python3 tools/deps.py` で自動生成（`build.py` を実行すると更新される）。手で書き換えない。

部品は番号順に1つのモジュールとしてつながる。後ろの部品で作る名前は、前の部品の「読み込み時に動く処理」からは使えない（関数の中や毎フレームの処理からは使える）。

## 00-head.js
- 作る：`G`、`LEAFTX`、`NEAR_TREE_MAT`、`mkLeaf`
- 使う：
  - 17-villages-houses.js（後ろの部品）：`cvTex`

## 01-trees.js
- 作る：`TREE_TEX`、`cardForest`、`cardTreeGeom`、`cardTreeMat`、`paintTree`、`treeTex`
- 使う：
  - 00-head.js：`G`
  - 02-settings.js（後ろの部品）：`S`
  - 11-start.js（後ろの部品）：`rnd`
  - 13-renderer-water-sky.js（後ろの部品）：`scene`
  - 14-terrain.js（後ろの部品）：`reedU`
  - 24-map.js（後ろの部品）：`far`

## 02-settings.js
- 作る：`LAKE`、`Q`、`RM`、`S`、`SPEED`

## 03-season.js
- 作る：`PALETTE`、`SEASON`、`v3`

## 04-coords.js
- 作る：`KX`、`KY`、`LAT0`、`LON0`、`ll`

## 05-clock.js
- 作る：`DAY`、`EPOCH`、`MO`、`PH`、`clock`
- 使う：
  - 02-settings.js：`Q`

## 06-lake.js
- 作る：`inPoly`、`islands`、`outer`
- 使う：
  - 02-settings.js：`LAKE`

## 07-inner-lakes.js
- 作る：`INNER`、`RECLAIMED`、`blob`、`bridgeY`、`channel`、`inInner`、`inLake`、`inMain`、`innerChan`、`innerPolys`、`maxX`、`maxY`、`minX`、`minY`
- 使う：
  - 02-settings.js：`LAKE`
  - 04-coords.js：`ll`
  - 06-lake.js：`inPoly`、`islands`、`outer`
  - 11-start.js（後ろの部品）：`rnd`

## 08-depth.js
- 作る：`CELL`、`GH`、`GW`、`depth`、`depthG`、`distShore`、`pockets`、`segs`
- 使う：
  - 06-lake.js：`outer`
  - 07-inner-lakes.js：`bridgeY`、`inInner`、`inLake`、`inMain`、`maxX`、`maxY`、`minX`、`minY`
  - 24-map.js（後ろの部品）：`fx`

## 09-weather.js
- 作る：`LEVEL`、`WX`、`WXQ`、`WX_NAMES`、`WX_P`、`weather`、`wxPick`
- 使う：
  - 02-settings.js：`Q`
  - 05-clock.js：`DAY`
  - 10-wind.js（後ろの部品）：`wind`

## 10-wind.js
- 作る：`GYRE`、`WIND`、`flow`、`gyres`、`outlet`、`reedFree0`、`wind`
- 使う：
  - 04-coords.js：`ll`
  - 07-inner-lakes.js：`bridgeY`
  - 09-weather.js：`weather`
  - 15-buildings.js（後ろの部品）：`s0`

## 11-start.js
- 作る：`NB`、`R0`、`bands`、`cumL`、`okB`、`okS`、`rnd`、`st`、`starts`
- 使う：
  - 06-lake.js：`outer`
  - 07-inner-lakes.js：`inMain`、`maxY`、`minY`
  - 08-depth.js：`depth`、`distShore`
  - 10-wind.js：`reedFree0`

## 12-state.js
- 作る：`B`、`STATE`、`steer`
- 使う：
  - 11-start.js：`st`
  - 25-controls.js（後ろの部品）：`dist`、`yaw`

## 13-renderer-water-sky.js
- 作る：`HQ`、`LQ`、`MOBILE`、`MOBILE_`、`NW`、`QQ`、`QUAL`、`camera`、`depthTex`、`dtex`、`hemi`、`renderer`、`resScale`、`scene`、`setWaves`、`skyDome`、`skyU`、`sun`、`water`、`waterU`、`waveH`、`waveTop`、`waves`
- 使う：
  - 00-head.js：`G`
  - 02-settings.js：`Q`、`RM`、`S`
  - 03-season.js：`PALETTE`
  - 06-lake.js：`outer`
  - 07-inner-lakes.js：`maxX`、`maxY`、`minX`、`minY`
  - 08-depth.js：`CELL`、`GH`、`GW`、`depthG`
  - 24-map.js（後ろの部品）：`far`

## 14-terrain.js
- 作る：`FOREST_TINT`、`INNER_Y`、`ISLE_H`、`PEAKS`、`PK`、`PLAIN`、`REED_MONTH`、`REED_SITES`、`REED_TEX`、`RELIEF`、`RG`、`RIDGES`、`SNOW`、`TH`、`TM`、`TW`、`VEX`、`VFAR`、`innerMat`、`innerReedPts`、`innerReeds`、`landContours`、`landH`、`plainK`、`reedGeo`、`reedGeom`、`reedMat`、`reedPts`、`reedTex`、`reedU`、`reeds`、`relief`、`tdx`、`tdy`、`terr`、`terrGeo`、`terrGeo_`、`terrH`、`terrMat`、`tx0`、`ty0`、`vnoise`
- 使う：
  - 00-head.js：`G`
  - 02-settings.js：`S`
  - 03-season.js：`SEASON`
  - 04-coords.js：`ll`
  - 06-lake.js：`inPoly`、`islands`、`outer`
  - 07-inner-lakes.js：`inLake`、`innerChan`、`innerPolys`、`maxX`、`maxY`、`minX`、`minY`
  - 08-depth.js：`depth`、`distShore`
  - 11-start.js：`rnd`
  - 13-renderer-water-sky.js：`HQ`、`scene`、`water`
  - 16-boats.js（後ろの部品）：`P`

## 15-buildings.js
- 作る：`BODY_COLORS`、`BP`、`BUILDINGS`、`CUST`、`LIGHT_COLORS`、`MAT`、`WOODTX`、`bbox`、`box`、`buildHouse`、`gable`、`glassMats`、`house`、`hullShape`、`inReeds`、`reedMask`、`rod`、`s0`
- 使う：
  - 00-head.js：`G`
  - 02-settings.js：`Q`
  - 08-depth.js：`depth`
  - 10-wind.js：`wind`
  - 13-renderer-water-sky.js：`scene`
  - 14-terrain.js：`reedPts`、`reeds`
  - 16-boats.js（後ろの部品）：`P`
  - 17-villages-houses.js（後ろの部品）：`cvTex`
  - 25-controls.js（後ろの部品）：`gl`

## 16-boats.js
- 作る：`FISH`、`P`、`PN`、`PORT`、`REED_YEAR`、`ROUTES`、`ROUTE_OFF`、`WAKE_N`、`WP`、`W_SENSE`、`astar`、`avoid`、`boatMeshes`、`boatState`、`clearLine`、`fishPorts`、`flash`、`makeBoat`、`nearestIn`、`nextFlash`、`pPos`、`portLamps`、`precipGeo`、`rainMesh`、`routePos`、`sPos`、`smB`、`smP`、`smoke`、`smokeGeo`、`snowGeo`、`snowMesh`、`updateBoats`、`updatePrecip`、`wake`、`wakeBob`、`wakeI`、`wakeP`
- 使う：
  - 00-head.js：`G`
  - 02-settings.js：`LAKE`、`S`
  - 05-clock.js：`DAY`
  - 07-inner-lakes.js：`inLake`、`minX`、`minY`
  - 08-depth.js：`CELL`、`GH`、`GW`、`depth`、`depthG`、`segs`
  - 11-start.js：`rnd`、`st`
  - 12-state.js：`B`
  - 13-renderer-water-sky.js：`camera`、`scene`、`waveH`
  - 14-terrain.js：`REED_SITES`
  - 15-buildings.js：`house`、`s0`
  - 17-villages-houses.js（後ろの部品）：`cvTex`

## 17-villages-houses.js
- 作る：`ROOF_COLS`、`VILLAGES`、`atlasMat`、`breaks`、`cvTex`、`houses`、`isLand`、`paddies`、`roads`、`roofG`、`roofGab`、`roofGeom`、`roofHip`、`roofM`、`roofShape`、`roofSnowU`、`roofTex`、`roofs`、`roofs2`、`skirt`、`terrainAt`、`wallAt`、`wallAt2`、`wallG`、`wallGA`、`wallGB`、`wallM`、`wallM2`、`wallTex`、`wallVar`、`walls`、`walls2`
- 使う：
  - 00-head.js：`G`、`NEAR_TREE_MAT`
  - 01-trees.js：`cardForest`
  - 02-settings.js：`S`
  - 04-coords.js：`ll`
  - 06-lake.js：`outer`
  - 07-inner-lakes.js：`inInner`、`inLake`、`maxY`、`minY`
  - 08-depth.js：`GW`、`depth`、`distShore`
  - 11-start.js：`rnd`
  - 12-state.js：`B`
  - 13-renderer-water-sky.js：`HQ`、`scene`
  - 14-terrain.js：`TH`、`TW`、`VEX`、`tdx`、`tdy`、`terrH`、`tx0`、`ty0`
  - 15-buildings.js：`buildHouse`、`inReeds`
  - 16-boats.js：`P`、`PORT`
  - 21-harbors.js（後ろの部品）：`lumpy`
  - 22-forests.js（後ろの部品）：`treeFade`
  - 24-map.js（後ろの部品）：`fx`

## 18-village-lights-roads.js
- 作る：`winGeo`、`windows`、`wp`
- 使う：
  - 02-settings.js：`S`
  - 07-inner-lakes.js：`inLake`
  - 08-depth.js：`distShore`
  - 13-renderer-water-sky.js：`scene`
  - 14-terrain.js：`VEX`
  - 17-villages-houses.js：`houses`、`roads`、`terrainAt`
  - 24-map.js（後ろの部品）：`fx`

## 19-paddies.js
- 作る：`PADDY`、`ghI`、`paddyI`、`paddyM`、`paddySeason`
- 使う：
  - 02-settings.js：`S`
  - 03-season.js：`SEASON`
  - 13-renderer-water-sky.js：`scene`
  - 14-terrain.js：`VEX`
  - 17-villages-houses.js：`cvTex`、`paddies`、`terrainAt`

## 20-shore-landmarks.js
- 作る：`brk`、`shoreTrees`、`treeI`、`treeM`、`treeSeason`
- 使う：
  - 00-head.js：`G`
  - 01-trees.js：`cardForest`
  - 02-settings.js：`S`
  - 04-coords.js：`ll`
  - 06-lake.js：`outer`
  - 07-inner-lakes.js：`inInner`、`inLake`、`inMain`、`innerPolys`
  - 08-depth.js：`depth`、`distShore`
  - 11-start.js：`rnd`、`st`
  - 13-renderer-water-sky.js：`HQ`、`scene`
  - 14-terrain.js：`REED_SITES`、`VEX`
  - 15-buildings.js：`inReeds`
  - 16-boats.js：`PORT`
  - 17-villages-houses.js：`ROOF_COLS`、`breaks`、`cvTex`、`houses`、`roofHip`、`roofM`、`terrainAt`
  - 21-harbors.js（後ろの部品）：`treeGeom`
  - 22-forests.js（後ろの部品）：`treeFade`

## 21-harbors.js
- 作る：`TREE_MAT`、`lumpy`、`treeGeom`
- 使う：
  - 00-head.js：`G`、`LEAFTX`、`NEAR_TREE_MAT`
  - 02-settings.js：`S`
  - 07-inner-lakes.js：`inLake`
  - 08-depth.js：`depth`
  - 11-start.js：`rnd`
  - 13-renderer-water-sky.js：`scene`
  - 16-boats.js：`PORT`

## 22-forests.js
- 作る：`treeFade`
- 使う：
  - 01-trees.js：`cardForest`
  - 02-settings.js：`S`
  - 06-lake.js：`inPoly`、`outer`
  - 07-inner-lakes.js：`inLake`、`innerPolys`
  - 08-depth.js：`distShore`
  - 11-start.js：`rnd`
  - 13-renderer-water-sky.js：`HQ`、`MOBILE`
  - 14-terrain.js：`VEX`
  - 17-villages-houses.js：`houses`、`terrainAt`
  - 24-map.js（後ろの部品）：`far`

## 23-sky-day.js
- 作る：`SKY`、`skyAt`

## 24-map.js
- 作る：`FZ`、`contours`、`drawFar`、`far`、`fx`、`fzAt`
- 使う：
  - 00-head.js：`G`
  - 02-settings.js：`LAKE`、`S`
  - 06-lake.js：`outer`
  - 07-inner-lakes.js：`RECLAIMED`、`innerChan`、`innerPolys`、`maxX`、`maxY`、`minX`、`minY`
  - 08-depth.js：`CELL`、`GH`、`GW`、`depthG`
  - 11-start.js：`rnd`
  - 12-state.js：`B`
  - 14-terrain.js：`PK`、`innerReedPts`、`landContours`、`reedPts`
  - 16-boats.js：`P`
  - 17-villages-houses.js：`houses`
  - 33-buoys.js（後ろの部品）：`VIS`

## 25-controls.js
- 作る：`dist`、`distT`、`gl`、`isFar`、`joy`、`joyEnd`、`joyId`、`kIn`、`keys`、`knob`、`lastTap`、`pinch0`、`pitch`、`ptrs`、`setFar`、`up`、`yaw`、`yawT`
- 使う：
  - 00-head.js：`G`
  - 02-settings.js：`S`
  - 12-state.js：`B`、`STATE`、`steer`
  - 13-renderer-water-sky.js：`camera`
  - 24-map.js：`FZ`、`far`、`fzAt`

## 26-audio.js
- 作る：`SND`、`audioInit`、`audioUpdate`、`bird`、`horn`、`nburst`、`pan`、`prevMoving`
- 使う：
  - 02-settings.js：`S`
  - 03-season.js：`SEASON`
  - 08-depth.js：`distShore`
  - 12-state.js：`B`
  - 13-renderer-water-sky.js：`camera`
  - 16-boats.js：`boatMeshes`
  - 25-controls.js：`isFar`、`up`、`yaw`

## 27-ui.js
- 作る：`$`、`MAT_ICONS`、`dots`、`hex`、`mats`、`pick`、`restBtn`、`showName`
- 使う：
  - 02-settings.js：`S`
  - 07-inner-lakes.js：`inLake`、`inMain`
  - 08-depth.js：`depth`
  - 11-start.js：`starts`
  - 12-state.js：`B`、`STATE`
  - 15-buildings.js：`BODY_COLORS`、`BUILDINGS`、`CUST`、`LIGHT_COLORS`、`buildHouse`、`house`、`inReeds`
  - 25-controls.js：`dist`、`distT`、`gl`
  - 26-audio.js：`SND`、`audioInit`
  - 30-frame-state.js（後ろの部品）：`camX`、`camZ`

## 28-drawing.js
- 作る：`DL`、`makeDrawing`
- 使う：
  - 06-lake.js：`outer`
  - 07-inner-lakes.js：`maxX`、`maxY`、`minX`、`minY`
  - 12-state.js：`B`
  - 16-boats.js：`P`
  - 24-map.js：`contours`
  - 27-ui.js：`$`

## 29-resize.js
- 作る：`resize`
- 使う：
  - 13-renderer-water-sky.js：`HQ`、`camera`、`renderer`、`resScale`
  - 24-map.js：`far`

## 30-frame-state.js
- 作る：`camX`、`camZ`、`fpsN`、`fpsT`、`last`、`trailT`
- 使う：
  - 02-settings.js：`S`
  - 12-state.js：`B`

## 31-torii.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 02-settings.js：`S`
  - 04-coords.js：`ll`
  - 08-depth.js：`depth`
  - 13-renderer-water-sky.js：`scene`

## 32-fireworks.js
- 作る：`FW`
- 使う：
  - 00-head.js：`G`
  - 02-settings.js：`Q`、`S`
  - 03-season.js：`v3`
  - 04-coords.js：`ll`
  - 05-clock.js：`DAY`、`PH`
  - 08-depth.js：`depth`
  - 11-start.js：`rnd`、`st`
  - 13-renderer-water-sky.js：`HQ`、`LQ`、`camera`、`renderer`、`scene`、`waterU`
  - 16-boats.js：`flash`
  - 25-controls.js：`isFar`、`yaw`
  - 26-audio.js：`SND`、`nburst`

## 33-buoys.js
- 作る：`VIS`
- 使う：
  - 00-head.js：`G`
  - 02-settings.js：`S`
  - 04-coords.js：`ll`
  - 08-depth.js：`depth`
  - 12-state.js：`B`、`STATE`
  - 13-renderer-water-sky.js：`camera`、`scene`、`waveH`
  - 25-controls.js：`gl`、`isFar`、`ptrs`
  - 27-ui.js：`pick`

## 34-seasonal-events.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 02-settings.js：`S`
  - 06-lake.js：`outer`
  - 07-inner-lakes.js：`inLake`
  - 11-start.js：`NB`、`rnd`
  - 13-renderer-water-sky.js：`camera`、`scene`、`waveH`
  - 14-terrain.js：`VEX`、`reedPts`
  - 16-boats.js：`smoke`
  - 17-villages-houses.js：`terrainAt`
  - 21-harbors.js：`lumpy`

## 35-kaizu.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 02-settings.js：`S`
  - 06-lake.js：`outer`
  - 07-inner-lakes.js：`inLake`
  - 11-start.js：`rnd`
  - 13-renderer-water-sky.js：`scene`
  - 14-terrain.js：`VEX`
  - 17-villages-houses.js：`cvTex`、`terrainAt`

## 36-shore-rocks.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 02-settings.js：`S`
  - 06-lake.js：`outer`
  - 07-inner-lakes.js：`inLake`
  - 11-start.js：`rnd`
  - 13-renderer-water-sky.js：`scene`
  - 14-terrain.js：`VEX`、`vnoise`
  - 15-buildings.js：`reedMask`
  - 17-villages-houses.js：`terrainAt`

## 37-islands.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 01-trees.js：`cardForest`
  - 02-settings.js：`S`
  - 06-lake.js：`islands`
  - 07-inner-lakes.js：`inLake`
  - 11-start.js：`rnd`
  - 13-renderer-water-sky.js：`scene`
  - 14-terrain.js：`VEX`
  - 17-villages-houses.js：`terrainAt`

## 38-city.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 02-settings.js：`S`
  - 06-lake.js：`outer`
  - 07-inner-lakes.js：`inInner`、`inLake`
  - 11-start.js：`rnd`
  - 13-renderer-water-sky.js：`scene`
  - 14-terrain.js：`VEX`
  - 17-villages-houses.js：`cvTex`、`terrainAt`

## 39-frame.js
- 作る：`frame`
- 使う：
  - 00-head.js：`G`
  - 02-settings.js：`LAKE`、`Q`、`RM`、`S`、`SPEED`
  - 03-season.js：`SEASON`
  - 04-coords.js：`ll`
  - 05-clock.js：`DAY`、`clock`
  - 07-inner-lakes.js：`inInner`、`inLake`、`inMain`
  - 08-depth.js：`depth`
  - 09-weather.js：`LEVEL`、`WXQ`
  - 10-wind.js：`flow`、`wind`
  - 11-start.js：`st`
  - 12-state.js：`B`、`STATE`、`steer`
  - 13-renderer-water-sky.js：`HQ`、`MOBILE`、`camera`、`hemi`、`renderer`、`resScale`、`scene`、`setWaves`、`skyDome`、`skyU`、`sun`、`water`、`waterU`、`waveH`、`waveTop`、`waves`
  - 14-terrain.js：`FOREST_TINT`、`INNER_Y`、`REED_MONTH`、`REED_TEX`、`SNOW`、`VEX`、`innerReeds`、`reedU`、`reeds`、`terrMat`
  - 15-buildings.js：`BP`、`CUST`、`LIGHT_COLORS`、`glassMats`、`house`、`inReeds`、`reedMask`
  - 16-boats.js：`P`、`WAKE_N`、`W_SENSE`、`boatState`、`flash`、`nextFlash`、`portLamps`、`smB`、`smoke`、`smokeGeo`、`updateBoats`、`updatePrecip`、`wakeBob`、`wakeI`、`wakeP`
  - 17-villages-houses.js：`houses`、`roofM`、`roofSnowU`、`terrainAt`
  - 18-village-lights-roads.js：`windows`
  - 19-paddies.js：`paddySeason`
  - 20-shore-landmarks.js：`treeSeason`
  - 23-sky-day.js：`skyAt`
  - 24-map.js：`drawFar`
  - 25-controls.js：`dist`、`distT`、`isFar`、`joyId`、`kIn`、`keys`、`pitch`、`ptrs`、`yaw`、`yawT`
  - 26-audio.js：`audioUpdate`
  - 27-ui.js：`restBtn`
  - 29-resize.js：`resize`
  - 30-frame-state.js：`camX`、`camZ`、`fpsN`、`fpsT`、`last`、`trailT`
  - 32-fireworks.js：`FW`

## 共有の値（window.__xxx）

- `__floating`：00-head.js
- `__set`：39-frame.js
- `__setH`：39-frame.js
