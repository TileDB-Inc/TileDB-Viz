class FixedQueue<Type> {
    private size: number;
    private data: Type[];
    private begin = 0;
    private end = 0;
    constructor(size: number) {
      this.data = new Array(size + 1); // +1 for empty vs full or allow overwrite
      this.size = size + 1;
    }
    public push(value: Type) {
      const next_end = (this.end + 1) % this.size;
      if (next_end === this.begin) {
        return;
      }
      this.data[this.end] = value;
      this.end = next_end;
    }
    public pop(): Type | void {
      if (this.begin === this.end) {
        return;
      }
      const prev_begin = this.begin;
      this.begin = (this.begin + 1) % this.size;
      return this.data[prev_begin];
    }
    public not_empty(): boolean {
      return this.begin !== this.end;
    }
  }

  export default FixedQueue;
  