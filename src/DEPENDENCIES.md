# 部品どうしのつながり

`python3 tools/deps.py` で自動生成（`build.py` を実行すると更新される）。手で書き換えない。

部品は番号順に1つのモジュールとしてつながる。後ろの部品で作る名前は、前の部品の「読み込み時に動く処理」からは使えない（関数の中や毎フレームの処理からは使える）。

## 00-head.js
- 作る：`G`、`LEAFTX`、`NEAR_TREE_MAT`、`mkLeaf`
- 使う：
  - 20-villages-layout.js（後ろの部品・関数なので可）：`cvTex`

## 01-settings.js
- 作る：`LAKE`、`Q`、`RM`、`S`、`SPEED`

## 02-season.js
- 作る：`PALETTE`、`SEASON`、`v3`

## 03-coords.js
- 作る：`KX`、`KY`、`LAT0`、`LON0`、`ll`

## 04-clock.js
- 作る：`DAY`、`EPOCH`、`MO`、`PH`、`clock`
- 使う：
  - 00-head.js：`G`
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

## 12-renderer.js
- 作る：`HQ`、`LQ`、`MOBILE`、`MOBILE_`、`QQ`、`QUAL`、`QUALITY`、`QUALITY_TABLE`、`camera`、`renderer`、`resScale`、`scene`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`Q`

## 13-sky-dome.js
- 作る：`hemi`、`skyDome`、`skyU`、`sun`
- 使う：
  - 12-renderer.js：`QUALITY`、`scene`

## 14-water.js
- 作る：`NW`、`depthTex`、`dtex`、`setWaves`、`water`、`waterU`、`waveH`、`waveTop`、`waves`
- 使う：
  - 01-settings.js：`RM`、`S`
  - 02-season.js：`PALETTE`
  - 06-inner-lakes.js：`maxX`、`maxY`、`minX`、`minY`
  - 07-depth.js：`CELL`、`GH`、`GW`、`depthG`
  - 12-renderer.js：`QUALITY`、`scene`

## 15-land-base.js
- 作る：（なし）
- 使う：
  - 01-settings.js：`S`
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`maxX`、`maxY`、`minX`、`minY`
  - 12-renderer.js：`scene`

## 16-terrain.js
- 作る：`FOREST_TINT`、`INNER_Y`、`ISLES`、`ISLE_H`、`OKI`、`OKI_BOX`、`PEAKS`、`PK`、`PLAIN`、`REED_MONTH`、`REED_SITES`、`REED_TEX`、`RELIEF`、`RG`、`RIDGES`、`SNOW`、`TH`、`TM`、`TW`、`VEX`、`VFAR`、`innerMat`、`innerReedPts`、`innerReeds`、`isleH`、`isleShape`、`landContours`、`landH`、`okiZone`、`plainK`、`reedGeo`、`reedGeom`、`reedMat`、`reedPts`、`reedTex`、`reedU`、`reeds`、`relief`、`tdx`、`tdy`、`terr`、`terrGeo`、`terrGeo_`、`terrH`、`terrMat`、`tx0`、`ty0`、`vnoise`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 02-season.js：`SEASON`
  - 03-coords.js：`ll`
  - 05-lake.js：`inPoly`、`islands`、`outer`
  - 06-inner-lakes.js：`inLake`、`innerChan`、`innerPolys`、`maxX`、`maxY`、`minX`、`minY`
  - 07-depth.js：`depth`、`distShore`
  - 10-start.js：`rnd`
  - 12-renderer.js：`QUALITY`、`scene`
  - 14-water.js：`water`

## 17-trees.js
- 作る：`TREE_TEX`、`cardForest`、`cardTreeGeom`、`cardTreeMat`、`paintTree`、`treeTex`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 10-start.js：`rnd`
  - 12-renderer.js：`scene`
  - 16-terrain.js：`reedU`

## 18-buildings.js
- 作る：`BODY_COLORS`、`BP`、`BUILDINGS`、`CUST`、`LIGHT_COLORS`、`MAT`、`WOODTX`、`bbox`、`box`、`buildHouse`、`gable`、`glassMats`、`glowBox`、`house`、`hullShape`、`inReeds`、`posts`、`reedMask`、`ring`、`ringPts`、`rod`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`Q`
  - 12-renderer.js：`scene`
  - 16-terrain.js：`reedPts`
  - 20-villages-layout.js（後ろの部品・関数なので可）：`cvTex`

## 19-boats.js
- 作る：`FISH`、`P`、`PN`、`PORT`、`REED_YEAR`、`ROUTES`、`ROUTE_OFF`、`WAKE_N`、`WP`、`W_SENSE`、`astar`、`avoid`、`boatMeshes`、`boatState`、`clearLine`、`fishPorts`、`flash`、`makeBoat`、`nearestIn`、`nextFlash`、`pPos`、`portLamps`、`precipGeo`、`rainMesh`、`routePos`、`sPos`、`smB`、`smP`、`smoke`、`smokeGeo`、`snowGeo`、`snowMesh`、`updateBoats`、`updatePrecip`、`wake`、`wakeBob`、`wakeI`、`wakeP`
- 使う：
  - 01-settings.js：`LAKE`、`S`
  - 04-clock.js：`DAY`
  - 06-inner-lakes.js：`inLake`、`minX`、`minY`
  - 07-depth.js：`CELL`、`GH`、`GW`、`depth`、`depthG`
  - 10-start.js：`rnd`
  - 11-state.js：`B`
  - 12-renderer.js：`camera`、`scene`
  - 14-water.js：`waveH`
  - 16-terrain.js：`REED_SITES`
  - 18-buildings.js：`house`
  - 20-villages-layout.js（後ろの部品・関数なので可）：`cvTex`

## 20-villages-layout.js
- 作る：`ROOF_COLS`、`VILLAGES`、`breaks`、`cvTex`、`houses`、`isLand`、`paddies`、`roads`、`roofG`、`roofGab`、`roofGeom`、`roofHip`、`roofM`、`roofShape`、`roofSnowU`、`roofTex`、`terrainAt`、`wallG`、`wallM`、`wallTex`
- 使う：
  - 00-head.js：`G`
  - 03-coords.js：`ll`
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`inInner`、`inLake`、`maxY`、`minY`
  - 07-depth.js：`depth`、`distShore`
  - 10-start.js：`rnd`
  - 16-terrain.js：`TH`、`TW`、`tdx`、`tdy`、`terrH`、`tx0`、`ty0`
  - 18-buildings.js：`buildHouse`
  - 19-boats.js：`PORT`

## 21-villages-walls-roofs.js
- 作る：`atlasMat`、`roofs`、`roofs2`、`skirt`、`wallAt`、`wallAt2`、`wallGA`、`wallGB`、`wallM2`、`wallVar`、`walls`、`walls2`
- 使う：
  - 00-head.js：`G`、`NEAR_TREE_MAT`
  - 01-settings.js：`S`
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`inLake`
  - 07-depth.js：`distShore`
  - 10-start.js：`rnd`
  - 12-renderer.js：`QUALITY`、`scene`
  - 16-terrain.js：`VEX`
  - 17-trees.js：`cardForest`
  - 18-buildings.js：`inReeds`
  - 20-villages-layout.js：`ROOF_COLS`、`cvTex`、`houses`、`roads`、`roofGab`、`roofHip`、`roofM`、`terrainAt`、`wallG`
  - 25-harbors.js（後ろの部品・関数なので可）：`lumpy`
  - 26-forests.js（後ろの部品・関数なので可）：`treeFade`

## 22-village-lights-roads.js
- 作る：`winGeo`、`windows`、`wp`
- 使う：
  - 01-settings.js：`S`
  - 06-inner-lakes.js：`inLake`
  - 07-depth.js：`distShore`
  - 12-renderer.js：`scene`
  - 16-terrain.js：`VEX`
  - 20-villages-layout.js：`houses`、`roads`、`terrainAt`

## 23-paddies.js
- 作る：`PADDY`、`ghI`、`paddyI`、`paddyM`、`paddySeason`
- 使う：
  - 01-settings.js：`S`
  - 02-season.js：`SEASON`
  - 12-renderer.js：`scene`
  - 16-terrain.js：`VEX`
  - 20-villages-layout.js：`cvTex`、`paddies`、`terrainAt`

## 24-shore-landmarks.js
- 作る：`brk`、`shoreTrees`、`treeI`、`treeM`、`treeSeason`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 03-coords.js：`ll`
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`inInner`、`inLake`、`inMain`、`innerPolys`
  - 07-depth.js：`depth`、`distShore`
  - 10-start.js：`rnd`
  - 12-renderer.js：`QUALITY`、`scene`
  - 16-terrain.js：`REED_SITES`、`VEX`
  - 17-trees.js：`cardForest`
  - 18-buildings.js：`inReeds`
  - 19-boats.js：`PORT`
  - 20-villages-layout.js：`ROOF_COLS`、`breaks`、`cvTex`、`houses`、`roofHip`、`roofM`、`terrainAt`
  - 25-harbors.js（後ろの部品・関数なので可）：`treeGeom`
  - 26-forests.js（後ろの部品・関数なので可）：`treeFade`

## 25-harbors.js
- 作る：`TREE_MAT`、`lumpy`、`treeGeom`
- 使う：
  - 00-head.js：`G`、`LEAFTX`、`NEAR_TREE_MAT`
  - 01-settings.js：`S`
  - 06-inner-lakes.js：`inLake`
  - 07-depth.js：`depth`
  - 10-start.js：`rnd`
  - 12-renderer.js：`scene`
  - 19-boats.js：`PORT`

## 26-forests.js
- 作る：`treeFade`
- 使う：
  - 01-settings.js：`S`
  - 05-lake.js：`inPoly`、`outer`
  - 06-inner-lakes.js：`inLake`、`innerPolys`
  - 07-depth.js：`distShore`
  - 10-start.js：`rnd`
  - 12-renderer.js：`MOBILE`、`QUALITY`
  - 16-terrain.js：`VEX`
  - 17-trees.js：`cardForest`
  - 20-villages-layout.js：`houses`、`terrainAt`

## 27-sky-day.js
- 作る：`SKY`、`skyAt`

## 28-map.js
- 作る：`FZ`、`contours`、`drawFar`、`far`、`fx`、`fzAt`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`LAKE`、`S`
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`RECLAIMED`、`innerChan`、`innerPolys`、`maxX`、`maxY`、`minX`、`minY`
  - 07-depth.js：`CELL`、`GH`、`GW`、`depthG`
  - 10-start.js：`rnd`
  - 11-state.js：`B`、`VIS`
  - 16-terrain.js：`PK`、`innerReedPts`、`landContours`、`reedPts`
  - 20-villages-layout.js：`houses`

## 29-controls.js
- 作る：`dist`、`distT`、`gl`、`isFar`、`joy`、`joyEnd`、`joyId`、`kIn`、`keys`、`knob`、`lastTap`、`pinch0`、`pitch`、`ptrs`、`setFar`、`up`、`yaw`、`yawT`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 11-state.js：`B`、`STATE`、`steer`
  - 12-renderer.js：`camera`
  - 28-map.js：`FZ`、`far`、`fzAt`

## 30-audio.js
- 作る：`SND`、`audioInit`、`audioUpdate`、`bird`、`horn`、`nburst`、`pan`、`prevMoving`
- 使う：
  - 01-settings.js：`S`
  - 02-season.js：`SEASON`
  - 07-depth.js：`distShore`
  - 11-state.js：`B`
  - 12-renderer.js：`camera`
  - 19-boats.js：`boatMeshes`
  - 29-controls.js：`isFar`、`yaw`

## 31-ui.js
- 作る：`$`、`MAT_ICONS`、`dots`、`hex`、`mats`、`pick`、`restBtn`、`showName`
- 使う：
  - 01-settings.js：`S`
  - 06-inner-lakes.js：`inLake`、`inMain`
  - 07-depth.js：`depth`
  - 10-start.js：`starts`
  - 11-state.js：`B`、`STATE`、`camX`、`camZ`
  - 18-buildings.js：`BODY_COLORS`、`BUILDINGS`、`CUST`、`LIGHT_COLORS`、`buildHouse`、`house`、`inReeds`
  - 29-controls.js：`dist`、`distT`、`gl`
  - 30-audio.js：`SND`、`audioInit`

## 32-drawing.js
- 作る：`DL`、`makeDrawing`
- 使う：
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`maxX`、`maxY`、`minX`、`minY`
  - 11-state.js：`B`
  - 28-map.js：`contours`
  - 31-ui.js：`$`

## 33-resize.js
- 作る：`resize`
- 使う：
  - 12-renderer.js：`QUALITY`、`camera`、`renderer`、`resScale`
  - 28-map.js：`far`

## 34-frame-state.js
- 作る：`fpsN`、`fpsT`、`last`、`trailT`

## 35-torii.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 03-coords.js：`ll`
  - 07-depth.js：`depth`
  - 12-renderer.js：`scene`

## 36-fireworks.js
- 作る：`FW`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`Q`、`S`
  - 03-coords.js：`ll`
  - 04-clock.js：`DAY`、`PH`
  - 07-depth.js：`depth`
  - 10-start.js：`rnd`
  - 12-renderer.js：`QUALITY`、`camera`、`renderer`、`scene`
  - 14-water.js：`waterU`
  - 29-controls.js：`isFar`、`yaw`
  - 30-audio.js：`SND`、`nburst`

## 37-buoys.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 03-coords.js：`ll`
  - 07-depth.js：`depth`
  - 11-state.js：`B`、`STATE`、`VIS`
  - 12-renderer.js：`camera`、`scene`
  - 14-water.js：`waveH`
  - 29-controls.js：`gl`、`isFar`、`ptrs`

## 38-seasonal-events.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`inLake`
  - 10-start.js：`rnd`
  - 12-renderer.js：`camera`、`scene`
  - 14-water.js：`waveH`
  - 16-terrain.js：`VEX`、`reedPts`
  - 20-villages-layout.js：`terrainAt`
  - 25-harbors.js：`lumpy`

## 39-kaizu.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`inLake`
  - 10-start.js：`rnd`
  - 12-renderer.js：`scene`
  - 16-terrain.js：`VEX`
  - 20-villages-layout.js：`cvTex`、`terrainAt`

## 40-shore-rocks.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`inLake`
  - 10-start.js：`rnd`
  - 12-renderer.js：`scene`
  - 16-terrain.js：`VEX`、`vnoise`
  - 18-buildings.js：`reedMask`
  - 20-villages-layout.js：`terrainAt`

## 41-islands.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 03-coords.js：`ll`
  - 05-lake.js：`inPoly`、`islands`
  - 06-inner-lakes.js：`inLake`
  - 10-start.js：`rnd`
  - 12-renderer.js：`MOBILE`、`QUALITY`、`scene`
  - 16-terrain.js：`ISLES`、`isleH`、`okiZone`
  - 17-trees.js：`cardForest`

## 42-ambience.js
- 作る：`idleLook`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 06-inner-lakes.js：`inLake`
  - 07-depth.js：`depth`
  - 10-start.js：`rnd`
  - 11-state.js：`STATE`
  - 12-renderer.js：`QUALITY`、`camera`、`scene`
  - 14-water.js：`waveH`
  - 16-terrain.js：`VEX`
  - 20-villages-layout.js：`paddies`、`terrainAt`
  - 29-controls.js：`isFar`、`yawT`

## 43-moments.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 04-clock.js：`DAY`
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`inLake`
  - 10-start.js：`rnd`
  - 12-renderer.js：`QUALITY`、`camera`、`scene`
  - 14-water.js：`waveH`
  - 16-terrain.js：`VEX`、`reedPts`
  - 17-trees.js：`cardForest`
  - 20-villages-layout.js：`terrainAt`
  - 29-controls.js：`isFar`
  - 30-audio.js：`SND`

## 44-life.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 03-coords.js：`ll`
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`inLake`、`inMain`
  - 07-depth.js：`depth`
  - 10-start.js：`rnd`
  - 12-renderer.js：`MOBILE`、`QUALITY`、`camera`、`scene`
  - 14-water.js：`waterU`、`waveH`
  - 16-terrain.js：`VEX`、`reedPts`
  - 17-trees.js：`cardForest`
  - 20-villages-layout.js：`cvTex`、`houses`、`paddies`、`terrainAt`
  - 22-village-lights-roads.js：`winGeo`
  - 29-controls.js：`isFar`

## 45-city.js
- 作る：（なし）
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 05-lake.js：`outer`
  - 06-inner-lakes.js：`inInner`、`inLake`
  - 10-start.js：`rnd`
  - 12-renderer.js：`scene`
  - 16-terrain.js：`VEX`
  - 20-villages-layout.js：`cvTex`、`terrainAt`

## 46-frame-move.js
- 作る：`moveHouse`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`、`SPEED`
  - 06-inner-lakes.js：`inInner`、`inLake`、`inMain`
  - 07-depth.js：`depth`
  - 08-weather.js：`LEVEL`
  - 09-wind.js：`flow`
  - 11-state.js：`B`、`STATE`、`steer`
  - 18-buildings.js：`BP`、`inReeds`
  - 29-controls.js：`joyId`、`kIn`、`keys`、`yaw`
  - 31-ui.js：`restBtn`

## 47-frame-sky-light.js
- 作る：`updateSkyLight`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`LAKE`、`S`
  - 02-season.js：`SEASON`
  - 03-coords.js：`ll`
  - 04-clock.js：`DAY`
  - 08-weather.js：`LEVEL`、`WXQ`
  - 09-wind.js：`flow`
  - 12-renderer.js：`camera`、`renderer`、`scene`
  - 13-sky-dome.js：`hemi`、`skyDome`、`skyU`、`sun`
  - 14-water.js：`setWaves`、`water`、`waterU`、`waves`
  - 16-terrain.js：`FOREST_TINT`、`INNER_Y`、`REED_MONTH`、`REED_TEX`、`SNOW`、`innerReeds`、`reedU`、`reeds`、`terrMat`
  - 18-buildings.js：`CUST`、`LIGHT_COLORS`、`glassMats`、`house`
  - 19-boats.js：`W_SENSE`、`flash`、`nextFlash`、`portLamps`、`smB`、`smoke`、`smokeGeo`、`updatePrecip`
  - 20-villages-layout.js：`roofM`、`roofSnowU`
  - 22-village-lights-roads.js：`windows`
  - 23-paddies.js：`paddySeason`
  - 24-shore-landmarks.js：`treeSeason`
  - 27-sky-day.js：`skyAt`
  - 29-controls.js：`isFar`

## 48-frame-float.js
- 作る：`floatHouse`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`RM`、`S`、`SPEED`
  - 06-inner-lakes.js：`inInner`、`inMain`
  - 11-state.js：`B`
  - 12-renderer.js：`scene`
  - 14-water.js：`water`、`waterU`、`waveH`、`waveTop`
  - 16-terrain.js：`INNER_Y`
  - 18-buildings.js：`BP`、`house`
  - 19-boats.js：`WAKE_N`、`wakeBob`、`wakeI`、`wakeP`

## 49-frame-camera.js
- 作る：`updateCamera`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`S`
  - 06-inner-lakes.js：`inLake`
  - 11-state.js：`B`、`STATE`、`camX`、`camZ`
  - 12-renderer.js：`camera`
  - 14-water.js：`water`、`waveH`
  - 16-terrain.js：`VEX`
  - 18-buildings.js：`house`
  - 20-villages-layout.js：`terrainAt`
  - 29-controls.js：`dist`、`distT`、`pitch`、`ptrs`、`yaw`、`yawT`
  - 42-ambience.js：`idleLook`

## 50-frame-render.js
- 作る：`renderFrame`
- 使う：
  - 00-head.js：`G`
  - 11-state.js：`camX`、`camZ`
  - 12-renderer.js：`QUALITY`、`camera`、`renderer`、`scene`
  - 13-sky-dome.js：`skyDome`、`sun`
  - 14-water.js：`water`、`waterU`
  - 18-buildings.js：`house`

## 51-frame.js
- 作る：`frame`
- 使う：
  - 00-head.js：`G`
  - 01-settings.js：`Q`、`S`
  - 03-coords.js：`ll`
  - 04-clock.js：`MO`、`PH`、`clock`
  - 08-weather.js：`WXQ`
  - 09-wind.js：`wind`
  - 11-state.js：`B`、`STATE`、`camX`、`camZ`
  - 12-renderer.js：`QUALITY`、`resScale`
  - 18-buildings.js：`CUST`、`buildHouse`、`reedMask`
  - 19-boats.js：`boatState`、`updateBoats`
  - 20-villages-layout.js：`houses`
  - 28-map.js：`drawFar`
  - 29-controls.js：`dist`、`distT`、`isFar`、`pitch`、`yaw`、`yawT`
  - 30-audio.js：`audioUpdate`
  - 33-resize.js：`resize`
  - 34-frame-state.js：`fpsN`、`fpsT`、`last`、`trailT`
  - 36-fireworks.js：`FW`
  - 46-frame-move.js：`moveHouse`
  - 47-frame-sky-light.js：`updateSkyLight`
  - 48-frame-float.js：`floatHouse`
  - 49-frame-camera.js：`updateCamera`
  - 50-frame-render.js：`renderFrame`

## 共有の値（window.__xxx）

- `__floating`：00-head.js
- `__scene`：51-frame.js
- `__set`：51-frame.js
- `__setH`：51-frame.js
