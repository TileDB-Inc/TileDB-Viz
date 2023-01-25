[@tiledb-inc/viz-core](../README.md) / [Exports](../modules.md) / TileDBMBRSVisualization

# Class: TileDBMBRSVisualization

## Hierarchy

- [`TileDBVisualization`](TileDBVisualization.md)

  ↳ **`TileDBMBRSVisualization`**

## Table of contents

### Constructors

- [constructor](TileDBMBRSVisualization.md#constructor)

### Properties

- [\_zScale](TileDBMBRSVisualization.md#_zscale)
- [canvas](TileDBMBRSVisualization.md#canvas)
- [data](TileDBMBRSVisualization.md#data)
- [engine](TileDBMBRSVisualization.md#engine)
- [extents](TileDBMBRSVisualization.md#extents)
- [height](TileDBMBRSVisualization.md#height)
- [inspector](TileDBMBRSVisualization.md#inspector)
- [moveSpeed](TileDBMBRSVisualization.md#movespeed)
- [rootElement](TileDBMBRSVisualization.md#rootelement)
- [wheelPrecision](TileDBMBRSVisualization.md#wheelprecision)
- [width](TileDBMBRSVisualization.md#width)

### Methods

- [createScene](TileDBMBRSVisualization.md#createscene)
- [destroy](TileDBMBRSVisualization.md#destroy)
- [render](TileDBMBRSVisualization.md#render)
- [rerenderCanvas](TileDBMBRSVisualization.md#rerendercanvas)
- [resizeCanvas](TileDBMBRSVisualization.md#resizecanvas)

## Constructors

### constructor

• **new TileDBMBRSVisualization**(`options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`TileDBMBRSVisualizationOptions`](../interfaces/TileDBMBRSVisualizationOptions.md) |

#### Overrides

[TileDBVisualization](TileDBVisualization.md).[constructor](TileDBVisualization.md#constructor)

#### Defined in

[mbrs/mbrs.ts:31](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/mbrs/mbrs.ts#L31)

## Properties

### \_zScale

• `Private` **\_zScale**: `number`

#### Defined in

[mbrs/mbrs.ts:28](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/mbrs/mbrs.ts#L28)

___

### canvas

• `Optional` **canvas**: `HTMLCanvasElement`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[canvas](TileDBVisualization.md#canvas)

#### Defined in

[base/base.ts:37](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/base/base.ts#L37)

___

### data

• `Private` **data**: `any`

#### Defined in

[mbrs/mbrs.ts:27](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/mbrs/mbrs.ts#L27)

___

### engine

• `Optional` **engine**: `Engine`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[engine](TileDBVisualization.md#engine)

#### Defined in

[base/base.ts:38](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/base/base.ts#L38)

___

### extents

• `Private` **extents**: `number`[]

#### Defined in

[mbrs/mbrs.ts:29](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/mbrs/mbrs.ts#L29)

___

### height

• **height**: `string`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[height](TileDBVisualization.md#height)

#### Defined in

[base/base.ts:36](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/base/base.ts#L36)

___

### inspector

• `Optional` **inspector**: `boolean`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[inspector](TileDBVisualization.md#inspector)

#### Defined in

[base/base.ts:41](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/base/base.ts#L41)

___

### moveSpeed

• **moveSpeed**: `number`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[moveSpeed](TileDBVisualization.md#movespeed)

#### Defined in

[base/base.ts:40](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/base/base.ts#L40)

___

### rootElement

• **rootElement**: `HTMLElement`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[rootElement](TileDBVisualization.md#rootelement)

#### Defined in

[base/base.ts:42](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/base/base.ts#L42)

___

### wheelPrecision

• **wheelPrecision**: `number`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[wheelPrecision](TileDBVisualization.md#wheelprecision)

#### Defined in

[base/base.ts:39](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/base/base.ts#L39)

___

### width

• **width**: `string`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[width](TileDBVisualization.md#width)

#### Defined in

[base/base.ts:35](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/base/base.ts#L35)

## Methods

### createScene

▸ `Protected` **createScene**(): `Promise`<`Scene`\>

#### Returns

`Promise`<`Scene`\>

#### Overrides

[TileDBVisualization](TileDBVisualization.md).[createScene](TileDBVisualization.md#createscene)

#### Defined in

[mbrs/mbrs.ts:38](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/mbrs/mbrs.ts#L38)

___

### destroy

▸ **destroy**(): `void`

#### Returns

`void`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[destroy](TileDBVisualization.md#destroy)

#### Defined in

[base/base.ts:70](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/base/base.ts#L70)

___

### render

▸ **render**(): `void`

#### Returns

`void`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[render](TileDBVisualization.md#render)

#### Defined in

[base/base.ts:88](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/base/base.ts#L88)

___

### rerenderCanvas

▸ **rerenderCanvas**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[rerenderCanvas](TileDBVisualization.md#rerendercanvas)

#### Defined in

[base/base.ts:55](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/base/base.ts#L55)

___

### resizeCanvas

▸ **resizeCanvas**(`dimensions?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `dimensions?` | `Object` |
| `dimensions.height` | `string` |
| `dimensions.width` | `string` |

#### Returns

`void`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[resizeCanvas](TileDBVisualization.md#resizecanvas)

#### Defined in

[base/base.ts:59](https://github.com/TileDB-Inc/TileDB-Viz/blob/cc0c331/packages/core/src/base/base.ts#L59)
