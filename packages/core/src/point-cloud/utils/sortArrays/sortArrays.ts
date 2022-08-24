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

export default sortArrays;
