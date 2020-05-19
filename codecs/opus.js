const sodium = require("libsodium-wrappers");

const time_inc = (48000 / 100) * 2;

function incrementAudioValues(voiceUdp) {
    voiceUdp.time += time_inc;
    if (voiceUdp.time >= 2 ** 32) voiceUdp.time = 0;
}

// encrypts all data that is not in rtp header.
// rtp header extensions and payload headers are also encrypted
function encryptData(data, secretkey, nonce) {
    return sodium.crypto_secretbox_easy(data, nonce, secretkey);
}

function createAudioPacket(voiceUdp, data) {
    let packetHeader = Buffer.alloc(12);

    packetHeader[0] = 0x80;
    packetHeader[1] = 0x78;
    packetHeader.writeUIntBE(voiceUdp.getNewSequence(), 2, 2);
    packetHeader.writeUIntBE(voiceUdp.time, 4, 4);
    packetHeader.writeUIntBE(voiceUdp.ssrc, 8, 4);
    
    incrementAudioValues(voiceUdp);
    const nonceBuffer = voiceUdp.getNewNonceBuffer();
    return Buffer.concat([packetHeader, encryptData(data, voiceUdp.secretkey, nonceBuffer), nonceBuffer.slice(0, 4)]);
}

module.exports = {
    incrementAudioValues,
    createAudioPacket
}