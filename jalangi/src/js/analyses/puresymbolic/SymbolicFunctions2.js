

(function(sandbox) {
    function regex_escape (text) {
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    }

    sandbox.string_indexOf = function(str, startPos) {
        var reg = new RegExp(".*"+regex_escape(str)+".*");
        var ret = JRR$.readInput(0,true);

        startPos = startPos | 0;

        JRR$.addAxiom("begin");
        JRR$.addAxiom("begin");
        var T = JRR$.readInput("", true);
        var S1 = JRR$.readInput("",true);
        var S2 = JRR$.readInput("",true);
        var pos = JRR$.readInput(0,true);

        JRR$.addAxiom("begin");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(startPos < this.length);
        JRR$.addAxiom(startPos >= 0);
        JRR$.addAxiom(pos === startPos);
        JRR$.addAxiom("and");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(startPos < 0);
        JRR$.addAxiom(pos === 0);
        JRR$.addAxiom("and");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(startPos >= this.length);
        JRR$.addAxiom(pos === this.length);
        JRR$.addAxiom("and");

        JRR$.addAxiom("or");


        JRR$.addAxiom(pos === T.length);
        JRR$.addAxiom(this === (T + S1 + str + S2));
        JRR$.addAxiom(ret === pos + S1.length);
        JRR$.addAxiom(!reg.test(S1));
        JRR$.addAxiom("and");


        JRR$.addAxiom("begin");
        JRR$.addAxiom(ret===-1);
        JRR$.addAxiom(!reg.test(this));
        JRR$.addAxiom("and");

        JRR$.addAxiom("or");
        return ret;
    }

    sandbox. string_lastIndexOf = function(str, startPos) {
        var reg = new RegExp(".*"+regex_escape(str)+".*");
        var ret = JRR$.readInput(0,true);

        if (arguments.length <= 1) {
            startPos = this.length - 1;
        }

        JRR$.addAxiom("begin");

        JRR$.addAxiom("begin");
        var T = JRR$.readInput("", true);
        var S1 = JRR$.readInput("",true);
        var S2 = JRR$.readInput("",true);
        var pos = JRR$.readInput(0,true);

        JRR$.addAxiom("begin");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(startPos < this.length);
        JRR$.addAxiom(startPos >= 0);
        JRR$.addAxiom(pos === startPos);
        JRR$.addAxiom("and");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(startPos < 0);
        JRR$.addAxiom(pos === -1);
        JRR$.addAxiom("and");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(startPos >= this.length);
        JRR$.addAxiom(pos === this.length-1);
        JRR$.addAxiom("and");

        JRR$.addAxiom("or");


        JRR$.addAxiom(pos === this.length - T.length -1);
        JRR$.addAxiom(this === (S1 + str + S2 + T));
        JRR$.addAxiom(ret === S1.length);
        JRR$.addAxiom(!reg.test(S2));
        JRR$.addAxiom("and");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(ret===-1);
        JRR$.addAxiom(!reg.test(this));
        JRR$.addAxiom("and");

        JRR$.addAxiom("or");
        return ret;
    }


    sandbox.string_charCodeAt = function(idx) {
        var ret = JRR$.readInput(0,true);
        var c = this.substring(idx, idx + 1);

        JRR$.addAxiom("begin");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(c !== '');
        JRR$.addAxiom(c === String.fromCharCode(ret));
        JRR$.addAxiom("and");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(c === '');
        JRR$.addAxiom(ret === -100000); // @todo should be NaN, but no way to model NaN.
        JRR$.addAxiom("and");

        JRR$.addAxiom("or");

        return ret;

    }

    sandbox.string_substring = function(start, end) {

        if (arguments.length <= 1) {
            end = this.length;
        }

        var ret = JRR$.readInput("",true);

        JRR$.addAxiom("begin");
        var S1 = JRR$.readInput("",true);
        var S2 = JRR$.readInput("",true);
        var s = JRR$.readInput(0,true);
        var e = JRR$.readInput(0,true);

        JRR$.addAxiom("begin");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(start >= 0);
        JRR$.addAxiom(start < this.length);
        JRR$.addAxiom(s === start);
        JRR$.addAxiom("and");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(start < 0);
        JRR$.addAxiom(s === 0);
        JRR$.addAxiom("and");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(start >= this.length);
        JRR$.addAxiom(s === this.length);
        JRR$.addAxiom("and");

        JRR$.addAxiom("or");

        JRR$.addAxiom("begin");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(end >= 0);
        JRR$.addAxiom(end < this.length);
        JRR$.addAxiom(e === end);
        JRR$.addAxiom("and");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(end < 0);
        JRR$.addAxiom(e === 0);
        JRR$.addAxiom("and");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(end >= this.length);
        JRR$.addAxiom(e === this.length);
        JRR$.addAxiom("and");


        JRR$.addAxiom("or");

        JRR$.addAxiom("begin");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(s <= e);
        JRR$.addAxiom(this === S1 + ret + S2);
        JRR$.addAxiom(s === S1.length);
        JRR$.addAxiom(e - s === ret.length);
        JRR$.addAxiom("and");


        JRR$.addAxiom("begin");
        JRR$.addAxiom(s > e);
        JRR$.addAxiom(ret === "");
        JRR$.addAxiom("and");

        JRR$.addAxiom("or");

        JRR$.addAxiom("and");

        return ret;
    }

    sandbox.string_substr = function(start, length) {

        var ret = JRR$.readInput("",true);

        JRR$.addAxiom("begin");
        var S1 = JRR$.readInput("",true);
        var S2 = JRR$.readInput("",true);
        var s = JRR$.readInput(0,true);
        var l = JRR$.readInput(0,true);

        JRR$.addAxiom("begin");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(start >= 0);
        JRR$.addAxiom(start < this.length);
        JRR$.addAxiom(s === start);
        JRR$.addAxiom("and");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(start >= this.length);
        JRR$.addAxiom(s === this.length);
        JRR$.addAxiom("and");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(start < 0);
        JRR$.addAxiom(start >= - this.length);
        JRR$.addAxiom(s === this.length + start);
        JRR$.addAxiom("and");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(start < -this.length);
        JRR$.addAxiom(s === 0);
        JRR$.addAxiom("and");

        JRR$.addAxiom("or");

        JRR$.addAxiom("begin");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(length >= 0);
        JRR$.addAxiom(length <= this.length - s);
        JRR$.addAxiom(l === length);
        JRR$.addAxiom("and");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(length < 0);
        JRR$.addAxiom(l === 0);
        JRR$.addAxiom("and");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(length > this.length - s);
        JRR$.addAxiom(l === this.length - s);
        JRR$.addAxiom("and");

        JRR$.addAxiom("or");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(this === S1 + ret + S2);
        JRR$.addAxiom(s === S1.length);
        JRR$.addAxiom(l === ret.length);
        JRR$.addAxiom("and");


        JRR$.addAxiom("and");

        return ret;
    }


    sandbox.string_charAt = function(start) {
        // assuming start >= 0 and end >= start and end === undefined or end <= this.length

        var ret = JRR$.readInput("",true);


        JRR$.addAxiom("begin");

        JRR$.addAxiom("begin");
        var S1 = JRR$.readInput("",true);
        var S2 = JRR$.readInput("",true);

        JRR$.addAxiom(start >= 0);
        JRR$.addAxiom(start < this.length);
        JRR$.addAxiom(this === S1 + ret + S2);
        JRR$.addAxiom(start === S1.length);
        JRR$.addAxiom(ret.length === 1);
        JRR$.addAxiom("and");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(start < 0);
        JRR$.addAxiom(ret === "");
        JRR$.addAxiom("and");

        JRR$.addAxiom("begin");
        JRR$.addAxiom(start >= this.length);
        JRR$.addAxiom(ret === "");
        JRR$.addAxiom("and");


        JRR$.addAxiom("or");


        return ret;
    }


    sandbox.builtin_parseInt = function(s) {
        var ret = JRR$.readInput(0,true);

        JRR$.addAxiom("begin");
        JRR$.addAxiom(ret === s * 1);
        JRR$.addAxiom("and");

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
