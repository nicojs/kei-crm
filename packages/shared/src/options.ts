export type Options<T extends string> = Readonly<Record<T, string>>;

export type GroupedOptions<T extends string> = Readonly<
  Record<string, Record<T, string>>
>;

export function groupOptions<T extends string>(
  options: Options<T>,
  groups: Record<string, T[]>,
): GroupedOptions<T> {
  return Object.fromEntries(
    Object.entries(groups).map(([groupName, items]) => [
      groupName,
      Object.fromEntries(items.map((option) => [option, options[option]])),
    ]),
  ) as GroupedOptions<T>;
}
