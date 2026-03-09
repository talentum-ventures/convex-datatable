import type { SelectOption } from "./types";

export type ResolvedMultiSelectTokens =
  | {
      ok: true;
      values: string[];
    }
  | {
      ok: false;
      invalidToken: string;
    };

export function findOptionByValue(
  options: ReadonlyArray<SelectOption>,
  value: string
): SelectOption | null {
  for (const option of options) {
    if (option.value === value) {
      return option;
    }
  }

  return null;
}

export function resolveOptionToken(
  options: ReadonlyArray<SelectOption>,
  token: string
): SelectOption | null {
  const trimmedToken = token.trim();
  if (trimmedToken.length === 0) {
    return null;
  }

  for (const option of options) {
    if (option.value === trimmedToken || option.label === trimmedToken) {
      return option;
    }
  }

  return null;
}

export function resolveMultiSelectTokens(
  options: ReadonlyArray<SelectOption>,
  text: string
): ResolvedMultiSelectTokens {
  const tokens = text
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const values: string[] = [];
  const seenValues = new Set<string>();

  for (const token of tokens) {
    const option = resolveOptionToken(options, token);
    if (!option) {
      return {
        ok: false,
        invalidToken: token
      };
    }

    if (seenValues.has(option.value)) {
      continue;
    }

    seenValues.add(option.value);
    values.push(option.value);
  }

  return {
    ok: true,
    values
  };
}
