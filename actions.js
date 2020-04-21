const yamaha = require('./yamaha');
const tables = require('./tables');

module.exports = {

    // Create a single action
    createAction(msg) {
        
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
                return tables.getChNames(ct);
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
                    max:      (msg.MaxVal !== 0) ? msg.MaxVal : 0xFFFFFFFF,
                    default:  msg.DefVal,
                    required: true
                });
        }

        return newAction;
        
    },



    // Create the Actions & Feedbacks
    createActions() {
        
        let commands  = {};
        let feedbacks = {};
        let yamMsgs   = yamaha.getMsgs('yamaha');
        let othMsgs   = yamaha.getMsgs('other');
        let othCmds   = [];

//    this.log('info','******** COMMAND LIST *********');

        for(const msg in yamMsgs) {
            let thisMsg = yamMsgs[msg];
            if (!thisMsg.hide) {
                commands[msg] = this.createAction(thisMsg);
    
//    this.log('info',`<font face="courier">${thisMsg.CommandStr}</font>`);

                feedbacks[msg] = JSON.parse(JSON.stringify(commands[msg])); // Clone the Actions to a matching feedback
                feedbacks[msg].options.push(
                    {type: 'colorpicker', label: 'Color', id: 'fg', default: this.rgb(0,0,0)},
                    {type: 'colorpicker', label: 'Background', id: 'bg', default: this.rgb(255,0,0)}
                )
            }
        }

//    this.log('info','***** END OF COMMAND LIST *****')
    
        for (const msg in othMsgs) {
            let thisMsg = othMsgs[msg];
            if (!thisMsg.hide) {
                othCmds.push({id: thisMsg.Command, label: thisMsg.CommandStr})         
            }
        }

        commands['otherYamParamMsg'] = {
            label:   'Other Yamaha MIDI Message',
            tooltip: 'Additional Message',
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
                min:      0,
                max:      0xFFFFFFFF,
                default:  0,
                required: true
            },
            {
                type:    'number',
                label:   'Value',
                id:      'yamMIDIval',
                tooltip: 'Choose a Value',
                min:      0,
                max:      0xFFFFFFFF,
                default:  0,
                required: true
            }]
        }

        // Add a command type for any new unidentified commands that need naming.
        commands['newYamParamMsg'] = {
            label:   'NEW Yamaha MIDI Message',
            tooltip: 'Other Message, not listed',
            options: [{
                type:    'textinput',
                label:   'Command',
                id:      'yamMIDIcmdStr',
                tooltip: 'Enter a name for this new command',
                default: 'New Command'
            },
            {
                type:    'textinput',
                label:   'Message Hex',
                id:      'yamMIDIcmd',
                tooltip: 'The Hex code',
                default: '0000000000',
                regex:   '/[0-9A-Fa-f]/g'
            },
            {
                type:    'number',
                label:   'Channel',
                id:      'yamMIDIch',
                tooltip: 'Choose a Channel',
                min:      0,
                max:      0xFFFFFFFF,
                default:  0,
                required: true
            },
            {
                type:    'number',
                label:   'Value',
                id:      'yamMIDIval',
                tooltip: 'Choose a Value',
                min:      0,
                max:      0xFFFFFFFF,
                default:  0,
                required: true
            }]
        }
        
        commands['macroRecStart']  = {label: 'RECORD MIDI Macro'};
        commands['macroRecStop']   = {label: 'STOP Recording Macro'};

        feedbacks['macroRecStart'] = {label: 'Is Macro Recording?', options: [
            {type: 'checkbox',    label: 'YES',        id: 'on', default: true},
            {type: 'colorpicker', label: 'Color',      id: 'fg', default: this.rgb(0, 0, 0)},
            {type: 'colorpicker', label: 'Background', id: 'bg', default: this.rgb(255, 0, 0)}
        ]};
    
        this.setActions(commands);
        this.setFeedbackDefinitions(feedbacks);
    },



    doAction(action) {

        let cmd = undefined;

        if (typeof(action.action) == 'string' && !action.action.startsWith('macro')) {

            if (action.action == 'otherYamParamMsg') {
                cmd = yamaha.newParamMsg(action.options.yamMIDIcmd, action.action, action.options.yamMIDIch, action.options.yamMIDIval);
            } else if (action.action == 'newYamParamMsg') {
                cmd = yamaha.newParamMsg(action.options.yamMIDIcmd, action.options.yamMIDIcmdStr, action.options.yamMIDIch, action.options.yamMIDIval);
            } else {
                cmd = yamaha.newParamMsg(action.action, action.label, action.options.yamMIDIch, action.options.yamMIDIval);
            }
            if (cmd !== undefined) {

                this.logMsg(cmd, 'Send');
                console.log(`sending: ${fmtHex(cmd.msg)}`)
                
                if (this.socket !== undefined && (this.socket.connected || this.socket.writable)) {
                    this.socket.write(cmd.msg); 					// send it
                }
                else {
                    this.log('info', `Socket not connected :(`);
                }
            } 
        } else {
            this.macroAction(action);       
        }
    }

}