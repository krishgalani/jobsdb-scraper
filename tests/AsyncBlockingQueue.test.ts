import { AsyncBlockingQueue } from '../src/utils';

describe('AsyncBlockingQueue', () => {
  let queue: AsyncBlockingQueue<number>;

  beforeEach(() => {
    queue = new AsyncBlockingQueue<number>();
  });

  test('enqueue and dequeue items', async () => {
    queue.enqueue(1);
    queue.enqueue(2);

    expect(await queue.dequeue()).toBe(1);
    expect(await queue.dequeue()).toBe(2);
  });

  test('dequeue waits for items when the queue is empty', async () => {
    setTimeout(() => {
      queue.enqueue(42);
    }, 1000); // Enqueue value after 1 second

    const value = await queue.dequeue();
    expect(value).toBe(42);
  });

  test('isEmpty should return true if no items are in the queue', () => {
    expect(queue.isEmpty()).toBe(true);
  });

  test('isEmpty should return false if there are items in the queue', () => {
    queue.enqueue(10);
    expect(queue.isEmpty()).toBe(false);
  });

  test('isBlocked should return true if there are pending resolvers', async () => {
    queue.dequeue(); // No item available, should add a pending resolver
    expect(queue.isBlocked()).toBe(true);
  });

  test('isBlocked should return false if there are no pending resolvers', async () => {
    queue.enqueue(10);
    await queue.dequeue(); // Resolver has been satisfied
    expect(queue.isBlocked()).toBe(false);
  });

  test('length should reflect the number of items in the queue', () => {
    expect(queue.length).toBe(0);
    queue.enqueue(1);
    expect(queue.length).toBe(1);
    queue.enqueue(2);
    expect(queue.length).toBe(2);
  });

  test('async iteration should work as expected', async () => {
    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);

    const results: number[] = [];
    for await (const item of queue) {
      results.push(item);
      if (results.length === 3) break; // Stop after three items
    }

    expect(results).toEqual([1, 2, 3]);
  });

  test('multiple dequeue calls should block and resolve correctly', async () => {
    const result: number[] = [];
    
    // Multiple dequeues, each will block until an item is enqueued
    const dequeuePromises = [
      queue.dequeue().then((value) => result.push(value)),
      queue.dequeue().then((value) => result.push(value)),
    ];

    // Enqueue values after a small delay
    setTimeout(() => {
      queue.enqueue(10);
      queue.enqueue(20);
    }, 500);

    await Promise.all(dequeuePromises);
    expect(result).toEqual([10, 20]);
  });
});
