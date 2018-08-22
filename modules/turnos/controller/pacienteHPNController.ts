import * as sql from 'mssql';

export async function savePaciente(paciente: any, transaction) {
    const fechaCreacion = new Date();
    const fechaUltimoAcceso = fechaCreacion;
    const fechaActualizacion = fechaCreacion;
    const hcTipo = 1;
    const hcNumero = 'PDR' + paciente.documento;
    const tipoDocumento = 'DNI';
    const nroDocumento = paciente.documento;
    const apellido = paciente.apellido;
    const nombre = paciente.nombre;
    const estadoCivil =  (paciente.estadoCivil ? paciente.estadoCivil : null);
    const fechaNacimiento = (paciente.fechaNacimiento ? paciente.fechaNacimiento : null);
    const sexo = paciente.sexo;

    const query = 'INSERT INTO dbo.Historias_Clinicas ' +
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
                idHistoria: result.recordset[0].codigo,
                idPaciente: result.recordset[0].idPaciente
            };
        }).catch(err => {
            throw err;
        });
}

export async function getDatosPaciente(tipoDocumento, documento, pool) {
    const query = 'SELECT h.Codigo as idHistoria, p.id as idPaciente ' +
    'FROM Historias_Clinicas h ' + 'inner join Pacientes p on p.legacy_idHistoriaClinica=h.codigo ' +
    'WHERE h.HC_Documento = @documento';

    const result = await pool.request()
        .input('documento', sql.VarChar(50), documento)
        .input('tipoDocumento', sql.VarChar(50), tipoDocumento)
        .query(query)
        .catch(err => {
            throw err;
        });

    return result.recordset[0];
}
