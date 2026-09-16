export class SocrataError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly body: string | null,
    public readonly url: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'SocrataError';
  }
}

export class SocrataRowValidationError extends Error {
  constructor(
    message: string,
    public readonly datasetId: string,
    public readonly rowIndex: number,
    public readonly issues: unknown,
  ) {
    super(message);
    this.name = 'SocrataRowValidationError';
  }
}
