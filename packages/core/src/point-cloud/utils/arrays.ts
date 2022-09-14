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

function reduceDataArrays(data: any, showFraction: number) {
  const GpsTime = data.GpsTime;
  const X = data.X;
  const Y = data.Y;
  const Z = data.Z;
  const Red = data.Red;
  const Green = data.Green;
  const Blue = data.Blue;

  const reducedData = reduceArrays(
    { GpsTime, X, Y, Z, Red, Green, Blue },
    showFraction
  );

  return reducedData;
}

function sortArrays(
  arrays: any,
  comparator = (a: number, b: number) => (a < b ? -1 : a > b ? 1 : 0)
) {
  const arrayKeys = Object.keys(arrays);
  const [sortableArray] = Object.values(arrays) as any[];
  const indexes = Object.keys(sortableArray);
  const sortedIndexes = indexes.sort((a, b) =>
    comparator(sortableArray[a], sortableArray[b])
  );

  const sortByIndexes = (array: { [x: string]: any }, sortedIndexes: any[]) =>
    sortedIndexes.map(sortedIndex => array[sortedIndex]);

  if (Array.isArray(arrays)) {
    return arrayKeys.map((arrayIndex: string) =>
      sortByIndexes(arrays[arrayIndex as any], sortedIndexes)
    );
  } else {
    const sortedArrays: any = {};
    arrayKeys.forEach(arrayKey => {
      sortedArrays[arrayKey] = sortByIndexes(
        arrays[arrayKey as any],
        sortedIndexes
      ) as any;
    });
    return sortedArrays;
  }
}

function sortDataArrays(data: any) {
  const GpsTime = data.GpsTime;
  const X = data.X;
  const Y = data.Y;
  const Z = data.Z;
  const Red = data.Red;
  const Green = data.Green;
  const Blue = data.Blue;

  const sortedData = sortArrays({ GpsTime, X, Y, Z, Red, Green, Blue });

  return sortedData;
}

export { reduceArrays, reduceDataArrays, sortArrays, sortDataArrays };