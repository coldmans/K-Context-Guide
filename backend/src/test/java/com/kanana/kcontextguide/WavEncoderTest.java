package com.kanana.kcontextguide;

import com.kanana.kcontextguide.util.WavEncoder;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WavEncoderTest {

    @Test
    void shouldWrapPcmWithWavHeader() {
        byte[] wav = WavEncoder.wrapPcm16Mono(new byte[]{1, 2, 3, 4}, 24000);

        assertThat(wav).hasSize(48);
        assertThat(new String(wav, 0, 4)).isEqualTo("RIFF");
        assertThat(new String(wav, 8, 4)).isEqualTo("WAVE");
    }
}
