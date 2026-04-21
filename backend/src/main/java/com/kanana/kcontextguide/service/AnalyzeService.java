package com.kanana.kcontextguide.service;

import com.kanana.kcontextguide.config.KananaProperties;
import com.kanana.kcontextguide.dto.AnalyzeMode;
import com.kanana.kcontextguide.dto.AnalyzeResponse;
import com.kanana.kcontextguide.dto.KananaStreamResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AnalyzeService {

    private static final Logger log = LoggerFactory.getLogger(AnalyzeService.class);

    private static final Pattern SECTION_PATTERN = Pattern.compile("(?m)^[-*]?\\s*(이미지 요약|의도 파악|답변|바로 쓸 수 있는 표현|주의할 점)\\s*:\\s*(.*?)(?=^[-*]?\\s*(이미지 요약|의도 파악|답변|바로 쓸 수 있는 표현|주의할 점)\\s*:|\\z)", Pattern.DOTALL);

    private final KananaProperties properties;
    private final KananaClient kananaClient;
    private final FallbackAnalysisService fallbackAnalysisService;

    public AnalyzeService(KananaProperties properties, KananaClient kananaClient, FallbackAnalysisService fallbackAnalysisService) {
        this.properties = properties;
        this.kananaClient = kananaClient;
        this.fallbackAnalysisService = fallbackAnalysisService;
    }

    public AnalyzeResponse analyze(MultipartFile image, MultipartFile audio, String question, AnalyzeMode mode) {
        String traceId = UUID.randomUUID().toString();
        String normalizedQuestion = StringUtils.hasText(question) ? question.trim() : defaultQuestion(mode);

        if (properties.isDemoMode() || !StringUtils.hasText(properties.getApiKey())) {
            return fallbackAnalysisService.create(image, audio, normalizedQuestion, mode, traceId,
                    properties.isDemoMode() ? "KANANA_DEMO_MODE=true" : "KANANA_API_KEY is empty");
        }

        try {
            String audioFormat = detectAudioFormat(audio);
            KananaStreamResult result = kananaClient.analyze(
                    image != null && !image.isEmpty() ? image.getBytes() : null,
                    audio != null && !audio.isEmpty() ? audio.getBytes() : null,
                    audioFormat,
                    normalizedQuestion,
                    mode
            );
            return toResponse(result, mode, traceId);
        } catch (IOException ioException) {
            throw new IllegalStateException("업로드 파일을 읽는 중 오류가 발생했습니다.", ioException);
        } catch (Exception exception) {
            log.warn("Kanana request failed. traceId={}", traceId, exception);
            return fallbackAnalysisService.create(image, audio, normalizedQuestion, mode, traceId, exception.getMessage());
        }
    }

    private AnalyzeResponse toResponse(KananaStreamResult result, AnalyzeMode mode, String traceId) {
        String rawText = StringUtils.hasText(result.text()) ? result.text().trim() : "응답 텍스트가 비어 있습니다.";
        ParsedSections parsed = parseSections(rawText);

        return new AnalyzeResponse(
                traceId,
                mode.code(),
                parsed.summary(),
                parsed.intent(),
                parsed.answer(),
                parsed.usefulPhrases(),
                parsed.cautions(),
                List.of("음성으로 듣기", "영어로 번역하기", "더 쉽게 설명하기", "카카오톡 공유용 요약 만들기"),
                result.audioBase64(),
                result.audioMimeType(),
                false,
                null,
                rawText
        );
    }

    private ParsedSections parseSections(String rawText) {
        String summary = null;
        String intent = null;
        String answer = null;
        String usefulPhrases = null;
        String cautions = null;

        Matcher matcher = SECTION_PATTERN.matcher(rawText);
        while (matcher.find()) {
            String label = matcher.group(1);
            String value = matcher.group(2).trim();
            switch (label) {
                case "이미지 요약" -> summary = value;
                case "의도 파악" -> intent = value;
                case "답변" -> answer = value;
                case "바로 쓸 수 있는 표현" -> usefulPhrases = value;
                case "주의할 점" -> cautions = value;
                default -> {
                }
            }
        }

        if (!StringUtils.hasText(summary)) {
            summary = "카나나가 인식한 장면을 바탕으로 답변을 생성했습니다.";
        }
        if (!StringUtils.hasText(intent)) {
            intent = "사용자의 질문 의도를 종합해 답변했습니다.";
        }
        if (!StringUtils.hasText(answer)) {
            answer = rawText;
        }

        return new ParsedSections(
                summary,
                intent,
                answer,
                splitLines(usefulPhrases),
                splitLines(cautions)
        );
    }

    private List<String> splitLines(String block) {
        if (!StringUtils.hasText(block)) {
            return List.of();
        }

        List<String> items = new ArrayList<>();
        for (String line : block.split("\\R")) {
            String cleaned = line.replaceFirst("^[-*•\\d.)\\s]+", "").trim();
            if (!cleaned.isBlank()) {
                items.add(cleaned);
            }
        }

        return items.isEmpty() ? List.of(block.trim()) : items;
    }

    private String defaultQuestion(AnalyzeMode mode) {
        return switch (mode) {
            case MENU -> "맵찔이인데 이 메뉴판에서 뭐 먹으면 좋아?";
            case STUDY -> "이 문제를 단계별로 풀어줘.";
            case AD -> "이 제품을 밝고 빠른 쇼호스트 말투로 소개해줘.";
            case PODCAST -> "이 사진으로 1분짜리 팟캐스트 대본 만들어줘.";
            case GUIDE -> "이 장면이 어떤 의미인지 한국 생활 맥락으로 설명해줘.";
        };
    }

    private String detectAudioFormat(MultipartFile audio) {
        if (audio == null || audio.isEmpty()) {
            return "wav";
        }

        String fileName = audio.getOriginalFilename();
        if (StringUtils.hasText(fileName) && fileName.contains(".")) {
            String extension = fileName.substring(fileName.lastIndexOf('.') + 1).trim().toLowerCase();
            if (!extension.isBlank()) {
                return normalizeAudioFormat(extension);
            }
        }

        String contentType = audio.getContentType();
        if (StringUtils.hasText(contentType) && contentType.contains("/")) {
            String mimeSubtype = contentType.substring(contentType.indexOf('/') + 1).trim().toLowerCase();
            if (!mimeSubtype.isBlank()) {
                return normalizeAudioFormat(mimeSubtype);
            }
        }

        return "wav";
    }

    private String normalizeAudioFormat(String raw) {
        return switch (raw) {
            case "mpeg", "mpga" -> "mp3";
            case "x-wav", "wave" -> "wav";
            case "x-m4a" -> "m4a";
            default -> raw;
        };
    }

    private record ParsedSections(
            String summary,
            String intent,
            String answer,
            List<String> usefulPhrases,
            List<String> cautions
    ) {
    }
}
