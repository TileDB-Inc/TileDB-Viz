import {
  AxisDragGizmo,
  Color3,
  Mesh,
  UtilityLayerRenderer,
  Vector3
} from '@babylonjs/core';

export default class DragGizmos {
  private gizmoX: AxisDragGizmo;
  private gizmoY: AxisDragGizmo;
  private gizmoZ: AxisDragGizmo;

  constructor(mesh: Mesh, utilLayer: UtilityLayerRenderer) {
    this.gizmoX = new AxisDragGizmo(
      new Vector3(1, 0, 0),
      Color3.FromHexString('#ff0000'),
      utilLayer
    );
    this.gizmoX.updateGizmoRotationToMatchAttachedMesh = false;
    this.gizmoX.updateGizmoPositionToMatchAttachedMesh = true;
    this.gizmoX.attachedMesh = mesh;

    this.gizmoY = new AxisDragGizmo(
      new Vector3(0, 1, 0),
      Color3.FromHexString('#00ff00'),
      utilLayer
    );
    this.gizmoY.updateGizmoRotationToMatchAttachedMesh = false;
    this.gizmoY.updateGizmoPositionToMatchAttachedMesh = true;
    this.gizmoY.attachedMesh = mesh;

    this.gizmoZ = new AxisDragGizmo(
      new Vector3(0, 0, 1),
      Color3.FromHexString('#0000ff'),
      utilLayer
    );
    this.gizmoZ.updateGizmoRotationToMatchAttachedMesh = false;
    this.gizmoZ.updateGizmoPositionToMatchAttachedMesh = true;
    this.gizmoZ.attachedMesh = mesh;
  }

  dispose() {
    this.gizmoX.dispose();
    this.gizmoY.dispose();
    this.gizmoZ.dispose();
  }
}
