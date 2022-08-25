function reduceArrays(arrays: any, showFraction: number) {
  const arrayKeys = Object.keys(arrays);
  const reducedArrays: any = {};

  for (const arrayKey of arrayKeys) {
    if (Array.isArray(arrays[arrayKey])) {
      reducedArrays[arrayKey] = arrays[arrayKey].filter(
        (value: any, index: any, Arr: any) => {
          return index % showFraction === 0;
        }
      );
    }
  }

  return reducedArrays;
}

export default reduceArrays;
