[@tiledb-inc/viz-core](../README.md) / [Exports](../modules.md) / TileDBImageVisualizationOptions

# Interface: TileDBImageVisualizationOptions

## Hierarchy

- [`TileDBVisualizationBaseOptions`](TileDBVisualizationBaseOptions.md)

  ↳ **`TileDBImageVisualizationOptions`**

## Table of contents

### Properties

- [data](TileDBImageVisualizationOptions.md#data)
- [height](TileDBImageVisualizationOptions.md#height)
- [inspector](TileDBImageVisualizationOptions.md#inspector)
- [moveSpeed](TileDBImageVisualizationOptions.md#movespeed)
- [rootElement](TileDBImageVisualizationOptions.md#rootelement)
- [wheelPrecision](TileDBImageVisualizationOptions.md#wheelprecision)
- [width](TileDBImageVisualizationOptions.md#width)
- [xyBbox](TileDBImageVisualizationOptions.md#xybbox)

## Properties

### data

• **data**: `any`

Data to render [all modes]

#### Defined in

[image/image.ts:18](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/image/image.ts#L18)

___

### height

• `Optional` **height**: `string`

Height of widget canvas in pixels

#### Inherited from

[TileDBVisualizationBaseOptions](TileDBVisualizationBaseOptions.md).[height](TileDBVisualizationBaseOptions.md#height)

#### Defined in

[base/base.ts:16](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L16)

___

### inspector

• `Optional` **inspector**: `boolean`

Show BabylonJS inspector

#### Inherited from

[TileDBVisualizationBaseOptions](TileDBVisualizationBaseOptions.md).[inspector](TileDBVisualizationBaseOptions.md#inspector)

#### Defined in

[base/base.ts:28](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L28)

___

### moveSpeed

• `Optional` **moveSpeed**: `number`

When camera view in first-person determines how fast to move

#### Inherited from

[TileDBVisualizationBaseOptions](TileDBVisualizationBaseOptions.md).[moveSpeed](TileDBVisualizationBaseOptions.md#movespeed)

#### Defined in

[base/base.ts:24](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L24)

___

### rootElement

• **rootElement**: `HTMLElement`

The HTML element to render the canvas

#### Inherited from

[TileDBVisualizationBaseOptions](TileDBVisualizationBaseOptions.md).[rootElement](TileDBVisualizationBaseOptions.md#rootelement)

#### Defined in

[base/base.ts:32](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L32)

___

### wheelPrecision

• `Optional` **wheelPrecision**: `number`

Gets or Set the mouse wheel precision or how fast is the camera zooming.

#### Inherited from

[TileDBVisualizationBaseOptions](TileDBVisualizationBaseOptions.md).[wheelPrecision](TileDBVisualizationBaseOptions.md#wheelprecision)

#### Defined in

[base/base.ts:20](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L20)

___

### width

• `Optional` **width**: `string`

Width of widget canvas in pixels

#### Inherited from

[TileDBVisualizationBaseOptions](TileDBVisualizationBaseOptions.md).[width](TileDBVisualizationBaseOptions.md#width)

#### Defined in

[base/base.ts:12](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L12)

___

### xyBbox

• **xyBbox**: `number`[]

The min and max values of x and y

#### Defined in

[image/image.ts:22](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/image/image.ts#L22)
