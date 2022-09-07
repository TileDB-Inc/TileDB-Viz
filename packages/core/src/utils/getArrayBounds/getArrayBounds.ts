const getArrayBounds = (nums: number[]) =>
  nums.reduce(
    (accum, current) => [
      Math.min(current, accum[0]),
      Math.max(current, accum[1])
    ],
    [Infinity, Number.NEGATIVE_INFINITY]
  );

export default getArrayBounds;
