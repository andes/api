import * as moment from 'moment';
import { makePattern } from './utils';
import { Types } from 'mongoose';

export function matchDate(date: Date) {
    return {
        $gte: moment(date).startOf('day').toDate(),
        $lte: moment(date).endOf('day').toDate()
    };
}

export function partialString(value: string) {
    if (value && value.length > 0) {
        const [_, searchPattern] = value.split('^');
        if (searchPattern) {
            return { $regex: makePattern(searchPattern) };
        }
    }

    return value;
}

export function matchString(value) {
    return value;
}

/**
 * Devuelve una query con elemMatch por keyName y valueName
 *
 * @param {string} value
 * @param {string} keyName
 * @param {string} valueName
 */

export function queryMatch(value: string, keyName: string, valueName: string) {
    let ids = value.split('|');
    let filtro = {};
    if (ids[0]) {
        filtro[keyName] = ids[0];
    }
    if (ids[1]) {
        if (Types.ObjectId.isValid(ids[1])) {
            filtro[valueName] = Types.ObjectId(ids[1]);
        } else {
            filtro[valueName] = partialString(ids[1]);
        }
    }
    return ({ $elemMatch: filtro });
}

/**
 * Devuelve una condición con operador (and, or) para buscar elementos en un arreglo a través del elemMatch
 *
 * @export
 * @param {string} fieldName
 * @param {Array<string>} values
 * @param {string} keyName
 * @param {string} valueName
 * @returns {Object}
 */


export function queryArray(fieldName: string, values: any[], keyName: string, valueName: string, op = '$and') {
    let conds = [];
    values.forEach(valor => {
        let filtro = {};
        filtro[fieldName] = queryMatch(valor, keyName, valueName);
        conds.push(filtro);
    });
    if (op === 'or') {
        return ({ $or: conds });
    }
    return ({ $and: conds });
}

export const MongoQuery = {
    matchDate,
    partialString,
    matchString,
    queryMatch,
    queryArray
};
