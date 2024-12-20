/*
 * Copyright 2013 Samsung Information Systems America, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Author: Koushik Sen

global.test = function(f) {
    var fs = require('fs');
    var TEST_FILE_NAME = process.cwd()+'/jalangi_tests';

    try {
        if (JRR$) {
            var args = [];
            var len = f.length;
            var str = "global."+f.name+"(";
            for (var i = 0; i<len ; ++i) {
                args[i] = JRR$.readInput(arguments[i+1]);
                if (i!==0) {
                    str += ",";
                }
                str += JSON.stringify(args[i]);
            }
            str += ");";
            if (process.env.JALANGI_MODE === 'record') {
                var contents = "// Tests generated by Jalangi\n\n";
                try {
                    contents = fs.readFileSync(TEST_FILE_NAME+".js","utf8");
                } catch(e) {

                }
                //contents += 'console.log("Running "+'+JSON.stringify(str)+');\n';
                contents += str+"\n\n";
                fs.writeFileSync(TEST_FILE_NAME+".js",contents, "utf8");
            }
            if (len === 1) {
                f(args[0]);
            } else if (len === 2) {
                f(args[0], args[1]);
            } else if (len === 3) {
                f(args[0], args[1], args[2]);
            } else if (len === 4) {
                f(args[0], args[1], args[2], args[3]);
            } else if (len === 5) {
                f(args[0], args[1], args[2], args[3], args[4]);
            }
        }
    } catch (e) {
        require(TEST_FILE_NAME);
    }
};

