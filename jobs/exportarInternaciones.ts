import { listadoInternacion } from '../modules/rup/controllers/internacion';
import { buscarPaciente } from '../core/mpi/controller/paciente';
import * as _provincias from '../core/tm/schemas/provincia_model';
import * as _localidades from '../core/tm/schemas/localidad';
import moment = require('moment');
import * as _mapeos from '../core/tm/schemas/mapeo';

const CodSexo = {
    masculino: 1,
    femenino: 2,
    indeterminado: 3
};

const CodNivelI = {
    'Nunca asistió': 1,
    'Primario completo': 2,
    'Primario incompleto': 3,
    'Secundario completo': 4,
    'Secundario incompleto': 5,
    'Superior o Universitario completo': 6,
    'Superior o Universitario incompleto': 7,
    'Ciclo EGB (1o y 2o)  completo': 11,
    'Ciclo EGB (1o y 2o)  incompleto': 12,
    'Ciclo EGB 3o completo': 13,
    'Ciclo EGB 3o incompleto': 14,
    'Polimodal completo': 15,
    'Polimodal incompleto': 16
};

const CodSitLab = {
    'Trabaja o está de licencia': 1,
    'No trabaja y busca trabajo': 2,
    'No trabaja y no busca trabajo': 3
};

const CodHospPor = {
    'Consultorio externo': 1,
    Emergencia: 2,
    Traslado: 3,
    'Sala de parto': 4,
    Otros: 5
};

const CodEgresP = {
    'Alta médica': 1,
    Traslado: 2,
    Defunción: 3,
    'Retiro voluntario': 4,
    Otro: 5
};

const CodCauExtT = {
    Accidente: 1,
    'Lesión autoinflingida': 2,
    Agresión: 3,
    'Se ignora': 9
};

const CodCauExtL = {
    'Domicilio particular': 1,
    'Vía pública': 2,
    'Lugar de trabajo': 3,
    Otro: 4,
    'Se ignora': 9
};

export async function exportarInternaciones(filtros, idOrganizacion) {
    try {
        let arrayAux = await Promise.all([
            listadoInternacion(filtros, idOrganizacion),
            _localidades.find(),
            _mapeos.find({ identificador: 'especialidad' })
        ]);
        let internaciones: any[] = arrayAux[0];
        let localidades: any = arrayAux[1];
        let mapeoEspecialidadServicio: any = arrayAux[2];
        let internacionResp = [];

        for (let documento of internaciones) {
            let datosIngreso = documento.ejecucion.registros[0];    // para chequear si existen registros
            let datosEgreso = documento.ejecucion.registros[1];
            let informeDeIngreso = documento.ejecucion.registros[0].valor.informeIngreso;   // para acceder a informes
            let informeDeEgreso = (datosEgreso) ? documento.ejecucion.registros[1].valor.InformeEgreso : null;
            const paciente: any = (await buscarPaciente(documento.paciente.id)).paciente;

            let mapEspecialidadServicio: any = (informeDeIngreso.especialidades) ? mapeoEspecialidadServicio.find(map => map.codigoOrigen === informeDeIngreso.especialidades[0].conceptId) : null; // la primer especialidad que encuentre
            let ubicacion = (paciente.direccion && paciente.direccion.length && paciente.direccion[0].ubicacion) ? paciente.direccion[0].ubicacion : null; // path ubicacion en coleccion 'paciente'
            let datosLocalidad = (ubicacion && ubicacion.localidad) ? localidades.find(loc => loc.id === ubicacion.localidad.id) : null; // documento de coleccion 'localidad' correspondiente a la del paciente
            let codProv = (datosLocalidad && datosLocalidad.codLocalidad) ? datosLocalidad.codLocalidad.substring(0, 2) : '';
            let codDepto = (datosLocalidad && datosLocalidad.codLocalidad) ? datosLocalidad.codLocalidad.substring(2, 5) : '';
            let codLoc = (datosLocalidad && datosLocalidad.codLocalidad) ? datosLocalidad.codLocalidad.substring(5, 8) : '';
            let nroDocProgenitor = (paciente.relaciones && paciente.relaciones.length && paciente.relaciones.find(rel => rel.relacion.nombre === 'progenitor/a')) ? paciente.relaciones.find(rel => rel.relacion.nombre === 'progenitor/a').documento : '';

            if (datosIngreso) {
                let resp: any = {
                    AnioInfor: (datosEgreso) ? moment(informeDeEgreso.fechaEgreso).format('DD/MM/YYYY') : '',
                    Estab: documento.ejecucion.organizacion.nombre,
                    CodEst: '01400011',
                    HistClin: informeDeIngreso.nroCarpeta,
                    Apellido: paciente.apellido,
                    Nombre: paciente.nombre,
                    CodDocum: 1,
                    NumDocum: (paciente.documento) ? paciente.documento : '',
                    NacDia: moment(paciente.fechaNacimiento).format('D'),
                    NacMes: moment(paciente.fechaNacimiento).format('M'),
                    NacAnio: moment(paciente.fechaNacimiento).format('YYYY'),
                    CodUniEdad: 1,
                    UniEdad: 'años',
                    EdadIng: moment().diff(paciente.fechaNacimiento, 'years', false),
                    CodDocumM: 1,
                    NumDocumM: nroDocProgenitor,
                    CodLocRes: codLoc,
                    LocRes: (datosLocalidad) ? datosLocalidad.nombre : '',
                    CodDepRes: codDepto,
                    DepRes: (datosLocalidad) ? datosLocalidad.departamento : '',
                    CodProvRes: codProv,
                    ProvRes: (datosLocalidad) ? datosLocalidad.provincia.nombre : '',
                    CodPaisRes: '200',
                    PaisRes: 'Argentina',
                    CodSexo: CodSexo[paciente.sexo],
                    Sexo: paciente.sexo,
                    CodAsoc: (informeDeIngreso.obraSocial) ? 1 : 5,
                    Osoc: (informeDeIngreso.obraSocial) ? informeDeIngreso.obraSocial.nombre : '',
                    CodNivelI: CodNivelI[informeDeIngreso.nivelInstruccion],
                    NivelInst: informeDeIngreso.nivelInstruccion,
                    CodSitLab: CodSitLab[informeDeIngreso.situacionLaboral],
                    SitLab: informeDeIngreso.situacionLaboral,
                    CodOcupac: (informeDeIngreso.ocupacionHabitual) ? informeDeIngreso.ocupacionHabitual.codigo : '',
                    Ocupac: (informeDeIngreso.ocupacionHabitual) ? informeDeIngreso.ocupacionHabitual.nombre : '',
                    CodHospPor: CodHospPor[informeDeIngreso.origen],
                    HospPor: informeDeIngreso.origen,
                    Origen: (informeDeIngreso.organizacionOrigen) ? informeDeIngreso.organizacionOrigen.nombre : '',
                    FecIngreso: moment(informeDeIngreso.fechaIngreso).format('DD/MM/YYYY'),
                    FecEgreso: (datosEgreso) ? moment(informeDeEgreso.fechaEgreso).format('DD/MM/YYYY') : '',
                    EspecEgre: (informeDeIngreso.especialidades) ? informeDeIngreso.especialidades[0].term : '',
                    CodEspecEgre: (informeDeIngreso.especialidades) ? informeDeIngreso.especialidades[0].conceptId : '',
                    ServEgre: (mapEspecialidadServicio) ? mapEspecialidadServicio.descripcionDestino : '',
                    CodServEgre: (mapEspecialidadServicio) ? mapEspecialidadServicio.codigoDestino : '',
                    DiasTotEst: (datosEgreso) ? informeDeEgreso.diasDeEstada : '',
                    CodEgresP: CodEgresP[(datosEgreso && informeDeEgreso.tipoEgreso) ? informeDeEgreso.tipoEgreso.nombre : 'Otro'],
                    EgresP: (datosEgreso && informeDeEgreso.tipoEgreso) ? informeDeEgreso.tipoEgreso.nombre : '',
                    Lugar_Trasl: (datosEgreso && informeDeEgreso.UnidadOrganizativaDestino) ? informeDeEgreso.UnidadOrganizativaDestino.nombre : '',
                    CodDiagPr: (datosEgreso && informeDeEgreso.diagnosticoPrincipal) ? informeDeEgreso.diagnosticoPrincipal.codigo : '',
                    OtDiag1: (datosEgreso && informeDeEgreso.otrasCircunstancias) ? informeDeEgreso.otrasCircunstancias.nombre : '',
                    CodCauExtT: (datosEgreso && informeDeEgreso.causaExterna.producidaPor !== null) ? CodCauExtT[informeDeEgreso.causaExterna.producidaPor.nombre] : CodCauExtT['Se ignora'],
                    CauExtT: (datosEgreso && informeDeEgreso.causaExterna.producidaPor !== null) ? informeDeEgreso.causaExterna.producidaPor.id : 'Se ignora',
                    CodCauExtL: (datosEgreso && informeDeEgreso.causaExterna.lugar !== null) ? CodCauExtL[informeDeEgreso.causaExterna.lugar.nombre] : CodCauExtL['Se ignora'],
                    CauExtL: (datosEgreso && informeDeEgreso.causaExterna.lugar !== null) ? informeDeEgreso.causaExterna.lugar.nombre : 'Se ignora'
                };
                if (datosEgreso && informeDeEgreso.nacimientos && informeDeEgreso.nacimientos.length && informeDeEgreso.nacimientos[0].condicionAlNacer) {
                    let nacimientos = informeDeEgreso.nacimientos;
                    for (let j = 0; j < nacimientos.length; j++) {
                        resp['PesoNacerRN' + (j + 1)] = nacimientos[j].pesoAlNacer;
                        resp['CondNacRN' + (j + 1)] = nacimientos[j].condicionAlNacer;
                        resp['TermRN' + (j + 1)] = nacimientos[j].terminacion;
                        resp['SexoRN' + (j + 1)] = nacimientos[j].sexo;
                        resp['CodSexoRN' + (j + 1)] = CodSexo[nacimientos[j].sexo];
                    }
                }
                internacionResp.push(resp);
            }
        }
        return internacionResp;
    } catch (err) {
        return null;
    }
}
