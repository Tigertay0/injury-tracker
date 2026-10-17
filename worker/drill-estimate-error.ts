// Kept in its own module so the app can recognise a failed estimate without importing the
// estimator, which pulls in the Anthropic SDK. Every page load runs this Worker, so the
// SDK stays off the static import path and loads only when an estimate runs.

/** Anything that stops an estimate: a failed call, a refusal, or an answer that cannot be used. */
export class DrillEstimateError extends Error {
  /** A short machine label for logs. It never holds any text from the player or the model. */
  readonly kind: string;

  constructor(message: string, kind = 'invalid_response') {
    super(message);
    this.name = 'DrillEstimateError';
    this.kind = kind;
  }
}
