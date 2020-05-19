const prism = require("prism-media");
const { readIvfFile, getFrameFromIvf, getFrameDelayInMilliseconds, IvfTransformer } = require("./ivfreader");
const { VideoStream } = require("./videoStream");

const FFMPEG_ARGUMENTS = "-re -f mp4 -i - -loglevel 0 -f ivf".split(" ");

async function streamVideoFile(voiceUdp, filepath, startcb) {
    if (filepath.endsWith(".ivf"))
        return await streamIvfFile(voiceUdp, filepath, startcb);
    return false;
}

function streamVideoFileStream(voiceUdp, stream, type) {
    return new Promise((resolve, reject) => {

        // pipe into ffmpeg if not an ivf stream
        let inputStream;
        if (type == "ivf") {
            inputStream = stream;
        }
        else if (type == "mp4") {
            const args = FFMPEG_ARGUMENTS;
            inputStream = new prism.FFmpeg({ args });
            stream.pipe(inputStream);
        }
        else {
            reject();
        }

        // make stream
        const ivfStream = new IvfTransformer();
        const videoStream = new VideoStream({ udp: voiceUdp });
    
        // get header frame time
        ivfStream.on("header", (header) => {
            videoStream.setSleepTime(getFrameDelayInMilliseconds(header));
        });

        videoStream.on("finish", () => {
            resolve();
        });

        inputStream.pipe(ivfStream);
        ivfStream.pipe(videoStream);
    });
}

async function streamIvfFile(voiceUdp, filepath, startcb) {
    const ivfFile = await readIvfFile(filepath);
    if (!ivfFile) return false;

    startcb();

    const videoStream = new VideoStream({ udp: voiceUdp });
    videoStream.setSleepTime(getFrameDelayInMilliseconds(ivfFile));

    let counter = 0;

    for (let i = 0; i < ivfFile.frameCount; i++) {
        const frame = getFrameFromIvf(ivfFile, i + 1);
        if (!frame) return;

        await new Promise((resolve, reject) => {
            videoStream.write(frame.data, (err) => {
                if (err)
                    reject(err);
                resolve(true);
            });
        })
        counter++;
    }
    console.log(`Sent ${counter} packets for video!`);
    return true;
}

module.exports = {
    streamVideoFile,
    streamVideoFileStream
};
