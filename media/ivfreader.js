const fs = require("fs");
const { Transform } = require("stream");

/*
** Transform stream to transform file stream into ivf file
** TODO: optimize concats
*/
class IvfTransformer extends Transform {
    constructor(options) {
        super(options);
        this.headerSize = 32;
        this.frameHeaderSize = 12;

        this.header = null;
        this.buf = null;
        this.retFullFrame = (options && options.fullframe) ? options.fullframe : false;
    }

    _parseHeader(header) {
        const out = {
            signature: header.slice(0, 4).toString(),
            version: header.readUIntLE(4, 2),
            headerLength: header.readUIntLE(6, 2),
            codec: header.slice(8, 12).toString(),
            width: header.readUIntLE(12, 2),
            height: header.readUIntLE(14, 2),
            timeDenominator: header.readUIntLE(16, 4),
            timeNumerator: header.readUIntLE(20, 4),
            frameCount: header.readUIntLE(24, 4)
        };

        this.header = out;
        this.emit("header", this.header);
    }

    _getFrameSize(buf) {
        return buf.readUIntLE(0, 4);
    }

    _parseFrame(frame) {
        const size = this._getFrameSize(frame);

        if (this.retFullFrame)
            return this.push(frame.slice(0, 12 + size));

        const out = {
            size: size,
            timestamp: frame.readBigUInt64LE(4),
            data: frame.slice(12, 12 + size)
        }
        this.push(out.data);
    }

    _appendChunkToBuf(chunk) {
        if (this.buf)
            this.buf = Buffer.concat([this.buf, chunk]);
        else
            this.buf = chunk;
    }

    _updateBufLen(size) {
        if (this.buf.length > size)
            this.buf = this.buf.slice(size, this.buf.length);
        else
            this.buf = null;
    }

    _write(chunk, encoding, cb) {
        this._appendChunkToBuf(chunk);
        
        // parse header
        if (!this.header) {
            if (this.buf.length >= this.headerSize) {
                this._parseHeader(this.buf.slice(0, this.headerSize));
                this._updateBufLen(this.headerSize);
            }
            else {
                cb();
                return;
            }
        }
        
        // parse frame(s)
        while (this.buf && this.buf.length >= this.frameHeaderSize) {
            const size = this._getFrameSize(this.buf) + this.frameHeaderSize;

            if (this.buf.length >= size) {
                this._parseFrame(this.buf.slice(0, size));
                this._updateBufLen(size);
            }
            else
                break
        }
        
        // callback
        cb();
    }
}

async function readIvfFile(filepath) {
    const inputStream = fs.createReadStream(filepath);
    
    const stream = new IvfTransformer({ fullframe: true });
    inputStream.pipe(stream);

    let out = {
        frames: []
    };

    await new Promise((resolve, reject) => {
        stream.on("header", (header) => {
            out = {
                ...out,
                ...header
            };
        });

        stream.on("data", (frame) => {
            out.frames.push(frame);
        });
    
        stream.on("end", () => {
            out.frames = Buffer.concat(out.frames);
            resolve();
        });
    });

    return out;
}

// get frame, starts at one
function getFrameFromIvf(file, framenum = 1) {
    if (!(framenum > 0 && framenum <= file.frameCount))
        return false;
    
    let currentFrame = 1;
    let currentBuffer = file.frames;
    while (true) {
        const size = currentBuffer.readUIntLE(0, 4);

        // jump to next frame if isnt the requested frame
        if (currentFrame != framenum) {
            currentBuffer = currentBuffer.slice(12 + size, currentBuffer.length);
            currentFrame++;
            continue
        }

        // return frame data
        const out = {
            size: size,
            timestamp: currentBuffer.readBigUInt64LE(4),
            data: currentBuffer.slice(12, 12 + size)
        }

        return out;
    }
}

function getFrameDelayInMilliseconds(file) {
    return ((parseFloat(file.timeNumerator) / parseFloat(file.timeDenominator)) * 1000);
}

module.exports = {
    getFrameFromIvf,
    readIvfFile,
    getFrameDelayInMilliseconds,
    IvfTransformer
}
