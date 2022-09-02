import { PointCloudMode } from '../../point-cloud';

interface PointCloudSwitches {
  isTime: boolean;
  isClass: boolean;
  isTopo: boolean;
  isGltf: boolean;
}

function setPointCloudSwitches(mode?: PointCloudMode): PointCloudSwitches {
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

export default setPointCloudSwitches;
