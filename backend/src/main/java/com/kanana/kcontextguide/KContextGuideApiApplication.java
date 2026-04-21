package com.kanana.kcontextguide;

import com.kanana.kcontextguide.config.KananaProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan(basePackageClasses = KananaProperties.class)
public class KContextGuideApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(KContextGuideApiApplication.class, args);
    }
}
