[@tiledb-inc/viz-core](../README.md) / [Exports](../modules.md) / TileDBImageVisualization

# Class: TileDBImageVisualization

## Hierarchy

- [`TileDBVisualization`](TileDBVisualization.md)

  ↳ **`TileDBImageVisualization`**

## Table of contents

### Constructors

- [constructor](TileDBImageVisualization.md#constructor)

### Properties

- [canvas](TileDBImageVisualization.md#canvas)
- [data](TileDBImageVisualization.md#data)
- [engine](TileDBImageVisualization.md#engine)
- [height](TileDBImageVisualization.md#height)
- [inspector](TileDBImageVisualization.md#inspector)
- [moveSpeed](TileDBImageVisualization.md#movespeed)
- [rootElement](TileDBImageVisualization.md#rootelement)
- [wheelPrecision](TileDBImageVisualization.md#wheelprecision)
- [width](TileDBImageVisualization.md#width)
- [xyBbox](TileDBImageVisualization.md#xybbox)

### Methods

- [createScene](TileDBImageVisualization.md#createscene)
- [destroy](TileDBImageVisualization.md#destroy)
- [render](TileDBImageVisualization.md#render)
- [rerenderCanvas](TileDBImageVisualization.md#rerendercanvas)
- [resizeCanvas](TileDBImageVisualization.md#resizecanvas)

## Constructors

### constructor

• **new TileDBImageVisualization**(`options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`TileDBImageVisualizationOptions`](../interfaces/TileDBImageVisualizationOptions.md) |

#### Overrides

[TileDBVisualization](TileDBVisualization.md).[constructor](TileDBVisualization.md#constructor)

#### Defined in

[image/image.ts:28](https://github.com/TileDB-Inc/TileDB-Viz/blob/bf6c778/packages/core/src/image/image.ts#L28)

## Properties

### canvas

• `Optional` **canvas**: `HTMLCanvasElement`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[canvas](TileDBVisualization.md#canvas)

#### Defined in

[base/base.ts:37](https://github.com/TileDB-Inc/TileDB-Viz/blob/bf6c778/packages/core/src/base/base.ts#L37)

___

### data

• `Private` **data**: `any`

#### Defined in

[image/image.ts:25](https://github.com/TileDB-Inc/TileDB-Viz/blob/bf6c778/packages/core/src/image/image.ts#L25)

___

### engine

• `Optional` **engine**: `Engine`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[engine](TileDBVisualization.md#engine)

#### Defined in

[base/base.ts:38](https://github.com/TileDB-Inc/TileDB-Viz/blob/bf6c778/packages/core/src/base/base.ts#L38)

___

### height

• **height**: `string`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[height](TileDBVisualization.md#height)

#### Defined in

[base/base.ts:36](https://github.com/TileDB-Inc/TileDB-Viz/blob/bf6c778/packages/core/src/base/base.ts#L36)

___

### inspector

• `Optional` **inspector**: `boolean`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[inspector](TileDBVisualization.md#inspector)

#### Defined in

[base/base.ts:41](https://github.com/TileDB-Inc/TileDB-Viz/blob/bf6c778/packages/core/src/base/base.ts#L41)

___

### moveSpeed

• **moveSpeed**: `number`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[moveSpeed](TileDBVisualization.md#movespeed)

#### Defined in

[base/base.ts:40](https://github.com/TileDB-Inc/TileDB-Viz/blob/bf6c778/packages/core/src/base/base.ts#L40)

___

### rootElement

• **rootElement**: `HTMLElement`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[rootElement](TileDBVisualization.md#rootelement)

#### Defined in

[base/base.ts:42](https://github.com/TileDB-Inc/TileDB-Viz/blob/bf6c778/packages/core/src/base/base.ts#L42)

___

### wheelPrecision

• **wheelPrecision**: `number`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[wheelPrecision](TileDBVisualization.md#wheelprecision)

#### Defined in

[base/base.ts:39](https://github.com/TileDB-Inc/TileDB-Viz/blob/bf6c778/packages/core/src/base/base.ts#L39)

___

### width

• **width**: `string`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[width](TileDBVisualization.md#width)

#### Defined in

[base/base.ts:35](https://github.com/TileDB-Inc/TileDB-Viz/blob/bf6c778/packages/core/src/base/base.ts#L35)

___

### xyBbox

• `Private` **xyBbox**: `number`[]

#### Defined in

[image/image.ts:26](https://github.com/TileDB-Inc/TileDB-Viz/blob/bf6c778/packages/core/src/image/image.ts#L26)

## Methods

### createScene

▸ `Protected` **createScene**(): `Promise`<`Scene`\>

#### Returns

`Promise`<`Scene`\>

#### Overrides

[TileDBVisualization](TileDBVisualization.md).[createScene](TileDBVisualization.md#createscene)

#### Defined in

[image/image.ts:34](https://github.com/TileDB-Inc/TileDB-Viz/blob/bf6c778/packages/core/src/image/image.ts#L34)

___

### destroy

▸ **destroy**(): `void`

#### Returns

`void`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[destroy](TileDBVisualization.md#destroy)

#### Defined in

[base/base.ts:70](https://github.com/TileDB-Inc/TileDB-Viz/blob/bf6c778/packages/core/src/base/base.ts#L70)

___

### render

▸ **render**(): `void`

#### Returns

`void`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[render](TileDBVisualization.md#render)

#### Defined in

[base/base.ts:88](https://github.com/TileDB-Inc/TileDB-Viz/blob/bf6c778/packages/core/src/base/base.ts#L88)

___

### rerenderCanvas

▸ **rerenderCanvas**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[rerenderCanvas](TileDBVisualization.md#rerendercanvas)

#### Defined in

[base/base.ts:55](https://github.com/TileDB-Inc/TileDB-Viz/blob/bf6c778/packages/core/src/base/base.ts#L55)

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

[base/base.ts:59](https://github.com/TileDB-Inc/TileDB-Viz/blob/bf6c778/packages/core/src/base/base.ts#L59)
