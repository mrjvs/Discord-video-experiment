function handleGatewayEvent(client, event, data) {
    if (event === 'READY') {
        client.events.emit("ready", client.bot);
    } else if (event === 'GUILD_CREATE') {
        client.events.emit("guild", data);
    } else if (event === 'MESSAGE_CREATE') {
        client.events.emit("message", data);
    } else if (event === 'MESSAGE_DELETE') {
        // ignore event
    } else if (event === "VOICE_STATE_UPDATE") {
        if (data.user_id === client.botId) {
            if (typeof client.voiceGuild[data.guild_id] !== "undefined") {
                // transfer session data to voice connection
                client.voiceGuild[data.guild_id].setSession(data.session_id);
            }
        }
    } else if (event === "VOICE_SERVER_UPDATE") {
        // transfer voice server update to voice connection
        client.voiceGuild[data.guild_id].setTokens(data.endpoint, data.token);
    } else if (event === "PRESENCE_UPDATE") {
        // ignore event
    } else {
        console.log("UNHANDLED EVENT", {event, data});
    }
}

module.exports = {
    handleGatewayEvent
};
