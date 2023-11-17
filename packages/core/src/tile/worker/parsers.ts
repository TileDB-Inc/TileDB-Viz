import { extrudePolygon } from 'geometry-extrude';
import proj4 from 'proj4';
import { Parser, Polygon } from '@tiledb-inc/wkx';
import earcut from 'earcut';

export function parseStringPolygon(
  wkts: string[],
  ids: number[],
  positions: number[],
  normals: number[],
  indices: number[],
  faceMapping: bigint[],
  vertexMap: Map<bigint, number[]>,
  geotransformCoefficients: number[],
  converter?: proj4.Converter
) {
  for (const [index, wkt] of wkts.entries()) {
    const indexOffset = positions.length / 3;

    const entry = Parser.parse(wkt) as Polygon;

    const vertices: number[] = [];
    const holes: number[] = [];

    for (let index = 0; index < entry.exteriorRing.length; ++index) {
      const point = entry.exteriorRing[index];
      if (converter) {
        [point.x, point.y] = converter.forward([point.x, point.y]);
      }

      [point.x, point.y] = [
        (point.x - geotransformCoefficients[0]) / geotransformCoefficients[1],
        (point.y - geotransformCoefficients[3]) / geotransformCoefficients[5]
      ];
      vertices.push(point.x, point.y);
    }

    for (
      let holeIndex = 0;
      holeIndex < entry.interiorRings.length;
      ++holeIndex
    ) {
      holes.push(vertices.length / 2);
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
        vertices.push(point.x, point.y);
      }
    }

    const polygon = earcut(vertices, holes) as number[];

    indices.push(...polygon.map((x: number) => x + indexOffset));
    for (let i = 0; i < vertices.length; i += 2) {
      positions.push(vertices[i], 0, vertices[i + 1]);
    }
    vertexMap.set(BigInt(ids[index]), [
      faceMapping.length,
      vertices.length / 2
    ]);
    faceMapping.push(
      ...new Array(vertices.length / 2).fill(BigInt(ids[index]))
    );
  }
}

export function parsePolygon(
  wkbs: ArrayBuffer,
  offsets: BigUint64Array,
  ids: BigInt64Array,
  positions: number[],
  normals: number[],
  indices: number[],
  faceMapping: bigint[],
  vertexMap: Map<bigint, number[]>,
  geotransformCoefficients: number[],
  converter?: proj4.Converter
) {
  for (const [geometryIndex, offset] of offsets.entries()) {
    const indexOffset = positions.length / 3;

    const entry = Parser.parse(
      new DataView(
        wkbs,
        Number(offset),
        geometryIndex === offsets.length - 1
          ? undefined
          : Number(offsets[geometryIndex + 1] - offset)
      )
    ) as Polygon;

    const vertices: number[] = [];
    const holes: number[] = [];

    for (let index = 0; index < entry.exteriorRing.length; ++index) {
      const point = entry.exteriorRing[index];
      if (converter) {
        [point.x, point.y] = converter.forward([point.x, point.y]);
      }
      [point.x, point.y] = [
        (point.x - geotransformCoefficients[0]) / geotransformCoefficients[1],
        (point.y - geotransformCoefficients[3]) / geotransformCoefficients[5]
      ];
      vertices.push(point.x, point.y);
    }

    for (
      let holeIndex = 0;
      holeIndex < entry.interiorRings.length;
      ++holeIndex
    ) {
      holes.push(vertices.length / 2);
      for (
        let index = 0;
        index < entry.interiorRings[holeIndex].length;
        ++index
      ) {
        const point = entry.interiorRings[holeIndex][index];
        if (converter) {
          [point.x, point.y] = converter.forward([point.x, point.y]);
        }
        [point.x, point.y] = [
          (point.x - geotransformCoefficients[0]) / geotransformCoefficients[1],
          (point.y - geotransformCoefficients[3]) / geotransformCoefficients[5]
        ];
        vertices.push(point.x, point.y);
      }
    }

    const polygon = earcut(vertices, holes) as number[];

    indices.push(...polygon.map((x: number) => x + indexOffset));
    for (let i = 0; i < vertices.length; i += 2) {
      positions.push(vertices[i], 0, vertices[i + 1]);
    }
    vertexMap.set(ids[geometryIndex], [
      faceMapping.length,
      vertices.length / 2
    ]);
    faceMapping.push(
      ...new Array(vertices.length / 2).fill(ids[geometryIndex])
    );
  }
}

export function parsePolygonExtruded(
  wkbs: ArrayBuffer,
  heights: number[],
  offsets: BigUint64Array,
  ids: BigInt64Array,
  positions: number[],
  normals: number[],
  indices: number[],
  faceMapping: bigint[],
  vertexMap: Map<bigint, number[]>,
  geotransformCoefficients: number[],
  metersPerUnit: number,
  converter?: proj4.Converter
) {
  let positionOffset = positions.length;

  for (const [geometryIndex, offset] of offsets.entries()) {
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
      if (converter) {
        [point.x, point.y] = converter.forward([point.x, point.y]);
      }
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
        if (converter) {
          [point.x, point.y] = converter.forward([point.x, point.y]);
        }
        [point.x, point.y] = [
          (point.x - geotransformCoefficients[0]) / geotransformCoefficients[1],
          (point.y - geotransformCoefficients[3]) / geotransformCoefficients[5]
        ];
        hole.push([point.x, point.y]);
      }
      data.push(hole);
    }

    const polygon = extrudePolygon([data], {
      depth: heights[geometryIndex] / (metersPerUnit ?? 1),
      excludeBottom: true
    });

    vertexMap.set(ids[geometryIndex], [
      faceMapping.length,
      polygon.position.length / 3
    ]);

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
    vertexMap.set(ids[geometryIndex], [
      faceMapping.length,
      polygon.position.length / 3
    ]);
    faceMapping.push(
      ...new Array(polygon.position.length / 3).fill(ids[geometryIndex])
    );

    positionOffset += polygon.position.length;
  }
}
