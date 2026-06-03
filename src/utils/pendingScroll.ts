let pending: string | null = null;

export const setPendingScroll = (hash: string) => {
  pending = hash;
};

export const takePendingScroll = (): string | null => {
  const value = pending;
  pending = null;
  return value;
};
