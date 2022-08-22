import {
  AxisDragGizmo,
  Color3,
  Mesh,
  UtilityLayerRenderer,
  Vector3
} from '@babylonjs/core';

export class DragGizmos {
  private gizmo_x: AxisDragGizmo;
  private gizmo_y: AxisDragGizmo;
  private gizmo_z: AxisDragGizmo;

  constructor(mesh: Mesh, util_layer: UtilityLayerRenderer) {
    this.gizmo_x = new AxisDragGizmo(
      new Vector3(1, 0, 0),
      Color3.FromHexString('#ff0000'),
      util_layer
    );
    this.gizmo_x.updateGizmoRotationToMatchAttachedMesh = false;
    this.gizmo_x.updateGizmoPositionToMatchAttachedMesh = true;
    this.gizmo_x.attachedMesh = mesh;

    this.gizmo_y = new AxisDragGizmo(
      new Vector3(0, 1, 0),
      Color3.FromHexString('#00ff00'),
      util_layer
    );
    this.gizmo_y.updateGizmoRotationToMatchAttachedMesh = false;
    this.gizmo_y.updateGizmoPositionToMatchAttachedMesh = true;
    this.gizmo_y.attachedMesh = mesh;

    this.gizmo_z = new AxisDragGizmo(
      new Vector3(0, 0, 1),
      Color3.FromHexString('#0000ff'),
      util_layer
    );
    this.gizmo_z.updateGizmoRotationToMatchAttachedMesh = false;
    this.gizmo_z.updateGizmoPositionToMatchAttachedMesh = true;
    this.gizmo_z.attachedMesh = mesh;
  }

  dispose() {
    this.gizmo_x.dispose();
    this.gizmo_y.dispose();
    this.gizmo_z.dispose();
  }
}
