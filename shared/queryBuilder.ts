import * as moment from 'moment';
import * as utils from './../utils/utils';
import * as mongoose from 'mongoose';
import { ObjectID, ObjectId } from 'bson';

export function rangoFechas(date: Date) {
    return {
        $lte: moment(date).endOf('day').toDate(),
        $gte: moment(date).startOf('day').toDate()
    };
}

export function parseStr(value: string) {
    if (value && value.length > 0) {
        const [_ , searchPattern] = value.split('^');
        if (searchPattern) {
            // Se realiza una búsqueda parcial
            return {$regex: utils.makePattern(searchPattern)};
        }
    }

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
        if (mongoose.Types.ObjectId.isValid(ids[1])) {
            filtro[valueName] = mongoose.Types.ObjectId(ids[1]);
        } else {
            filtro[valueName] = parseStr(ids[1]);
        }
    }
    return ({$elemMatch: filtro});
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
        return ({$or : conds });
    }
    return ({$and : conds });
}

