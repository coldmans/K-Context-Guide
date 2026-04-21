package com.kanana.kcontextguide.controller;

import com.kanana.kcontextguide.dto.AnalyzeMode;
import com.kanana.kcontextguide.dto.AnalyzeResponse;
import com.kanana.kcontextguide.service.AnalyzeService;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@RestController
@RequestMapping("/api")
public class AnalyzeController {

    private final AnalyzeService analyzeService;

    public AnalyzeController(AnalyzeService analyzeService) {
        this.analyzeService = analyzeService;
    }

    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AnalyzeResponse analyze(
            @RequestPart(name = "image", required = false) MultipartFile image,
            @RequestPart(name = "audio", required = false) MultipartFile audio,
            @RequestParam(name = "question", required = false) String question,
            @RequestParam(name = "mode", required = false) String mode
    ) {
        boolean hasImage = image != null && !image.isEmpty();
        boolean hasAudio = audio != null && !audio.isEmpty();
        boolean hasQuestion = StringUtils.hasText(question);

        if (!hasImage && !hasAudio && !hasQuestion) {
            throw new ResponseStatusException(BAD_REQUEST, "이미지, 음성, 텍스트 질문 중 하나는 필요합니다.");
        }

        return analyzeService.analyze(image, audio, question, AnalyzeMode.from(mode));
    }
}
