// From http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript

(function($)
{
    $.QueryString = (function(a) {
        if (a == "") return {};
        let b = {};
        for (let i = 0; i < a.length; ++i)
        {
            const p=a[i].split('=');
            if (p.length != 2) continue;
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return b;
    })(window.location.search.substr(1).split('&'))
})(jQuery);

/**
 * Log text including the calling function name
 * @param level  Override to print Nth function name in stack
 */
function fun(text, level)
{
    if (text == null)
        text = "";

    let func = arguments.callee.caller;
    while (func && level > 1) {
        func = func.arguments.callee.caller;
        level--;
    }
    const name = func?.name || "?";
    console.log("PURP::" + name + ": " + text)
}

// Like fun(), but log JSON objects
function funj(j, varname) {
    let string = "";
    if (varname)
        string = varname + "=";
    string += JSON.stringify(j);

    fun(string, 2);
}
