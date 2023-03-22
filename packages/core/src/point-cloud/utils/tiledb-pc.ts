import { Layout } from '@tiledb-inc/tiledb-cloud/lib/v1';
import { TileDBVisualizationBaseOptions } from '../../base';
import { getQueryDataFromCache, writeToCache } from '../../utils/cache';
import getArrayBounds from '../../utils/getArrayBounds';
import getTileDBClient from '../../utils/getTileDBClient';
import { PointType } from '../materials/plugins/roundPointPlugin';
import { SparseResult } from '../model';
import { sortDataArrays } from './arrays';

export interface TileDBPointCloudOptions
  extends TileDBVisualizationBaseOptions {
  /**
   * Optional modes
   * time: add an interactive time slider
   * classes: add an interactive classes slider
   * topo: add a mapbox base layer
   * gltf: add gltf meshes
   */
  mode?: 'time' | 'classes' | 'topo' | 'gltf';
  /**
   * Background color scheme, choose from 'dark', 'light' or 'blue' with
   */
  colorScheme?: string;
  /**
   * Data to render from a json object
   */
  data?: SparseResult;
  /**
   * Scale the height (z-coordinate values) of all points
   */
  zScale?: number;
  /**
   * Binary blob of a gltf mesh or an array of gltf meshes [mode='gltf']
   */
  gltfData?: string;
  /**
   * Move the gltf datas along the z-axis to better align with the mapbox base layer [mode='topo']
   */
  topoOffset?: number;
  /**
   * Lookup table with the index and names of all classes [mode='classes']
   */
  classes?: { names: string[]; numbers: number[] };
  /**
   * Time offset
   */
  timeOffset?: number;
  /**
   * Perform clash detection between mesh and point cloud if true
   */
  distanceColors?: boolean;
  /**
   * Rotate the mesh with [alpha,beta,gamma]
   */
  meshRotation?: number[];
  /**
   * Shift the mesh with [x,y,z]
   */
  meshShift?: number[];
  /**
   * Scale the size [x,y,z] of the mesh
   */
  meshScale?: number[];
  /**
   * gltfData is an array with blobs when true
   */
  gltfMulti?: boolean;
  source?: 'dict' | 'cloud';
  pointShift?: number[];
  rgbMax?: number;
  /**
   * The min and max values of x, y and z
   */
  bbox?: { X: number[]; Y: number[]; Z: number[] };
  /**
   * Namespace of the array/group registered in TileDB Cloud (if mode === "cloud")
   */
  namespace?: string;
  /**
   * Name of the array registered in TileDB Cloud (if mode === "cloud")
   */
  arrayName?: string;
  /**
   * Name of the group registered in TileDB Cloud (if mode === "cloud")
   */
  groupName?: string;
  /**
   * TileDB Cloud api token (if mode === "cloud")
   */
  token?: string;
  /**
   * Path to TileDB config file
   */
  tiledbEnv?: string;
  /**
   * TileDB query buffer size
   */
  bufferSize?: number;
  /**
   * Stream from TileDB Cloud
   */
  streaming?: boolean;
  /**
   * Select point rendering type, 'box' is supported for now
   */
  pointType?: PointType;
  /**
   * Point size
   */
  pointSize?: number;
  /**
   * Camera location, choose a camera viewpoint towards the centre of the point cloud between 1 and 9
   */
  cameraLocation?: number;
  /**
   * Camera zoom, move the camera towards or away from the centre of the point cloud in the [x,y,z] directions
   */
  cameraZoomOut?: number[];
  /**
   * Move the free camera position up or down
   */
  cameraUp?: number;
  /**
   * EDL shader strength
   */
  edlStrength?: number;
  /**
   * EDL shader radius
   */
  edlRadius?: number;
  /**
   * Number of neightbours used in EDL shader
   */
  edlNeighbours?: number;
  /**
   * Point budget
   */
  pointBudget?: number;
  /**
   * Use shaders, on low end system might not want to use shaders
   */
  useShader?: boolean;
  /**
   * Use a Solid Particle System for the point cloud
   */
  useSPS?: boolean;
  /**
   * debug, draw octant boxes that are being rendered
   */
  debug?: boolean;
  /**
   * Web worker request pool size
   */
  workerPoolSize?: number;
}

export async function getPointCloud(options: TileDBPointCloudOptions) {
  if (!options.streaming) {
    let data: SparseResult = {
      X: new Float32Array(),
      Y: new Float32Array(),
      Z: new Float32Array(),
      Red: new Uint16Array(),
      Green: new Uint16Array(),
      Blue: new Uint16Array()
    };

    if (options.source === 'cloud') {
      const dataUnsorted = await loadPointCloud(options);
      if (options.mode === 'time') {
        data = sortDataArrays(dataUnsorted);
      } else {
        data = dataUnsorted;
      }
    } else {
      if (options.data) {
        data = options.data;
      }
    }

    let { xmin, xmax, ymin, ymax, zmin, zmax } = getPointCloudLimits(
      options,
      data
    );

    // shift points with user defined values (optional)
    if (options.pointShift) {
      const [x, y, z] = options.pointShift;
      data.X = data.X.map((n: number) => n + x);
      data.Y = data.Y.map((n: number) => n + y);
      data.Z = data.Z.map((n: number) => n + z);
      xmin = xmin + x;
      xmax = xmax + x;
      ymin = ymin + y;
      ymax = ymax + y;
      zmin = zmin + z;
      zmax = zmax + z;
    }
    return { data, xmin, xmax, ymin, ymax, zmin, zmax };
  }
}

export async function loadPointCloud(options: TileDBPointCloudOptions) {
  const config: Record<string, string> = {};

  config.apiKey = options.token as string;

  if (options.tiledbEnv) {
    config.basePath = options.tiledbEnv;
  }
  const tiledbClient = getTileDBClient(config);

  let ranges: number[][] = [];
  if (options.bbox) {
    ranges = [options.bbox.X, options.bbox.Y, options.bbox.Z];
  }
  const query = {
    layout: Layout.Unordered,
    bufferSize: options.bufferSize || 150000000000,
    ranges: ranges,
    attributes: [
      'X',
      'Y',
      'Z',
      'Red',
      'Green',
      'Blue',
      'GpsTime',
      'Classification'
    ]
  };

  // Concatenate all results in case of incomplete queries
  const concatenatedResults: Record<string, any> = {};

  const queryCacheKey = 0; // TODO need to include partial ranges

  const storeName = `${options.namespace}:${options.arrayName}`;

  const dataFromCache = await getQueryDataFromCache(storeName, queryCacheKey);

  if (dataFromCache) {
    return dataFromCache;
  }

  for await (const results of tiledbClient.query.ReadQuery(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    options.namespace!,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    options.arrayName!,
    query
  )) {
    for (const [attributeKey, attributeValues] of Object.entries(results)) {
      // If attribute key aready exists push attributes to the array
      if (concatenatedResults[attributeKey]) {
        concatenatedResults[attributeKey].push(attributeValues);
      } else {
        // If object key doesn't exist just assign it to the result
        concatenatedResults[attributeKey] = attributeValues;
      }
    }
  }

  await writeToCache(storeName, queryCacheKey, concatenatedResults);

  return concatenatedResults;
}

export function getPointCloudLimits(
  options: TileDBPointCloudOptions,
  data: SparseResult
) {
  let xmin: number;
  let xmax: number;
  let ymin: number;
  let ymax: number;
  let zmin: number;
  let zmax: number;

  if (options.bbox) {
    // In case pointShift exists add them to the respected values, otherwise default to zero.
    const [x = 0, y = 0, z = 0] = options.pointShift || [];
    xmin = options.bbox.X[0] + x;
    xmax = options.bbox.X[1] + x;
    ymin = options.bbox.Y[0] + y;
    ymax = options.bbox.Y[1] + y;
    zmin = options.bbox.Z[0] + z;
    zmax = options.bbox.Z[1] + z;
  } else {
    const xBounds = getArrayBounds(data.X);
    const yBounds = getArrayBounds(data.Y);
    const zBounds = getArrayBounds(data.Z);

    xmin = xBounds[0];
    xmax = xBounds[1];
    ymin = yBounds[0];
    ymax = yBounds[1];
    zmin = zBounds[0];
    zmax = zBounds[1];
  }

  return { xmin, xmax, ymin, ymax, zmin, zmax };
}

export function setPointCloudSwitches(mode?: string) {
  let isTime = false;
  let isClass = false;
  let isTopo = false;
  let isGltf = false;

  if (mode === 'time') {
    isTime = true;
  } else if (mode === 'classes') {
    isClass = true;
  } else if (mode === 'topo') {
    isTopo = true;
  } else if (mode === 'gltf') {
    isGltf = true;
  }
  return { isTime, isClass, isTopo, isGltf };
}

export function getStoreName(namespace: string, arrayName: string) {
  return `${namespace}:${arrayName}`;
}

export async function getNonEmptyDomain(
  options: TileDBPointCloudOptions
): Promise<number[]> {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const storeName = getStoreName(options.namespace!, options.groupName!);
  const key = 0;
  // we might have the data cached
  const dataFromCache = await getQueryDataFromCache(storeName, key);

  if (!dataFromCache) {
    const config: Record<string, string> = {};

    config.apiKey = options.token as string;

    if (options.tiledbEnv) {
      config.basePath = options.tiledbEnv;
    }
    const tiledbClient = getTileDBClient(config);

    const resp = await tiledbClient.ArrayApi.getArrayNonEmptyDomain(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      options.namespace!,
      options.groupName + '_0', // naming convention for groups of multi-resolution arrays
      'application/json'
    );

    writeToCache(storeName, key, resp.data.nonEmptyDomain.float32);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return resp.data.nonEmptyDomain.float32!;
  } else {
    return dataFromCache;
  }
}

export async function getArraySchema(options: TileDBPointCloudOptions) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const storeName = getStoreName(options.namespace!, options.groupName!);
  const key = -2;
  // we might have the data cached
  const dataFromCache = await getQueryDataFromCache(storeName, key);

  if (!dataFromCache) {
    const config: Record<string, string> = {};

    config.apiKey = options.token as string;

    if (options.tiledbEnv) {
      config.basePath = options.tiledbEnv;
    }
    const tiledbClient = getTileDBClient(config);

    const arraySchemaResponse = await tiledbClient.ArrayApi.getArray(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      options.namespace!,
      options.groupName + '_0',
      'application/json'
    );
    writeToCache(storeName, key, arraySchemaResponse.data);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return arraySchemaResponse.data;
  } else {
    return dataFromCache;
  }
}

export async function getArrayMetadata(
  options: TileDBPointCloudOptions
): Promise<[Map<string, number>, Array<number>, Array<number>, number]> {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const storeName = getStoreName(options.namespace!, options.groupName!);
  const key = -1;
  // we might have the data cached
  const dataFromCache = await getQueryDataFromCache(storeName, key);

  if (!dataFromCache) {
    const config: Record<string, string> = {};

    config.apiKey = options.token as string;

    if (options.tiledbEnv) {
      config.basePath = options.tiledbEnv;
    }
    const tiledbClient = getTileDBClient(config);
    const resp = await tiledbClient.ArrayApi.getArrayMetaDataJson(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      options.namespace!,
      options.groupName + '_0' // naming convention for groups of multi-resolution arrays
    );

    const contents = await tiledbClient.groups.getGroupContents(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      options.namespace!,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      options.groupName!
    );
    if (!contents.entries) {
      console.log('TileDB Group does not contain any array data');
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const nLevels = contents.entries!.length;

    interface OctantData {
      'octree-bounds': string;
      'octree-bounds-conforming': string;
      'octant-data': string;
    }
    const o = resp.data as OctantData;
    const obj = JSON.parse(o['octant-data']);
    const bounds = JSON.parse(o['octree-bounds']);
    let boundsConforming = JSON.parse(o['octree-bounds']);
    if (o['octree-bounds-conforming']) {
      boundsConforming = JSON.parse(o['octree-bounds-conforming']);
    }

    writeToCache(storeName, key, {
      'octant-data': obj,
      'octree-bounds': bounds,
      'octree-bounds-conforming': boundsConforming,
      'octree-levels': nLevels
    });
    return [
      new Map<string, number>(Object.entries(obj)),
      bounds,
      boundsConforming,
      nLevels
    ];
  } else {
    return [
      new Map<string, number>(Object.entries(dataFromCache['octant-data'])),
      dataFromCache['octree-bounds'],
      dataFromCache['octree-bounds-conforming'],
      dataFromCache['octree-levels']
    ];
  }
}
