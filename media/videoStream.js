const { Writable } = require("stream");
const { partitionVideoData, getInitialVideoValues, createVideoPacket, incrementVideoFrameValues } = require("../codecs/vp8");

class VideoStream extends Writable {

    constructor(options) {
        super(options);
        this.udp = options.udp;
        this.count = 0;

        this.ops = {
            ssrc: options.udp.ssrc + 1,
            secretkey: options.udp.secretkey,
            mtu: options.mtu ? options.mtu : 1200
        }
        this.ops = getInitialVideoValues(this.ops);
        this.sleepTime = 0;
    }

    setSleepTime(time) {
        this.sleepTime = time;
    }

    _write(frame, _, callback) {
        this.count++;
        if (!this.startTime)
            this.startTime = Date.now();

        const data = partitionVideoData(this.ops.mtu, frame);

        for (let i = 0; i < data.length; i++) {
            const packet = createVideoPacket(this.udp, this.ops, data[i], i, data.length);
            this.udp.sendPacket(packet);
        }

        this.ops = incrementVideoFrameValues(this.ops);

        const next = (this.count * this.sleepTime) - (Date.now() - this.startTime);
        setTimeout(() => {
            callback();
        }, next);
    }
}

module.exports = {
    VideoStream
};
