# 部品どうしのつながり

`python3 tools/deps.py` で自動生成（`build.py` を実行すると更新される）。手で書き換えない。

部品は番号順に1つのモジュールとしてつながる。後ろの部品で作る名前は、前の部品の「読み込み時に動く処理」からは使えない（関数の中や毎フレームの処理からは使える）。

## 00-head.js
- 作る：`G`、`LEAFTX`、`NEAR_TREE_MAT`、`mkLeaf`
- 使う：
  - 17-villages-houses.js（後ろの部品・関数なので可）：`cvTex`

## 01-settings.js
- 作る：`LAKE`、`Q`、`RM`、`S`、`SPEED`

## 02-season.js
- 作る：`PALETTE`、`SEASON`、`v3`

## 03-coords.js
- 作る：`KX`、`KY`、`LAT0`、`LON0`、`ll`

## 04-clock.js
- 作る：`DAY`、`EPOCH`、`MO`、`PH`、`clock`
- 使う：
  - 01-settings.js：`Q`

## 05-lake.js
- 作る：`inPoly`、`islands`、`outer`
- 使う：
  - 01-settings.js：`LAKE`

## 06-inner-lakes.js
- 作る：`INNER`、`RECLAIMED`、`blob`、`bridgeY`、`channel`、`inInner`、`inLake`、`inMain`、`innerChan`、`innerPolys`、`maxX`、`maxY`、`minX`、`minY`
- 使う：
  - 01-settings.js：`LAKE`
  - 03-coords.js：`ll`
  - 05-lake.js：`inPoly`、`islands`、`outer`
  - 10-start.js（後ろの部品・関数なので可）：`rnd`

## 07-depth.js
- 作る：`CELL`、`GH`、`GW`、`depth`、`depthG`、`distShore`、`pockets`、`segs`
- 使う：
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`bridgeY`、`inInner`、`inLake`、`inMain`、`maxX`、`maxY`、`minX`、`minY`

## 08-weather.js
- 作る：`LEVEL`、`WX`、`WXQ`、`WX_NAMES`、`WX_P`、`weather`、`wxPick`
- 使う：
  - 01-settings.js：`Q`
  - 04-clock.js：`DAY`

## 09-wind.js
- 作る：`GYRE`、`WIND`、`flow`、`gyres`、`outlet`、`reedFree0`、`wind`
- 使う：
  - 03-coords.js：`ll`
  - 06-inner-lakes.js：`bridgeY`
  - 08-weather.js：`weather`

## 10-start.js
- 作る：`NB`、`R0`、`bands`、`cumL`、`okB`、`okS`、`rnd`、`st`、`starts`
- 使う：
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`inMain`、`maxY`、`minY`
  - 07-depth.js：`depth`、`distShore`
  - 09-wind.js：`reedFree0`

## 11-state.js
- 作る：`B`、`STATE`、`VIS`、`camX`、`camZ`、`steer`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 10-start.js：`st`

## 12-renderer-water-sky.js
- 作る：`HQ`、`LQ`、`MOBILE`、`MOBILE_`、`NW`、`QQ`、`QUAL`、`QUALITY`、`QUALITY_TABLE`、`camera`、`depthTex`、`dtex`、`hemi`、`renderer`、`resScale`、`scene`、`setWaves`、`skyDome`、`skyU`、`sun`、`water`、`waterU`、`waveH`、`waveTop`、`waves`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`Q`、`RM`、`S`
  - 02-season.js：`PALETTE`
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`maxX`、`maxY`、`minX`、`minY`
  - 07-depth.js：`CELL`、`GH`、`GW`、`depthG`

## 13-terrain.js
- 作る：`FOREST_TINT`、`INNER_Y`、`ISLE_H`、`PEAKS`、`PK`、`PLAIN`、`REED_MONTH`、`REED_SITES`、`REED_TEX`、`RELIEF`、`RG`、`RIDGES`、`SNOW`、`TH`、`TM`、`TW`、`VEX`、`VFAR`、`innerMat`、`innerReedPts`、`innerReeds`、`landContours`、`landH`、`plainK`、`reedGeo`、`reedGeom`、`reedMat`、`reedPts`、`reedTex`、`reedU`、`reeds`、`relief`、`tdx`、`tdy`、`terr`、`terrGeo`、`terrGeo_`、`terrH`、`terrMat`、`tx0`、`ty0`、`vnoise`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 02-season.js：`SEASON`
  - 03-coords.js：`ll`
  - 05-lake.js：`inPoly`、`islands`、`outer`
  - 06-inner-lakes.js：`inLake`、`innerChan`、`innerPolys`、`maxX`、`maxY`、`minX`、`minY`
  - 07-depth.js：`depth`、`distShore`
  - 10-start.js：`rnd`
  - 12-renderer-water-sky.js：`QUALITY`、`scene`、`water`

## 14-trees.js
- 作る：`TREE_TEX`、`cardForest`、`cardTreeGeom`、`cardTreeMat`、`paintTree`、`treeTex`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 10-start.js：`rnd`
  - 12-renderer-water-sky.js：`scene`
  - 13-terrain.js：`reedU`

## 15-buildings.js
- 作る：`BODY_COLORS`、`BP`、`BUILDINGS`、`CUST`、`LIGHT_COLORS`、`MAT`、`WOODTX`、`bbox`、`box`、`buildHouse`、`gable`、`glassMats`、`house`、`hullShape`、`inReeds`、`reedMask`、`rod`、`s0`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`Q`
  - 12-renderer-water-sky.js：`scene`
  - 13-terrain.js：`reedPts`
  - 17-villages-houses.js（後ろの部品・関数なので可）：`cvTex`

## 16-boats.js
- 作る：`FISH`、`P`、`PN`、`PORT`、`REED_YEAR`、`ROUTES`、`ROUTE_OFF`、`WAKE_N`、`WP`、`W_SENSE`、`astar`、`avoid`、`boatMeshes`、`boatState`、`clearLine`、`fishPorts`、`flash`、`makeBoat`、`nearestIn`、`nextFlash`、`pPos`、`portLamps`、`precipGeo`、`rainMesh`、`routePos`、`sPos`、`smB`、`smP`、`smoke`、`smokeGeo`、`snowGeo`、`snowMesh`、`updateBoats`、`updatePrecip`、`wake`、`wakeBob`、`wakeI`、`wakeP`
- 使う：
  - 01-settings.js：`LAKE`、`S`
  - 04-clock.js：`DAY`
  - 06-inner-lakes.js：`inLake`、`minX`、`minY`
  - 07-depth.js：`CELL`、`GH`、`GW`、`depth`、`depthG`
  - 10-start.js：`rnd`
  - 11-state.js：`B`
  - 12-renderer-water-sky.js：`camera`、`scene`、`waveH`
  - 13-terrain.js：`REED_SITES`
  - 15-buildings.js：`house`、`s0`
  - 17-villages-houses.js（後ろの部品・関数なので可）：`cvTex`

## 17-villages-houses.js
- 作る：`ROOF_COLS`、`VILLAGES`、`atlasMat`、`breaks`、`cvTex`、`houses`、`isLand`、`paddies`、`roads`、`roofG`、`roofGab`、`roofGeom`、`roofHip`、`roofM`、`roofShape`、`roofSnowU`、`roofTex`、`roofs`、`roofs2`、`skirt`、`terrainAt`、`wallAt`、`wallAt2`、`wallG`、`wallGA`、`wallGB`、`wallM`、`wallM2`、`wallTex`、`wallVar`、`walls`、`walls2`
- 使う：
  - 00-head.js：`G`、`NEAR_TREE_MAT`
  - 01-settings.js：`S`
  - 03-coords.js：`ll`
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`inInner`、`inLake`、`maxY`、`minY`
  - 07-depth.js：`depth`、`distShore`
  - 10-start.js：`rnd`
  - 12-renderer-water-sky.js：`QUALITY`、`scene`
  - 13-terrain.js：`TH`、`TW`、`VEX`、`tdx`、`tdy`、`terrH`、`tx0`、`ty0`
  - 14-trees.js：`cardForest`
  - 15-buildings.js：`buildHouse`、`inReeds`
  - 16-boats.js：`PORT`
  - 21-harbors.js（後ろの部品・関数なので可）：`lumpy`
  - 22-forests.js（後ろの部品・関数なので可）：`treeFade`

## 18-village-lights-roads.js
- 作る：`winGeo`、`windows`、`wp`
- 使う：
  - 01-settings.js：`S`
  - 06-inner-lakes.js：`inLake`
  - 07-depth.js：`distShore`
  - 12-renderer-water-sky.js：`scene`
  - 13-terrain.js：`VEX`
  - 17-villages-houses.js：`houses`、`roads`、`terrainAt`

## 19-paddies.js
- 作る：`PADDY`、`ghI`、`paddyI`、`paddyM`、`paddySeason`
- 使う：
  - 01-settings.js：`S`
  - 02-season.js：`SEASON`
  - 12-renderer-water-sky.js：`scene`
  - 13-terrain.js：`VEX`
  - 17-villages-houses.js：`cvTex`、`paddies`、`terrainAt`

## 20-shore-landmarks.js
- 作る：`brk`、`shoreTrees`、`treeI`、`treeM`、`treeSeason`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 03-coords.js：`ll`
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`inInner`、`inLake`、`inMain`、`innerPolys`
  - 07-depth.js：`depth`、`distShore`
  - 10-start.js：`rnd`
  - 12-renderer-water-sky.js：`QUALITY`、`scene`
  - 13-terrain.js：`REED_SITES`、`VEX`
  - 14-trees.js：`cardForest`
  - 15-buildings.js：`inReeds`
  - 16-boats.js：`PORT`
  - 17-villages-houses.js：`ROOF_COLS`、`breaks`、`cvTex`、`houses`、`roofHip`、`roofM`、`terrainAt`
  - 21-harbors.js（後ろの部品・関数なので可）：`treeGeom`
  - 22-forests.js（後ろの部品・関数なので可）：`treeFade`

## 21-harbors.js
- 作る：`TREE_MAT`、`lumpy`、`treeGeom`
- 使う：
  - 00-head.js：`G`、`LEAFTX`、`NEAR_TREE_MAT`
  - 01-settings.js：`S`
  - 06-inner-lakes.js：`inLake`
  - 07-depth.js：`depth`
  - 10-start.js：`rnd`
  - 12-renderer-water-sky.js：`scene`
  - 16-boats.js：`PORT`

## 22-forests.js
- 作る：`treeFade`
- 使う：
  - 01-settings.js：`S`
  - 05-lake.js：`inPoly`、`outer`
  - 06-inner-lakes.js：`inLake`、`innerPolys`
  - 07-depth.js：`distShore`
  - 10-start.js：`rnd`
  - 12-renderer-water-sky.js：`MOBILE`、`QUALITY`
  - 13-terrain.js：`VEX`
  - 14-trees.js：`cardForest`
  - 17-villages-houses.js：`houses`、`terrainAt`

## 23-sky-day.js
- 作る：`SKY`、`skyAt`

## 24-map.js
- 作る：`FZ`、`contours`、`drawFar`、`far`、`fx`、`fzAt`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`LAKE`、`S`
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`RECLAIMED`、`innerChan`、`innerPolys`、`maxX`、`maxY`、`minX`、`minY`
  - 07-depth.js：`CELL`、`GH`、`GW`、`depthG`
  - 10-start.js：`rnd`
  - 11-state.js：`B`、`VIS`
  - 13-terrain.js：`PK`、`innerReedPts`、`landContours`、`reedPts`
  - 17-villages-houses.js：`houses`

## 25-controls.js
- 作る：`dist`、`distT`、`gl`、`isFar`、`joy`、`joyEnd`、`joyId`、`kIn`、`keys`、`knob`、`lastTap`、`pinch0`、`pitch`、`ptrs`、`setFar`、`up`、`yaw`、`yawT`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 11-state.js：`B`、`STATE`、`steer`
  - 12-renderer-water-sky.js：`camera`
  - 24-map.js：`FZ`、`far`、`fzAt`

## 26-audio.js
- 作る：`SND`、`audioInit`、`audioUpdate`、`bird`、`horn`、`nburst`、`pan`、`prevMoving`
- 使う：
  - 01-settings.js：`S`
  - 02-season.js：`SEASON`
  - 07-depth.js：`distShore`
  - 11-state.js：`B`
  - 12-renderer-water-sky.js：`camera`
  - 16-boats.js：`boatMeshes`
  - 25-controls.js：`isFar`、`yaw`

## 27-ui.js
- 作る：`$`、`MAT_ICONS`、`dots`、`hex`、`mats`、`pick`、`restBtn`、`showName`
- 使う：
  - 01-settings.js：`S`
  - 06-inner-lakes.js：`inLake`、`inMain`
  - 07-depth.js：`depth`
  - 10-start.js：`starts`
  - 11-state.js：`B`、`STATE`、`camX`、`camZ`
  - 15-buildings.js：`BODY_COLORS`、`BUILDINGS`、`CUST`、`LIGHT_COLORS`、`buildHouse`、`house`、`inReeds`
  - 25-controls.js：`dist`、`distT`、`gl`
  - 26-audio.js：`SND`、`audioInit`

## 28-drawing.js
- 作る：`DL`、`makeDrawing`
- 使う：
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`maxX`、`maxY`、`minX`、`minY`
  - 11-state.js：`B`
  - 24-map.js：`contours`
  - 27-ui.js：`$`

## 29-resize.js
- 作る：`resize`
- 使う：
  - 12-renderer-water-sky.js：`QUALITY`、`camera`、`renderer`、`resScale`
  - 24-map.js：`far`

## 30-frame-state.js
- 作る：`fpsN`、`fpsT`、`last`、`trailT`

## 31-torii.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 03-coords.js：`ll`
  - 07-depth.js：`depth`
  - 12-renderer-water-sky.js：`scene`

## 32-fireworks.js
- 作る：`FW`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`Q`、`S`
  - 03-coords.js：`ll`
  - 04-clock.js：`DAY`、`PH`
  - 07-depth.js：`depth`
  - 10-start.js：`rnd`
  - 12-renderer-water-sky.js：`QUALITY`、`camera`、`renderer`、`scene`、`waterU`
  - 25-controls.js：`isFar`、`yaw`
  - 26-audio.js：`SND`、`nburst`

## 33-buoys.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 03-coords.js：`ll`
  - 07-depth.js：`depth`
  - 11-state.js：`B`、`STATE`、`VIS`
  - 12-renderer-water-sky.js：`camera`、`scene`、`waveH`
  - 25-controls.js：`gl`、`isFar`、`ptrs`

## 34-seasonal-events.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`inLake`
  - 10-start.js：`rnd`
  - 12-renderer-water-sky.js：`camera`、`scene`、`waveH`
  - 13-terrain.js：`VEX`、`reedPts`
  - 17-villages-houses.js：`terrainAt`
  - 21-harbors.js：`lumpy`

## 35-kaizu.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`inLake`
  - 10-start.js：`rnd`
  - 12-renderer-water-sky.js：`scene`
  - 13-terrain.js：`VEX`
  - 17-villages-houses.js：`cvTex`、`terrainAt`

## 36-shore-rocks.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`inLake`
  - 10-start.js：`rnd`
  - 12-renderer-water-sky.js：`scene`
  - 13-terrain.js：`VEX`、`vnoise`
  - 15-buildings.js：`reedMask`
  - 17-villages-houses.js：`terrainAt`

## 37-islands.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 05-lake.js：`islands`
  - 06-inner-lakes.js：`inLake`
  - 10-start.js：`rnd`
  - 12-renderer-water-sky.js：`scene`
  - 13-terrain.js：`VEX`
  - 14-trees.js：`cardForest`
  - 17-villages-houses.js：`terrainAt`

## 38-city.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`inInner`、`inLake`
  - 10-start.js：`rnd`
  - 12-renderer-water-sky.js：`scene`
  - 13-terrain.js：`VEX`
  - 17-villages-houses.js：`cvTex`、`terrainAt`

## 39-frame.js
- 作る：`frame`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`LAKE`、`Q`、`RM`、`S`、`SPEED`
  - 02-season.js：`SEASON`
  - 03-coords.js：`ll`
  - 04-clock.js：`DAY`、`MO`、`PH`、`clock`
  - 06-inner-lakes.js：`inInner`、`inLake`、`inMain`
  - 07-depth.js：`depth`
  - 08-weather.js：`LEVEL`、`WXQ`
  - 09-wind.js：`flow`、`wind`
  - 11-state.js：`B`、`STATE`、`camX`、`camZ`、`steer`
  - 12-renderer-water-sky.js：`QUALITY`、`camera`、`hemi`、`renderer`、`resScale`、`scene`、`setWaves`、`skyDome`、`skyU`、`sun`、`water`、`waterU`、`waveH`、`waveTop`、`waves`
  - 13-terrain.js：`FOREST_TINT`、`INNER_Y`、`REED_MONTH`、`REED_TEX`、`SNOW`、`VEX`、`innerReeds`、`reedU`、`reeds`、`terrMat`
  - 15-buildings.js：`BP`、`CUST`、`LIGHT_COLORS`、`buildHouse`、`glassMats`、`house`、`inReeds`、`reedMask`
  - 16-boats.js：`WAKE_N`、`W_SENSE`、`boatState`、`flash`、`nextFlash`、`portLamps`、`smB`、`smoke`、`smokeGeo`、`updateBoats`、`updatePrecip`、`wakeBob`、`wakeI`、`wakeP`
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
  - 30-frame-state.js：`fpsN`、`fpsT`、`last`、`trailT`
  - 32-fireworks.js：`FW`

## 共有の値（window.__xxx）

- `__floating`：00-head.js
- `__scene`：39-frame.js
- `__set`：39-frame.js
- `__setH`：39-frame.js
