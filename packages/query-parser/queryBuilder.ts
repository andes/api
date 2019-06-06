import { makePattern } from './utils';


export function partialMatch(value: string | String, compareValue: string | String) {
    if (value && value.length > 0 && value.split('^')) {
        const [_, expression] = value.split('^');
        let reg = makePattern(expression);
        return reg.test(compareValue.toString());
    } else {
        return (value === compareValue);
    }
}

export function equalMatch(value, compareValue) {
    return (value === compareValue);
}

export function matchQuery(query, value, filtros) {
    return Object.keys(query).reduce((flag, key) => {
        if (query[key] && value[key]) {
            return flag && (filtros[key](query[key], value[key]));
        }
        return false;
    }, true);
}
