package com.kanana.kcontextguide.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "kanana")
public class KananaProperties {

    private String apiKey;
    private String baseUrl = "https://kanana-o.a2s-endpoint.kr-central-2.kakaocloud.com/v1";
    private String model = "kanana-o";
    private boolean demoMode = false;
    private String outputVoice = "preset_spk_1";

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public boolean isDemoMode() {
        return demoMode;
    }

    public void setDemoMode(boolean demoMode) {
        this.demoMode = demoMode;
    }

    public String getOutputVoice() {
        return outputVoice;
    }

    public void setOutputVoice(String outputVoice) {
        this.outputVoice = outputVoice;
    }
}
