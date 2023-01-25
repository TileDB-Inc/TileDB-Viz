[@tiledb-inc/viz-core](../README.md) / [Exports](../modules.md) / TileDBMBRSVisualizationOptions

# Interface: TileDBMBRSVisualizationOptions

## Hierarchy

- [`TileDBVisualizationBaseOptions`](TileDBVisualizationBaseOptions.md)

  ↳ **`TileDBMBRSVisualizationOptions`**

## Table of contents

### Properties

- [data](TileDBMBRSVisualizationOptions.md#data)
- [extents](TileDBMBRSVisualizationOptions.md#extents)
- [height](TileDBMBRSVisualizationOptions.md#height)
- [inspector](TileDBMBRSVisualizationOptions.md#inspector)
- [moveSpeed](TileDBMBRSVisualizationOptions.md#movespeed)
- [rootElement](TileDBMBRSVisualizationOptions.md#rootelement)
- [wheelPrecision](TileDBMBRSVisualizationOptions.md#wheelprecision)
- [width](TileDBMBRSVisualizationOptions.md#width)
- [zScale](TileDBMBRSVisualizationOptions.md#zscale)

## Properties

### data

• **data**: `any`

Data to render [all modes]

#### Defined in

[mbrs/mbrs.ts:18](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/mbrs/mbrs.ts#L18)

___

### extents

• **extents**: `number`[]

#### Defined in

[mbrs/mbrs.ts:23](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/mbrs/mbrs.ts#L23)

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

### moveSpeed

• `Optional` **moveSpeed**: `number`

When camera view in first-person determines how fast to move

#### Inherited from

[TileDBVisualizationBaseOptions](TileDBVisualizationBaseOptions.md).[moveSpeed](TileDBVisualizationBaseOptions.md#movespeed)

#### Defined in

[base/base.ts:24](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/base/base.ts#L24)

___

### rootElement

• **rootElement**: `HTMLElement`

The HTML element to render the canvas

#### Inherited from

[TileDBVisualizationBaseOptions](TileDBVisualizationBaseOptions.md).[rootElement](TileDBVisualizationBaseOptions.md#rootelement)

#### Defined in

[base/base.ts:32](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/base/base.ts#L32)

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

### zScale

• **zScale**: `number`

The extends (min/max) of each mbrs

#### Defined in

[mbrs/mbrs.ts:22](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/mbrs/mbrs.ts#L22)
