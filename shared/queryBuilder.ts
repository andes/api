import * as moment from 'moment';
import * as utils from './../utils/utils';

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

