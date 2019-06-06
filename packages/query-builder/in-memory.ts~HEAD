import { makePattern } from './utils';

export function matchDate(date: Date) {

}

export function partialString(value: string | String, compareValue: string | String) {
    if (value && value.length > 0 && value.split('^')) {
        const [_, expression] = value.split('^');
        let reg = makePattern(expression);
        return reg.test(compareValue.toString());
    } else {
        return (value === compareValue);
    }
}

export function matchString(value, compareValue) {
    return (value === compareValue);
}

export function buildQuery(query, searchSpecification, value) {
    return Object.keys(query).reduce((flag, key) => {
        if (query[key] && value[key]) {
            return flag && (searchSpecification[key](query[key], value[key]));
        }
        return false;
    }, true);
}

export const MemoryQuery = {
    matchDate,
    partialString,
    matchString,
    buildQuery
};
