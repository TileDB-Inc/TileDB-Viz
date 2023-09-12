export function calculateChannelRanges(channelMapping: Int32Array): number[] {
  let range: number[] = [];
  const channelRanges = [];
  for (let index = 0; index < channelMapping.length / 4; ++index) {
    if (channelMapping[4 * index] === -1) {
      continue;
    }

    if (range.length === 0) {
      range.push(index);
    } else {
      if (index - (range.at(-1) as number) !== 1) {
        channelRanges.push(range[0], range.at(-1) as number);
        range = [index];
      } else {
        range.push(index);
      }
    }
  }
  channelRanges.push(range[0], range.at(-1) as number);

  return channelRanges;
}

export function calculateChannelMapping(channelMapping: Int32Array) {
  let visibleCounter = 0;
  for (let index = 0; index < channelMapping.length / 4; ++index) {
    if (channelMapping[4 * index] === -1) {
      continue;
    }

    channelMapping[4 * index] = visibleCounter++;
  }
}
