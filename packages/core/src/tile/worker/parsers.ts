import { extrudePolygon } from 'geometry-extrude';
import proj4 from 'proj4';
import { Parser, Polygon } from '@tiledb-inc/wkx';

export function parsePolygon(
  wkbs: ArrayBuffer,
  heights: number[],
  offsets: BigUint64Array,
  ids: BigInt64Array,
  positions: number[],
  normals: number[],
  indices: number[],
  faceMapping: bigint[],
  converter: proj4.Converter,
  geotransformCoefficients: number[],
  metersPerUnit: number
) {
  let positionOffset = positions.length;

  for (const [geometryIndex, offset] of offsets.entries()) {
    // const entry = wkx.Geometry.parse(
    //   NodeBuffer.from(
    //     wkbs,
    //     Number(offset),
    //     geometryIndex === offsets.length - 1
    //       ? undefined
    //       : Number(offsets[geometryIndex + 1] - offset)
    //   )
    // );

    const entry = Parser.parse(
      new DataView(
        wkbs,
        Number(offset),
        geometryIndex === offsets.length - 1
          ? undefined
          : Number(offsets[geometryIndex + 1] - offset)
      )
    ) as Polygon;

    const data: number[][][] = [];
    const shape: number[][] = [];

    for (let index = 0; index < entry.exteriorRing.length; ++index) {
      const point = entry.exteriorRing[index];
      [point.x, point.y] = converter.forward([point.x, point.y]);
      [point.x, point.y] = [
        (point.x - geotransformCoefficients[0]) / geotransformCoefficients[1],
        (point.y - geotransformCoefficients[3]) / geotransformCoefficients[5]
      ];
      shape.push([point.x, point.y]);
    }
    data.push(shape);

    for (
      let holeIndex = 0;
      holeIndex < entry.interiorRings.length;
      ++holeIndex
    ) {
      const hole: number[][] = [];
      for (
        let index = 0;
        index < entry.interiorRings[holeIndex].length;
        ++index
      ) {
        const point = entry.interiorRings[holeIndex][index];
        [point.x, point.y] = converter.forward([point.x, point.y]);
        [point.x, point.y] = [
          (point.x - geotransformCoefficients[0]) / geotransformCoefficients[1],
          (point.y - geotransformCoefficients[3]) / geotransformCoefficients[5]
        ];
        hole.push([point.x, point.y]);
      }
      data.push(hole);
    }

    const polygon = extrudePolygon([data], {
      depth: heights[geometryIndex] / metersPerUnit,
      excludeBottom: true
    });

    for (let index = 0; index < polygon.position.length / 3; ++index) {
      [polygon.position[3 * index + 1], polygon.position[3 * index + 2]] = [
        polygon.position[3 * index + 2],
        polygon.position[3 * index + 1]
      ];
      [polygon.normal[3 * index + 1], polygon.normal[3 * index + 2]] = [
        polygon.normal[3 * index + 2],
        polygon.normal[3 * index + 1]
      ];
    }

    positions.push(...Array.from(polygon.position));
    normals.push(...Array.from(polygon.normal));
    indices.push(
      ...Array.from(polygon.indices).map((x: number) => x + positionOffset / 3)
    );
    faceMapping.push(
      ...new Array(polygon.position.length / 3).fill(ids[geometryIndex])
    );

    positionOffset += polygon.position.length;
  }
}
