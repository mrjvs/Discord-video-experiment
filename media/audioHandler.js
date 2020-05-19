const prism = require("prism-media");
const { AudioStream } = require("./audioStream");

const FFMPEG_ARGUMENTS = ['-analyzeduration', '0', '-loglevel', '0', '-f', 's16le', '-ar', '48000', '-ac', '2'];

async function streamAudioFile(voiceUdp, filepath) {
    if (filepath.endsWith(".mp3") || filepath.endsWith(".opus")) {
        await streamMp3File(voiceUdp, filepath);
        return true;
    }
    return false;
}

function streamAudioFileStream(voiceUdp, stream, type) {
    return new Promise((resolve, reject) => {

        let inputStream;
        if (type == "opus") {
            inputStream = stream;
        }
        else if (type == "mp3") {
            const args = ["-f", "mp3", ...FFMPEG_ARGUMENTS];
            inputStream = new prism.FFmpeg({ args });
            stream.pipe(inputStream);
        }
        else if (type == "mp4") {
            const args = ["-f", "mp4", ...FFMPEG_ARGUMENTS];
            inputStream = new prism.FFmpeg({ args });
            stream.pipe(inputStream);
        }
        else {
            return reject();
        }
        
        // make opus stream
        const opus = new prism.opus.Encoder({ channels: 2, rate: 48000, frameSize: 960 });
        const opusStream = inputStream.pipe(opus);
        
        // send stream data
        const audioStream = new AudioStream({ udp: voiceUdp });
        audioStream.on("finish", () => {
            resolve();
        });
        opusStream.pipe(audioStream);
    })
}

function streamMp3File(voiceUdp, filepath) {
    return new Promise((resolve) => {
        // make ffmpeg stream
        const args = ["-i", filepath, ...FFMPEG_ARGUMENTS];
        const ffmpeg = new prism.FFmpeg({ args });
        
        // make opus stream
        const opus = new prism.opus.Encoder({ channels: 2, rate: 48000, frameSize: 960 });
        const opusStream = ffmpeg.pipe(opus);
        
        // send stream data
        const audioStream = new AudioStream({ udp: voiceUdp });
        audioStream.on("close", () => {
            resolve();
        });
        opusStream.pipe(audioStream);
    })
}

module.exports = {
    streamAudioFile,
    streamAudioFileStream
}