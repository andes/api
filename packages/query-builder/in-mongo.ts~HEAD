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
    if (value && value.charAt(0) === '^') {
        const searchPattern = value.substring(1);
        return { $regex: makePattern(searchPattern) };
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
    return { $elemMatch: filtro };
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


export function queryArray(fieldName: string, values: any[], keyName: string, valueName: string, op = 'and') {
    values = Array.isArray(values) ? values : [values];
    const conds = [];
    values.forEach(valor => {
        const filtro = {};
        filtro[fieldName] = queryMatch(valor, keyName, valueName);
        conds.push(filtro);
    });
    if (op === 'or') {
        return { $or: conds };
    }
    return { $and: conds };
}


export function buildQuery(query, searchSpecification) {
    const mongoQuery = {};
    const arrayFilter = [];
    Object.keys(query).forEach((fieldName) => {

        const queryParam = searchSpecification[fieldName];
        const filterValue = query[fieldName];

        const isFunction = typeof queryParam === 'function';

        const callback = isFunction ? queryParam : queryParam.fn;
        const field = isFunction ? fieldName : queryParam.field;

        if (callback) {
            const mongoFind = callback(filterValue, query);
            if (!mongoFind['$and'] && !mongoFind['$or']) {
                mongoQuery[field] = mongoFind;
            } else {
                arrayFilter.push(mongoFind);
            }
        }
    });
    if (arrayFilter.length > 0) {
        mongoQuery['$and'] = arrayFilter;
    }
    return mongoQuery;
}

export const MongoQuery = {
    matchDate,
    partialString,
    matchString,
    queryMatch,
    queryArray,
    buildQuery
};
