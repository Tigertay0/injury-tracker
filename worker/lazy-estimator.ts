// Loads the drill estimator, and with it the Anthropic SDK, only when the first estimate
// runs. Nothing here imports the SDK, so the Worker's entry chunk stays small for the many
// requests that never ask for an estimate.
import type { DrillEstimate } from '../shared/custom-drills';
import type { EstimateRequest } from '../shared/validation';

type EstimatorModule = typeof import('./drill-estimator');

export function lazyDrillEstimator(
  apiKey: string,
  load: () => Promise<EstimatorModule> = () => import('./drill-estimator'),
): (input: EstimateRequest) => Promise<DrillEstimate> {
  return async (input) => {
    const { createAnthropicClient, createDrillEstimator } = await load();
    // The client is built here, per estimate, not per API request
    return createDrillEstimator(createAnthropicClient(apiKey))(input);
  };
}
