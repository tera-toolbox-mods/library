const LOAD_MODULES = ['entity', 'player', 'effect'];
const PRE_LOAD_MODULES = ['packet', 'library'];

class Library{
	constructor(dispatch, arg1) {
		this.autism3 = true;
        this.mods = {};
		this.command = dispatch.command;
		this.cmd = this.command;

		for(let name of PRE_LOAD_MODULES) {
			try {
				let tmp = require(`./class/${name}`);
				this.mods[name] = new tmp(dispatch, this.mods);
				this[name] = this.mods[name];
			}catch(e) {
				console.log(`[Library] Failed to load module ${name}. Will close.`);
				throw e;
			}
		}

		function loadAllModules() {
			for(let name of LOAD_MODULES) {
				try {
					let tmp = require(`./class/${name}`);
					this.mods[name] = new tmp(dispatch, this.mods);
					this[name] = this.mods[name];
				}catch(e) {
					console.log(`[Library] Failed to load module ${name}. Will close.`);
					throw e;
				}
			}
		}

		// don't mind this tbh
		if(arg1 || dispatch.majorPatchVersion) loadAllModules.call(this);
		else dispatch.hook('C_LOGIN_ARBITER', 'raw', loadAllModules.bind(this));
	}
}

module.exports.NetworkMod = function Require(dispatch, ...args) {
	if(dispatch.info.name !== 'library')
		throw new Error(`Tried to require library module: ${dispatch.info.name}`);

	return new Library(dispatch, ...args);
}
module.exports.RequireInterface = (globalMod, clientMod, networkMod) => networkMod;
