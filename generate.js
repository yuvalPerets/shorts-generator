const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

// Define video path
const videoPath = "sample2.mp4";
const videoName = path.basename(videoPath, path.extname(videoPath));
const outputDir = path.join(__dirname, "final vedios");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
const outputName = path.join(outputDir, `${videoName}_sub.mp4`);

const command = `curl.exe -X POST http://localhost:3000/generate -F "video=@${videoPath}" -o "${outputName}"`;

console.log("🚀 Generating video...");
exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Error: ${error.message}`);
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  if (stdout) {
    console.log(`stdout: ${stdout}`);
  }
  if (!error) {
    console.log(`✅ Done! Saved as ${outputName}`);
  }
});
