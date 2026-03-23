import type { EnvironmentData, ScienceData } from '../types/telemetry';

/**
 * Calculates a Life Probability Index (LPI) and a Confidence Rating
 * based on environmental and scientific telemetry.
 * 
 * This model correlates atmospheric signatures (CH4, NH3, CO2)
 * with habitability metrics (Temp, Humidity, pH).
 */
export function calculateLPI(env: EnvironmentData | undefined, sci: ScienceData | undefined): { score: number, confidence: number } {
  if (!env || !sci) return { score: 0, confidence: 0 };

  let score = 5; // Absolute baseline
  let confidenceFactors = 0;

  // 1. Methane (CH4) - Potent biosignature
  const ch4Baseline = 1800;
  if (env.ch4 > ch4Baseline) {
    const ch4Bonus = Math.min((env.ch4 - ch4Baseline) * 0.04, 45);
    score += ch4Bonus;
    confidenceFactors += 1;
  }

  // 2. Ammonia (NH3) - Supporting biosignature
  if (env.nh3 > 0.1) {
    const nh3Bonus = Math.min(env.nh3 * 15, 20);
    score += nh3Bonus;
    confidenceFactors += 1;
  }

  // 3. Humidity - Habitability
  if (env.humidity > 20) {
    const humBonus = Math.min((env.humidity - 20) * 0.4, 15);
    score += humBonus;
    confidenceFactors += 1;
  }

  // 4. pH - Scientific context
  if (sci.phValid && sci.ph >= 6.0 && sci.ph <= 8.5) {
    score += 10;
    confidenceFactors += 1;
  }

  // 5. Temperature - Metabolic constraint
  if (env.temperature >= 0 && env.temperature <= 45) {
    score += 5;
    confidenceFactors += 1;
  }

  // 6. Soil Moisture 
  if (env.soilMoisture > 5) {
    score += 5;
    confidenceFactors += 1;
  }

  // --- Confidence Calculation (Nuanced Model) ---
  // Base confidence for any active reading
  let confidence = score > 10 ? 42.0 : 35.0;

  // 1. Agreement Bonus: Each factor that aligns reinforces the model
  confidence += confidenceFactors * 5.5;

  // 2. Correlation Bonuses (Evidence Synergy)
  if (score > 50 && env.humidity > 35) confidence += 8.0;
  if (score > 50 && sci.phValid) confidence += 4.5;
  if (env.ch4 > 2200 && env.nh3 > 0.5) confidence += 10.0;

  // 3. Contradiction Penalties (Reality Grounding)
  // If we have high biosignatures but lethal temperatures, confidence drops
  if (score > 60 && (env.temperature < -15 || env.temperature > 55)) {
    confidence -= 25.0;
  }
  // If pH is highly acidic/alkaline but moisture is high (unusual for life)
  if (sci.phValid && (sci.ph < 3 || sci.ph > 11) && env.soilMoisture > 20) {
    confidence -= 15.0;
  }
  // Lack of pH validation in high-score scenarios reduces certainty
  if (score > 70 && !sci.phValid) {
    confidence -= 12.0;
  }

  // 4. Environmental Noise / Uncertainty
  // More active factors = slightly more cumulative measurement uncertainty
  const uncertainty = confidenceFactors * 0.85;
  confidence -= uncertainty;

  // Final Constraints
  // Hard cap at 91.2% - Nothing is certain without sample return (MSR)
  const finalConfidence = Math.min(Math.max(confidence, 5.0), 91.2);
  const finalScore = Math.min(score, 100);

  return { score: finalScore, confidence: finalConfidence };
}
