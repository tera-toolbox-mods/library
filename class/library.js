const path = require('path');
const fs = require('fs');
const util = require('util');

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
    async query(query, ...args) {
        args = [...args];
        try {
            return await this.dispatch.queryData(query, args, args.length != 0);
        } catch(e) {
            console.log("FATAL ERROR in Library. Failed to execute query:", query);
            throw new Error(e);
        }
    }

    async queryM(queries) {
        let ret = [];

        for(const [query, ...args] of queries) {
            ret.push(await this.dispatch.queryData(query, args, true));
        }

        return ret.reduce((acc, val)=> {
            acc.push(...val);
            return acc;
        }, []);
    }

    async queryF(query, concat=true, findAll=true, children=true, attributeFilter=null) {
        let result;
        try {
            result = await this.dispatch.queryData(query, [], findAll, children, attributeFilter);
        } catch(e) {
            console.log("FATAL ERROR in Library. Failed to execute query:", query);
            throw new Error(e);
        }
        
        let ret = {
            attributes: {},
            children: []
        };

        if(concat) {
            for(const res of (Array.isArray(result) ? result : [result])) {
                ret.attributes = {...ret.attributes, ...res.attributes};
                ret.children.push(...res.children);
            }
        } else {
            ret = result;
        }
        return ret;
    }

    /**
     * queryData is the data returned from "query"
     * path is the path to the data you want, accesses the same way as you would through a query
     */
    getQueryEntry(queryData, path, ...argsData) {
        path = path.split("/");
        queryData = queryData.children;

        while(path.length && queryData.length) {
            const path_info = path.shift();
            if(path_info == "") break;
            const name = path_info.split("@")[0];
            const argsNames = (path_info.replace("=?", "").split("@")[1] || "").split("&");
            
            let argData = [];
            for(const i in argsNames) argData.push(argsData.shift());
            //console.log(`Looking for ${name} with args: ${argsNames} == ${argData}`);

            for(const child of queryData) {
                //console.log(child.name, name, child.name == name);
                if(child.name == name) {
                    let found_all = true;
                    for(const i in argsNames) {
                        const name = argsNames[i];
                        const data = argData[i];
                        //console.log(`comparing ${name}: child: ${child.attributes[name]} | data: ${data} | ${child.attributes[name] == data}`)
                        if(child.attributes[name] != data) found_all = false;
                    }
                    if(found_all) {
                        queryData = (path.length && path[0] != "") ? child.children : [child];
                        break;
                    }
                }
            }
        }
        return queryData;
    }

    print(...args) {
        console.log(util.inspect(...args, false, null, true));
    }

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
        throw new Error(`DeprecationWarning: Library.emptyLong is deprecated. Use BigInt equivalents instead.\n    ${Error().stack}`);
    }

    long(low=0, high=0, unsigned=true) {
        throw new Error(`DeprecationWarning: Library.long is deprecated. Use BigInt equivalents instead.\n    ${Error().stack}`);
    }

    jsonStringify(data, spaces="") {
        return JSON.stringify(data, (key, value)=> {
            if(typeof value === "bigint") {
                return `BI/-${value.toString()}`;
            }

            return value;
        }, spaces);
    }

    parseJson(data) {
        return JSON.parse(data, (key, value)=> {
            if(typeof value === "string" && value.includes("BI/-")) {
                return BigInt(value.replace("BI/-", ""))
            }

            return value;
        });
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
        const str = typeof data === "object" ? JSON.stringify(data, null, "    ") : data;

        fs.writeFileSync(path.join(dirname, filePath), str);
    }

    getEvent(opcode, packetVersion, payload) {
        return this.dispatch.dispatch.fromRaw(opcode, packetVersion, payload);
        return this.dispatch.dispatch.protocol.parse(this.version, opcode, packetVersion, payload);
    }

    getPayload(opcode, packetVersion, data) {
        return this.dispatch.dispatch.toRaw(opcode, packetVersion, data);
        return this.dispatch.dispatch.protocol.write(this.version, opcode, packetVersion, data);
    }

    getPacketInformation(identifier) {
        return this.dispatch.dispatch.resolve(identifier);
        return this.dispatch.dispatch.protocol.resolveIdentifier(this.version, identifier);
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
        return this.dispatch.parseSystemMessage(message);
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
        return this.dispatch.buildSystemMessage(message);
    }

    constructor(dispatch, mods) {
        this.dispatch = dispatch;
        dispatch.hook(...mods.packet.get_all("C_CHECK_VERSION"), {order: 100, filter: {fake: null}},()=> {
            this.version = dispatch.dispatch.protocolVersion;
            this.protocolVersion = dispatch.dispatch.protocolVersion;
        });
        try {
            this.version = dispatch.dispatch.protocolVersion;
            this.protocolVersion = dispatch.dispatch.protocolVersion;
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
