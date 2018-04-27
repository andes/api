// const config = require('../../config');
import * as sql from 'mssql';

export function query(connection, consulta, offset?, limit?) {
    return sql.connect(connection)
        .then(r => {
            let msql_req = new sql.Request();
            if (offset) {msql_req.input('offset', offset); }
            if (limit) { msql_req.input('limit', limit); }
            return msql_req.query(consulta)
                .then(listaRow => {
                    sql.close();
                    return listaRow;
                })
                .catch(error => {
                    sql.close();
                    console.log('Error en sql server', error);
                    throw Error(error);
                });
        });
};


export function queryOffset(connection, consulta, offset, limit) {
    return sql.connect(connection).then(function () {
        // Es una consulta a una vista que tiene toda la información
        return new sql.Request()
            .input('offset', offset)
            .input('limit', limit)
            .query(consulta)
            .then(function (recordset) {
                return recordset;
            })
            .catch(function (err) {
                // ... query error checks
                console.log("Error de conexión al server");
                return (err);
            });
    });
}