import { extrudePolygon } from 'geometry-extrude';
import proj4 from 'proj4';
import { Parser, Polygon } from '@tiledb-inc/wkx';
import { Matrix, multiply, index } from 'mathjs';
import { OutputGeometry } from '../types';

export function parsePolygon(
  data: ArrayBuffer | string[],
  heights: number[],
  offsets: BigUint64Array,
  ids: BigInt64Array,
  geometryOutput: OutputGeometry,
  featureData: Record<string, number[]>,
  affineTransform: Matrix,
  converter?: proj4.Converter
) {
  let positionOffset = geometryOutput.positions.length;
  const extrude = heights.length !== 0;

  for (const [feature] of Object.entries(featureData)) {
    if (feature in geometryOutput) {
      continue;
    }

    geometryOutput[feature] = [];
  }

  const polygons: Polygon[] = [];
  if (data instanceof ArrayBuffer) {
    for (const [geometryIndex, offset] of offsets.entries()) {
      polygons.push(
        Parser.parse(
          new DataView(
            data,
            Number(offset),
            geometryIndex === offsets.length - 1
              ? undefined
              : Number(offsets[geometryIndex + 1] - offset)
          )
        ) as Polygon
      );
    }
  } else if (data instanceof Array) {
    for (const entry of data) {
      polygons.push(Parser.parse(entry) as Polygon);
    }
  }

  for (const [geometryIndex, entry] of polygons.entries()) {
    const data: number[][][] = [];
    const shape: number[][] = [];

    for (
      let pointIndex = 0;
      pointIndex < entry.exteriorRing.length;
      ++pointIndex
    ) {
      const point = entry.exteriorRing[pointIndex];
      if (converter) {
        [point.x, point.y] = converter.forward([point.x!, point.y!]);
      }

      // The polygon data is 2D and always on the XY plane
      // We trnasform the polygon vertices to 4D hemogeneous coordinates
      // in order to apply the affine tranformation tha brings the coordinates from CRS to pixel space
      // Then we only take the XY component to contstruct the polygon mesh
      shape.push(
        multiply(affineTransform, [point.x!, point.y!, 0, 1])
          .subset(index([true, true, false, false]))
          .toArray() as number[]
      );
    }
    data.push(shape);

    for (
      let holeIndex = 0;
      holeIndex < entry.interiorRings.length;
      ++holeIndex
    ) {
      const hole: number[][] = [];
      for (
        let pointIndex = 0;
        pointIndex < entry.interiorRings[holeIndex].length;
        ++pointIndex
      ) {
        const point = entry.interiorRings[holeIndex][pointIndex];
        if (converter) {
          [point.x, point.y] = converter.forward([point.x!, point.y!]);
        }

        hole.push(
          multiply(affineTransform, [point.x!, point.y!, 0, 1])
            .subset(index([true, true, false, false]))
            .toArray() as number[]
        );
      }
      data.push(hole);
    }

    const polygon = extrudePolygon([data], {
      depth: extrude
        ? heights[geometryIndex] * affineTransform.get([0, 0])
        : Number.MIN_VALUE,
      excludeBottom: true,
      smoothSide: true
    });

    for (
      let vertexIndex = 0;
      vertexIndex < polygon.position.length / 3;
      ++vertexIndex
    ) {
      [
        polygon.position[3 * vertexIndex + 1],
        polygon.position[3 * vertexIndex + 2]
      ] = [
        polygon.position[3 * vertexIndex + 2],
        -polygon.position[3 * vertexIndex + 1]
      ];
      [
        polygon.normal[3 * vertexIndex + 1],
        polygon.normal[3 * vertexIndex + 2]
      ] = [
        polygon.normal[3 * vertexIndex + 2],
        polygon.normal[3 * vertexIndex + 1]
      ];
    }

    geometryOutput.positions.push(...Array.from(polygon.position));
    geometryOutput.indices.push(
      ...Array.from(polygon.indices).map((x: number) => x + positionOffset / 3)
    );
    geometryOutput.vertexMap.set(ids[geometryIndex], [
      geometryOutput.faceMapping.length,
      polygon.position.length / 3
    ]);
    geometryOutput.faceMapping.push(
      ...new Array(polygon.position.length / 3).fill(ids[geometryIndex])
    );

    for (const [feature, data] of Object.entries(featureData)) {
      const elementsPerVertex = data.length / polygons.length;
      const value: number[] = [];

      for (let idx = 0; idx < elementsPerVertex; ++idx) {
        value.push(
          featureData[feature][geometryIndex * elementsPerVertex + idx]
        );
      }

      geometryOutput[feature].push(
        ...new Array(polygon.position.length / 3).fill(value).flatMap(x => x)
      );
    }

    positionOffset += polygon.position.length;
  }
}
