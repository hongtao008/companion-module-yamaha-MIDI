// Control module for Yamaha Pro Audio, using MIDI communication
// Andrew Broughton <andy@checkcheckonetwo.com>
// Apr 22, 2020 Version 1.1.1

var tcp            = require('../../tcp');
var net            = require('net');
var instance_skel  = require('../../instance_skel');

const actions      = require('./actions.js');
const feedback     = require('./feedback.js');
const presets      = require('./presets.js');
const yamaha       = require('./yamaha.js');


// Instance Setup
class instance extends instance_skel {
	
	constructor(system, id, config) {
		super(system, id, config);

		this.CL_HEARTBEAT   = [0xF0, 0x43, 0x10, 0x3E, 0x19, 0x7F, 0xF7];

		this.heartBeatTimer = {};
		this.macroMode      = 'stopped';
		this.macroCount     = 0;
		this.macroPgBk      = {};
		this.dataStore      = {};

		Object.assign(this, {
			...actions,
			...feedback,
			...presets,
			...yamaha
		});

	}


	// Startup
	init() {
		this.updateConfig(this.config);
	}

	// Module deletion
	destroy() {
	
		clearInterval(this.heartBeatTimer);
		
		if (this.server !== undefined) {
			this.server.close()
		}
		if (this.socket !== undefined) {
			this.socket.destroy();
		}

		this.log('debug', `destroyed ${this.id}`);
	}


	// Web config fields
	config_fields() {
		
		return [{
				type: 		'textinput',
				id: 		'host',
				label: 		'IP Address of Console',
				width: 		6,
				default: 	'192.168.0.128',
				regex: 		this.REGEX_IP
			},
			{
				type: 		'dropdown',
				id: 		'model',
				label: 		'Console Type',
				width: 		6,
				default: 	'CL/QL',
				choices: [
					{id: 'CL/QL', label: 'CL/QL Console'}
				]
			},
			{
				type: 		'checkbox',
				id: 		'heartbeat',
				label: 		'Use Editor',
				width: 		6,
				default: 	false
			},
			{
				type: 		'textinput',
				id: 		'logfolder',
				label: 		'folder for log files (must be writable!)',
				width: 		6,
				default: 	`${require('os').homedir()}/`,
				regex: 		''
			}
		]
	}

	
	// Change in Configuration
	updateConfig(config) {
		this.config = config;

		const fs    = require('fs');
		let folder  = this.config.logfolder || `${require('os').homedir()}/`;
		folder = require('path').resolve(folder);
		if (!folder.endsWith('/')) {
			folder = folder + '/';
		}


		fs.access(folder, fs.constants.W_OK, (err) => {
			if (err) {
				this.log('error', `Unable to write to log folder '${folder}'`);
			} else {
				let fname = `${folder}newParamMsgs.json`;
				
				console.log(`newParamMsgs = '${fname}'`);
				
				if (fs.existsSync(fname)) {
					yamaha.setFName(fname);
					this.log('info', `Previous newParamMsgs loaded from '${fname}'`);
					fs.copyFile(fname, fname + '.bak', (err) => {
						if (err) {
							this.log('error', `Cant copy file '${fname}'!`);
						}
						this.log('info', `newParamMsgs backed up to ${fname}.bak`);
					});
				} else {
					this.log('info',`Previous newParamMsgs '${fname}' does not exist.`);
				}
		
				this.log('info', `New Commands Logging to: '${fname}'`);
			}		  
		});

		this.newConsole();
	}


	// Whenever the console type changes, update the info
	newConsole() {
		
		this.log('info', `Device model= ${this.config.model}`);
		
		this.createActions(); // Re-do the actions once the console is chosen
		this.createPresets();
		this.init_tcp();
	}


	// Initialize TCP
	init_tcp() {
		
		let heartBeat 	  = Buffer.from(this.CL_HEARTBEAT);
		let receivedMsgs  = [];
		
		if (this.server !== undefined) {
			this.server.close();
			delete this.server;
		}

		if (this.socket !== undefined) {
			if (this.heartBeatTimer !== undefined) clearInterval(this.heartBeatTimer);
			this.socket.destroy();
			delete this.socket;
		}

		const newSocket = (socket) => {
			this.socket = socket;

			this.pollConsole();
			
			if (this.config.heartbeat) {
				this.heartBeatTimer = setInterval(() => {
					this.socket.write(heartBeat)
				}, 1000)
			}
			
			this.socket.on('status_change', (status, message) => {
				this.status(status, message);
			});

			this.socket.on('error', (err) => {
				this.status(this.STATUS_ERROR, err);
				this.log('error', `Network error: ${err.message}`);
			});

			this.socket.on('connect', () => {
				this.status(this.STATUS_OK,'');
				this.log('info', `Socket Connected!`);
				this.pollConsole();				
			});

			socket.on('close', (err) => {
				if (this.heartBeatTimer !== undefined) clearInterval(this.heartBeatTimer);
				this.status(this.STATUS_WARNING, 'Socket Closed!');
				if (err) {
					this.log('error', `Socket closed with error.`);
				} else {
					this.log('info', `Socket closed.`);
				}
			});

			this.socket.on('data', (chunk) => {
				let i = 0
				while(i < chunk.length) {
					while(i < chunk.length && chunk[i] !== 0xF0) {
						i++
					}

					let start = i;
					while(i < chunk.length && chunk[i] !== 0xF7) {
						i++;
					}

					if (start < i) {
						i++;
						receivedMsgs.push(Buffer.alloc(i - start, chunk.slice(start, i)));
					}
				}

				for(let line of receivedMsgs) {
					//this.log('debug', `Received from device: '${line.toString('hex').toUpperCase()}'`);
					switch (line.length) {
						case 0:
							continue;
						case 18:
							this.msg = new yamaha.yamParamMsg(line);
							if (this.msg.cmdStr !== undefined) {
								this.logMsg(this.msg, 'Recv');
							}
							break;
						case 27:
							this.msg = new yamaha.yamLibMsg(line, {cmdStr: line.slice(6, 22).toString(), cmdKey: line.slice(6, 22).toString()});
							if (this.msg.cmdStr !== undefined) {
								this.logMsg(this.msg,'Recv');
							}
							break;
						default:
							console.log(`Unknown: ${fmtHex(line)} length = ${line.length}`);			
					}
					if (this.msg !== undefined && !this.msg.hide) {
						if (this.macroMode !== 'stopped') this.addToMacro(this.msg);
						this.addToDataStore(this.msg);
						this.checkFeedbacks(this.msg.cmdKey);
					}	
				}					
				receivedMsgs = [];	// Clear the buffers
				this.msg = undefined;
 			});
		}

		if (this.config.enabled) {
			if (this.config.heartbeat) {
				
				this.server = net.createServer();
				this.server.listen(50000);

				this.server.on('listening', (isListening) => {
						this.status(this.STATUS_WARNING, 'I\'m Listening...');
						this.log('info', `Server Listening...`);
				});
				
				this.server.on('connection', (socket) => {
					this.log('info', `Socket created to ${socket.remoteAddress}`);
					this.status(this.STATUS_OK,'');
					newSocket(socket);
				});

				this.server.on('error', (err) => {
					this.status(this.STATUS_ERROR, err);
					this.log('error', `Server Network error: ${err.message}`);	
				});
				
			} else {

				newSocket(new tcp(this.config.host, 50000));

			}			
		}
	}

	action(action) {
		this.doAction(action);
	}

	feedback(feedback, bank) {
		return this.handleFeedback(feedback, bank);
	}

	pollConsole() {
		this.pollMIDI();
	}

	addToDataStore(msg) {
		if (this.dataStore[msg.cmdKey] == undefined) {
			this.dataStore[msg.cmdKey] = {};
		}
		this.dataStore[msg.cmdKey][msg.ch] = msg.val;
	}

	logMsg(msg, prefix) {
		if (msg.msg.length == 18) {
			this.log('debug',`<font face="courier">${prefix}: ${msg.cmdStr.padEnd(30, '\u00A0')} Ch:${msg.ch.toString().padStart(2,'0')} Val:${msg.val}</font>`);
			console.log(`${prefix}: ${fmtHex(msg.msg)}		'${msg.cmdStr}' 	ch:${msg.ch}/${msg.maxCh} 	val:[${msg.minVal}]-> ${msg.val} <-[${msg.maxVal}]  ${msg.hide ? '(hidden)' : ''}`);
		} else {
			this.log('debug',`<font face="courier">${prefix}: ${msg.cmdStr.padEnd(30, '\u00A0')} Ch:${msg.ch.toString().padStart(2,'0')} Scene:${msg.val}</font>`);
			console.log(`${prefix}: ${fmtHex(msg.msg)}		'${msg.cmdStr}'  scene:${msg.val} ch:${msg.ch}`);
		}
	}
}

fmtHex = (buf) => {
	return buf.toString('hex').replace(/(.{2})/g, '$1 ');
}

module.exports = instance;
