

(function(sandbox) {
    function regex_escape (text) {
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    }

    sandbox.string_indexOf = function(str, startPos) {
        var reg = new RegExp(".*"+regex_escape(str)+".*");
        startPos = startPos | 0;

        if (reg.test(this)) {
            var T = JRR$.readInput("", true);
            var S1 = JRR$.readInput("",true);
            var S2 = JRR$.readInput("",true);
            var pos = JRR$.readInput(0,true);

            if (startPos < 0) {
                pos = 0;
            } else if (startPos >= this.length) {
                pos = this.length;
            } else {
                pos = startPos;
            }

            JRR$.addAxiom(pos === T.length);
            JRR$.addAxiom(this === (T + S1 + str + S2));
            JRR$.addAxiom(!reg.test(S1));
            return pos + S1.length;
        } else {
            return -1;
        }
    };

    sandbox. string_lastIndexOf = function(str, startPos) {
        var reg = new RegExp(".*"+regex_escape(str)+".*");

        if (arguments.length <= 1) {
            startPos = this.length - 1;
        }

        if (reg.test(this)) {
            var T = JRR$.readInput("", true);
            var S1 = JRR$.readInput("",true);
            var S2 = JRR$.readInput("",true);
            var pos = JRR$.readInput(0,true);

            if (startPos < 0){
                pos = -1;
            } else if (startPos >= this.length) {
                pos = this.length-1;
            } else {
                pos = startPos;
            }
            JRR$.addAxiom(pos === this.length - T.length -1);
            JRR$.addAxiom(this === (S1 + str + S2 + T));
            JRR$.addAxiom(!reg.test(S2));
            return S1.length;
        } else {
            return -1;
        }
    };


    sandbox.string_charCodeAt = function(idx) {
        var ret = JRR$.readInput(0,true);
        var c = this.substring(idx, idx + 1);

        if (c !== ''){
            JRR$.addAxiom(c === String.fromCharCode(ret));
        } else {
            JRR$.addAxiom(ret === -100000);
        } // @todo should be NaN, but no way to model NaN.

        return ret;

    }

    sandbox.string_substring = function(start, end) {

        if (arguments.length <= 1) {
            end = this.length;
        }

        var ret = JRR$.readInput("",true);
        var S1 = JRR$.readInput("",true);
        var S2 = JRR$.readInput("",true);
        var s = JRR$.readInput(0,true);
        var e = JRR$.readInput(0,true);

        if (start < 0) {
            s = 0;
        } else if (start >= this.length) {
            s = this.length;
        } else {
            s = start;
        }
        if (end < 0) {
            e = 0;
        } else if (end >= this.length) {
            e = this.length;
        } else {
            e = end;
        }
        if (s <= e) {
            JRR$.addAxiom(this === S1 + ret + S2);
            JRR$.addAxiom(s === S1.length);
            JRR$.addAxiom(e - s === ret.length);
        } else {
            JRR$.addAxiom(ret === "");
        }
        return ret;
    }

    sandbox.string_substr = function(start, length) {

        var ret = JRR$.readInput("",true);

        var S1 = JRR$.readInput("",true);
        var S2 = JRR$.readInput("",true);
        var s = JRR$.readInput(0,true);
        var l = JRR$.readInput(0,true);

        if (start >= this.length) {
            s = this.length;
        } else if (start >= 0 && start < this.length) {
            s = start;
        } else if (start < 0 && start >= - this.length) {
            s = this.length + start;
        } else {
            s = 0;
        }
        if (length < 0){
            l = 0;
        } else if (length > this.length - s) {
            l = this.length - s;
        } else {
            l = length;
        }
        JRR$.addAxiom(this === S1 + ret + S2);
        JRR$.addAxiom(s === S1.length);
        JRR$.addAxiom(l === ret.length);

        return ret;
    };


    sandbox.string_charAt = function(start) {
        // assuming start >= 0 and end >= start and end === undefined or end <= this.length

        var ret = JRR$.readInput("",true);
        var S1 = JRR$.readInput("",true);
        var S2 = JRR$.readInput("",true);

        if (start < 0) {
            JRR$.addAxiom(ret === "");
        } else if (start >= this.length) {
            JRR$.addAxiom(ret === "");
        } else {
            JRR$.addAxiom(this === S1 + ret + S2);
            JRR$.addAxiom(start === S1.length);
            JRR$.addAxiom(ret.length === 1);

        }
        return ret;
    }


    sandbox.builtin_parseInt = function(s) {
        var ret = JRR$.readInput(0,true);
        JRR$.addAxiom(ret === s * 1);
        return ret;
    }

    sandbox.object_getField = function(base, offset) {
        var ret = JRR$.readInput(0,true);

        JRR$.addAxiom("begin");
        for (var i in base) {
            JRR$.addAxiom("begin");
            JRR$.addAxiom(i === offset+"");
            JRR$.addAxiom(ret === base[i]);
            JRR$.addAxiom("and");
        }
        JRR$.addAxiom("or");

        return ret;

    }

}(module.exports));
