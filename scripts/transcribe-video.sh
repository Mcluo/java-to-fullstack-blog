#!/bin/bash
# 转录B站视频: 下载音频 → whisper-cpp 转文字 → 带时间戳输出到 stdout
# Usage: ./scripts/transcribe-video.sh BV1HzDSBqEgd
# Output format: [MM:SS] transcribed text

BVID="$1"
if [ -z "$BVID" ]; then echo "Usage: $0 <BVID>" >&2; exit 1; fi

BILI_CLI="$HOME/.agent-reach-venv/bin/bili"
WHISPER_MODEL="$HOME/.local/share/whisper-cpp/ggml-small.bin"
AUDIO_DIR="/tmp/bilibili-cli/$BVID"
SEGMENT_SEC=25

# Step 1: Download audio
rm -rf "$AUDIO_DIR" 2>/dev/null
"$BILI_CLI" audio "$BVID" -o "$AUDIO_DIR" --segment $SEGMENT_SEC >/dev/null 2>&1

if [ ! -d "$AUDIO_DIR" ]; then
  echo "ERROR: Audio download failed" >&2
  exit 1
fi

# Step 2: Transcribe each WAV segment with timestamp prefix
SEG_INDEX=0
for wav in "$AUDIO_DIR"/seg_*.wav; do
  [ -f "$wav" ] || continue

  # Calculate timestamp
  TOTAL_SEC=$((SEG_INDEX * SEGMENT_SEC))
  MINS=$((TOTAL_SEC / 60))
  SECS=$((TOTAL_SEC % 60))
  TIMESTAMP=$(printf "[%02d:%02d]" $MINS $SECS)

  TEXT=$(whisper-cli -m "$WHISPER_MODEL" -l zh -f "$wav" --no-timestamps 2>/dev/null | tr -d '\n' | sed 's/^[[:space:]]*//')

  if [ -n "$TEXT" ]; then
    echo "$TIMESTAMP $TEXT"
  fi

  SEG_INDEX=$((SEG_INDEX + 1))
done

# Cleanup
rm -rf "$AUDIO_DIR" 2>/dev/null
