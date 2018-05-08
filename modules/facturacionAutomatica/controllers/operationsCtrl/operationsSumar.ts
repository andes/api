// Imports
import * as mongoose from 'mongoose';
import { agendasCache } from '../../../legacy/schemas/agendasCache';
import * as organizacion from '../../../../core/tm/schemas/organizacion';
import * as sql from 'mssql';
import * as moment from 'moment';
import * as configPrivate from '../../../../config.private';
import * as dbg from 'debug';
import * as operacionesLegacy from './../../../legacy/controller/operations';

import * as pacienteCrtl from './../../../../core/mpi/controller/paciente';
import * as constantes from '../../../legacy/schemas/constantes';
import { paciente, pacienteMpi } from '../../../../core/mpi/schemas/paciente'
import { insertarPacienteEnSips } from '../../../turnos/controller/operationsCacheController/operationsPaciente';
const debug = dbg('integracion');

let transaction;
let poolAgendas;
let config = {
    user: configPrivate.conSql.auth.user,
    password: configPrivate.conSql.auth.password,
    server: configPrivate.conSql.serverSql.server,
    database: configPrivate.conSql.serverSql.database,
    requestTimeout: 45000
};
var thingSchema = new mongoose.Schema({
    id: Object,
    tipoPrestacion: Object,
    nomencladorSUMAR: String,
    nomencladorRecuperoFinanciero: String

});
export let configuracionPrestaciones = mongoose.model('configuracionPrestacion', thingSchema, 'configuracionPrestacion');
/* IMPORTANTE!!!!!
TENER EN CUENTA QUE PARA FACTURAR EL PACIENTE TIENE QUE EXISTIR EN LA TABLA PN_SMIAFILIADOS Y QUE ESTAR ACTIVO*/
export async function facturacionSumar(agenda: any) {

    for (var index = 0; index < agenda.length; index++) {
        let afiliadoSumar = await getAfiliadoSumar(agenda[index].paciente.documento);
let efector = await mapeoEfector(agenda[index].efector);
        if (afiliadoSumar.length > 0) {
            let comprobante = {
                cuie: efector ,
                fechaComprobante: moment().format('YYYYMMDD'),
                claveBeneficiario: afiliadoSumar[0].clavebeneficiario,
                idAfiliado: afiliadoSumar[0].id_smiafiliados,
                fechaCarga: moment().format('YYYYMMDD'),
                comentario: 'Carga Automática',
                marca: 0,
                periodo: await getPeriodo(),
                activo: 'S',
                idTipoPrestacion: 1
            }

            let pacienteSips = await mapeoPaciente(agenda[index].paciente.documento);

            let datosPaciente = {
                fechaNacimiento: pacienteSips.fechaNacimiento,
                sexo: (pacienteSips.idSexo === 3 ? 'M' : pacienteSips.idSexo === 2 ? 'F' : 1),
                edad: moment(agenda[index].fecha).diff(pacienteSips.fechaNacimiento, 'years')
            }

            insertBeneficiario(pacienteSips,efector)
            creaComprobanteSumar(comprobante, agenda[index], agenda[index].fecha, datosPaciente);
        } else {
            console.log("NOOOOOO Es paciente SUMAr afiliado")
            // let idPacienteSips = await mapeoPaciente(agenda[index].paciente.documento);

            // if (!idPacienteSips) {
            //     let resultadoBusquedaPaciente: any = await pacienteCrtl.buscarPaciente(agenda[index].paciente.id);
            //     let idNivelCentral = 127; // Por defecto seteamos como efector nivel central (ID 127)
            //     let pacienteSips = operacionesLegacy.pacienteSipsFactory(resultadoBusquedaPaciente.paciente, idNivelCentral);
            //     idPacienteSips = await operacionesLegacy.insertaPacienteSips(pacienteSips);
            // }
        }
    }
}

async function getAfiliadoSumar(documento) {

    poolAgendas = await new sql.ConnectionPool(config).connect();
    let query = "SELECT * FROM dbo.PN_smiafiliados WHERE afidni = @documento AND activo = 'S'";
    let resultado = await new sql.Request(poolAgendas)
        .input('documento', sql.VarChar(50), documento)
        .query(query);
    poolAgendas.close()
    resultado = resultado.recordset;

    return resultado;
}

// mapeo de los efectores
async function mapeoEfector(idEfector) {
    let efectorMongo: any = await mapeoEfectorMongo(idEfector);

    poolAgendas = await new sql.ConnectionPool(config).connect();
    let query = 'SELECT * FROM dbo.Sys_efector WHERE cuie = @codigo';
    let resultado = await new sql.Request(poolAgendas)
        .input('codigo', sql.VarChar(50), efectorMongo.codigo.cuie)
        .query(query);
    poolAgendas.close()

    return resultado.recordset[0].cuie;
}

/* Se trae el efector de mongo por ObjectId*/
async function mapeoEfectorMongo(idEfector: any) {
    return new Promise((resolve, reject) => {
        organizacion.model.findById(idEfector).then(efector => {
            resolve(efector);
        })
    });
}

async function getPeriodo() {
    return new Promise((resolve, reject) => {
        let fecha = moment(new Date, 'YYYY/MM/DD');

        let año = fecha.format('YYYY');
        let mes = fecha.format('MM');

        let periodo = año + '/' + mes;

        resolve(periodo);
    });
}

async function creaComprobanteSumar(datosComprobante, prestacion, fechaAgenda, datosPaciente) {
    return new Promise(async (resolve, reject) => {
        let query = "INSERT INTO dbo.PN_comprobante ( cuie, id_factura, nombre_medico, fecha_comprobante, clavebeneficiario, id_smiafiliados, " +
            " fecha_carga, comentario, marca, periodo, activo, idTipoDePrestacion) values ( " +
            "'" + datosComprobante.cuie + "'," + null + "," + null + ",'" + datosComprobante.fechaComprobante + "'," + "'" + datosComprobante.claveBeneficiario + "'" +
            "," + datosComprobante.idAfiliado + ",'" + datosComprobante.fechaCarga + "','" + datosComprobante.comentario + "'," + datosComprobante.marca +
            ",'" + datosComprobante.periodo + "','" + datosComprobante.activo + "'," + datosComprobante.idTipoPrestacion + ")";

        let idComprobante = await executeQuery(query);
        console.log("Query: ", query)
        console.log("IdComprobante: ", idComprobante)

        let codigo = crearCodigoComp(datosComprobante.cuie, fechaAgenda, datosComprobante.claveBeneficiario, datosPaciente.fechaNacimiento, datosPaciente.sexo, datosPaciente.edad, 'CT', 'C002', 'A98');
        creaPrestaciones(prestacion, idComprobante, fechaAgenda, datosPaciente.fechaNacimiento, datosPaciente.sexo, datosPaciente.edad, codigo)
    });
}

function creaPrestaciones(prestacionEntrante, idComprobante, fechaPrestacion, fechaNacimiento, sexo, edad, codigo) {

    let prestacion = {
        id: null,
        id_comprobante: idComprobante,
        id_nomenclador: null,
        cantidad: 1,
        codigo: codigo,
        sexo: sexo,
        edad: edad,
        fechaPrestacion: fechaPrestacion,
        anio: moment(fechaPrestacion).format('YYYY'),
        mes: moment(fechaPrestacion).format('MM'),
        dia: moment(fechaPrestacion).format('DD'),
        fechaNacimiento: fechaNacimiento,
        precio_prestacion: null,
        id_anexo: 301
    }


    configuracionPrestaciones.find({
        'tipoPrestacion.conceptId': prestacionEntrante.tipoPrestacion.conceptId
    }, {}, async function (err, file: any) {

        let nomenclador: any = await mapeoNomenclador(file[0].nomencladorSUMAR);
        prestacion.precio_prestacion = nomenclador.precio;
        prestacion.id_nomenclador = nomenclador.id;
        console.log(prestacion);
    });



}

async function mapeoNomenclador(codigoNomenclador) {
    poolAgendas = await new sql.ConnectionPool(config).connect();
    let query = 'SELECT * FROM [dbo].[PN_nomenclador] where id_nomenclador = @codigo';
    let resultado = await new sql.Request(poolAgendas)
        .input('codigo', sql.VarChar(50), 919) //919 HARDCOOOODIIIIINGGGG (id de consulta pediatrica de 1 a 6 años)
        .query(query);
    poolAgendas.close()

    let res = {
        id: resultado.recordset[0].id_nomenclador,
        precio: resultado.recordset[0].precio
    }
    return res;
}


function insertBeneficiario(paciente,efector) {
    let beneficiario = {
        id: null,
        estado_enviado: 'n',
        clave_beneficiario: 2101300000000000, //falta sumar id
        tipo_transaccion: "A",
        apellido: paciente.apellido,
        nombr: paciente.nombre,
        clase_doc: null,
        tipo_documento: "DNI",
        numero_doc: paciente.numeroDocumento,
        id_categoria: null,
        sexo: (paciente.idSexo === 3 ? 'M' : paciente.idSexo === 2 ? 'F' : 1),
        fechaNacimiento: paciente.fechaNacimiento,
        pais: "ARGENTINA",
        indigena: "N",
        idTribu: 0,
        idLengua: 0,
        anioMayorNivel: 0,
        anioMayorNivelMadre: 0,
        tipoDocMadre: null,
        numeroDocMadre: null,
        apellidoMadre: null,
        nombreMadre: null,
        cuie_ea: efector,
        cuie_ah: efector,
        fecha_carga: new Date(),
        fecha_inscripcion: new Date(),

    };

    // let query = "INSERT INTO [dbo].[PN_beneficiarios] ([estado_envio], [clave_beneficiario], [tipo_transaccion], [apellido_benef], [nombre_benef], [clase_documento_benef]"
    //    + ", [tipo_documento], [numero_doc], [id_categoria], [sexo], [fecha_nacimiento_benef], [provincia_nac], [localidad_nac] , [pais_nac]" +
    //    +", [indigena] , [id_tribu], [id_lengua] , [alfabeta] , [estudios] , [anio_mayor_nivel] , [tipo_doc_madre] , [nro_doc_madre] , [apellido_madre]" + 
    //    + " , [nombre_madre] , [alfabeta_madre], [estudios_madre], [anio_mayor_nivel_madre] , [tipo_doc_padre], [nro_doc_padre], [apellido_padre]"
    //     + ", [nombre_padre], [alfabeta_padre] , [estudios_padre], [anio_mayor_nivel_padre] , [tipo_doc_tutor], [nro_doc_tutor], [apellido_tutor]
    //     , [nombre_tutor]
    //     , [alfabeta_tutor]
    //     , [estudios_tutor]
    //     , [anio_mayor_nivel_tutor]
    //     , [fecha_diagnostico_embarazo]
    //     , [semanas_embarazo]
    //     , [fecha_probable_parto]
    //     , [fecha_efectiva_parto]
    //     , [cuie_ea]
    //     , [cuie_ah]
    //     , [menor_convive_con_adulto]
    //     , [calle]
    //     , [numero_calle]
    //     , [piso]
    //     , [dpto]
    //     , [manzana]
    //     , [entre_calle_1]
    //     , [entre_calle_2]
    //     , [telefono]
    //     , [departamento]
    //     , [localidad]
    //     , [municipio]
    //     , [barrio]
    //     , [cod_pos]
    //     , [observaciones]
    //     , [fecha_inscripcion]
    //     , [fecha_carga]
    //     , [usuario_carga]
    //     , [activo]
    //     , [fum]
    //     , [tipo_ficha]
    //     , [responsable]
    //     , [discv]
    //     , [disca]
    //     , [discmo]
    //     , [discme]
    //     , [otradisc]
    //     , [rcv])
    //     VALUES(" + + ")";
    console.log(beneficiario)
}

export async function mapeoPaciente(dni) {
    poolAgendas = await new sql.ConnectionPool(config).connect();
    let query = 'SELECT TOP 1 * FROM dbo.Sys_Paciente where activo=1 and numeroDocumento=@dni order by objectId DESC;';
    let result = await new sql.Request(poolAgendas)
        .input('dni', sql.VarChar(50), dni)
        .query(query);
    poolAgendas.close()
    return result.recordset[0] ? result.recordset[0] : null;
}

export function crearCodigoComp(cuie, fechaPrestacion: Date, claveB, fechaNac: Date, sexo, año, grupo, codigo, diagnostico) {

    let fechaPrestParseada = moment(fechaPrestacion).format('YYYY') + '' + moment(fechaPrestacion).format('MM') + '' + moment(fechaPrestacion).format('DD');
    let fechaNacParseada = moment(fechaNac).format('YYYY') + '' + moment(fechaNac).format('MM') + '' + moment(fechaNac).format('DD');
    let codigoFinal = cuie + fechaPrestParseada + claveB + sexo + fechaNacParseada + año + grupo + codigo + diagnostico + 'P99';
    console.log(codigoFinal)
    return codigoFinal;
}

async function executeQuery(query: any) {
    try {
        query += ' select SCOPE_IDENTITY() as id';
        poolAgendas = await new sql.ConnectionPool(config).connect();
        let result = await new sql.Request(poolAgendas).query(query);
        if (result && result.recordset) {
            return result.recordset[0].id;
        }
    } catch (err) {
        return (err);
    }
}
