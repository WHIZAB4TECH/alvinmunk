import { describe, expect, it } from 'vitest';
import { throwTxRejected, TxRejectedError } from './tx-errors';
import { humanizeError } from './utils';

function resultUnion(code: string, value?: unknown) {
  return {
    switch: () => ({ name: code }),
    value: () => value,
  };
}

function transactionResult(code: string, value?: unknown) {
  return { result: () => resultUnion(code, value) };
}

function operationResult(code: string) {
  return { result: () => resultUnion(code) };
}

describe('throwTxRejected', () => {
  it.each([
    ['txBadSeq', 'Another transaction went out at the same moment — try again'],
    ['txTooLate', 'This took too long — try again'],
    ['txBadAuth', 'Your wallet is on a different network'],
    ['txInsufficientBalance', 'Your XLM balance is too low to cover this transaction.'],
  ])('decodes %s into a safe actionable rejection', (code, message) => {
    let thrown: unknown;
    try {
      throwTxRejected(transactionResult(code));
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(TxRejectedError);
    expect(thrown).toMatchObject({ code, message });
    expect((thrown as Error).message).not.toMatch(/_attributes|_maxDepth/);
    expect(humanizeError(thrown)).toBe(message);
  });

  it('uses the first operation result for txFailed', () => {
    let thrown: unknown;
    try {
      throwTxRejected(
        transactionResult('txFailed', [operationResult('opUnderfunded'), operationResult('opBadAuth')]),
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      code: 'opUnderfunded',
      message: 'Your XLM balance is too low to cover this transaction.',
    });
  });
});