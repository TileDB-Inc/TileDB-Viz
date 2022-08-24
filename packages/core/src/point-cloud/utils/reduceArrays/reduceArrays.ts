function reduceArrays(arrays: any, show_fraction: number) {
  const arrayKeys = Object.keys(arrays);
  const reducedArrays: any = {};

  for (const arrayKey of arrayKeys) {
    if (Array.isArray(arrays[arrayKey])) {
      reducedArrays[arrayKey] = arrays[arrayKey].filter(
        (value: any, index: any, Arr: any) => {
          return index % show_fraction === 0;
        }
      );
    }
  }

  return reducedArrays;
}

export default reduceArrays;
