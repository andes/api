import { profesional } from '../schemas/profesional';
import { turnoSolicitado } from '../../../modules/matriculaciones/schemas/turnoSolicitado';
import * as turno from '../../../modules/matriculaciones/schemas/turno';
import { userScheduler } from '../../../config.private';
import { Auth } from './../../../auth/auth.class';
import { conSql } from '../../../config.private';
import * as sql from 'mssql';

/**
 * funcion que controla los vencimientos de la matriculas y de ser necesario envia sms y email avisando al profesional.
 */
export async function vencimientoMatriculaGrado(done) {
    // let profesionales: any = await profesional.find({ 'formacionGrado.matriculado': true, profesionalMatriculado: true }, (data: any) => { return data; });
    let profesionales: any = await profesional.find({ 'formacionGrado.matriculacion.fin': { $lte: new Date() }, 'formacionGrado.matriculado': true, profesionalMatriculado: true });

    for (let _n = 0; _n < profesionales.length; _n++) {
        if (profesionales[_n].habilitado === true) {
            for (let _i = 0; _i < profesionales[_n].formacionGrado.length; _i++) {
                if (profesionales[_n].formacionGrado[_i].matriculacion) {

                    if (profesionales[_n].formacionGrado[_i].matriculado === true && profesionales[_n].formacionGrado[_i].matriculacion[profesionales[_n].formacionGrado[_i].matriculacion.length - 1].fin <= new Date()) {
                        profesionales[_n].formacionGrado[_i].matriculado = false;
                        profesionales[_n].formacionGrado[_i].papelesVerificados = false;
                        await actualizar(profesionales[_n]);
                    }
                }
            }
        }
    }
    done();
}

export async function vencimientoMatriculaPosgrado(done) {
    let profesionales: any = await profesional.find({ 'formacionPosgrado.matriculado': true, profesionalMatriculado: true, 'formacionPosgrado.tieneVencimiento': true }, (data: any) => { return data; });
    for (let _n = 0; _n < profesionales.length; _n++) {
        if (profesionales[_n].habilitado === true) {
            if (profesionales[_n].formacionPosgrado) {
                for (let _i = 0; _i < profesionales[_n].formacionPosgrado.length; _i++) {
                    if (profesionales[_n].formacionPosgrado[_i].matriculacion.length > 0) {
                        if (profesionales[_n].formacionPosgrado[_i].matriculado === true && profesionales[_n].formacionPosgrado[_i].tieneVencimiento === true && profesionales[_n].formacionPosgrado[_i].matriculacion[profesionales[_n].formacionPosgrado[_i].matriculacion.length - 1].fin.getFullYear() < new Date().getFullYear()) {
                            profesionales[_n].formacionPosgrado[_i].matriculado = false;
                            profesionales[_n].formacionPosgrado[_i].papelesVerificados = false;
                            await actualizar(profesionales[_n]);
                        }
                    }
                }
            }
        }
    }
    done();
}

/**
 * funcion que actualiza la formacion grado, formacion posgrado y estados de vencimientos;
 * @param profesional  profesional a modificar
 */
async function actualizar(unProfesional) {
    Auth.audit(unProfesional, (userScheduler as any));
    await unProfesional.save();
}

export async function migrarTurnos() {
    let profesionales: any = await profesional.find({ turno: { $gte: new Date() } }, (data: any) => { return data; });
    profesionales.forEach(unProfesional => {
        let tipoDeTurno;
        let turnoSolicitud = {
            nombre: unProfesional.nombre,
            apellido: unProfesional.apellido,
            documento: unProfesional.documento,
            fecha: unProfesional.turno,
            idRenovacion: unProfesional._id
        };


        let formacionGrado = unProfesional.formacionGrado;
        if (formacionGrado.length === 1 && formacionGrado[formacionGrado.length - 1].matriculacion === null) {
            tipoDeTurno = 'matriculacion';
        } else {
            tipoDeTurno = 'renovacion';
        }

        let newTurnoSolicitado = new turnoSolicitado(turnoSolicitud);
        let unTurno: any = newTurnoSolicitado.save((err2) => {

            let nTurno = new turno({
                notificado: false,
                sePresento: false,
                fecha: unProfesional.turno,
                tipo: tipoDeTurno,
                profesional: newTurnoSolicitado._id
            });

            nTurno.save((err) => {
            });

        });
    });
}

export async function matriculaCero() {
    let profesionales: any = await profesional.find({ 'formacionGrado.matriculacion.matriculaNumero': 0 }, (data: any) => { return data; });
    profesionales.forEach((unProfesional, i) => {
        let formacionGrado = unProfesional.formacionGrado;
        formacionGrado.forEach((element, n) => {
            if (element.matriculacion[element.matriculacion.length - 1].matriculaNumero === 0) {
                unProfesional.formacionGrado[n].matriculacion = null;
            }
        });
        profesional.findByIdAndUpdate(unProfesional.id, unProfesional, (err, resultado: any) => { });
    });
}


export async function formacionCero() {
    let profesionales: any = await profesional.find({ $where: 'this.formacionGrado.length > 1 && this.formacionGrado[0].matriculacion == null' }, (data: any) => { return data; });
    return profesionales;
}

export async function migrarASips() {
    const connection = {
        user: conSql.auth.user,
        password: conSql.auth.password,
        server: conSql.serverSql.server,
        database: conSql.serverSql.database,
        requestTimeout: 30000
    };
    const pool = await new sql.ConnectionPool(connection).connect();
    const transaction = await new sql.Transaction(pool);

    try {
        transaction.begin();
        let values = [];
        let nuevosProfesionales: any = await getProfesionalesDeHoy();

        for (let p of nuevosProfesionales) {
            let usuarioId: Number = await getIdUsuario(p, transaction);
            // se crea dto segun tabla de profesionales de SIPS
            let prof = {
                idEfector: 1,
                apellido: p.apellido,
                nombre: p.nombre,
                idTipoDocumento: 1,
                numeroDocumento: parseInt(p.documento, 10),
                matricula: p.formacionGrado[0].matriculacion[0].matriculaNumero, // Por defecto toma la primer matriculacion. Hay que validar cual debería tomar
                idUsuario: usuarioId,
                fechaModificacion: new Date('1900-01-01'),
                activo: 1,
                legajo: 0,
                codigoSISA: 0,
                idTipoProfesional: 1,
                mail: p.contactos.find(c => c.tipo === 'email').valor,
                telefono: p.contactos.find(c => c.tipo === 'celular' || c.tipo === 'fijo').valor,
                CreatedBy: '',
                CreatedOn: p.createdAt, // new Date()
                ModifiedBy: '',
                ModifiedOn: (p.updateAt) ? p.updateAt : new Date('1900-01-01') // new Date()
            };
            values.push(prof);
        }

        await saveProfesionalesSips(values, pool);
        pool.close();
    } catch (ex) {
        pool.close();
        // en un futuro loggear
    }
}

async function getProfesionalesDeHoy() {
    return await profesional.find({ createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) } }).exec();
}

async function saveProfesionalesSips(values, pool) {
    try {
        // Se inserta cada profesional
        for (let val of values) {
            let result = await pool.request()
                .input('idEfector', sql.Int, val.idEfector)
                .input('apellido', sql.VarChar(50), val.apellido)
                .input('nombre', sql.VarChar(50), val.nombre)
                .input('idTipoDocumento', sql.Int, val.idTipoDocumento)
                .input('numeroDocumento', sql.Int, val.numeroDocumento)
                .input('matricula', sql.VarChar(50), val.matricula)
                .input('idUsuario', sql.VarChar(50), val.idUsuario)
                .input('fechaModificacion', sql.DateTime, val.fechaModificacion)
                .input('activo', sql.Bit, val.activo)
                .input('legajo', sql.VarChar(50), val.legajo)
                .input('codigoSISA', sql.VarChar(50), val.codigoSISA)
                .input('idTipoProfesional', sql.Int, val.idTipoProfesional)
                .input('mail', sql.VarChar(50), val.mail)
                .input('telefono', sql.VarChar(50), val.telefono)
                .input('CreatedBy', sql.VarChar(50), val.CreatedBy)
                .input('CreatedOn', sql.DateTime, val.CreatedOn)
                .input('ModifiedBy', sql.VarChar(50), val.ModifiedBy)
                .input('ModifiedOn', sql.DateTime, val.ModifiedOn)
                //    .output('output_parameter', sql.VarChar(50))
                .execute('AltaNuevoProfesionalMatriculado');
        }
    } catch (err) {
        pool.close();
        // en un futuro loggear
    }
}

async function getIdUsuario(_profesional, transaction) {
    const query = `INSERT INTO [dbo].[Sys_Usuario]
        ([idEfector]
        ,[idPerfil]
        ,[apellido]
        ,[nombre]
        ,[legajo]
        ,[username]
        ,[password]
        ,[activo]
        ,[idUsuarioActualizacion]
        ,[fechaActualizacion]
        ,[email]
        ,[telefono]
        ,[observacion]
        ,[documento])
    VALUES (
        @idEfector,
        @idPerfil,
        @apellido,
        @nombre,
        @legajo,
        @username,
        @password,
        @activo,
        @idUsuarioActualizacion,
        @fechaActualizacion,
        @email,
        @telefono,
        @observacion,
        @documento)
        SELECT SCOPE_IDENTITY() as id`;

    const result = await new sql.Request(transaction)
        .input('idEfector', sql.Int, 1)
        .input('idPerfil', sql.Int, 1)
        .input('apellido', sql.VarChar(50), _profesional.apellido)
        .input('nombre', sql.VarChar(50), _profesional.nombre)
        .input('legajo', sql.VarChar(50), '')
        .input('username', sql.VarChar(50), _profesional.documento)
        .input('password', sql.VarChar(50), '')
        .input('activo', sql.Bit, 1)
        .input('idUsuarioActualizacion', sql.Int, 2)
        .input('fechaActualizacion', sql.DateTime, new Date())
        .input('firmaValidacion', sql.VarChar(500), '')
        .input('email', sql.VarChar(100), '')
        .input('telefono', sql.VarChar(50), '')
        .input('observacion', sql.VarChar(500), '')
        .input('documento', sql.Int, _profesional.documento)
        .query(query);

    return result.recordset[0].id;
}

