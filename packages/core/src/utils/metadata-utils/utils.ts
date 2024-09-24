import { BoundingInfo, Vector3 } from '@babylonjs/core';
import { Datatype } from '@tiledb-inc/tiledb-cloud/lib/v2';
import { Matrix, multiply } from 'mathjs';

export function deserializeBuffer(type: string, buffer: Array<number>): any {
  switch (type) {
    case Datatype.StringAscii:
      return new TextDecoder('ascii').decode(new Uint8Array(buffer));
    case Datatype.StringUtf8:
      return new TextDecoder('utf-8').decode(new Uint8Array(buffer));
    case Datatype.StringUtf16:
      return new TextDecoder('utf-16').decode(new Uint8Array(buffer));
    case Datatype.Int64:
      return Number(new BigInt64Array(new Uint8Array(buffer).buffer)[0]);
    default:
      console.error(`Cannot deserialize type '${type}'`);
      return undefined;
  }
}

export function get2DTransformedBoundingInfo(
  minPoint: [number, number],
  maxPoint: [number, number],
  converter?: proj4.Converter,
  pixelToCRS?: Matrix
): BoundingInfo {
  // Transform 2D box in 4D homogenous coordinates
  const box: [number, number, number, number][] = [
    [minPoint[0], minPoint[1], 0, 1],
    [minPoint[0], maxPoint[1], 0, 1],
    [maxPoint[0], minPoint[1], 0, 1],
    [maxPoint[0], maxPoint[1], 0, 1]
  ];

  return _getTransformBoundingInfo(box, converter, pixelToCRS);
}

export function get3DTransformedBoundingInfo(
  minPoint: [number, number, number],
  maxPoint: [number, number, number],
  converter?: proj4.Converter,
  CRSToPixel?: Matrix
) {
  // Transform 3D box in 4D homogeneous coordinates
  const box: [number, number, number, number][] = [
    [minPoint[0], minPoint[1], minPoint[2], 1],
    [minPoint[0], minPoint[1], maxPoint[2], 1],
    [minPoint[0], maxPoint[1], minPoint[2], 1],
    [minPoint[0], maxPoint[1], maxPoint[2], 1],
    [maxPoint[0], minPoint[1], minPoint[2], 1],
    [maxPoint[0], minPoint[1], maxPoint[2], 1],
    [maxPoint[0], maxPoint[1], minPoint[2], 1],
    [maxPoint[0], maxPoint[1], maxPoint[2], 1]
  ];

  return _getTransformBoundingInfo(box, converter, CRSToPixel);
}

export function get3DInverseTransformedBoundingInfo(
  minPoint: [number, number, number],
  maxPoint: [number, number, number],
  converter?: proj4.Converter,
  pixelTOCRS?: Matrix
) {
  // Transform 3D box in 4D homogeneous coordinates
  const box: [number, number, number, number][] = [
    [minPoint[0], minPoint[1], minPoint[2], 1],
    [minPoint[0], minPoint[1], maxPoint[2], 1],
    [minPoint[0], maxPoint[1], minPoint[2], 1],
    [minPoint[0], maxPoint[1], maxPoint[2], 1],
    [maxPoint[0], minPoint[1], minPoint[2], 1],
    [maxPoint[0], minPoint[1], maxPoint[2], 1],
    [maxPoint[0], maxPoint[1], minPoint[2], 1],
    [maxPoint[0], maxPoint[1], maxPoint[2], 1]
  ];

  return _getInverseTransformBoundingInfo(box, converter, pixelTOCRS);
}

export function _getTransformBoundingInfo(
  box: [number, number, number, number][],
  converter?: proj4.Converter,
  CRSToPixel?: Matrix
) {
  // When contructing the bounding boxes we need all corners because with the transformation between different
  // coordinate system using only two corners can result in invalid bounding boxes
  for (let idx = 0; idx < box.length; ++idx) {
    if (converter) {
      box[idx] = [...converter.forward(box[idx].slice(0, 3)), 1] as [
        number,
        number,
        number,
        number
      ];
    }

    if (CRSToPixel) {
      box[idx] = multiply(CRSToPixel, box[idx]).toArray() as [
        number,
        number,
        number,
        number
      ];
    }
  }

  // Switch from Z-up to Y-up
  const minPoint = [
    Math.min(...box.map(x => x[0])),
    Math.min(...box.map(x => x[2])),
    Math.min(...box.map(x => -x[1]))
  ];
  const maxPoint = [
    Math.max(...box.map(x => x[0])),
    Math.max(...box.map(x => x[2])),
    Math.max(...box.map(x => -x[1]))
  ];

  return new BoundingInfo(
    Vector3.FromArray(minPoint.slice(0, 3)),
    Vector3.FromArray(maxPoint.slice(0, 3))
  );
}

export function _getInverseTransformBoundingInfo(
  box: [number, number, number, number][],
  converter?: proj4.Converter,
  pixelToCRS?: Matrix
) {
  // When contructing the bounding boxes we need all corners because with the transformation between different
  // coordinate system using only two corners can result in invalid bounding boxes
  for (let idx = 0; idx < box.length; ++idx) {
    // Switch from Y-up to Z-up
    box[idx] = [box[idx][0], -box[idx][2], box[idx][1], 1];

    if (pixelToCRS) {
      box[idx] = multiply(pixelToCRS, box[idx]).toArray() as [
        number,
        number,
        number,
        number
      ];
    }

    if (converter) {
      box[idx] = [...converter.forward(box[idx].slice(0, 3)), 1] as [
        number,
        number,
        number,
        number
      ];
    }
  }

  // Switch from Z-up to Y-up
  const minPoint = [
    Math.min(...box.map(x => x[0])),
    Math.min(...box.map(x => x[1])),
    Math.min(...box.map(x => x[2]))
  ];
  const maxPoint = [
    Math.max(...box.map(x => x[0])),
    Math.max(...box.map(x => x[1])),
    Math.max(...box.map(x => x[2]))
  ];

  return new BoundingInfo(
    Vector3.FromArray(minPoint.slice(0, 3)),
    Vector3.FromArray(maxPoint.slice(0, 3))
  );
}