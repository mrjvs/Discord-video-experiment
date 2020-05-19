const { Client } = require("../discord");
const fs = require("fs");
const ytdl = require("ytdl-core");

const client = new Client();

const token = require("./config");
const { voiceChannel, guildId } = require("./constants");
const video = "VIDEO FILE HERE";

async function playVideo(voice) {
    console.log("Started playing video");

    // make file streams
    const videoStream = fs.createReadStream(video);
    const audioStream = fs.createReadStream(video);

    // play audio stream
    voice.playAudioFileStream(audioStream, "mp4");

    // play video stream
    await voice.playVideoFileStream(videoStream, "mp4");

    console.log("Finished playing video");
}

function playYoutube(voice, link) {
    const stream = ytdl(link, {
        quality: 136
    });

    const audiostream = ytdl(link, {
        filter: "audioonly"
    });

    voice.playAudioFileStream(audiostream, "mp4");
    voice.playVideoFileStream(stream, "mp4");
}

// guild create event
client.events.on("guild", (guild) => {
    if (guildId !== guild.id)
        return
    // test guild loaded
});

// ready event
client.events.on("ready", (user) => {
    console.log(`--- ${user.username}#${user.discriminator} is ready ---`);
});

// message event
client.events.on("message", (msg) => {
    if (msg.author.bot)
        return
    if (!msg.guild_id)
        return

    if (msg.guild_id !== guildId)
        return

    // handle messages here
    if (msg.content.startsWith(`$play`)) {
        const args = msg.content.split(" ");
        client.joinVoice(msg.guild_id, voiceChannel, (vc) => {
            playYoutube(vc, args[1]);
        });
    }
});

// login
client.login(token);
