export function parseDate(data: any): any {
    let rvalidchars = /^[\],:{}\s]*$/;
    let rvalidescape = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
    let rvalidtokens = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
    let rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g;
    let dateISO = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[.,]\d+)?Z/i;
    let dateNet = /\/Date\((-?\d+)(?:-\d+)?\)\//i;

    let replacer = (key, value) => {
        if (typeof (value) === 'string') {
            if (dateISO.test(value)) {
                return new Date(value);
            }
            if (dateNet.test(value)) {
                return new Date(parseInt(dateNet.exec(value)[1], 10));
            }
        }
        return value;
    };

    if (data && typeof (data) === 'string'
        && rvalidchars.test(data.replace(rvalidescape, '@').replace(rvalidtokens, ']').replace(rvalidbraces, ''))) {
        return JSON.parse(data, replacer);
    } else {
        return data;
    }
}
