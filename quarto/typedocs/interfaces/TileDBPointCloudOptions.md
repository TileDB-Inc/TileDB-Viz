[@tiledb-inc/viz-core](../README.md) / [Exports](../modules.md) / TileDBPointCloudOptions

# Interface: TileDBPointCloudOptions

## Hierarchy

- [`TileDBVisualizationBaseOptions`](TileDBVisualizationBaseOptions.md)

  ↳ **`TileDBPointCloudOptions`**

## Table of contents

### Properties

- [arrayName](TileDBPointCloudOptions.md#arrayname)
- [bbox](TileDBPointCloudOptions.md#bbox)
- [bufferSize](TileDBPointCloudOptions.md#buffersize)
- [cameraRadius](TileDBPointCloudOptions.md#cameraradius)
- [classes](TileDBPointCloudOptions.md#classes)
- [colorScheme](TileDBPointCloudOptions.md#colorscheme)
- [data](TileDBPointCloudOptions.md#data)
- [debug](TileDBPointCloudOptions.md#debug)
- [distanceColors](TileDBPointCloudOptions.md#distancecolors)
- [edlNeighbours](TileDBPointCloudOptions.md#edlneighbours)
- [edlRadius](TileDBPointCloudOptions.md#edlradius)
- [edlStrength](TileDBPointCloudOptions.md#edlstrength)
- [fanOut](TileDBPointCloudOptions.md#fanout)
- [gltfData](TileDBPointCloudOptions.md#gltfdata)
- [gltfMulti](TileDBPointCloudOptions.md#gltfmulti)
- [groupName](TileDBPointCloudOptions.md#groupname)
- [height](TileDBPointCloudOptions.md#height)
- [inspector](TileDBPointCloudOptions.md#inspector)
- [maxNumCacheBlocks](TileDBPointCloudOptions.md#maxnumcacheblocks)
- [meshRotation](TileDBPointCloudOptions.md#meshrotation)
- [meshScale](TileDBPointCloudOptions.md#meshscale)
- [meshShift](TileDBPointCloudOptions.md#meshshift)
- [mode](TileDBPointCloudOptions.md#mode)
- [moveSpeed](TileDBPointCloudOptions.md#movespeed)
- [namespace](TileDBPointCloudOptions.md#namespace)
- [pointBudget](TileDBPointCloudOptions.md#pointbudget)
- [pointShift](TileDBPointCloudOptions.md#pointshift)
- [pointSize](TileDBPointCloudOptions.md#pointsize)
- [pointType](TileDBPointCloudOptions.md#pointtype)
- [rgbMax](TileDBPointCloudOptions.md#rgbmax)
- [rootElement](TileDBPointCloudOptions.md#rootelement)
- [showFraction](TileDBPointCloudOptions.md#showfraction)
- [source](TileDBPointCloudOptions.md#source)
- [streaming](TileDBPointCloudOptions.md#streaming)
- [tiledbEnv](TileDBPointCloudOptions.md#tiledbenv)
- [timeOffset](TileDBPointCloudOptions.md#timeoffset)
- [token](TileDBPointCloudOptions.md#token)
- [topoOffset](TileDBPointCloudOptions.md#topooffset)
- [useGUI](TileDBPointCloudOptions.md#usegui)
- [useSPS](TileDBPointCloudOptions.md#usesps)
- [useShader](TileDBPointCloudOptions.md#useshader)
- [wheelPrecision](TileDBPointCloudOptions.md#wheelprecision)
- [width](TileDBPointCloudOptions.md#width)
- [workerPoolSize](TileDBPointCloudOptions.md#workerpoolsize)
- [zScale](TileDBPointCloudOptions.md#zscale)

## Properties

### arrayName

• `Optional` **arrayName**: `string`

Name of the array registered in TileDB Cloud (if mode === "cloud")

#### Defined in

[point-cloud/utils/tiledb-pc.ts:81](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L81)

___

### bbox

• `Optional` **bbox**: `Object`

The min and max values of x, y and z

#### Type declaration

| Name | Type |
| :------ | :------ |
| `X` | `number`[] |
| `Y` | `number`[] |
| `Z` | `number`[] |

#### Defined in

[point-cloud/utils/tiledb-pc.ts:73](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L73)

___

### bufferSize

• `Optional` **bufferSize**: `number`

TileDB query buffer size

#### Defined in

[point-cloud/utils/tiledb-pc.ts:97](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L97)

___

### cameraRadius

• `Optional` **cameraRadius**: `number`

Camera radius

#### Defined in

[point-cloud/utils/tiledb-pc.ts:113](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L113)

___

### classes

• `Optional` **classes**: `Object`

Lookup table with the index and names of all classes [mode='classes']

#### Type declaration

| Name | Type |
| :------ | :------ |
| `names` | `string`[] |
| `numbers` | `number`[] |

#### Defined in

[point-cloud/utils/tiledb-pc.ts:41](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L41)

___

### colorScheme

• `Optional` **colorScheme**: `string`

Color scheme

#### Defined in

[point-cloud/utils/tiledb-pc.ts:21](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L21)

___

### data

• `Optional` **data**: `any`

Data to render [all modes]

#### Defined in

[point-cloud/utils/tiledb-pc.ts:25](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L25)

___

### debug

• `Optional` **debug**: `boolean`

debug, draw octant boxes that are being rendered

#### Defined in

[point-cloud/utils/tiledb-pc.ts:153](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L153)

___

### distanceColors

• `Optional` **distanceColors**: `boolean`

Perform clash detection between mesh and point cloud if true

#### Defined in

[point-cloud/utils/tiledb-pc.ts:49](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L49)

___

### edlNeighbours

• `Optional` **edlNeighbours**: `number`

Number of neightbours used in EDL shader

#### Defined in

[point-cloud/utils/tiledb-pc.ts:125](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L125)

___

### edlRadius

• `Optional` **edlRadius**: `number`

EDL shader radius

#### Defined in

[point-cloud/utils/tiledb-pc.ts:121](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L121)

___

### edlStrength

• `Optional` **edlStrength**: `number`

EDL shader strength

#### Defined in

[point-cloud/utils/tiledb-pc.ts:117](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L117)

___

### fanOut

• `Optional` **fanOut**: `number`

Number of blocks to fan out when buffering

#### Defined in

[point-cloud/utils/tiledb-pc.ts:137](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L137)

___

### gltfData

• `Optional` **gltfData**: `any`

Binary blob of a gltf mesh or an array of gltf meshes [mode='gltf']

#### Defined in

[point-cloud/utils/tiledb-pc.ts:33](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L33)

___

### gltfMulti

• `Optional` **gltfMulti**: `boolean`

gltfData is an array with blobs when true

#### Defined in

[point-cloud/utils/tiledb-pc.ts:65](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L65)

___

### groupName

• `Optional` **groupName**: `string`

Name of the group registered in TileDB Cloud (if mode === "cloud")

#### Defined in

[point-cloud/utils/tiledb-pc.ts:85](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L85)

___

### height

• `Optional` **height**: `string`

Height of widget canvas in pixels

#### Inherited from

[TileDBVisualizationBaseOptions](TileDBVisualizationBaseOptions.md).[height](TileDBVisualizationBaseOptions.md#height)

#### Defined in

[base/base.ts:16](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/base/base.ts#L16)

___

### inspector

• `Optional` **inspector**: `boolean`

Show BabylonJS inspector

#### Inherited from

[TileDBVisualizationBaseOptions](TileDBVisualizationBaseOptions.md).[inspector](TileDBVisualizationBaseOptions.md#inspector)

#### Defined in

[base/base.ts:28](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/base/base.ts#L28)

___

### maxNumCacheBlocks

• `Optional` **maxNumCacheBlocks**: `number`

Number of blocks in LRU cache

#### Defined in

[point-cloud/utils/tiledb-pc.ts:129](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L129)

___

### meshRotation

• `Optional` **meshRotation**: `number`[]

Rotate the mesh with [alpha,beta,gamma]

#### Defined in

[point-cloud/utils/tiledb-pc.ts:53](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L53)

___

### meshScale

• `Optional` **meshScale**: `number`[]

Scale the size [x,y,z] of the mesh

#### Defined in

[point-cloud/utils/tiledb-pc.ts:61](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L61)

___

### meshShift

• `Optional` **meshShift**: `number`[]

Shift the mesh with [x,y,z]

#### Defined in

[point-cloud/utils/tiledb-pc.ts:57](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L57)

___

### mode

• `Optional` **mode**: ``"time"`` \| ``"classes"`` \| ``"topo"`` \| ``"gltf"``

Optional modes
time: add an interactive time slider
classes: add an interactive classes slider
topo: add a mapbox base layer
gltf: add gltf meshes

#### Defined in

[point-cloud/utils/tiledb-pc.ts:17](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L17)

___

### moveSpeed

• `Optional` **moveSpeed**: `number`

When camera view in first-person determines how fast to move

#### Inherited from

[TileDBVisualizationBaseOptions](TileDBVisualizationBaseOptions.md).[moveSpeed](TileDBVisualizationBaseOptions.md#movespeed)

#### Defined in

[base/base.ts:24](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/base/base.ts#L24)

___

### namespace

• `Optional` **namespace**: `string`

Namespace of the array/group registered in TileDB Cloud (if mode === "cloud")

#### Defined in

[point-cloud/utils/tiledb-pc.ts:77](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L77)

___

### pointBudget

• `Optional` **pointBudget**: `number`

Point budget

#### Defined in

[point-cloud/utils/tiledb-pc.ts:133](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L133)

___

### pointShift

• `Optional` **pointShift**: `number`[]

#### Defined in

[point-cloud/utils/tiledb-pc.ts:68](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L68)

___

### pointSize

• `Optional` **pointSize**: `number`

Point size

#### Defined in

[point-cloud/utils/tiledb-pc.ts:109](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L109)

___

### pointType

• `Optional` **pointType**: `string`

Select point rendering type, 'box' is supported for now

#### Defined in

[point-cloud/utils/tiledb-pc.ts:105](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L105)

___

### rgbMax

• `Optional` **rgbMax**: `number`

#### Defined in

[point-cloud/utils/tiledb-pc.ts:69](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L69)

___

### rootElement

• **rootElement**: `HTMLElement`

The HTML element to render the canvas

#### Inherited from

[TileDBVisualizationBaseOptions](TileDBVisualizationBaseOptions.md).[rootElement](TileDBVisualizationBaseOptions.md#rootelement)

#### Defined in

[base/base.ts:32](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/base/base.ts#L32)

___

### showFraction

• `Optional` **showFraction**: `number`

#### Defined in

[point-cloud/utils/tiledb-pc.ts:67](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L67)

___

### source

• `Optional` **source**: ``"dict"`` \| ``"cloud"``

#### Defined in

[point-cloud/utils/tiledb-pc.ts:66](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L66)

___

### streaming

• `Optional` **streaming**: `boolean`

Stream from TileDB Cloud

#### Defined in

[point-cloud/utils/tiledb-pc.ts:101](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L101)

___

### tiledbEnv

• `Optional` **tiledbEnv**: `string`

Path to TileDB config file

#### Defined in

[point-cloud/utils/tiledb-pc.ts:93](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L93)

___

### timeOffset

• `Optional` **timeOffset**: `number`

Time offset

#### Defined in

[point-cloud/utils/tiledb-pc.ts:45](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L45)

___

### token

• `Optional` **token**: `string`

TileDB Cloud api token (if mode === "cloud")

#### Defined in

[point-cloud/utils/tiledb-pc.ts:89](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L89)

___

### topoOffset

• `Optional` **topoOffset**: `number`

Move the gltf datas along the z-axis to better align with the mapbox base layer [mode='topo']

#### Defined in

[point-cloud/utils/tiledb-pc.ts:37](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L37)

___

### useGUI

• `Optional` **useGUI**: `boolean`

Add an interactive GUI

#### Defined in

[point-cloud/utils/tiledb-pc.ts:145](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L145)

___

### useSPS

• `Optional` **useSPS**: `boolean`

Use a Solid Particle System for the point cloud

#### Defined in

[point-cloud/utils/tiledb-pc.ts:149](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L149)

___

### useShader

• `Optional` **useShader**: `boolean`

Use shaders, on low end system might not want to use shaders

#### Defined in

[point-cloud/utils/tiledb-pc.ts:141](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L141)

___

### wheelPrecision

• `Optional` **wheelPrecision**: `number`

Gets or Set the mouse wheel precision or how fast is the camera zooming.

#### Inherited from

[TileDBVisualizationBaseOptions](TileDBVisualizationBaseOptions.md).[wheelPrecision](TileDBVisualizationBaseOptions.md#wheelprecision)

#### Defined in

[base/base.ts:20](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/base/base.ts#L20)

___

### width

• `Optional` **width**: `string`

Width of widget canvas in pixels

#### Inherited from

[TileDBVisualizationBaseOptions](TileDBVisualizationBaseOptions.md).[width](TileDBVisualizationBaseOptions.md#width)

#### Defined in

[base/base.ts:12](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/base/base.ts#L12)

___

### workerPoolSize

• `Optional` **workerPoolSize**: `number`

Web worker request pool size

#### Defined in

[point-cloud/utils/tiledb-pc.ts:157](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L157)

___

### zScale

• `Optional` **zScale**: `number`

Scale the z-coordinate values for all points

#### Defined in

[point-cloud/utils/tiledb-pc.ts:29](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/point-cloud/utils/tiledb-pc.ts#L29)
