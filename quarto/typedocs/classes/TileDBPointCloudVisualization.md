[@tiledb-inc/viz-core](../README.md) / [Exports](../modules.md) / TileDBPointCloudVisualization

# Class: TileDBPointCloudVisualization

## Hierarchy

- [`TileDBVisualization`](TileDBVisualization.md)

  ↳ **`TileDBPointCloudVisualization`**

## Table of contents

### Constructors

- [constructor](TileDBPointCloudVisualization.md#constructor)

### Properties

- [cameras](TileDBPointCloudVisualization.md#cameras)
- [canvas](TileDBPointCloudVisualization.md#canvas)
- [engine](TileDBPointCloudVisualization.md#engine)
- [gui](TileDBPointCloudVisualization.md#gui)
- [height](TileDBPointCloudVisualization.md#height)
- [inspector](TileDBPointCloudVisualization.md#inspector)
- [model](TileDBPointCloudVisualization.md#model)
- [moveSpeed](TileDBPointCloudVisualization.md#movespeed)
- [options](TileDBPointCloudVisualization.md#options)
- [rootElement](TileDBPointCloudVisualization.md#rootelement)
- [scene](TileDBPointCloudVisualization.md#scene)
- [wheelPrecision](TileDBPointCloudVisualization.md#wheelprecision)
- [width](TileDBPointCloudVisualization.md#width)

### Methods

- [attachKeys](TileDBPointCloudVisualization.md#attachkeys)
- [createScene](TileDBPointCloudVisualization.md#createscene)
- [destroy](TileDBPointCloudVisualization.md#destroy)
- [render](TileDBPointCloudVisualization.md#render)
- [rerenderCanvas](TileDBPointCloudVisualization.md#rerendercanvas)
- [resizeCanvas](TileDBPointCloudVisualization.md#resizecanvas)
- [clearCache](TileDBPointCloudVisualization.md#clearcache)

## Constructors

### constructor

• **new TileDBPointCloudVisualization**(`options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`TileDBPointCloudOptions`](../interfaces/TileDBPointCloudOptions.md) |

#### Overrides

[TileDBVisualization](TileDBVisualization.md).[constructor](TileDBVisualization.md#constructor)

#### Defined in

[point-cloud/point-cloud.ts:33](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/point-cloud/point-cloud.ts#L33)

## Properties

### cameras

• `Private` **cameras**: `Camera`[]

#### Defined in

[point-cloud/point-cloud.ts:28](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/point-cloud/point-cloud.ts#L28)

___

### canvas

• `Optional` **canvas**: `HTMLCanvasElement`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[canvas](TileDBVisualization.md#canvas)

#### Defined in

[base/base.ts:37](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L37)

___

### engine

• `Optional` **engine**: `Engine`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[engine](TileDBVisualization.md#engine)

#### Defined in

[base/base.ts:38](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L38)

___

### gui

• `Private` **gui**: `PointCloudGUI`

#### Defined in

[point-cloud/point-cloud.ts:31](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/point-cloud/point-cloud.ts#L31)

___

### height

• **height**: `string`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[height](TileDBVisualization.md#height)

#### Defined in

[base/base.ts:36](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L36)

___

### inspector

• `Optional` **inspector**: `boolean`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[inspector](TileDBVisualization.md#inspector)

#### Defined in

[base/base.ts:41](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L41)

___

### model

• `Private` **model**: `ArrayModel`

#### Defined in

[point-cloud/point-cloud.ts:30](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/point-cloud/point-cloud.ts#L30)

___

### moveSpeed

• **moveSpeed**: `number`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[moveSpeed](TileDBVisualization.md#movespeed)

#### Defined in

[base/base.ts:40](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L40)

___

### options

• `Private` **options**: [`TileDBPointCloudOptions`](../interfaces/TileDBPointCloudOptions.md)

#### Defined in

[point-cloud/point-cloud.ts:29](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/point-cloud/point-cloud.ts#L29)

___

### rootElement

• **rootElement**: `HTMLElement`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[rootElement](TileDBVisualization.md#rootelement)

#### Defined in

[base/base.ts:42](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L42)

___

### scene

• `Private` **scene**: `Scene`

#### Defined in

[point-cloud/point-cloud.ts:27](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/point-cloud/point-cloud.ts#L27)

___

### wheelPrecision

• **wheelPrecision**: `number`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[wheelPrecision](TileDBVisualization.md#wheelprecision)

#### Defined in

[base/base.ts:39](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L39)

___

### width

• **width**: `string`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[width](TileDBVisualization.md#width)

#### Defined in

[base/base.ts:35](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L35)

## Methods

### attachKeys

▸ **attachKeys**(): `void`

#### Returns

`void`

#### Defined in

[point-cloud/point-cloud.ts:49](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/point-cloud/point-cloud.ts#L49)

___

### createScene

▸ `Protected` **createScene**(): `Promise`<`Scene`\>

#### Returns

`Promise`<`Scene`\>

#### Overrides

[TileDBVisualization](TileDBVisualization.md).[createScene](TileDBVisualization.md#createscene)

#### Defined in

[point-cloud/point-cloud.ts:83](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/point-cloud/point-cloud.ts#L83)

___

### destroy

▸ **destroy**(): `void`

#### Returns

`void`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[destroy](TileDBVisualization.md#destroy)

#### Defined in

[base/base.ts:70](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L70)

___

### render

▸ **render**(): `void`

#### Returns

`void`

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[render](TileDBVisualization.md#render)

#### Defined in

[base/base.ts:88](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L88)

___

### rerenderCanvas

▸ **rerenderCanvas**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[rerenderCanvas](TileDBVisualization.md#rerendercanvas)

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

#### Inherited from

[TileDBVisualization](TileDBVisualization.md).[resizeCanvas](TileDBVisualization.md#resizecanvas)

#### Defined in

[base/base.ts:59](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/base/base.ts#L59)

___

### clearCache

▸ `Static` **clearCache**(`storeName`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `storeName` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[point-cloud/point-cloud.ts:45](https://github.com/TileDB-Inc/TileDB-Viz/blob/f8363c2/packages/core/src/point-cloud/point-cloud.ts#L45)
