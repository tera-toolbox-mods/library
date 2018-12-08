const {protocol, sysmsg} = require('tera-data-parser');
const path = require('path');
const fs = require('fs');
const Long = require("long");

class SkillClasserino{
    constructor(id, usingMask=true, bossSkill=false) {
        let val = this.calculateValues(id, usingMask, bossSkill);
        this.raw = val.raw;
        this.id = val.id;
        this.skill = val.skill;
        this.sub = val.sub;
        this.level = val.level;
    }

    calculateValues(id, usingMask=true, bossSkill=false) {
        let skillId;
        let raw;
        let skill;
        let sub;
        let level;
        if(bossSkill) {
            // This might be deprecated for boss skills?
            skillId = parseInt('0x' + id.toString(16).slice(-4));
            raw = id;
            skill =  Math.floor(skillId / 100);
            level = 1;
        }else {
            skillId = id - (usingMask ? 0x4000000 : 0);
            raw = id + (usingMask ? 0 : 0x4000000);
            skill = Math.floor(skillId / 10000);
            level = Math.floor(skillId / 100) % 100
        }
        sub = skillId % 100;
        id = skillId;

        return {
            raw,
            id,
            skill,
            sub,
            level
        };
    }

    setValues(id, usingMask=true, bossSkill=false) {
        let val = this.calculateValues(id, usingMask, bossSkill);
        this.raw = val.raw;
        this.id = val.id;
        this.skill = val.skill;
        this.sub = val.sub;
        this.level = val.level;
        return this;
    }

    getBaseId(skill=1, level=1, sub=0) {
        return ((skill * 10000) + (level * 100)) + sub;
    }

    setValuesTo(skill, level, sub) {
        return this.setValues(this.getBaseId(skill, level, sub), false);
    }
}

class Library{
    // Checks if the items in array A, is in array b
    arraysItemInArray(a, b) {
        for(let item of a) {
            if(b.includes(item)) return true;
        }
        return false;
    }

    dist2D(loc1, loc2) {
        return Math.sqrt(Math.pow(loc2.x - loc1.x, 2) + Math.pow(loc2.y - loc1.y, 2));
    }

    dist3D(loc1, loc2) {
        return Math.sqrt(Math.pow(loc2.x - loc1.x, 2) + Math.pow(loc2.y - loc1.y, 2) + Math.pow(loc2.z - loc1.z, 2))
    }

    getDirectionTo(fromPos, toPos) {
        console.warn(`DeprecationWarning: Library.getDirectionTo is deprecated. Use "Angle" equivalents instead.\n    at ${Error().stack.split('\n')[3].slice(7)}`);
        return Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x) * 0x8000 / Math.PI;
    }

    opositeDirection(direction) {
        console.warn(`DeprecationWarning: Library.opositeDirection is deprecated. Use "Angle" equivalents instead.\n    at ${Error().stack.split('\n')[3].slice(7)}`);
        return (direction + 2 * 32768) % (2 * 32768) - 32768;
    }

    jsonEqual(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    emptyLong(bool=true) {
        console.warn(`DeprecationWarning: Library.emptyLong is deprecated. Use BigInt equivalents instead.\n    at ${Error().stack.split('\n')[3].slice(7)}`);
        return new Long(0, 0, bool);
    }

    long(low=0, high=0, unsigned=true) {
        console.warn(`DeprecationWarning: Library.long is deprecated. Use BigInt equivalents instead.\n    at ${Error().stack.split('\n')[3].slice(7)}`);
        return new Long(low, high, unsigned);
    }

    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    objectLength(obj) {
        return Object.keys(obj).length;
    }

    positionsIntersect(a, b, aRadius, bRadius) {
        let sum = Math.pow((a.x - b.x), 2) + Math.pow((a.y - b.y), 2);
        return (Math.pow((aRadius - bRadius), 2) <= sum && sum <= Math.pow((aRadius + bRadius), 2));
    }

    getSkillInfo(id, usingMask=true, bossSkill=false) {
        return new SkillClasserino(id, usingMask, bossSkill);
    }

    fromAngle(w) { return w / Math.PI * 0x8000; }
    toAngle(w) { return w / 0x8000 * Math.PI; }

    // Change and return the loc object
    applyDistance(loc, distance) {
        let r = loc.w; //(loc.w / 0x8000) * Math.PI;
        loc.x += Math.cos(r) * distance;
        loc.y += Math.sin(r) * distance;
        return loc;
    }

    saveFile(filePath, data, dirname=__dirname) {
        fs.writeFileSync(path.join(dirname, filePath), JSON.stringify(data, null, "    "));
    }

    getEvent(opcode, packetVersion, payload) {
        return protocol.parse(this.version, opcode, packetVersion, payload);
    }

    getPayload(opcode, packetVersion, data) {
        return protocol.write(this.version, opcode, packetVersion, data);
    }

    getPacketInformation(identifier) {
        return protocol.resolveIdentifier(this.version, identifier);
    }

    // Read a file
    readFile(dirname, filePath) {
        return fs.readFileSync(path.join(dirname, filePath));
    }

    /* Caali™
        Converts a string coming from for example S_SYSTEM_MESSAGE like this:
        '@5678 [0x0B] ItemName [0x0B] @item:123456 [0x0B] ItemAmount [0x0B] 5'
        to an easily usable object like this:
        {
            'id': 'SMT_DO_RANDOM_STUFF',
            'tokens': {
                'ItemName': '@item:123456',
                'ItemAmount': 5,
            }
        }
    */
    parseSystemMessage(message) {
        // TODO: this just works(TM) but is really ugly...
        // Split tokens
        let tokenstrings = message.split('\x0B');
        if(tokenstrings.length == 0)
            return null;

        // Get SMT_ ID
        let msgId = tokenstrings[0];
        if(msgId.charAt(0) != '@')
            return null;
        msgId = this.sysmsgMap.code.get(parseInt(msgId.substring(1)));
        if(!msgId)
            return null;

        // Convert tokens to dictionary
        if(tokenstrings.length % 2 != 1)
            return null;
        let tokens = {};
        for(let i = 1; i < tokenstrings.length; i += 2)
            tokens[tokenstrings[i]] = tokenstrings[i+1];

        return {id: msgId, tokens: tokens};
    }

    /* Caali™
        Converts something like this:
        {
            'id': 'SMT_DO_RANDOM_STUFF',
            'tokens': {
                'ItemName': '@item:123456',
                'ItemAmount': 5,
            }
        }
        to a string usable for S_SYSTEM_MESSAGE like this:
        '@5678 [0x0B] ItemName [0x0B] @item:123456 [0x0B] ItemAmount [0x0B] 5'
    */
    buildSystemMessage(message) {
        if(!message || !message['id'] || !message['tokens'])
            return null;

        let msgId = this.sysmsgMap.name.get(message['id']);
        if(!msgId)
            return null;

        return `@${msgId}\x0B` + Object.entries(message['tokens']).map(([k, v]) => `${k}\x0B${v}`).join('\x0B');
    }

    constructor(dispatch) {
        this.dispatch = dispatch;
        dispatch.hook('C_CHECK_VERSION', 1, {order: 100, filter: {fake: null}},()=> {
            this.version = dispatch.protocolVersion;
            this.protocolVersion = dispatch.protocolVersion;
            this.sysmsgMap = sysmsg.maps.get(this.protocolVersion);
        });
        try {
            this.version = dispatch.protocolVersion;
            this.protocolVersion = dispatch.protocolVersion;
            this.sysmsgMap = sysmsg.maps.get(this.protocolVersion);
        }catch(e) {}
        this.command = dispatch.command;

        this.sp = false;
        for(let x of ['skill-prediction', 'skill-prediction-master', 'sp', 'sp-master']) {
            try {
                require(x);
                this.sp = true;
            }catch(e){}
        }
    }
}

module.exports = Library;
