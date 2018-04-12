const Command = require('command');
const LOAD_MODULES = ['entity', 'player', 'effect'];
const PRE_LOAD_MODULES = ['library'];

class Library{
	constructor(dispatch, arg1) {
        this.mods = {};
		this.command = Command(dispatch);
		this.cmd = this.command;

		for(let name of PRE_LOAD_MODULES) {
			try {
				let tmp = require(`./class/${name}`);
				this.mods[name] = new tmp(dispatch, this.mods);
				this[name] = this.mods[name];
			}catch(e) {
				console.log(e);
				console.log(`[Library] Failed to load module ${name}. Will close.`);
				process.exit();
			}
		}

		function loadAllModules() {
			for(let name of LOAD_MODULES) {
				try {
					let tmp = require(`./class/${name}`);
					this.mods[name] = new tmp(dispatch, this.mods);
					this[name] = this.mods[name];
				}catch(e) {
					console.log(e);
					console.log(`[Library] Failed to load module ${name}. Will close.`);
					process.exit();
				}
			}
		}

		// don't mind this tbh
		if(arg1) loadAllModules.call(this);
		else dispatch.hook('C_LOGIN_ARBITER', 'raw', loadAllModules.bind(this));
	}
}

let map = new WeakMap();

module.exports = function Require(dispatch, ...args) {
	if(map.has(dispatch.base)) return map.get(dispatch.base);

	let library = new Library(dispatch, ...args);
	map.set(dispatch.base, library);
	return library;
}
