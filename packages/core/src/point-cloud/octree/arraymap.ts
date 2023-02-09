class ArrayMap<Type> {
    private data: Type[];
    public size = 0;
    constructor(size: number) {
        this.data = new Array(size);
        this.data.fill(0 as Type);
    }
    public set(index: number, value: Type): void {
        ++this.size;
        this.data[index] = value;
    }
    public get(index: number): Type {
        return this.data[index];
    }
    public has(index: number): boolean {
        return !!this.data[index];
    }
}

export default ArrayMap;
