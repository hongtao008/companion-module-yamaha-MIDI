const actions = require('./actions.js');
const shortid = require('shortid');

const createPresets = (inst) => {
    inst.midiPresets = [{
        category:    'Macros',
        label:       'Create Macro',
        bank: {
            style:   'png',
            text:    'Record MIDI Macro',
            png64:   inst.ICON_REC_INACTIVE,
            pngalignment: 'center:center',
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
        if (m.msgType == 'main') { // Normal actions
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

    if (m.msgType == 'main') {
        midiActions[foundActionIdx] = {action: m.cmdKey, options: {yamMIDIch: m.ch, yamMIDIval: m.val}};     
    } else if (m.msgType == 'other') {
        midiActions[foundActionIdx] = {action: 'otherYamParamMsg', options: {yamMIDIcmd: m.cmdKey, yamMIDIch: m.ch, yamMIDIval: m.val}};
    } else {
        midiActions[foundActionIdx] = {action: 'newYamParamMsg', options: {yamMIDIcmdStr: m.cmdStr, yamMIDIcmd: m.cmdKey, yamMIDIch: m.ch, yamMIDIval: m.val}}; 
    }
}

const dropMacro = (inst, preset, pgBk) => {

    if (preset.actions !== undefined) {
        for (var i = 0; i < preset.actions.length; ++i) {
            preset.actions[i].id = shortid.generate();
            preset.actions[i].instance = inst.id;
            preset.actions[i].label = inst.id + ':' + preset.actions[i].action;
        }
    } else {
        preset.actions = [];
    }

    preset.config = preset.bank
    inst.system.emit('import_bank', pgBk.page, pgBk.bank, preset);
    
//    inst.system.emit('import_bank', pgBk.page, pgBk.bank, preset, () => {
//        inst.system.emit('preset_drop:result', null, 'ok');
//    });
}

const macroAction = (inst, action) => {

    if (action.action == 'macroRecStart' && inst.macroRec == false) {
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
        inst.macroPgBk = getActionPgBk(action.id);

    } else if (action.action == 'macroRecStop') {
        inst.macroRec = false;
        
        let curMacro = inst.midiPresets[inst.midiPresets.length - 1];

        if (curMacro.actions.length > 0) {
            inst.setPresetDefinitions(inst.midiPresets);
            dropMacro(inst, curMacro, inst.macroPgBk);
            //inst.macroPgBk = {};

        } else {
            inst.midiPresets.pop();
            inst.macroCount--;
        }
    }

    inst.checkFeedbacks('macroRecStart');
}

getActionPgBk = (id) => {
    for (let pg in bank_actions)
        for (let bk in bank_actions[pg])
            for (let act in bank_actions[pg][bk])
                if (bank_actions[pg][bk][act]['id'] == id) {
                    return {page: pg, bank: bk}
                }
    for (let pg in bank_release_actions)
        for (let bk in bank_release_actions[pg])
            for (let act in bank_release_actions[pg][bk])
                if (bank_release_actions[pg][bk][act]['id'] == id) {
                    return {page: pg, bank: bk}
                }            
}



module.exports = {createPresets, addToMacro, macroAction};