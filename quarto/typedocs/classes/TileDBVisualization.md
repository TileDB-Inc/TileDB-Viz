[@tiledb-inc/viz-core](../README.md) / [Exports](../modules.md) / TileDBVisualization

# Class: TileDBVisualization

## Hierarchy

- **`TileDBVisualization`**

  ↳ [`TileDBPointCloudVisualization`](TileDBPointCloudVisualization.md)

  ↳ [`TileDBImageVisualization`](TileDBImageVisualization.md)

  ↳ [`TileDBMBRSVisualization`](TileDBMBRSVisualization.md)

## Table of contents

### Constructors

- [constructor](TileDBVisualization.md#constructor)

### Properties

- [canvas](TileDBVisualization.md#canvas)
- [engine](TileDBVisualization.md#engine)
- [height](TileDBVisualization.md#height)
- [inspector](TileDBVisualization.md#inspector)
- [moveSpeed](TileDBVisualization.md#movespeed)
- [rootElement](TileDBVisualization.md#rootelement)
- [wheelPrecision](TileDBVisualization.md#wheelprecision)
- [width](TileDBVisualization.md#width)

### Methods

- [createScene](TileDBVisualization.md#createscene)
- [destroy](TileDBVisualization.md#destroy)
- [render](TileDBVisualization.md#render)
- [rerenderCanvas](TileDBVisualization.md#rerendercanvas)
- [resizeCanvas](TileDBVisualization.md#resizecanvas)

## Constructors

### constructor

• **new TileDBVisualization**(`options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`TileDBVisualizationBaseOptions`](../interfaces/TileDBVisualizationBaseOptions.md) |

#### Defined in

[base/base.ts:44](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L44)

## Properties

### canvas

• `Optional` **canvas**: `HTMLCanvasElement`

#### Defined in

[base/base.ts:37](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L37)

___

### engine

• `Optional` **engine**: `Engine`

#### Defined in

[base/base.ts:38](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L38)

___

### height

• **height**: `string`

#### Defined in

[base/base.ts:36](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L36)

___

### inspector

• `Optional` **inspector**: `boolean`

#### Defined in

[base/base.ts:41](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L41)

___

### moveSpeed

• **moveSpeed**: `number`

#### Defined in

[base/base.ts:40](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L40)

___

### rootElement

• **rootElement**: `HTMLElement`

#### Defined in

[base/base.ts:42](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L42)

___

### wheelPrecision

• **wheelPrecision**: `number`

#### Defined in

[base/base.ts:39](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L39)

___

### width

• **width**: `string`

#### Defined in

[base/base.ts:35](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L35)

## Methods

### createScene

▸ `Protected` **createScene**(): `Promise`<`Scene`\>

#### Returns

`Promise`<`Scene`\>

#### Defined in

[base/base.ts:76](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L76)

___

### destroy

▸ **destroy**(): `void`

#### Returns

`void`

#### Defined in

[base/base.ts:70](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L70)

___

### render

▸ **render**(): `void`

#### Returns

`void`

#### Defined in

[base/base.ts:88](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L88)

___

### rerenderCanvas

▸ **rerenderCanvas**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[base/base.ts:55](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L55)

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

#### Defined in

[base/base.ts:59](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L59)
