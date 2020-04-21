module.exports = {

    getChNames(tableNum) {
        this.chTable = [];
        
        switch(tableNum) {
            case 1:
                this.makeLabel(0, 0, 71, "INPUT");
                this.makeStLabel(72, 0, 7, "ST INPUT");
                break;
            case 2:
                this.makeLabel(0, 0, 23, "MIX");
                break;
            case 3:
                this.makeLabel(0, 0, 7, "MATRIX");
                break;
            case 4:
                this.chTable.push({id: 0, label: 'STEREO L'});
                this.chTable.push({id: 1, label: 'STEREO R'});
                this.chTable.push({id: 2, label: 'MONO'});
                break;
            case 7:
                this.makeLabel(0, 0, 15, "DCA");
                break;
            case 23: // Select
                this.makeLabel(0, 0, 71, "INPUT");
                this.makeStLabel(72, 0, 7, "ST INPUT");
                this.makeLabel(88, 0, 23, "MIX");
                this.makeLabel(112, 0, 7, "MATRIX");
                this.chTable.push({id: 120, label: 'STEREO L'});
                this.chTable.push({id: 121, label: 'STEREO R'});
                this.chTable.push({id: 122, label: 'MONO'});
                break;
            case 100: // Library Recall
                this.makeLabel(0, 0, 71, "INPUT");
                this.makeStLabel(72, 0, 7, "ST INPUT");
                this.makeLabel(257, 0, 23, "MIX");
                this.makeLabel(513, 0, 7, "MATRIX");
                this.chTable.push({id: 1025, label: 'STEREO L'});
                this.chTable.push({id: 1026, label: 'STEREO R'});
                this.chTable.push({id: 1027, label: 'MONO'});
        }
    
        return this.chTable;
    },

    makeLabel(start, min, max, labelStr) {
        let thisLabel = '';
        for (let i = min; i <= max; i++) {
            thisLabel = labelStr + ' ' + `${i + 1}`.padStart(2, '0')
            this.chTable.push({id: i + start, label: thisLabel});
        }
    },

    makeStLabel(start, min, max, labelStr) {
        let thisLabel = '';
        for (let i = min; i <= max; i++) {
            thisLabel = labelStr + ` ${i + 1}`;
            this.chTable.push({id: i * 2 + start, label: thisLabel + 'L'});
            this.chTable.push({id: i * 2 + start + 1, label: thisLabel + 'R'});
        }
    }

}