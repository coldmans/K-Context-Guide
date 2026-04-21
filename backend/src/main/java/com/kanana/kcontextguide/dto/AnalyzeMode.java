package com.kanana.kcontextguide.dto;

import java.util.Arrays;

public enum AnalyzeMode {
    GUIDE,
    MENU,
    STUDY,
    AD,
    PODCAST;

    public static AnalyzeMode from(String raw) {
        if (raw == null || raw.isBlank()) {
            return GUIDE;
        }

        return Arrays.stream(values())
                .filter(value -> value.name().equalsIgnoreCase(raw.trim()))
                .findFirst()
                .orElse(GUIDE);
    }

    public String code() {
        return name().toLowerCase();
    }
}
