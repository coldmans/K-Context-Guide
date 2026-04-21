package com.kanana.kcontextguide.service;

import com.kanana.kcontextguide.dto.AnalyzeMode;
import com.kanana.kcontextguide.dto.AnalyzeResponse;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
public class FallbackAnalysisService {

    public AnalyzeResponse create(MultipartFile image, MultipartFile audio, String question, AnalyzeMode mode, String traceId, String reason) {
        boolean hasImage = image != null && !image.isEmpty();
        boolean hasAudio = audio != null && !audio.isEmpty();
        String cleanedQuestion = StringUtils.hasText(question) ? question.trim() : defaultQuestion(mode);

        String summary = switch (mode) {
            case MENU -> hasImage ? "업로드된 이미지는 메뉴판 또는 음식 관련 장면으로 보입니다." : "음식 선택과 관련된 질문으로 이해했습니다.";
            case STUDY -> hasImage ? "업로드된 이미지는 문제지나 학습 자료로 보입니다." : "단계별 설명이 필요한 학습 질문으로 이해했습니다.";
            case AD -> hasImage ? "업로드된 이미지는 제품 또는 소개 대상이 담긴 장면으로 보입니다." : "설명형 카피가 필요한 소개 요청으로 이해했습니다.";
            case PODCAST -> hasImage ? "업로드된 이미지는 이야깃거리가 있는 장면이나 풍경으로 보입니다." : "대본형 응답이 필요한 요청으로 이해했습니다.";
            case GUIDE -> hasImage ? "업로드된 이미지는 한국 생활 맥락을 설명할 수 있는 장면으로 보입니다." : "생활 맥락 해설이 필요한 질문으로 이해했습니다.";
        };

        String intent = switch (mode) {
            case MENU -> "덜 맵거나 실패 확률이 낮은 메뉴를 추천받고 싶어 합니다.";
            case STUDY -> "문제를 단계별로 쉽게 설명받고 싶어 합니다.";
            case AD -> "제품의 장점을 한국어 톤 앤 매너에 맞게 소개하고 싶어 합니다.";
            case PODCAST -> "사진이나 주제를 바탕으로 이야기형 대본을 만들고 싶어 합니다.";
            case GUIDE -> "이미지와 질문을 함께 보고 한국 생활 맥락으로 설명받고 싶어 합니다.";
        };

        String answer = switch (mode) {
            case MENU -> "지금은 데모 응답으로 안내드리면, 매운맛이 걱정될 때는 국물 요리보다 덮밥류나 계란, 불고기 계열을 우선 보는 편이 안전합니다. 메뉴판 사진이 함께 들어오면 실제 메뉴 이름을 기준으로 덜 매운 후보를 추려 드릴 수 있어요.";
            case STUDY -> "이 모드에서는 문제의 조건을 먼저 읽고, 필요한 공식이나 개념을 분리한 뒤, 계산 과정을 한 단계씩 설명하는 흐름으로 답변합니다. 실제 문제 사진이 들어오면 OCR 결과를 바탕으로 식을 정리해서 풀어드릴 수 있어요.";
            case AD -> "광고문 생성에서는 제품의 재질, 사용 장면, 감정 톤을 함께 잡아주는 것이 중요합니다. 실제 제품 사진이 들어오면 한국 홈쇼핑 톤으로 짧은 훅, 장점, 마무리 멘트까지 이어서 구성해드릴 수 있어요.";
            case PODCAST -> "팟캐스트 모드에서는 장면 묘사만 하는 대신, 청자가 계속 듣고 싶어지는 도입과 대화 리듬을 함께 만듭니다. 사진이 들어오면 1분 안팎의 오프닝 대본과 진행자 멘트 형식으로 정리해드릴 수 있어요.";
            case GUIDE -> "이 프로젝트는 사진과 질문을 함께 보고 한국어 생활 맥락으로 풀어주는 데 강점이 있습니다. 예를 들어 간판, 메뉴판, 관광지, 영수증처럼 현장에서 바로 이해가 필요한 장면을 설명하기 좋습니다.";
        };

        List<String> usefulPhrases = switch (mode) {
            case MENU -> List.of("덜 맵게 해주세요.", "혹시 아이들도 먹기 괜찮을까요?", "처음 먹는 사람에게 추천해 주세요.");
            case STUDY -> List.of("이 식을 먼저 정리해볼게요.", "조건을 하나씩 써보면 쉬워져요.");
            case AD -> List.of("지금 보시는 이 제품이요.", "실사용 만족도가 높은 포인트는 바로 이 부분입니다.");
            case PODCAST -> List.of("오늘은 이 장면에서 시작해볼게요.", "여기에는 한국적인 분위기가 진하게 담겨 있습니다.");
            case GUIDE -> List.of("이 장면은 한국 생활에서 자주 마주치는 상황입니다.", "외국인 친구에게는 이렇게 설명하면 자연스러워요.");
        };

        List<String> cautions = List.of(
                "현재 응답은 카나나 실연동 전 데모 fallback입니다.",
                hasAudio ? "음성 입력은 수신했지만 데모 모드에서는 음성 합성이 생략됩니다." : "카나나 API 키를 연결하면 음성 응답도 함께 생성됩니다.",
                "fallback reason: " + reason
        );

        return new AnalyzeResponse(
                traceId,
                mode.code(),
                summary,
                intent,
                answer + "\n\n질문 원문: " + cleanedQuestion,
                usefulPhrases,
                cautions,
                List.of("영어로 번역하기", "더 쉽게 설명하기", "카카오톡 공유용 요약 만들기"),
                null,
                null,
                true,
                reason,
                answer
        );
    }

    private String defaultQuestion(AnalyzeMode mode) {
        return switch (mode) {
            case MENU -> "맵찔이인데 뭐 먹으면 좋을까?";
            case STUDY -> "이 문제 단계별로 풀어줘.";
            case AD -> "이 제품을 밝고 빠른 쇼호스트 말투로 소개해줘.";
            case PODCAST -> "이 사진으로 1분짜리 팟캐스트 대본 만들어줘.";
            case GUIDE -> "이 사진을 한국 생활 맥락으로 설명해줘.";
        };
    }
}
