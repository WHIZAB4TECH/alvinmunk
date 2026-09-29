type XdrResultUnion = {
  switch(): { name?: string };
  value?(): unknown;
};

const REJECTION_MESSAGES: Record<string, string> = {
  txBadSeq: 'Another transaction went out at the same moment — try again',
  txTooLate: 'This took too long — try again',
  txBadAuth: 'Your wallet is on a different network',
  txInsufficientBalance: 'Your XLM balance is too low to cover this transaction.',
  opUnderfunded: 'Your XLM balance is too low to cover this transaction.',
  opInsufficientBalance: 'Your balance is too low to cover this transaction.',
};

function invoke(value: unknown, method: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  const candidate = (value as Record<string, unknown>)[method];
  return typeof candidate === 'function' ? candidate.call(value) : undefined;
}

function switchName(value: unknown): string | undefined {
  const switched = invoke(value, 'switch');
  if (typeof switched !== 'object' || switched === null) return undefined;
  const name = (switched as { name?: unknown }).name;
  return typeof name === 'string' ? name : undefined;
}

function resultCode(value: unknown): string | undefined {
  return switchName(invoke(value, 'result'));
}

export class TxRejectedError extends Error {
  constructor(readonly code: string) {
    super(REJECTION_MESSAGES[code] ?? `Transaction rejected (${code}). Try again.`);
    Object.setPrototypeOf(this, TxRejectedError.prototype);
    this.name = 'TxRejectedError';
  }
}

/** Throw a user-safe typed error for a rejected Stellar transaction result. */
export function throwTxRejected(errorResult: unknown): never {
  const transactionResult = invoke(errorResult, 'result');
  const transactionCode = switchName(transactionResult) ?? 'unknown';
  let code = transactionCode;

  if (transactionCode === 'txFailed') {
    const operationResults = invoke(transactionResult, 'value');
    if (Array.isArray(operationResults)) {
      code = resultCode(operationResults[0]) ?? transactionCode;
    }
  }

  throw new TxRejectedError(code);
}