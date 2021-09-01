export function parseDate(data: any): any {
    const rvalidchars = /^[\],:{}\s]*$/;
    const rvalidescape = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
    const rvalidtokens = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
    const rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g;
    const dateISO = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[.,]\d+)?Z/i;
    const dateNet = /\/Date\((-?\d+)(?:-\d+)?\)\//i;

    const replacer = (key, value) => {
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
