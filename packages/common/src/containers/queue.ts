export class Block<T> {
  public score: number = Number.MAX_VALUE;
  public data?: T;
}

export class PriorityQueue<T> {
  private heap: Block<T>[];
  private size: number;

  constructor(maxSize: number) {
    this.heap = Array.from(Array(maxSize), _ => ({
      score: -1,
      data: undefined
    }));
    this.size = -1;
  }

  // Function to return the index of the
  // parent node of a given node
  parent(index: number): number {
    return Math.floor((index - 1) / 2);
  }

  // Function to return the index of the
  // left child of the given node
  leftChild(index: number): number {
    return 2 * index + 1;
  }

  // Function to return the index of the
  // right child of the given node
  rightChild(index: number): number {
    return 2 * index + 2;
  }

  // Function to shift up the node in order
  // to maintain the heap property
  shiftUp(index: number): void {
    while (
      index > 0 &&
      this.heap[this.parent(index)].score < this.heap[index].score
    ) {
      // Swap parent and current node
      this.swap(this.parent(index), index);

      // Update i to parent of i
      index = this.parent(index);
    }
  }

  swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  // Function to shift down the node in
  // order to maintain the heap property
  shiftDown(index: number): void {
    let maxIndex = index;

    // Left Child
    const l = this.leftChild(index);

    if (l <= this.size && this.heap[l].score > this.heap[maxIndex].score) {
      maxIndex = l;
    }

    // Right Child
    const r = this.rightChild(index);

    if (r <= this.size && this.heap[r].score > this.heap[maxIndex].score) {
      maxIndex = r;
    }

    // If i not same as maxIndex
    if (index !== maxIndex) {
      this.swap(index, maxIndex);
      this.shiftDown(maxIndex);
    }
  }

  // Function to insert a new element
  // in the Binary Heap
  insert(score: number, data: T) {
    this.size += 1;
    this.heap[this.size] = { score: score, data: data };

    // Shift Up to maintain heap property
    this.shiftUp(this.size);
  }

  // Function to extract the element with
  // maximum priority
  extractMax(): Block<T> {
    const result = this.heap[0];

    // Replace the value at the root
    // with the last leaf
    this.heap[0] = this.heap[this.size];
    this.size -= 1;

    // Shift down the replaced element
    // to maintain the heap property
    this.shiftDown(0);

    return result;
  }

  // Function to change the priority
  // of an element
  changePriority(index: number, score: number) {
    const oldscore = this.heap[index].score;

    this.heap[index].score = score;

    if (score > oldscore) {
      this.shiftUp(index);
    } else {
      this.shiftDown(index);
    }
  }

  // Function to get value of the current
  // maximum element
  getMax(): Block<T> {
    return this.heap[0];
  }

  // Function to remove the element
  // located at given index
  remove(index: number) {
    this.heap[index].score = this.getMax().score + 1;

    // Shift the node to the root
    // of the heap
    this.shiftUp(index);

    // Extract the node
    this.extractMax();
  }

  isEmpty(): boolean {
    return this.size === -1;
  }

  reset(): void {
    this.size = -1;
  }
}
