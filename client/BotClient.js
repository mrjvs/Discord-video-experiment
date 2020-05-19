const WebSocket = require('ws');
const axios = require('axios');
const events = require('events');

const { VoiceConnection } = require("../voice/VoiceConnection");
const { handleGatewayEvent } = require("./EventHandler");

const gatewaySocket =  "wss://gateway.discord.gg/?v=6&encoding=json";
const apiEndpoint = "https://discordapp.com/api/v6";

const gatewayOpCodes = {
    event: 0,
    heartbeat: 1,
    identify: 2,
    status: 3,
    voice: 4,
    hello: 10,
    heartbeat_ack: 11,
}

const properties = {
    $os: 'windows',
    $browser: 'barebones tester',
    $device: 'barebones tester'
}

class BotClient {
    constructor(token, shards = undefined, gateway = gatewaySocket, api = apiEndpoint) {
        this.shards = shards;

        this.api = api;
        this.gateway = gateway;

        // keeps track of voice connections
        this.voiceGuild = {};

        // starts event handling
        this.events = new events.EventEmitter();
    }

    logout() {
        clearInterval(this.interval);
        this.ws.close();
    }

    login(token) {
        if (!token)
            throw new Error("Invalid token");
        this.token = token;

        this.getUser('@me').then((user) => {
            this.bot = user;
            this.botId = user.id;

            this.ws = new WebSocket(this.gateway);
            this.setupEvents();
        }).catch((err) => {
            console.error(err);
        });
    }

    sendOpcode(code, data) {
        this.ws.send(JSON.stringify({
            op: code,
            d: data
        }));
    }
    
    setupEvents() {
        let heartbeat = null;
        let startedHeartbeat = false;
        this.sequence = null;

        this.ws.on('message', (data) => {
            const { op, d, s, t } = JSON.parse(data);
            if (op === gatewayOpCodes.event) {
                this.sequence = s;
                handleGatewayEvent(this, t, d);
            }
            if (op === gatewayOpCodes.hello) {
                heartbeat = d.heartbeat_interval;
                if (startedHeartbeat === false) {
                    this.setupHeartbeat(heartbeat);
                    startedHeartbeat = true;
                    this.identify();
                }
            }
            if (op === gatewayOpCodes.heartbeat_ack) {
                // ignore heartbeat ack
            }
            if (op >= 4000) {
                console.log("GATEWAY ERROR", d)
            }
        });
    }

    /*
    ** identify with gateway
    */
    identify() {
        let shard;
        if (this.shards) {
            shard = shards;
        }

        this.sendOpcode(gatewayOpCodes.identify, {
            token: this.token,
            properties,
            shard
        });
    }

    setupHeartbeat(interval) {
        if (this.interval) {
            clearInterval(this.interval);
        }
        this.interval = setInterval(() => {
            this.sendOpcode(gatewayOpCodes.heartbeat, this.sequence);
        }, interval);
    }

    getVoiceConnection(guild_id) {
        this.voiceGuild[guild_id];
    }

    /*
    ** set status of bot
    ** text -> Text of game the bot is playing
    */
    setStatus(text) {
        this.sendOpcode(gatewayOpCodes.status, {
            afk: false,
            status: 'online',
            game: {
                name: text,
                type: 0
            },
            since: null
        });
    }

    /*
    ** send message to channel
    ** text -> message to send
    ** channelId -> channel id
    */
    sendMessage(text, channelId) {
        axios({
            url: `${this.api}/channels/${channelId}/messages`,
            method: 'post',
            data: {
                content: text,
                tts: false,
            },
            headers: {
                'Authorization': 'Bot ' + this.token,
            },
        }).catch((err) => {
            console.error(err);
        });
    }

    /*
    ** get user by userid
    ** userid -> user id or "@me"
    */
    async getUser(userId) {
        const res = await axios({
            url: `${this.api}/users/${userId}`,
            method: 'get',
            headers: {
                'Authorization': 'Bot ' + this.token,
            }
        });
        return res.data;
    }

    /*
    ** Join a voice channel
    ** guild_id -> guild id
    ** channel_id -> channel id
    */
    joinVoice(guild_id, channel_id, callback) {
        this.voiceGuild[guild_id] = new VoiceConnection(guild_id, this.botId, callback);
        this.sendOpcode(gatewayOpCodes.voice, {
            guild_id,
            channel_id,
            self_mute: false,
            self_deaf: false
        });
    }
}

module.exports = {
    BotClient
};
