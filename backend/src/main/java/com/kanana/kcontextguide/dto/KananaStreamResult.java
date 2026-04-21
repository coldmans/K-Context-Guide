package com.kanana.kcontextguide.dto;

public record KananaStreamResult(
        String text,
        String audioBase64,
        String audioMimeType
) {
}
