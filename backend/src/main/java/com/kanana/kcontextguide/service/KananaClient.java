package com.kanana.kcontextguide.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kanana.kcontextguide.config.KananaProperties;
import com.kanana.kcontextguide.dto.AnalyzeMode;
import com.kanana.kcontextguide.dto.KananaStreamResult;
import com.kanana.kcontextguide.util.WavEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class KananaClient {

    private static final int OUTPUT_SAMPLE_RATE = 24_000;

    private final KananaProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public KananaClient(KananaProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    public KananaStreamResult analyze(byte[] imageBytes, byte[] audioBytes, String audioFormat, String question, AnalyzeMode mode) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(stripTrailingSlash(properties.getBaseUrl()) + "/chat/completions"))
                .timeout(Duration.ofMinutes(2))
                .header("Authorization", "Bearer " + properties.getApiKey())
                .header("Content-Type", "application/json")
                .header("Accept", "text/event-stream")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(buildBody(imageBytes, audioBytes, audioFormat, question, mode))))
                .build();

        HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() >= 400) {
            throw new IllegalStateException("Kanana API error " + response.statusCode() + ": " + new String(response.body(), StandardCharsets.UTF_8));
        }

        StringBuilder textBuilder = new StringBuilder();
        List<byte[]> pcmChunks = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(new ByteArrayInputStream(response.body()), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.startsWith("data:")) {
                    continue;
                }

                String payload = line.substring(5).trim();
                if (payload.isEmpty() || "[DONE]".equals(payload)) {
                    continue;
                }

                JsonNode root = objectMapper.readTree(payload);
                JsonNode delta = root.path("choices").path(0).path("delta");
                appendText(textBuilder, delta.path("content"));
                appendAudio(pcmChunks, delta.path("audio"));
            }
        }

        String audioBase64 = null;
        if (!pcmChunks.isEmpty()) {
            int totalLength = pcmChunks.stream().mapToInt(chunk -> chunk.length).sum();
            byte[] pcm = new byte[totalLength];
            int offset = 0;
            for (byte[] chunk : pcmChunks) {
                System.arraycopy(chunk, 0, pcm, offset, chunk.length);
                offset += chunk.length;
            }
            audioBase64 = Base64.getEncoder().encodeToString(WavEncoder.wrapPcm16Mono(pcm, OUTPUT_SAMPLE_RATE));
        }

        return new KananaStreamResult(textBuilder.toString().trim(), audioBase64, audioBase64 == null ? null : "audio/wav");
    }

    private Map<String, Object> buildBody(byte[] imageBytes, byte[] audioBytes, String audioFormat, String question, AnalyzeMode mode) {
        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of(
                "role", "system",
                "content", systemPrompt(mode)
        ));

        List<Map<String, Object>> content = new ArrayList<>();
        if (imageBytes != null && imageBytes.length > 0) {
            content.add(Map.of(
                    "type", "image_url",
                    "image_url", Map.of("url", Base64.getEncoder().encodeToString(imageBytes))
            ));
        }
        if (audioBytes != null && audioBytes.length > 0) {
            content.add(Map.of(
                    "type", "input_audio",
                    "input_audio", Map.of(
                            "data", Base64.getEncoder().encodeToString(audioBytes),
                            "format", audioFormat
                    )
            ));
        }
        content.add(Map.of(
                "type", "text",
                "text", userPrompt(question, mode)
        ));
        messages.add(Map.of(
                "role", "user",
                "content", content
        ));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", properties.getModel());
        body.put("messages", messages);
        body.put("modalities", List.of("text", "audio"));
        body.put("stream", true);

        if (StringUtils.hasText(properties.getOutputVoice())) {
            body.put("audio", Map.of("voice", properties.getOutputVoice()));
        }

        return body;
    }

    private String systemPrompt(AnalyzeMode mode) {
        return """
                너는 한국 생활과 문화 맥락을 잘 이해하는 멀티모달 AI 가이드다.
                사용자가 올린 이미지와 음성, 텍스트 질문을 함께 보고 답한다.
                단정이 어려운 내용은 추정이라고 말하고, 바로 현장에서 쓸 수 있는 한국어 표현도 제공한다.
                답변은 과장하지 말고, 실용적이고 친절하게 작성한다.
                현재 분석 모드는 %s 이다.
                """.formatted(mode.code());
    }

    private String userPrompt(String question, AnalyzeMode mode) {
        String modeGuide = switch (mode) {
            case MENU -> "메뉴판이면 덜 맵거나 처음 먹기 쉬운 메뉴를 우선 추천하고, 한국 식당에서 바로 쓸 표현도 함께 준다.";
            case STUDY -> "문제지라면 조건 정리, 풀이 단계, 최종 답을 순서대로 설명한다.";
            case AD -> "제품이나 장면을 보고 광고문이나 소개 멘트를 한국어 톤으로 자연스럽게 만든다.";
            case PODCAST -> "사진을 바탕으로 1분 내외의 팟캐스트형 대화나 오프닝 대본을 만든다.";
            case GUIDE -> "관광지, 간판, 메뉴판, 생활 장면이면 외국인이나 초행자도 이해할 수 있게 풀어준다.";
        };

        return """
                질문: %s
                모드 지침: %s

                아래 형식을 지켜 답변해줘.
                - 이미지 요약:
                - 의도 파악:
                - 답변:
                - 바로 쓸 수 있는 표현:
                - 주의할 점:
                """.formatted(question, modeGuide);
    }

    private void appendText(StringBuilder textBuilder, JsonNode contentNode) {
        if (contentNode == null || contentNode.isMissingNode() || contentNode.isNull()) {
            return;
        }

        if (contentNode.isTextual()) {
            textBuilder.append(contentNode.asText());
            return;
        }

        if (contentNode.isArray()) {
            for (JsonNode item : contentNode) {
                JsonNode text = item.path("text");
                if (text.isTextual()) {
                    textBuilder.append(text.asText());
                }
            }
        }
    }

    private void appendAudio(List<byte[]> pcmChunks, JsonNode audioNode) {
        if (audioNode == null || audioNode.isMissingNode() || audioNode.isNull()) {
            return;
        }

        String encoded = null;
        if (audioNode.isTextual()) {
            encoded = audioNode.asText();
        } else if (audioNode.isObject()) {
            JsonNode dataNode = audioNode.get("data");
            if (dataNode == null || dataNode.isNull()) {
                dataNode = audioNode.get("audio");
            }
            if (dataNode != null && dataNode.isTextual()) {
                encoded = dataNode.asText();
            }
        }

        if (StringUtils.hasText(encoded)) {
            pcmChunks.add(Base64.getDecoder().decode(encoded));
        }
    }

    private String stripTrailingSlash(String url) {
        return url != null && url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
