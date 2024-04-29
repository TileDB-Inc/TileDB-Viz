export type OGC3DTilesBoundingVolume = {
  /**
   * An array of 12 numbers that define an oriented bounding box.
   * The first three elements define the x, y, and z values for the center of the box.
   * The next three elements (with indices 3, 4, and 5) define the x axis direction and half-length.
   * The next three elements (indices 6, 7, and 8) define the y axis direction and half-length.
   * The last three elements (indices 9, 10, and 11) define the z axis direction and half-length.
   */
  box?: Array<number>;

  /**
   * An array of six numbers that define a bounding geographic region in EPSG:4979 coordinates with the order [west, south, east, north, minimum height, maximum height].
   * Longitudes and latitudes are in radians, and heights are in meters above (or below) the WGS84 ellipsoid.
   */
  region?: Array<number>;

  /**
   * An array of four numbers that define a bounding sphere. The first three elements define the x, y, and z values for the center of the sphere.
   * The last element (with index 3) defines the radius in meters.
   */
  sphere?: Array<number>;
};

export type OGC3DTilesMetadataEntity = {
  /**
   * The class that property values conform to.
   * The value shall be a class ID declared in the `classes` dictionary of the metadata schema.
   */
  class: string;
};
