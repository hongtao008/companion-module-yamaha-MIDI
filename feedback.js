// Handle the Feedbacks
handleFeedback = (inst, feedback, bank) => {
    let options = feedback.options;

console.log(feedback);

    switch (feedback.type) {
        case 'macroRecStart':
            if (options.on == inst.macroRec && inst.macroPgBk !== undefined && feedbacks[inst.macroPgBk.page][inst.macroPgBk.bank][0].id == feedback.id) {
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

    if (inst.dataStore[cmdKeyToFind] !== undefined &&
        inst.dataStore[cmdKeyToFind][options.yamMIDIch] == options.yamMIDIval) {
        return {color: options.fg, bgcolor: options.bg};
    }
 
    return;
}

pollMIDI = (inst) => {
    let allFeedbacks = inst.getAllFeedbacks();
    for (let fb in allFeedbacks) {
        let thisFB = allFeedbacks[fb];
        let cmd = yamaha.newParamMsg(thisFB.type, thisFB.label, thisFB.options.yamMIDIch, thisFB.options.yamMIDIval)

        if (cmd !== undefined) {
           inst.logMsg(cmd, 'Req ');
            if (inst.socket !== undefined && (inst.socket.connected || inst.socket.writable)) {
                inst.socket.write(cmd.req); 	// send it
            } else {
                inst.log('info', `Socket not connected :(`);
            }
        } 
    }
}

module.exports = {handleFeedback, pollMIDI}
