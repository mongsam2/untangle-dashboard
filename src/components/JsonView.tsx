import type { JsonValue } from '../api/types';

export function JsonView({ value }: { value: JsonValue | undefined }) {
  return <pre>{JSON.stringify(value ?? null, null, 2)}</pre>;
}
