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
        return Math.pow((a.x - b.x), 2) + Math.pow((a.y - b.y), 2) < Math.pow((aRadius + bRadius), 2)
    }

    getSkillInfo(id, usingMask=true) {
        let skillId = id - (usingMask ? 0x4000000 : 0);
        return {
            raw: id + (usingMask ? 0 : 0x4000000),
            id: skillId,
            skill: Math.floor(skillId / 10000),
            sub: skillId % 100,
            level: Math.floor(skillId / 100) % 100
        };
    }

    // Change and return the loc object
    applyDistance(loc, distance) {
        let r = (loc.w / 0x8000) * Math.PI;
        loc.x += Math.cos(r) * distance;
        loc.y += Math.sin(r) * distance;
        return loc;
    }

    // Might need rework?
    saveFile(filePath, data, dirname=__dirname) {
        fs.writeFileSync(path.join(dirname, filePath), JSON.stringify(data, null, "    "));
    }

    getEvent(opcode, packetVersion, payload) {
        return protocol.parse(this.version, opcode, packetVersion, payload);
    }

    // Read a file
    readFile(dirname, filePath) {
        return fs.readFileSync(path.join(dirname, filePath));
    }

    constructor(dispatch) {
        dispatch.hook('C_CHECK_VERSION', 1, {order: 100},()=> this.version = dispatch.base.protocolVersion);
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
