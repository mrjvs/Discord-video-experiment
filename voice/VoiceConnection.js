const WebSocket = require('ws');

const { VoiceUdp } = require("./VoiceUdp");

const voiceOpCodes = {
    identify: 0,
    protocols: 1,
    ready: 2,
    heartbeat: 3,
    sessionDescription: 4,
    speaking: 5,
    heartbeat_ack: 6,
    hello: 8,
    sources: 12
}

class VoiceConnection {
    constructor(guildId, botId, ready) {
        this.status = {
            hasSession: false,
            hasToken: false,
            started: false
        }

        // make udp client
        this.udp = new VoiceUdp(this);

        this.guild = guildId;
        this.botId = botId;
        this.ready = ready;
    }

    stop() {
        clearInterval(this.interval);
        this.ws.close();
        this.status.started = false;
    }

    setSession(session) {
        this.session = session;

        this.status.hasSession = true;
        this.start();
    }
    
    setTokens(server, token) {
        this.token = token;
        this.server = server;

        this.status.hasToken = true;
        this.start();
    }

    start() {
        /*
        ** Connection can only start once both
        ** session description and tokens have been gathered 
        */
        if (this.status.hasSession && this.status.hasToken) {
            if (this.status.started)
                return
            this.status.started = true;

            this.ws = new WebSocket("ws://" + this.server + "/?v=5", {
                followRedirects: true
            });
            this.ws.on("error", (err) => {
                console.error(err);
            })
            this.ws.on("close", (err) => {
                console.error("closed voice");
                this.status.started = false;
            })
            this.setupEvents();
        }
    }

    handleReady(d) {
        this.ssrc = d.ssrc;
        this.address = d.ip;
        this.port = d.port;
        this.modes = d.modes;

        // transfer media server to udp client
        this.udp.setData(d);
    }

    handleSession(d) {
        this.secretkey = d.secret_key;

        // transfer encryption key to udp client
        this.udp.setSession(d);
        this.ready(this.udp);
    }

    setupEvents() {
        this.ws.on('message', (data) => {
            const { op, d } = JSON.parse(data);
            if (op == 2) { // ready
                this.handleReady(d);
                this.sendVoice();
                this.setVideoStatus(false);
            }
            else if (op >= 4000) {
                console.error("Error voice connection", d);
            }
            else if (op === 8) {
                this.setupHeartbeat(d.heartbeat_interval);
                this.identify();
            }
            else if (op === 4) { // session description
                this.handleSession(d);
            }
            else if (op === 5) {
                // ignore speaking updates
            }
            else if (op === 6) {
                // ignore heartbeat acknowledgements
            }
            else {
                console.log("unhandled voice event", {op, d});
            }
        });
    }

    setupHeartbeat(interval) {
        if (this.interval) {
            clearInterval(this.interval);
        }
        this.interval = setInterval(() => {
            this.sendOpcode(voiceOpCodes.heartbeat, 42069);
        }, interval);
    }

    sendOpcode(code, data) {
        this.ws.send(JSON.stringify({
            op: code,
            d: data
        }));
    }

    /*
    ** identifies with media server with credentials
    */
    identify() {
        this.sendOpcode(voiceOpCodes.identify, {
            server_id: this.guild,
            user_id: this.botId,
            session_id: this.session,
            token: this.token
        });
    }

    /*
    ** Sets protocols and ip data used for video and audio.
    ** Uses vp8 for video
    ** Uses opus for audio
    */
    setProtocols() {
        this.sendOpcode(voiceOpCodes.protocols, {
            protocol: "udp",
            codecs: [
                { name: "opus", type: "audio", priority: 1000, payload_type: 120 },
                { name: "VP8", type: "video", priority: 3000, payload_type: 103, rtx_payload_type: 104 }
            ],
            data: {
                address: this.self_ip,
                port: this.self_port,
                mode: "xsalsa20_poly1305_lite"
            }
        });
    }

    /*
    ** Sets video status.
    ** bool -> video on or off
    ** video and rtx sources are set to ssrc + 1 and ssrc + 2
    */
    setVideoStatus(bool) {
        this.sendOpcode(voiceOpCodes.sources, {
            audio_ssrc: this.ssrc,
            video_ssrc: bool ? this.ssrc + 1 : 0,
            rtx_ssrc: bool ? this.ssrc + 2 : 0
        });
    }

    /*
    ** Set speaking status
    ** speaking -> speaking status on or off
    */
   setSpeaking(speaking) {
        this.sendOpcode(voiceOpCodes.speaking, {
            delay: 0,
            speaking: bool ? 1 : 0,
            ssrc: this.ssrc
        });
    }

    /*
    ** Start media connection
    */
    sendVoice() {
        return new Promise((resolve, reject) => {
            this.udp.createUdp().then(async () => {
                resolve();
            });
        })
    }
}

module.exports = {
    VoiceConnection
};
