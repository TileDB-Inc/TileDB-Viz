import setPointCloudSwitches from './setPointCloudSwitches';

describe('setPointCloudSwitches', () => {
  it('returns default switches', () => {
    const result = setPointCloudSwitches();
    expect(result).toEqual({
      isTime: false,
      isClass: false,
      isTopo: false,
      isGltf: false
    });
  });

  it('returns switches when mode == time', () => {
    const result = setPointCloudSwitches('time');
    expect(result).toEqual({
      isTime: true,
      isClass: false,
      isTopo: false,
      isGltf: false
    });
  });

  it('returns switches when mode == classes', () => {
    const result = setPointCloudSwitches('classes');
    expect(result).toEqual({
      isTime: false,
      isClass: true,
      isTopo: false,
      isGltf: false
    });
  });

  it('returns switches when mode == topo', () => {
    const result = setPointCloudSwitches('topo');
    expect(result).toEqual({
      isTime: false,
      isClass: false,
      isTopo: true,
      isGltf: false
    });
  });

  it('returns switches when mode == gltf', () => {
    const result = setPointCloudSwitches('gltf');
    expect(result).toEqual({
      isTime: false,
      isClass: false,
      isTopo: false,
      isGltf: true
    });
  });
});
