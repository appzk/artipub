export function first<T>(array: T[]): T | undefined {
    const [firstElement] = array;
    return firstElement;
}