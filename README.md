# CURRENTLY BROKEN
## Discord bot video
Video for discord bot proof of concept.
This is an experiment done by the [Cascadebot](https://github.com/CascadeBot) team.

This accidental feature/bug has been patched by discord in the latest client update. the client still receives video but just doesn't show it anymore.

## features
 - Playing vp8 video in a voice channel (not `go live`, but webcam video)
 - Transcoding video and audio to vp8 (using ffmpeg)
 - Can send via streams (possible hook with youtube)

## implementation
What I implemented and what I did not.

#### Video codecs
 - [X] VP8
 - [ ] VP9
 - [ ] H.264

#### Packet types
 - [X] RTP (sending of realtime data)
 - [ ] RTX (retransmission)
 - [ ] Go live (?) (Has not been researched yet if even possible)

#### Extras
 - [ ] Figure out rtp header extensions (discord specific)

## Running example
`config.js`:
```JS
module.exports = "BOT TOKEN HERE"
```

in `/example`:
1. have `config.js` like above
2. have `constants.js` set correctly for your voice channel
3. set video file path in `index.js`
4. run with `node .`
