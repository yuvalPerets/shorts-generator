const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

// Read text from file
const text = fs.readFileSync("input.txt", "utf-8").replace(/\n/g, " ").trim();

// Define video path
const videoPath = "sample.mp4"; // you can change this to another path
const videoName = path.basename(videoPath, path.extname(videoPath));
const outputName = `${videoName}_sub.mp4`;

const command = `curl.exe -X POST http://localhost:3000/generate -F "video=@${videoPath}" -F "text=${text}" -o ${outputName}`;

console.log("🚀 Generating video...");
exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Error: ${error.message}`);
    return;
  }
  console.log(`✅ Done! Saved as ${outputName}`);
});
