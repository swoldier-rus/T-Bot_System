/**
 * Fixed-capacity circular ring buffer with O(1) push and lookup.
 * Avoids continuous memory reallocations during high-frequency data ingestion.
 */
export class FixedRingBuffer<T> {
  private readonly buffer: (T | undefined)[];
  private head = 0; // Points to the oldest item
  private count = 0; // Number of items currently stored

  constructor(public readonly capacity: number) {
    if (capacity <= 0 || !Number.isInteger(capacity)) {
      throw new Error(`Capacity must be a positive integer, received: ${capacity}`);
    }
    this.buffer = new Array<T | undefined>(capacity);
  }

  /**
   * Current number of elements in the buffer.
   */
  public get size(): number {
    return this.count;
  }

  /**
   * Whether the buffer has reached maximum capacity.
   */
  public get isFull(): boolean {
    return this.count === this.capacity;
  }

  /**
   * Whether the buffer is empty.
   */
  public get isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * Adds an item to the end of the buffer.
   * If capacity is reached, overwrites the oldest item in O(1).
   */
  public push(item: T): void {
    if (this.count < this.capacity) {
      const insertIndex = (this.head + this.count) % this.capacity;
      this.buffer[insertIndex] = item;
      this.count++;
    } else {
      this.buffer[this.head] = item;
      this.head = (this.head + 1) % this.capacity;
    }
  }

  /**
   * Returns the most recently added (newest) item, or undefined if empty.
   */
  public last(): T | undefined {
    if (this.count === 0) {
      return undefined;
    }
    const lastIndex = (this.head + this.count - 1) % this.capacity;
    return this.buffer[lastIndex];
  }

  /**
   * Returns the oldest item, or undefined if empty.
   */
  public first(): T | undefined {
    if (this.count === 0) {
      return undefined;
    }
    return this.buffer[this.head];
  }

  /**
   * Gets item by chronological index (0 = oldest, size - 1 = newest).
   */
  public get(index: number): T | undefined {
    if (index < 0 || index >= this.count) {
      return undefined;
    }
    const realIndex = (this.head + index) % this.capacity;
    return this.buffer[realIndex];
  }

  /**
   * Updates the most recently added item in-place.
   * Returns true if updated, false if buffer is empty.
   */
  public updateLast(item: T): boolean {
    if (this.count === 0) {
      return false;
    }
    const lastIndex = (this.head + this.count - 1) % this.capacity;
    this.buffer[lastIndex] = item;
    return true;
  }

  /**
   * Returns elements in chronological order (oldest to newest).
   */
  public toArray(): T[] {
    const result: T[] = new Array<T>(this.count);
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head + i) % this.capacity;
      result[i] = this.buffer[idx] as T;
    }
    return result;
  }

  /**
   * Clears the buffer and resets pointers.
   */
  public clear(): void {
    this.buffer.fill(undefined);
    this.head = 0;
    this.count = 0;
  }

  /**
   * Supports standard for..of iteration from oldest to newest.
   */
  public *[Symbol.iterator](): Iterator<T> {
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head + i) % this.capacity;
      yield this.buffer[idx] as T;
    }
  }
}
