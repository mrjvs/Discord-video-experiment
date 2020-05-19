const udpCon = require('dgram');

const { streamVideoFile, streamVideoFileStream } = require("../media/videoHandler");
const { streamAudioFile, streamAudioFileStream } = require("../media/audioHandler");

const max_nonce = 2 ** 32 - 1;

// credit to discord.js
function parseLocalPacket(message) {
    try {
        const packet = Buffer.from(message);
        let address = '';
        for (let i = 4; i < packet.indexOf(0, i); i++) address += String.fromCharCode(packet[i]);
        const port = parseInt(packet.readUIntLE(packet.length - 2, 2).toString(10), 10);
        return { address, port };
    } catch (error) {
        return { error };
    }
}
  

class VoiceUdp {
    constructor(voiceConnection) {
        this.nonce = 0;
        this.noncetwo = 0;
        this.time = 0;
        this.sequence = 0;

        this.voiceConnection = voiceConnection;
    }

    getNewNonceBuffer() {
        const nonceBuffer = Buffer.alloc(24)
        this.nonce++;
        if (this._nonce > max_nonce) this.nonce = 0;
            nonceBuffer.writeUInt32BE(this.nonce, 0);
        return nonceBuffer;
    }

    getNewSequence() {
        this.sequence++;
        if (this.sequence >= 2 ** 16) this.sequence = 0;
        return this.sequence;
    }

    setData(d) {
        this.ssrc = d.ssrc;
        this.address = d.ip;
        this.port = d.port;
        this.modes = d.modes;
    }

    setSession(d) {
        this.secretkey = new Uint8Array(d.secret_key);
    }

    async playAudioFile(filepath) {
        return await streamAudioFile(this, filepath);
    }

    async playVideoFile(filepath, audioPath) {
        this.voiceConnection.setVideoStatus(true);
        const res = await streamVideoFile(this, filepath, () => {
            if (audioPath) {
                streamAudioFile(this, audioPath);
            }
        });
        this.voiceConnection.setVideoStatus(false);
        return res;
    }

    async playVideoFileStream(stream, type) {
        this.voiceConnection.setVideoStatus(true);
        await streamVideoFileStream(this, stream, type);
        this.voiceConnection.setVideoStatus(false);
    }

    async playAudioFileStream(stream, type) {
        streamAudioFileStream(this, stream, type);
    }

    sendPacket(packet) {
        return new Promise((resolve, reject) => {
            this.udp.send(packet, 0, packet.length, this.port, this.address, (error, bytes) => {
                if (error) {
                    console.log("ERROR", error);
                    return reject(error);
                }
                resolve();
            });
        });
    }

    handleIncoming(buf) {
        //console.log("RECEIVED PACKET", buf);
    }

    createUdp() {
        return new Promise((resolve, reject) => {
            this.udp = udpCon.createSocket('udp4');
            this.udp.on('error', e => {
                console.error("Error connecting to media udp server", e);
                reject(e);
            });
            this.udp.once('message', (message) => {
                
                const packet = parseLocalPacket(message);
                if (packet.error) {
                    return reject(packet.error);
                }

                this.voiceConnection.self_ip = packet.address;
                this.voiceConnection.self_port = packet.port;
                this.voiceConnection.setProtocols();

                resolve(true);
                this.udp.on('message', this.handleIncoming);
            });

            const blank = Buffer.alloc(70);
            blank.writeUIntBE(this.ssrc, 0, 4);

            this.udp.send(blank, 0, blank.length, this.port, this.address, (error, bytes) => {
                if (error) {
                    return reject(error)
                }
            });
        });
    }
}

module.exports = {
    VoiceUdp
};
