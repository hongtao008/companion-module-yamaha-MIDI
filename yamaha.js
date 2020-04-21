var yamParamMsgs   = require('./yamParamMsgs.json');
var otherParamMsgs = require('./otherParamMsgs.json');
var newParamMsgs   = {};
var fname          = undefined;
var fs             = require('fs');

const CL_HEADER = [0xF0, 0x43, 0x10, 0x3E, 0x19];
const CL_TAIL   = 0xF7;

const getMsgs = (which) => {
	if (which == 'yamaha') {
		return yamParamMsgs
	} else if (which == 'other') {
		return otherParamMsgs
	}
}

const setFName = (fn) => {
	fname = fn;
	
	if (fs.existsSync(fname)) {
		newParamMsgs = require(fname);
		fs.copyFile(fname, fname + '.bak', (err) => {
			if (err) {
				console.log(`Cant open file ${fname}!`);
			}
		});
	} else {
		console.log(`${fname} does not exist.`);
	}
}

const writeNewParams = () => {
	if (fname !== undefined) {
		data = JSON.stringify(newParamMsgs, null, 2);
		fs.writeFile(fname, data, err => {
			if (err) throw err;
			console.log(`\nNew messages written to file ${fname}!\n`);
		});
	}
}				


class yamMsg {

	constructor(cmdKey, newCmdStr) {
		this._cmd = this.findCmd(cmdKey, newCmdStr);
		if (this.msgType == 'new') {
			writeNewParams();
		}
	}

	findCmd(aKey, aCmdStr) {
		let foundCmd = yamParamMsgs[aKey];
		this.msgType = 'new';
		
		if (foundCmd !== undefined) {
			this.msgType = 'main';
			return foundCmd;
		
		} else if ((foundCmd = otherParamMsgs[aKey]) !== undefined) {
			this.msgType = 'other';
			return foundCmd
		
		} else {
			if ((foundCmd = newParamMsgs[aKey]) !== undefined) {
				if (foundCmd.Command !== aCmdStr) {
					foundCmd.CommandStr = aCmdStr;
				}
				return foundCmd;		
			} else {
				newParamMsgs[aKey] = {
					"CommandStr": aCmdStr,
					"MaxCh":      0,
					"MinVal":     0,
					"MaxVal":     0,
					"DefVal":     0,
					"Command":    aKey,
					"ChType":     "",
					"ValType":    "",
					"Hide":       false
				}
				return newParamMsgs[aKey];
			}
		}
	}

	
	get cmdStr() {
		if (this._cmd !== undefined) {
			return this._cmd.CommandStr;
		}
	}
	set cmdStr(value) {
		if (this._cmd !== undefined) {
			this._cmd.CommandStr = value;
		}
	}

	get maxCh() {
		if (this._cmd !== undefined) {
			return this._cmd.MaxCh;
		}
	}
	set maxCh(value) {
		if (this._cmd !== undefined) {
			this._cmd.MaxCh = value;
		}
	}

	get maxVal() {
		if (this._cmd !== undefined) {
			return this._cmd.MaxVal;
		}
	}
	set maxVal(value) {
		if (this._cmd !== undefined) {
			this._cmd.MaxVal = value;
		}
	}

	get minVal() {
		if (this._cmd !== undefined) {
			return this._cmd.MinVal;
		}
	}
	set minVal(value) {
		if (this._cmd !== undefined) {
			this._cmd.MinVal = value;
		}
	}

	get defVal() {
		if (this._cmd !== undefined) {
			return this._cmd.DefVal;
		}
	}
	set defVal(value) {
		if (this._cmd !== undefined) {
			this._cmd.DefVal = value;
		}
	}
	
	get chType() {
		if (this._cmd !== undefined) {
			return this._cmd.ChType;
		}
	}
	set chType(value) {
		if (this._cmd !== undefined) {
			this._cmd.ChType = value;
		}
	}

	get valType() {
		if (this._cmd !== undefined) {
			return this._cmd.ValType;
		}
	}
	set valType(value) {
		if (this._cmd !== undefined) {
			this._cmd.ValType = value;
		}
	}

	get hide() {
		if (this._cmd !== undefined) {
			return this._cmd.Hide;
		}
	}
	set hide(value) {
		if (this._cmd !== undefined) {
			this._cmd.Hide = value;
		}
	}
}


class yamParamMsg extends yamMsg {
	
	constructor(msg, newMsgParams) {
		if (msg == undefined) {
			super(newMsgParams.cmdKey, newMsgParams.cmdStr)
			newMsgParams.len = (newMsgParams.len == undefined) ? 18 : newMsgParams.len
			msg = Buffer.concat([
				Buffer.from(CL_HEADER),
				Buffer.alloc(newMsgParams.len - CL_HEADER.length - 1, 0),
				Buffer.alloc(1, CL_TAIL)])
			this._msg   = msg;
			this.cmdKey = newMsgParams.cmdKey
			this.ch     = newMsgParams.ch
			this.val    = newMsgParams.val
		} else {

			let newCmdKey = msg.toString('hex', 5, 10).toUpperCase();
			let newCmdStr = newCmdKey;
			if (newMsgParams !== undefined) {
				newCmdKey = newMsgParams.cmdKey;
				newCmdStr = newMsgParams.cmdStr;
			}
			super(newCmdKey, newCmdStr);		
			this._msg = msg;
		}

		if (this.ch > this.maxCh) {
			this.maxCh = this.ch;
		}

		if (this.val > this.maxVal) {
			this.maxVal = this.val;
		}

	}


	get7Bit(start, length) {
		let tempVal = 0;
		if (start + length < this._msg.length) {
			for(let i = start; i < start + length; i++) {
				tempVal |= (this._msg[i] << (7 * (start + length - i - 1)));
			}
		}
		return tempVal;
	}

	set7Bit(value, start, length) {
		if (start + length < this._msg.length) {
			for(let i = start; i < start + length; i++) {
				this._msg[i] = (value >>> (7 * (start + length - i - 1))) & 0x7F;
			}
		}
	}


	get msg() {
		return this._msg;
	}

	get req() {
		let rm = Buffer.from(this.msg.slice(0, 13));
		rm[12] = CL_TAIL;
		rm[2] = 0x30; // Request
		return rm
	}

	get cmdKey() {
		return this._msg.toString('hex', 5, 10).toUpperCase();
	}
	set cmdKey(value) {
		for(let i = 0; i < 5; i++) {
			this._msg[i + 5] = parseInt(value.slice(i * 2, (i * 2) + 2),16);
		}
	}

	get ch() {
		return this.get7Bit(10, 2);
	}
	set ch(value) {
		this.set7Bit(value, 10, 2);
	}

	get val() {
		let tempVal = this.get7Bit(12, 5);
		if (this.msgType == 'main' && this.valType == 'bool') {
			return (tempVal == 1); // True or False
		} else {
			return tempVal;
		}
	}
	set val(value) {
		let tempVal;
		switch(this.valType) {
			case 'bool':
				tempVal = (value) ? 1 : 0; // True or False
				break;
			case 'ch':
				tempVal = value;
				break;
			default:
				tempVal = value;
		}
		this.set7Bit(tempVal, 12, 5);
	}
}


class yamLibMsg extends yamParamMsg {

	constructor(msg, newMsgParams) {
		newMsgParams.len = 27;
		super(msg, newMsgParams);
	}

	get cmdKey() {
		return this._msg.toString('ascii', 6, 22)
	}
	set cmdKey(value) {
		this._msg.write(value, 6, 22);
	}

	get val() {
		return this.get7Bit(22, 2);
	}
	set val(value) {
		this.set7Bit(value, 22, 2);
	}

	get ch() {
		return this.get7Bit(24, 2) + 1;
	}
	set ch(value) {
		this.set7Bit(value - 1, 24, 2);
	}
}

newParamMsg = (newCmd, newCmdStr, newCh, newVal) => {
	let newParam = undefined;
	let newParamVals = {cmdKey: newCmd, cmdStr: newCmdStr, ch: newCh, val: newVal}

	if (newCmd !== null && newCmd !== undefined && newCmd.length == 10) { 					// Parameter Message
		newParam = new yamParamMsg(undefined, newParamVals);
	} else if (newCmd !== null && newCmd !== undefined && newCmd.length == 16) { 			// Lib Message
		newParam = new yamLibMsg(undefined, newParamVals);
	}

	return newParam;
}


todB = (intVal) => {
	let dBVal = 0;
	switch(true) {
		case (intVal == 0):
			return '-Inf dB';
		case (intVal < 16):
			dBVal = (intVal - 1) * 3 - 138;
			break;
		case (intVal < 34):
			dBVal = (intVal - 16) - 95;
			break;
		case (intVal < 224):
			dBVal = ((intVal - 34) * 0.2 - 77.8);
			break;
		case (intVal < 424):
			dBVal = ((intVal - 224) * 0.1 - 39.9);
			break;
		case (intVal < 1024):
			dBVal = ((intVal - 424) * 0.05 - 19.95)
			break;
		default:
			return '#.##'
	}
	return `${dBVal.toFixed(2)}dB`;
}

module.exports = {setFName, getMsgs, yamMsg, yamParamMsg, yamLibMsg, todB, newParamMsg}