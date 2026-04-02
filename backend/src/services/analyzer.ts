import { getProvider } from "@/providers";
import { AnalysisRequest, AnalysisResponse } from "@/providers/AIProvider";

export async function analyzeMessage(
  request: AnalysisRequest
): Promise<AnalysisResponse> {
  const provider = getProvider();
  return provider.analyze(request);
}
