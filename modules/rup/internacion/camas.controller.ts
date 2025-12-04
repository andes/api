import * as mongoose from 'mongoose';
import { Camas, INTERNACION_CAPAS } from './camas.schema';
import * as CamasEstadosController from './cama-estados.controller';
import * as moment from 'moment';
import { EstadosCtr } from './estados.routes';
import { Request } from '@andes/api-tool';
import { ObjectId } from '@andes/core';
import { ISnomedConcept } from '../schemas/snomed-concept';
import { EventCore } from '@andes/event-bus';
import { Auth } from '../../../auth/auth.class';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { internacionCamaEstadosLog as logger } from './internacion.log';
import { InformeEstadistica } from './informe-estadistica.schema';
interface INombre {
    _id: ObjectId;
    nombre?: String;
}

interface InternacionConfig {
    /**
     * ID de la organización de consulta.
     */
    organizacion: INombre;

    /**
     * El proceso hospitalario. 'internacion' o 'guardia'.
     * Por el momento solo se va a usar internacion.
     */

    ambito?: String;

    /**
     * La vista del mapa de capa. enfermeria, medica, estadistica.
     */

    capa: String;
}

interface SearchParams {
    cama?: ObjectId;
    paciente?: ObjectId;
    internacion?: ObjectId;
    estado?: ObjectId;
    fecha?: Date;
}

export interface ICama {
    _id: ObjectId;
    id: ObjectId;
    genero: ISnomedConcept;
    estado: String;
    esCensable: Boolean;
    idInternacion: ObjectId;
    esMovimiento: Boolean;
    fecha: Date;
    unidadOrganizativa: ISnomedConcept;
    especialidades: ISnomedConcept[];
    createdAt: Date;
    createdBy: Object;
    organizacion: { _id: ObjectId; nombre: String };
    ambito: String;
    unidadOrganizativaOriginal: ISnomedConcept;
    sectores: Object[];
    nombre: String;
    tipoCama: ISnomedConcept;
    equipamiento: ISnomedConcept[];
    capa: String;
    paciente?: {
        _id: ObjectId;
        id: ObjectId;
        nombre: String;
        apellido: String;
        sexo?: String;
        documento?: String;
        fechaNacimiento?: Date;
    };
    extras: any;
    nota: String;
    fechaIngreso: Date;
}


/**
 * Listado de camas y sus estados a una fecha determinada.
 */

export async function search({ organizacion, capa, ambito }: InternacionConfig, params: SearchParams): Promise<ICama[]> {
    let timestamp = moment().toDate();

    if (params.fecha) {
        timestamp = moment(params.fecha).toDate();
    }

    return await CamasEstadosController.snapshotEstados({ fecha: timestamp, organizacion: organizacion._id, ambito, capa }, params);
}

export async function historial({ organizacion, capa, ambito }, cama: ObjectId, internacion: ObjectId, desde: Date, hasta: Date, esMovimiento: boolean = null) {
    const movimientos = await CamasEstadosController.searchEstados({ desde, hasta, organizacion, capa, ambito }, { cama, internacion, esMovimiento });
    return movimientos;
}

/**
 * Devuelve una cama en particular a una cierta hora.
 */
export async function findById({ organizacion, capa, ambito }: InternacionConfig, idCama: ObjectId, timestamp: Date = null): Promise<ICama> {
    if (!timestamp) {
        timestamp = moment().toDate();
    }

    const estadoCama = await CamasEstadosController.snapshotEstados({ fecha: timestamp, organizacion: organizacion._id, ambito, capa }, { cama: idCama });
    if (estadoCama.length > 0) {
        return estadoCama[0];
    }

    return null;
}

/**
 * Devuelve la cama donde esta el paciente en un determinado horario
 */
export async function findByPaciente({ organizacion, capa, ambito }: InternacionConfig, idPaciente: ObjectId, timestamp: Date = null): Promise<ICama> {
    if (!timestamp) {
        timestamp = moment().toDate();
    }
    const estadoCama = await CamasEstadosController.snapshotEstados({ fecha: timestamp, organizacion: wrapOrganizacion(organizacion), ambito, capa }, { paciente: idPaciente });
    if (estadoCama.length > 0) {
        return estadoCama[0];
    }

    return null;
}

function wrapOrganizacion(organizacion) {
    return organizacion.id || organizacion._id || organizacion;
}


export async function listaEspera({ fecha, organizacion, ambito, capa }: { fecha: Date; organizacion: INombre; ambito: String; capa: String }) {

    const $match = {};
    if (fecha) {
        $match['informeIngreso.fechaIngreso'] = {
            $lte: moment(fecha).toDate().toISOString()
        };
    } else {
        fecha = new Date();
    }

    const informes$ = InformeEstadistica.find({
        'organizacion._id': mongoose.Types.ObjectId(organizacion._id as any),
        'informeIngreso.fechaIngreso': { $lte: moment(fecha).toDate() },
        'estadoActual.tipo': 'ejecucion',
        ...$match
    }).lean();

    const estadoCama$ = CamasEstadosController.snapshotEstados({ fecha, organizacion: organizacion._id, ambito, capa }, {});

    const [informes, estadoCama] = await Promise.all([informes$, estadoCama$]);

    const listaDeEspera = informes.filter(inf => !estadoCama.find(est => String(inf._id) === String(est.idInternacion)));

    return listaDeEspera;
}


/**
 *
 * @param cama objeto cama a partir del cual se crean los estados
 * @param req
 * @returns array de nuevos estados
 */
export async function storeEstados(cama: Partial<ICama>, req: Request) {


    const fecha = cama.fecha || moment().toDate();

    const nuevoEstado = {
        fecha,
        estado: 'disponible',
        unidadOrganizativa: cama.unidadOrganizativa,
        especialidades: cama.especialidades,
        genero: cama.genero,
        esCensable: cama.esCensable,
        esMovimiento: cama.esMovimiento,
        equipamiento: cama.equipamiento,
        nota: cama.nota,
    };


    const organizacionId =
        (cama.organizacion as any)._id
            ? (cama.organizacion as any)._id
            : cama.organizacion;


    const organizacion = await Organizacion.findById(organizacionId);

    let capas = INTERNACION_CAPAS;
    if (organizacion?.usaEstadisticaV2) {
        capas = capas.filter(capa => capa !== 'estadistica');
    }

    const resultados = await Promise.all(
        capas.map(async capa => {

            const params = {
                organizacion: organizacionId,
                ambito: cama.ambito,
                capa,
                cama: cama._id
            };


            const result = await CamasEstadosController.store(params, nuevoEstado, req);


            return { capa, result };
        })
    );


    const [estadosSaved] = resultados.map(r => r.result);

    return estadosSaved?.nModified > 0 && estadosSaved?.ok === 1;
}

/**
 * Modifica el estado de una cama.
 * @param data nuevos atributos de cama/estadoCama
 * @param req
 */

export async function patchEstados(data: Partial<ICama>, req: Request) {
    const organizacionConfig = {
        organizacion: data.organizacion,
        capa: data.capa,
        ambito: data.ambito
    };

    const estadoCama = await findById(organizacionConfig, data.id, data.fecha);

    let cambioPermitido = true;

    if (data.esMovimiento) {

        const orgId = data.organizacion && data.organizacion._id
            ? data.organizacion._id
            : data.organizacion;


        const maquinaEstado = await EstadosCtr.encontrar(
            orgId,
            data.ambito,
            data.capa
        );

        const estadoAnterior = estadoCama?.estado || 'null';

        cambioPermitido = await maquinaEstado.check(
            estadoAnterior,
            data.estado,
            estadoCama?.idInternacion,
            data.idInternacion
        );
    } else {
        delete data['idInternacion'];
        delete data['estado'];
        delete data['paciente'];
    }

    if (cambioPermitido) {

        delete data['idCama'];
        delete data['createdAt'];
        delete data['createdBy'];
        delete data['updatedAt'];
        delete data['updatedBy'];

        if (estadoCama && data.esMovimiento) {
            estadoCama.extras = null;
        }

        const nuevoEstado = {
            ...(data.esMovimiento ? estadoCama : {}),
            ...data,
            esMovimiento: data.esMovimiento,
            idInternacion: data.idInternacion


        };

        const orgId = data.organizacion && data.organizacion._id
            ? data.organizacion._id
            : data.organizacion;

        await CamasEstadosController.store({
            organizacion: orgId,
            ambito: data.ambito,
            capa: data.capa,
            cama: data.id
        }, nuevoEstado, req);

        if (nuevoEstado.extras?.egreso) {
            EventCore.emitAsync('mapa-camas:paciente:egreso', nuevoEstado);
        }
        if (nuevoEstado.extras?.ingreso) {
            EventCore.emitAsync('mapa-camas:paciente:ingreso', { ...nuevoEstado });
        }
        if (nuevoEstado.extras?.unidadOrganizativaOrigen) {
            EventCore.emitAsync('mapa-camas:paciente:pase', { ...nuevoEstado });
        }

        return nuevoEstado;
    }

    logger.info('patchEstados', {
        info: 'cambio no permitido',
        fecha: moment().toDate(),
        estadoAnterior: estadoCama,
        nuevoEstado: data
    }, req);

    return null;
}
/**
 * Operacion especial para cambiar la fecha de un estado.
 */
export async function changeTime({ organizacion, capa, ambito }: InternacionConfig, cama: ObjectId, from: Date, to: Date, internacionId: ObjectId, req) {

    let start, end;
    if (from.getTime() <= to.getTime()) {
        start = from;
        end = to;
    } else {
        start = to;
        end = from;
    }

    const movements = await CamasEstadosController.searchEstados(
        { desde: start, hasta: end, organizacion: organizacion._id, capa, ambito },
        { internacion: internacionId }
    );

    if (movements.length > 1) {
        return false;
    }

    const myMov = movements[0];

    await CamasEstadosController.remove(
        { organizacion: organizacion._id, capa, ambito, cama },
        from
    );

    myMov.fecha = to;

    const valid = await CamasEstadosController.store(
        { organizacion: organizacion._id, capa, ambito, cama },
        myMov,
        req
    );

    return valid;
}
/**
 * Chequea la integridad de los estados de las camas.
 */
export async function integrityCheck({ organizacion, capa, ambito }: InternacionConfig, { cama, from, to }) {
    let start = from || moment('1900-01-01').toDate();
    let end = to || moment().toDate();
    if (start.getTime() > end.getTime()) {
        const aux = start;
        start = end;
        end = aux;
    }

    const allMovements = await CamasEstadosController.searchEstados({ desde: start, hasta: end, organizacion: organizacion._id, capa, ambito }, { cama });
    const groupedMovements = groupBy(allMovements, 'idCama');
    const maquinaEstado = await EstadosCtr.encontrar(organizacion._id, ambito, capa);

    const checkPromises = Object.values(groupedMovements).map((movementsCama: ICama[]) => {
        return movementsCama.slice(1).map(async (movement, index) => {
            const sourceMovement = movementsCama[index];
            if (movement.esMovimiento) {
                let cambioPermitido = false;

                if (sourceMovement.estado !== movement.estado) {
                    cambioPermitido = await maquinaEstado.check(sourceMovement.estado, movement.estado);
                } else {
                    if (movement.estado === 'ocupada') {
                        cambioPermitido = false;
                    } else {
                        cambioPermitido = true;
                    }
                }


                if (!cambioPermitido) {
                    return { source: sourceMovement, target: movement };
                }
            }
            return null;
        });
    });

    const flattened = [].concat(...checkPromises);
    const allViolations = await Promise.all(flattened);


    const res = allViolations.filter(violation => violation !== null);

    return res;
}

function groupBy(xs: any[], key: string) {
    return xs.reduce((rv, x) => {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
}

export async function sectorChange(idOrganizacion, sector) {
    await Camas.update(
        {
            'organizacion._id': mongoose.Types.ObjectId(idOrganizacion),
            sectores: { $elemMatch: { _id: mongoose.Types.ObjectId(sector._id) } }
        },
        {
            $set: {
                'sectores.$.nombre': sector.nombre,
                'sectores.$.tipoSector': sector.tipoSector,
                'sectores.$.unidadConcept': sector.unidadConcept,
            }
        },
        {
            upsert: false,
            multi: true,
        }
    );
}

export async function checkSectorDelete(idOrganizacion: string, idSector: string) {
    const ambito = 'internacion';
    const capa = 'estadistica';
    const estadoCama = await CamasEstadosController.snapshotEstados({ fecha: moment().toDate(), organizacion: idOrganizacion, ambito, capa }, { sector: idSector });
    if (estadoCama[0] && estadoCama[0].estado !== 'inactiva') {
        return false;
    }

    return true;
}

EventCore.on('mapa-camas:paciente:pase', async (estado) => {
    if (estado?.idInternacion && estado.capa === 'estadistica') {
        const informe: any = await InformeEstadistica.findById(estado.idInternacion);
        if (informe) {
            informe.unidadOrganizativa = estado.unidadOrganizativa;
            const user = Auth.getUserFromResource(informe);
            Auth.audit(informe, user as any);
            await informe.save();
        }
    }
});
