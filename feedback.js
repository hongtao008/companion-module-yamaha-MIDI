module.exports = {

    // Handle the Feedbacks
    handleFeedback(feedback, bank) {
        let options = feedback.options;

        switch (feedback.type) {
            case 'macroRec':
                let savedFb = feedbacks[this.macroPgBk.page][this.macroPgBk.bank]
                if (this.macroPgBk !== undefined && savedFb.length > 0 && savedFb[0].id == feedback.id) {
                    if (this.macroMode == 'one-shot') {
                        return {color: this.rgb(0,0,0), bgcolor: this.rgb(255,0,0), text: 'REC'};
                    } else if (this.macroMode == 'latch') {
                        return {color: this.rgb(0,0,0), bgcolor: this.rgb(255,255,0), text: 'REC'};
                    }
                }
                return;
            case 'otherYamParamMsg':
            case 'newYamParamMsg':
                cmdKeyToFind = options.yamMIDIcmd;
                break;
            default:
                cmdKeyToFind = feedback.type;
        }

        if (this.dataStore[cmdKeyToFind] !== undefined &&
            this.dataStore[cmdKeyToFind][options.yamMIDIch] == options.yamMIDIval) {
            return {color: options.fg, bgcolor: options.bg};
        }
    
        return;
    },

    pollMIDI() {
        let allFeedbacks = this.getAllFeedbacks();
        for (let fb in allFeedbacks) {
            let thisFB = allFeedbacks[fb];
            if (!thisFB.type.startsWith('macro')) {
                let cmd = this.newParamMsg(thisFB.type, thisFB.label, thisFB.options.yamMIDIch, thisFB.options.yamMIDIval)

                if (cmd !== undefined) {
                this.logMsg(cmd, 'Req ');
                    if (this.socket !== undefined && (this.socket.connected || this.socket.writable)) {
                        this.socket.write(cmd.req); 	// send it
                    } else {
                        this.log('info', `Socket not connected :(`);
                    }
                } 
            }
        }
    }

}