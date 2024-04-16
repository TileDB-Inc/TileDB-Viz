import { OGC3DTilesBoundingVolume } from './base';

export type OGC3DTilesTileset = {
  /**
   * Metadata about the entire tileset
   */
  asset: {
    /**
     * The 3D Tiles version. The version defines the JSON schema for the tileset JSON and the base set of tile formats.
     */
    version: string;

    /**
     * Application-specific version of this tileset, e.g., for when an existing tileset is updated.
     */
    tilesetVersion?: string;
  };

  /**
   * The error, in meters, introduced if this tileset is not rendered.
   * At runtime, the geometric error is used to compute screen space error (SSE), i.e., the error measured in pixels.
   */
  geometricError: number;

  /**
   * The root tile
   */
  root: OGC3DTilesTile;
};

export type OGC3DTilesTile = {
  /**
   * The bounding volume that encloses the tile
   */
  boundingVolume: OGC3DTilesBoundingVolume;

  /**
   * The error, in meters, introduced if this tile is rendered and its children are not.
   * At runtime, the geometric error is used to compute screen space error (SSE), i.e., the error measured in pixels.
   */
  geometricError: number;

  /**
   * Specifies if additive or replacement refinement is used when traversing the tileset for rendering.
   * This property is required for the root tile of a tileset; it is optional for all other tiles.
   * The default is to inherit from the parent tile.
   */
  refine?: 'ADD' | 'REPLACE';

  /**
   * A floating-point 4x4 affine transformation matrix, stored in column-major order, that transforms the tile's content--i.e., its features as well as content.boundingVolume, boundingVolume, and viewerRequestVolume--from the tile's local coordinate system to the parent tile's coordinate system, or, in the case of a root tile, from the tile's local coordinate system to the tileset's coordinate system.
   * `transform` does not apply to any volume property when the volume is a region, defined in EPSG:4979 coordinates.
   * `transform` scales the `geometricError` by the maximum scaling factor from the matrix
   */
  transform?: Array<number>;

  /**
   * Metadata about the tile's content and a link to the content.
   * When this is omitted the tile is just used for culling.
   * When this is defined, then `contents` shall be undefined.
   */
  content?: OGC3DTilesContent;

  /**
   * An array of contents.
   * When this is defined, then `content` shall be undefined.
   */
  contents?: Array<OGC3DTilesContent>;

  /**
   * An array of objects that define child tiles.
   * Each child tile content is fully enclosed by its parent tile's bounding volume and, generally, has a geometricError less than its parent tile's geometricError.
   * For leaf tiles, the length of this array is zero, and children may not be defined.
   */
  children?: Array<OGC3DTilesTile>;
};

export type OGC3DTilesContent = {
  /**
   * A uri that points to tile content. When the uri is relative, it is relative to the referring tileset JSON file.
   */
  uri: string;

  /**
   * An optional bounding volume that tightly encloses tile content.
   * tile.boundingVolume provides spatial coherence and tile.content.boundingVolume enables tight view frustum culling.
   * When this is omitted, tile.boundingVolume is used.
   */
  boundingVolume?: OGC3DTilesBoundingVolume;

  /**
   * The group this content belongs to.
   * The value is an index into the array of `groups` that is defined for the containing tileset.
   */
  group?: number;
};
