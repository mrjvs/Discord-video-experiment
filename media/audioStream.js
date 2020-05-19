const { Writable } = require("stream");
const { createAudioPacket } = require("../codecs/opus");

class AudioStream extends Writable {
    constructor(options) {
        super(options);
        this.udp = options.udp;
        this.count = 0;
        this.sleepTime = 20;
    }

    _write(chunk, _, callback) {
        this.count++;
        if (!this.startTime)
            this.startTime = Date.now();

        const packet = createAudioPacket(this.udp, chunk);
        this.udp.sendPacket(packet);

        const next = ((this.count + 1) * this.sleepTime) - (Date.now() - this.startTime);
        setTimeout(() => {
            callback();
        }, next);
    }
}

module.exports = {
    AudioStream
};
