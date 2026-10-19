export function JsonView({ value }: { value: unknown }) {
  return <pre>{JSON.stringify(value ?? null, null, 2)}</pre>;
}
