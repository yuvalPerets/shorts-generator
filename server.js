const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const googleTTS = require("google-tts-api");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = 3000;

const upload = multer({ dest: "uploads/" });
app.use(express.json());

app.post("/generate", upload.single("video"), async (req, res) => {
  const text = fs.readFileSync("input.txt", "utf-8").replace(/\n/g, " ").trim();
  const videoPath = req.file.path;
  const audioPath = `assets/voice.mp3`;
  const subtitlePath = `subtitles/subs.srt`;
  const outputPath = `assets/final.mp4`;

  try {
    await createVoiceFromText(text, audioPath);

    const subs = generateSubtitles(text);
    fs.writeFileSync(subtitlePath, subs);

    // 1. Extract original audio
    const extractedAudio = `assets/original_audio.aac`;
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .noVideo()
        .audioCodec("aac")
        .save(extractedAudio)
        .on("end", resolve)
        .on("error", reject);
    });

    // 2. Mix original audio (quieter) and TTS audio (normal)
    const mixedAudio = `assets/mixed_audio.aac`;
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(extractedAudio)
        .input(audioPath)
        .complexFilter([
          "[0:a]volume=0.3[a0];[1:a]volume=1.0[a1];[a0][a1]amix=inputs=2:duration=longest:dropout_transition=2[aout]"
        ])
        .outputOptions(["-map [aout]", "-ac 2"])
        .audioCodec("aac")
        .save(mixedAudio)
        .on("end", resolve)
        .on("error", reject);
    });

    // 3. Combine video, mixed audio, and subtitles
    ffmpeg()
      .input(videoPath)
      .input(mixedAudio)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-map 0:v:0",
        "-map 1:a:0",
        "-shortest",
        `-vf subtitles=${subtitlePath}`
      ])
      .save(outputPath)
      .on("end", () => {
        console.log("✅ Final video created");
        res.download(outputPath);
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err.message);
        res.status(500).send("Video generation failed: " + err.message);
      });
  } catch (e) {
    res.status(500).send("Error: " + e.message);
  }
});

async function createVoiceFromText(text, audioPath) {
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    let chunk = remaining.slice(0, 200);
    // Try not to split in the middle of a word
    const lastSpace = chunk.lastIndexOf(' ');
    if (lastSpace > 0 && remaining.length > 200) {
      chunk = chunk.slice(0, lastSpace);
    }
    chunks.push(chunk);
    remaining = remaining.slice(chunk.length).trim();
  }

  const audioBuffers = [];
  for (const chunk of chunks) {
    const url = googleTTS.getAudioUrl(chunk, {
      lang: "en",
      slow: false,
      host: "https://translate.google.com",
    });
    const audioBuffer = await fetch(url).then((r) => r.arrayBuffer());
    audioBuffers.push(Buffer.from(audioBuffer));
  }
  // Concatenate all buffers and write to file
  fs.writeFileSync(audioPath, Buffer.concat(audioBuffers));
}

function generateSubtitles(text) {
  const words = text.split(" ");
  let srt = "";
  let time = 0;
  let index = 1;
  for (let i = 0; i < words.length; i += 7) {
    const chunk = words.slice(i, i + 7).join(" ");
    const start = formatTime(time);
    const end = formatTime(time + 2);
    srt += `${index}\n${start} --> ${end}\n${chunk}\n\n`;
    index++;
    time += 2;
  }
  return srt;
}

function formatTime(sec) {
  const hrs = String(Math.floor(sec / 3600)).padStart(2, "0");
  const mins = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const secs = String(Math.floor(sec % 60)).padStart(2, "0");
  return `${hrs}:${mins}:${secs},000`;
}

app.listen(PORT, () => console.log(`🚀 Running at http://localhost:${PORT}`));
