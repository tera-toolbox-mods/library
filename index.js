const LOAD_MODULES = ['entity', 'player', 'effect'];
const PRE_LOAD_MODULES = ['library'];

class Library{
	constructor(dispatch, arg1) {

        this.mods = {};
		this.command = dispatch.command;
		this.cmd = this.command;

		// just gonna leave this here for a bit because of pinkie's dispatch.proxyAuthor == "caali" stunt.
		if(!global.TeraProxy && !arg1) {
			console.log("Yikes... Looks like you're using pinkie's proxy.");
			console.log("It's outdated fam. Get a new one here https://discord.gg/dUNDDtw");
			console.log("Technically their both the same since both have proxyAuthor set to Caali though :)");
			process.exit(69);
		}

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
		if(arg1 || dispatch.majorPatchVersion) loadAllModules.call(this);
		else dispatch.hook('C_LOGIN_ARBITER', 'raw', loadAllModules.bind(this));
	}
}

module.exports = function Require(dispatch, ...args) {
	if(dispatch.name !== 'library')
		throw new Error(`Tried to require library module: ${dispatch.name}`);

	return new Library(dispatch, ...args);
}
