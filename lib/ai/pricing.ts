// Sarvam AI pricing — verify current rates at build time from https://www.sarvam.ai/apis
// Update these values based on official published pricing
export const SARVAM_PRICING: Record<string, { input_per_1k: number; output_per_1k: number }> = {
  'sarvam-m': {
    input_per_1k: 0.06,   // INR per 1K input tokens — update with real pricing
    output_per_1k: 0.24,  // INR per 1K output tokens — update with real pricing
  },
}

export function estimateCostINR(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = SARVAM_PRICING[model] ?? SARVAM_PRICING['sarvam-m']
  return (
    (inputTokens / 1000) * pricing.input_per_1k +
    (outputTokens / 1000) * pricing.output_per_1k
  )
}
