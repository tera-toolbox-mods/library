const {protocol, sysmsg} = require('tera-data-parser');
const path = require('path');
const fs = require('fs');
const Long = require("long");
const Command = require('command');
const request = require('request');

class Library{
    // I forgot why this :akashrug:
    arrayItemInArray(a, b) {
        for(let item of a) {
            if(b.includes(item)) return true;
        }
        return false;
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

    getSkillInfo(id, usingMask=true) {
        let skillId = id - usingMask ? 0x4000000 : 0;
        return {
            raw: id + usingMask ? 0 : 0x4000000,
            id: skillId,
            skill: Math.floor(skillId / 10000),
            sub: skillId % 100
        };
    }

    // Change and return the loc object
    applyDistance(loc, distance) {
        let r = (loc.w / 0x8000) * Math.PI;
        loc.x += Math.cos(r) * distance;
        loc.y += Math.sin(r) * distance;
        return loc;
    }

    sendRequest(url, data) {
        request.post(url, {form: JSON.stringify(data)});
    }

    // Might need rework?
    saveFile(filePath, data) {
        fs.writeFileSync(path.join(__dirname, filePath), JSON.stringify(data, null, "    "));
    }

    getEvent(opcode, packetVersion, payload) {
        return protocol.parse(this.version, opcode, packetVersion, payload);
    }

    constructor(dispatch) {
        dispatch.hook('S_CHECK_VERSION', ()=> this.version = dispatch.base.protocolVersion);
        this.command = Command(dispatch);
        
        this.startSkillsPackets = [['C_START_SKILL', 3], 
                                    ['C_START_TARGETED_SKILL', 3], 
                                    ['C_START_COMBO_INSTANT_SKILL', 1],
                                    ['C_START_INSTANCE_SKILL', 2], 
                                    ['C_START_INSTANCE_SKILL_EX', 2], 
                                    ['C_PRESS_SKILL', 1], 
                                    ['C_NOTIMELINE_SKILL', 1]];

        this.sp = false;
        try{
            require('skill-prediction');
            this.sp = true;
        }catch(e) {
            try{
                require('skill-prediction-master');
                this.sp = true;
            }catch(e) {}
        }
    }
}

module.exports = Library;
