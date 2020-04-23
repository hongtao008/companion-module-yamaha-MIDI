const shortid = require('shortid');

module.exports = {

    createPresets() {
       this.setPresetDefinitions([{
            category:    'Macros',
            label:       'Create Macro',
            bank: {
                style:   'png',
                text:    'Record MIDI Macro',
                png64:   this.ICON_REC_INACTIVE,
                pngalignment: 'center:center',
                latch:   false,
                size:    'auto',
                color:   this.rgb(255,255,255),
                bgcolor: this.rgb(0,0,0)
            },
            actions:         [{action: 'macroRec'}], 
            release_actions: [{action: 'macroRecLatch'}],
            feedbacks:       [{type:   'macroRec'}]
        }]);
    },


    // Add a command to a Macro Preset
    addToMacro(m) {

        let foundActionIdx = -1;

        // Check for new value on existing action
        let macroActions   = this.macro.actions;

        if (macroActions !== undefined) {
            if (m.msgType == 'main') {  // Normal actions
                foundActionIdx = macroActions.findIndex(act => (
                    act.action            == m.cmdKey && 
                    act.options.yamMIDIch == m.ch
                ));         
            } else {                    // Other, less used actions
                foundActionIdx = macroActions.findIndex(act => (
                    act.options.yamMIDIcmd == m.cmdKey && 
                    act.options.yamMIDIch  == m.ch
                ));
            }              
        }
        
        if(foundActionIdx == -1) {
            macroActions.push([]);
            foundActionIdx = macroActions.length - 1;
        }

        if (m.msgType == 'main') {
            macroActions[foundActionIdx] = {action: m.cmdKey, options: {yamMIDIch: m.ch, yamMIDIval: m.val}};     
        } else if (m.msgType == 'other') {
            macroActions[foundActionIdx] = {action: 'otherYamParamMsg', options: {yamMIDIcmd: m.cmdKey, yamMIDIch: m.ch, yamMIDIval: m.val}};
        } else {
            macroActions[foundActionIdx] = {action: 'newYamParamMsg', options: {yamMIDIcmdStr: m.cmdStr, yamMIDIcmd: m.cmdKey, yamMIDIch: m.ch, yamMIDIval: m.val}}; 
        }
    },

    dropMacro(preset, pgBk) {
        
        preset.feedbacks = JSON.parse(JSON.stringify(preset.actions));
       
        if (preset.actions !== undefined) {
            for (var i = 0; i < preset.actions.length; ++i) {
                preset.actions[i].id        = shortid.generate();
                preset.actions[i].instance  = this.id;
                preset.actions[i].label     = this.id + ':' + preset.actions[i].action;

                if (this.macroMode == 'latch' && (preset.actions[i].options.yamMIDIval == true || preset.actions[i].options.yamMIDIval == false)) {
                    if (preset.release_actions == undefined) {
                        preset.release_actions = [];
                    }
                    preset.release_actions.push(JSON.parse(JSON.stringify(preset.actions[i])));
                    let lastRelAct = preset.release_actions[preset.release_actions.length - 1];                        
                    lastRelAct.id                 = shortid.generate();
                    lastRelAct.options.yamMIDIval = !lastRelAct.options.yamMIDIval;
                }

                preset.feedbacks[i].id          = shortid.generate();
                preset.feedbacks[i].instance_id = this.id;
                preset.feedbacks[i].type        = preset.actions[i].action;
                delete preset.feedbacks[i].action;
            }
        } else {
            preset.actions = [];
        }

        preset.config = preset.bank
        delete preset.bank
        this.system.emit('import_bank', pgBk.page, pgBk.bank, preset);
        
    },

    macroAction(action) {

        if (action.action == 'macroRec') {
            if (this.macroMode == 'stopped') {
                this.macroCount++;
                this.macro = {
                    category:  'Macros',
                    label:     `Macro ${this.macroCount}`,
                    bank: {
                        style:  'text',
                        text:   `Macro ${this.macroCount}`,
                        size:   'auto',
                        color:   this.rgb(255,255,255),
                        bgcolor: this.rgb(0,0,0)
                    },
                    actions: []
                };
                this.macroMode = 'one-shot';
                this.macroPgBk = this.getActionPgBk(action.id);
                this.latchTimer = setTimeout(() => {
                    this.macro.bank.latch = true;
                    this.macroMode = 'latch';
                    this.checkFeedbacks('macroRec');
                }, 500);
            } else {
               if (this.macro.actions.length > 0) {
                    this.dropMacro(this.macro, this.macroPgBk);
                } else {
                    this.macroCount--;
                }
                this.macroMode = 'stopped';
            }
        } else if (action.action == 'macroRecLatch' && this.macroMode == 'one-shot') {
            clearTimeout(this.latchTimer);
        }

        this.checkFeedbacks('macroRec');

    },

    getActionPgBk(id) {
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

}
