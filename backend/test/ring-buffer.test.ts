import { describe, expect, it } from 'vitest';
import { FixedRingBuffer } from '../src/core/ring-buffer';

describe('FixedRingBuffer', () => {
  it('should initialize empty with valid capacity', () => {
    const buffer = new FixedRingBuffer<number>(5);
    expect(buffer.capacity).toBe(5);
    expect(buffer.size).toBe(0);
    expect(buffer.isEmpty).toBe(true);
    expect(buffer.isFull).toBe(false);
    expect(buffer.last()).toBeUndefined();
    expect(buffer.first()).toBeUndefined();
    expect(buffer.toArray()).toEqual([]);
  });

  it('should throw when initialized with invalid capacity', () => {
    expect(() => new FixedRingBuffer<number>(0)).toThrow();
    expect(() => new FixedRingBuffer<number>(-5)).toThrow();
    expect(() => new FixedRingBuffer<number>(2.5)).toThrow();
  });

  it('should push items without overflowing until full', () => {
    const buffer = new FixedRingBuffer<string>(3);
    buffer.push('a');
    expect(buffer.size).toBe(1);
    expect(buffer.first()).toBe('a');
    expect(buffer.last()).toBe('a');
    expect(buffer.get(0)).toBe('a');
    expect(buffer.get(1)).toBeUndefined();

    buffer.push('b');
    buffer.push('c');
    expect(buffer.size).toBe(3);
    expect(buffer.isFull).toBe(true);
    expect(buffer.first()).toBe('a');
    expect(buffer.last()).toBe('c');
    expect(buffer.toArray()).toEqual(['a', 'b', 'c']);
  });

  it('should overwrite oldest items in FIFO order when capacity is exceeded', () => {
    const buffer = new FixedRingBuffer<number>(3);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    expect(buffer.toArray()).toEqual([1, 2, 3]);

    // Push 4: overwrites 1
    buffer.push(4);
    expect(buffer.size).toBe(3);
    expect(buffer.first()).toBe(2);
    expect(buffer.last()).toBe(4);
    expect(buffer.toArray()).toEqual([2, 3, 4]);

    // Push 5: overwrites 2
    buffer.push(5);
    expect(buffer.size).toBe(3);
    expect(buffer.first()).toBe(3);
    expect(buffer.last()).toBe(5);
    expect(buffer.toArray()).toEqual([3, 4, 5]);

    // Verify index access
    expect(buffer.get(0)).toBe(3);
    expect(buffer.get(1)).toBe(4);
    expect(buffer.get(2)).toBe(5);
    expect(buffer.get(3)).toBeUndefined();
    expect(buffer.get(-1)).toBeUndefined();
  });

  it('should support iterable for..of loop in chronological order', () => {
    const buffer = new FixedRingBuffer<number>(3);
    buffer.push(10);
    buffer.push(20);
    buffer.push(30);
    buffer.push(40); // 10 is replaced, order: 20, 30, 40

    const collected: number[] = [];
    for (const item of buffer) {
      collected.push(item);
    }
    expect(collected).toEqual([20, 30, 40]);
  });

  it('should reset properly on clear()', () => {
    const buffer = new FixedRingBuffer<number>(3);
    buffer.push(1);
    buffer.push(2);
    buffer.clear();

    expect(buffer.size).toBe(0);
    expect(buffer.isEmpty).toBe(true);
    expect(buffer.isFull).toBe(false);
    expect(buffer.first()).toBeUndefined();
    expect(buffer.last()).toBeUndefined();
    expect(buffer.toArray()).toEqual([]);

    buffer.push(100);
    expect(buffer.size).toBe(1);
    expect(buffer.last()).toBe(100);
    expect(buffer.toArray()).toEqual([100]);
  });
});
