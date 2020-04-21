module.exports = {

    // Handle the Feedbacks
    handleFeedback(feedback, bank) {
        let options = feedback.options;

        switch (feedback.type) {
            case 'macroRecStart':
                if (options.on == this.macroRec && this.macroPgBk !== undefined && feedbacks[this.macroPgBk.page][this.macroPgBk.bank][0].id == feedback.id) {
                    return {color: options.fg, bgcolor: options.bg};
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