import { Camera, Mesh, Scene, SceneLoader } from '@babylonjs/core';
import { Tileset, TileState } from '../../../types';
import { OGC3DTilesTileset } from '@tiledb-inc/viz-common/src/types/3DTiles';
import { Tile } from '@tiledb-inc/viz-common';
import { extractBVH } from '../../../utils/metadata-utils/3DTiles/3DTileLoader';

export class TDB3DTile extends Tile<TDB3DTile> {
  public contents: string[];
  public mesh?: Mesh;

  constructor() {
    super();

    this.contents = [];
  }

  get isSubTileset(): boolean {
    if (this.contents.length === 1 && this.contents[0].endsWith('.json')) {
      return true;
    }

    return false;
  }
}

export class TDB3DTileTileset extends Tileset<TDB3DTile> {
  public scene: Scene;

  constructor(scene: Scene, root: TDB3DTile) {
    super(root);

    this.scene = scene;
  }

  public loadTiles(camera: Camera, threshold: number) {
    for (const tile of super.getTiles(camera, threshold)) {
      this.state.set(tile.id, TileState.LOADING);

      if (tile.isSubTileset) {
        // Load subtileset and store it under that tile node
        // The subtiles will be loaded once the tileset has been parsed
        fetch(tile.contents[0])
          .then(response =>
            response.json().then(data => {
              // Parse JSON to 3D Tiles tileset
              return data as OGC3DTilesTileset;
            })
          )
          .then(result => {
            // Append nodes to current tile
            tile.children = extractBVH(result)[0].children;
          });
      } else {
        for (const uri of tile.contents) {
          SceneLoader.ImportMeshAsync('', uri, '', this.scene).then(result => {
            this.state.set(tile.id, TileState.VISIBLE);
          });
        }
      }
    }
  }
}
