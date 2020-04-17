yamaha  = require('./yamaha.js');
presets = require('./presets.js');
tables = require('./tables.js');


// Create a single action
const createAction = (msg) => {
    
    let newAction = {};

    const x10Choices = () => {
        let theChoices = [];
        for(let i = msg.MinVal; i <= msg.MaxVal; i++) {
            theChoices.push({id: i, label: `${(i / 10).toFixed(1)}dB`});
        }
        return theChoices;
    }

    const x100Choices = () => {
        let theChoices = [];
        for(let i = msg.MinVal; i <= msg.MaxVal; i++) {
            theChoices.push({id: i, label: `${(i / 100).toFixed(2)}dB`});
        }
        return theChoices;
    }

    const dBChoices = () => {
        let theChoices = [];
        for(let i = msg.MaxVal; i >= msg.MinVal; i--) {
            theChoices.push({id: i, label: yamaha.todB(i)});
        }
        return theChoices;
    }

    let chChoices = (ct) => {
        if (ct == 0) {
            let chNames = [];
            for (let i = 0; i <= msg.MaxCh; i++) {
                chNames.push({id: i, label: i});
            }
            return chNames;
        } else {
            return getChNames(ct);
        }
    }

    newAction = {
        label:   msg.CommandStr,
        id:      msg.Command,
        tooltip: 'Yamaha MIDI SysEx Command',
        options: [{
            type:    'dropdown',
            label:   'Channel',
            id:      'yamMIDIch',
            tooltip: 'Choose a channel',
            default: 0,
            choices: chChoices(msg.ChType),
            minChoicesForSearch: 0
        }], 
    }
    
    switch(msg.ValType) {
        case 'scene':
            let sceneOption = {
                type:    'number',
                label:   'Scene',
                id:      'yamMIDIval',
                tooltip: 'Choose a Scene',
                min:      msg.MinVal,
                max:      msg.MaxVal,
                default:  msg.DefVal,
                required: true
            }
            if (msg.Command.slice(8, 13) == "SCENE") { // No channel option for scene recall
                newAction.options = [sceneOption];
            } else {
                newAction.options.push(sceneOption);
            }
            break;
        case 'ch':                  // No 2nd parameter if it's a select command
            newAction.options = [{
                type:    'dropdown',
                label:   'Channel',
                id:      'yamMIDIval',
                tooltip: 'Choose a channel',
                choices: chChoices(23),
                minChoicesForSearch: 0
            }];
            break;
        case 'bool':
            newAction.options.push({
                type:    'checkbox',
                label:   'On',
                id:      'yamMIDIval',
                tooltip: 'On or Off',
                required: true
                });
            break;
        case 'x10':
            newAction.options.push({
                type:    'dropdown',
                label:   'Value',
                id:      'yamMIDIval',
                tooltip: 'Choose a dB Value',
                default: msg.DefVal,
                choices: x10Choices(),
                minChoicesForSearch: 0
            });
            break;
        case 'x100':
            newAction.options.push({
                type:    'dropdown',
                label:   'Value',
                id:      'yamMIDIval',
                tooltip: 'Choose a dB Value',
                default: msg.DefVal,
                choices: x100Choices(),
                minChoicesForSearch: 0
            });
            break;
        case 'dB':
            newAction.options.push({
                type:    'dropdown',
                label:   'Value',
                id:      'yamMIDIval',
                tooltip: 'Choose a dB Value',
                default: msg.DefVal,
                choices: dBChoices(),
                minChoicesForSearch: 0
            });
            break;           
        default:
            newAction.options.push({
                type:    'number',
                label:   'Value',
                id:      'yamMIDIval',
                tooltip: 'Choose a Value',
                min:      msg.MinVal,
                max:      msg.MaxVal,
                default:  msg.DefVal,
                required: true
            });
    }

    return newAction;
    
}



// Create the Actions & Feedbacks
const createActions = (inst) => {
    
    let commands  = {};
    let feedbacks = {};
    let yamMsgs   = yamaha.getMsgs('yamaha');
    let othMsgs   = yamaha.getMsgs('other');
    let othCmds   = [];

inst.log('info','******** COMMAND LIST *********');

    for(const msg in yamMsgs) {
        let thisMsg = yamMsgs[msg];
        if (!thisMsg.hide) {
            commands[msg] = createAction(thisMsg);
 
inst.log('info',`<font face="courier">${thisMsg.CommandStr}</font>`);

            feedbacks[msg] = JSON.parse(JSON.stringify(commands[msg])); // Clone the Actions to a matching feedback
            feedbacks[msg].options.push(
                {type: 'colorpicker', label: 'Color', id: 'fg', default: inst.rgb(0,0,0)},
                {type: 'colorpicker', label: 'Background', id: 'bg', default: inst.rgb(255,0,0)}
            )
        }
    }

inst.log('info','***** END OF COMMAND LIST *****')
 
    for (const msg in othMsgs) {
        let thisMsg = othMsgs[msg];
        if (!thisMsg.hide) {
            othCmds.push({id: thisMsg.Command, label: thisMsg.CommandStr})         
        }
    }

    commands['otherYamParamMsg'] = {
        label:   'Other Yamaha MIDI Message',
        tooltip: 'Other Message, not listed',
        options: [{
            type:    'dropdown',
            label:   'Message Name',
            id:      'yamMIDIcmd',
            tooltip: 'Choose a Message',
            choices: othCmds,
            minChoicesForSearch: 0,
            tags:    true
        },
        {
            type:    'number',
            label:   'Channel',
            id:      'yamMIDIch',
            tooltip: 'Choose a Channel',
            default:  0,
            required: true
        },
        {
            type:    'number',
            label:   'Value',
            id:      'yamMIDIval',
            tooltip: 'Choose a Value',
            default:  0,
            required: true
        }]
    }


    commands['macroRecStart']  = {label: 'Record MIDI Macro'};
    commands['macroRecStop']   = {label: 'Stop Recording'};

    feedbacks['macroRecStart'] = {label: 'Macro is Recording', options: [
        {type: 'checkbox',    label: 'ON',         id: 'on', default: true},
        {type: 'colorpicker', label: 'Color',      id: 'fg', default: inst.rgb(0, 0, 0)},
        {type: 'colorpicker', label: 'Background', id: 'bg', default: inst.rgb(255, 0, 0)}
    ]};
/*
inst.log('info','******** COMMAND LIST *********');
Object.entries(commands).forEach(([key, value]) => inst.log('info',`<font face="courier">${value.label.padEnd(36, '\u00A0')} ${key}</font>`));
inst.log('info','***** END OF COMMAND LIST *****')
 */ 
    inst.setActions(commands);
    inst.setFeedbackDefinitions(feedbacks);
}



doAction = (inst, action) => {

    let cmd = undefined;

    if (typeof(action.action) == 'string' && !action.action.startsWith('macro')) {

        if (action.action == 'otherYamParamMsg') {
            cmd = yamaha.newParamMsg(action.options.yamMIDIcmd, action.action, action.options.yamMIDIch, action.options.yamMIDIval);
        } else {
            cmd = yamaha.newParamMsg(action.action, action.label, action.options.yamMIDIch, action.options.yamMIDIval);
        }
        if (cmd !== undefined) {

            inst.logMsg(cmd, 'Send');
            console.log(`sending: ${fmtHex(cmd.msg)}`)
            
            if (inst.socket !== undefined && (inst.socket.connected || inst.socket.writable)) {
                inst.socket.write(cmd.msg); 					// send it
            }
            else {
                inst.log('info', `Socket not connected :(`);
            }
        } 
    } else {

        presets.macroAction(inst, action.action);       
    }

}

module.exports = {createActions, createAction, doAction};