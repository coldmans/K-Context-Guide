package com.kanana.kcontextguide.dto;

import java.util.List;

public record AnalyzeResponse(
        String traceId,
        String mode,
        String summary,
        String intent,
        String answer,
        List<String> usefulPhrases,
        List<String> cautions,
        List<String> suggestedActions,
        String audioBase64,
        String audioMimeType,
        boolean usedFallback,
        String fallbackReason,
        String rawText
) {
}
