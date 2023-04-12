import { MoctreeBlock } from '../../point-cloud/octree';

const isMockTreeBlock = (data: any): data is MoctreeBlock => {
  return (
    data &&
    data.entries &&
    data.entries.length &&
    data.entries.Position instanceof Float32Array &&
    data.entries.Color instanceof Float32Array
  );
};

export default isMockTreeBlock;
