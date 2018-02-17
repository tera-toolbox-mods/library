const Command = require('command');
const LOAD_MODULES = ['entity', 'player', 'library', 'effect'];

class Library{
	constructor(dispatch) {
        this.mods = {};
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
		this.command = Command(dispatch);
		this.cmd = this.command;
	}
}

let map = new WeakMap();

module.exports = function Require(dispatch) {
	if(map.has(dispatch.base)) return map.get(dispatch.base);

	let library = new Library(dispatch);
	map.set(dispatch.base, library);
	return library;
}
