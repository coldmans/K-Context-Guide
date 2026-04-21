package com.kanana.kcontextguide.util;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;

public final class WavEncoder {

    private WavEncoder() {
    }

    public static byte[] wrapPcm16Mono(byte[] pcmData, int sampleRate) {
        int byteRate = sampleRate * 2;
        int blockAlign = 2;
        int fileSize = 36 + pcmData.length;

        ByteBuffer buffer = ByteBuffer.allocate(44 + pcmData.length).order(ByteOrder.LITTLE_ENDIAN);
        buffer.put("RIFF".getBytes());
        buffer.putInt(fileSize);
        buffer.put("WAVE".getBytes());
        buffer.put("fmt ".getBytes());
        buffer.putInt(16);
        buffer.putShort((short) 1);
        buffer.putShort((short) 1);
        buffer.putInt(sampleRate);
        buffer.putInt(byteRate);
        buffer.putShort((short) blockAlign);
        buffer.putShort((short) 16);
        buffer.put("data".getBytes());
        buffer.putInt(pcmData.length);
        buffer.put(pcmData);
        return buffer.array();
    }
}
