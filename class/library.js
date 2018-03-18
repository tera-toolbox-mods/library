const {protocol, sysmsg} = require('tera-data-parser');
const path = require('path');
const fs = require('fs');
const Long = require("long");
const Command = require('command');

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
        return Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x) * 0x8000 / Math.PI;
    }

    opositeDirection(direction) {
        return (direction + 2 * 32768) % (2 * 32768) - 32768;
    }

    jsonEqual(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    emptyLong(bool=true) {
        return new Long(0, 0, bool);
    }

    objectLength(obj) {
        return Object.keys(obj).length;
    }

    positionsIntersect(a, b, aRadius, bRadius) {
        let sum = Math.pow((a.x - b.x), 2) + Math.pow((a.y - b.y), 2);
        return (Math.pow((aRadius - bRadius), 2) <= sum && sum <= Math.pow((aRadius + bRadius), 2));
    }

    getSkillInfo(id, usingMask=true, bossSkill=false) {
        let skillId;
        let raw;
        let skill;
        let sub;
        let level;
        if(bossSkill) {
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

    // Change and return the loc object
    applyDistance(loc, distance) {
        let r = (loc.w / 0x8000) * Math.PI;
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
        dispatch.hook('C_CHECK_VERSION', 1, {order: 100, filter: {fake: null}},()=> {
            this.version = dispatch.base.protocolVersion;
            this.protocolVersion = dispatch.base.protocolVersion;
            this.sysmsgMap = sysmsg.maps.get(this.protocolVersion);
        });
        try {
            this.version = dispatch.base.protocolVersion;
            this.protocolVersion = dispatch.base.protocolVersion;
            this.sysmsgMap = sysmsg.maps.get(this.protocolVersion);
        }catch(e) {}
        this.command = Command(dispatch);
        
        this.startSkillsPackets = [['C_START_SKILL', 3], 
                                    ['C_START_TARGETED_SKILL', 3], 
                                    ['C_START_COMBO_INSTANT_SKILL', 1],
                                    ['C_START_INSTANCE_SKILL', 2], 
                                    ['C_START_INSTANCE_SKILL_EX', 2], 
                                    ['C_PRESS_SKILL', 1], 
                                    ['C_NOTIMELINE_SKILL', 1]];

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
