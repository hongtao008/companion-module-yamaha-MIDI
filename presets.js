const actions = require('./actions.js');

const createPresets = (inst) => {
    inst.midiPresets = [{
        category:    'Macros',
        label:       'Create Macro',
        bank: {
            style:   'text',
            text:    'Record MIDI Macro',
            latch:   true,
            size:    'auto',
            color:   inst.rgb(255,255,255),
            bgcolor: inst.rgb(0,0,0)
        },
        actions:         [{action: 'macroRecStart'}],
        release_actions: [{action: 'macroRecStop'}],
        feedbacks:       [{type:   'macroRecStart', options: {on: true}}]
    }];

    inst.setPresetDefinitions(inst.midiPresets);
}


// Add a command to a Macro Preset
const addToMacro = (inst, m) => {

    let foundActionIdx = -1;

    // Check for new value on existing action
    let midiActions = inst.midiPresets[inst.midiPresets.length - 1].actions; // [inst.midiPresets.length - 1] is the Current Macro
    if (midiActions !== undefined) {
        if (m.mainMsg) { // Normal actions
            foundActionIdx = midiActions.findIndex(act => (
                act.action            == m.cmdKey && 
                act.options.yamMIDIch == m.ch
            ));         
        } else { // Other, less used actions
            foundActionIdx = midiActions.findIndex(act => (
                act.options.yamMIDIcmd == m.cmdKey && 
                act.options.yamMIDIch  == m.ch
            ));
        }              
    }
    
    if(foundActionIdx == -1) {
        midiActions.push([]);
        foundActionIdx = midiActions.length - 1;
    }

    if (m.mainMsg) {
        midiActions[foundActionIdx] = {action: m.cmdKey, options: {yamMIDIch: m.ch, yamMIDIval: m.val}};     
    } else {
        midiActions[foundActionIdx] = {action: 'otherYamParamMsg', options: {yamMIDIcmd: m.cmdKey, yamMIDIch: m.ch, yamMIDIval: m.val}};
    }
}


const macroAction = (inst, action) => {

    if (action == 'macroRecStart' && inst.macroRec == false) {
        inst.macroCount++;
        inst.midiPresets.push({
            category:  'Macros',
            label:     `Macro ${inst.macroCount}`,
            bank: {
                style:  'text',
                text:   `Macro ${inst.macroCount}`,
                size:   'auto',
                color:   inst.rgb(255,255,255),
                bgcolor: inst.rgb(0,0,0)
            },
            actions: []
        });
        inst.macroRec = true;

    } else if (action == 'macroRecStop') {
        inst.macroRec = false;
        if (inst.midiPresets[inst.midiPresets.length - 1].actions.length > 0) {
            inst.setPresetDefinitions(inst.midiPresets);
        } else {
            inst.midiPresets.pop();
            inst.macroCount--;
        }
    }

    inst.checkFeedbacks('macroRecStart');
}
module.exports = {createPresets, addToMacro, macroAction};