import * as sql from 'mssql';
import * as moment from 'moment';

export async function savePaciente(paciente: any, transaction) {
    let fechaCreacion = new Date();
    let fechaUltimoAcceso = fechaCreacion;
    let fechaActualizacion = fechaCreacion;
    let hcTipo = 1;
    let hcNumero = 'PDR' + paciente.documento;
    let tipoDocumento = 'DNI';
    let nroDocumento = paciente.documento;
    let apellido = paciente.apellido;
    let nombre = paciente.nombre;
    let estadoCivil =  (paciente.estadoCivil ? paciente.estadoCivil : null);
    let fechaNacimiento = (paciente.fechaNacimiento ? paciente.fechaNacimiento : null);
    let sexo = paciente.sexo;

    let query = 'INSERT INTO dbo.Historias_Clinicas ' +
        '(HC_Fecha_de_creacion ' +
        ',HC_Fecha_de_ultimo_acceso ' +
        ',HC_Fecha_Actualizacion ' +
        ',HC_Tipo ' +
        ',HC_Numero ' +
        ',HC_Tipo_de_documento ' +
        ',HC_Documento ' +
        ',HC_Apellido ' +
        ',HC_Nombre ' +
        ',HC_Estado_Civil ' +
        ',HC_Sexo ' +
        ',HC_Nacimiento_Fecha) ' +
    'VALUES (' +
        '@fechaCreacion, ' +
        '@fechaUltimoAcceso, ' +
        '@fechaActualizacion, ' +
        '@hcTipo, ' +
        '@hcNumero, ' +
        '@tipoDocumento, ' +
        '@nroDocumento,' +
        '@apellido,' +
        '@nombre,' +
        '@estadoCivil, ' +
        '@sexo, ' +
        '@fechaNacimiento) ' +
        'SELECT SCOPE_IDENTITY() AS idHistoria';

    return await new sql.Request(transaction)
        .input('fechaCreacion', sql.DateTime, fechaCreacion)
        .input('fechaUltimoAcceso', sql.DateTime, fechaUltimoAcceso)
        .input('fechaActualizacion', sql.DateTime, fechaActualizacion)
        .input('hcTipo', sql.Int, hcTipo)
        .input('hcNumero', sql.VarChar(50), hcNumero)
        .input('tipoDocumento', sql.VarChar(3), tipoDocumento)
        .input('nroDocumento', sql.VarChar(10), nroDocumento)
        .input('apellido', sql.VarChar(50), apellido)
        .input('nombre', sql.VarChar(50), nombre)
        .input('estadoCivil', sql.VarChar(10), estadoCivil)
        .input('sexo', sql.VarChar(10), sexo)
        .input('fechaNacimiento', sql.DateTime, fechaNacimiento)
        .query(query).then(result => {
            return {
                idHistoria: hcNumero,
                idPaciente: result.recordset[0].idHistoria
            };
        }).catch(err => {
            throw err;
        });
}

export async function getDatosPaciente(tipoDocumento, documento, pool) {
    // Agregar indice a HC_Documento de Historias_Clinicas
    let query = 'SELECT h.Codigo as idPaciente, h.HC_Numero as idHistoria ' +
                'FROM Historias_Clinicas h ' +
                'WHERE HC_Tipo_de_documento = @tipoDocumento ' +
                'AND h.HC_Documento = @documento';
    let result = await pool.request()
        .input('documento', sql.VarChar(50), documento)
        .input('tipoDocumento', sql.VarChar(50), tipoDocumento)
        .query(query)
        .catch(err => {
            throw err;
        });

    return result.recordset[0];
}
