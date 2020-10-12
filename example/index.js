import { upload, post } from "./ajax.js";

var res = document.querySelector("#result");
var res = document.querySelector("#result");
res.value = '[["1","2","3"],["a","b","c"]]';

window.upload = function () {
    var file = document.querySelector('input[name="file"]');
    res.innerHTML = "";
    upload("/upload", {
        files: file
    }).then(function (data) {
        console.log(data);
        res.value = JSON.stringify(data);
    }).catch(function (err) {
        console.error(err);
    });
}


window.download = function () {
    var filename = "test.xls";
    fetch("/download", {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            "Content-type": "application/json"
            // "Content-type": "application/x-www-form-urlencoded"
        },
        // body: "filename="+filename+"&data="+res.value
        body: JSON.stringify({ filename: filename, data: res.value })
    }).then(res => {
        if (res.ok) {
            return res.blob();
        } else {
            res.text().then(res => console.error(res));
            return false;
        }
    }).then(blob => {
        if (blob) {
            var a = document.createElement('a');
            var url = window.URL.createObjectURL(blob);
            a.href = url;
            a.download = filename;
            document.body.append(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        }
    }).catch(err => {
        console.log(err);
    });
}

window.debug = true;