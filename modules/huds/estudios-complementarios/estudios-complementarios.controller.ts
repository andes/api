import { Types } from 'mongoose';
import * as moment from 'moment';
import { Constantes } from '../../constantes/constantes.schema';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { makeFs } from '../../cda/schemas/CDAFiles';
import { Prestacion } from '../../rup/schemas/prestacion';

export async function getEstudiosComplementarios(idPaciente: string, options: { fechaDesde?: string | Date; fechaHasta?: string | Date } = {}) {
    if (!Types.ObjectId.isValid(idPaciente)) {
        return [];
    }

    const paciente: any = await PacienteCtr.findById(idPaciente);
    if (!paciente) {
        return [];
    }

    const pacienteIdsRaw = [
        paciente._id || paciente.id,
        ...(paciente.vinculos || []),
        ...(paciente.idPacientePrincipal ? [paciente.idPacientePrincipal] : [])
    ];
    const pacienteIds = pacienteIdsRaw.filter(Boolean).map(id => (typeof id === 'string' ? new Types.ObjectId(id) : id));

    // 1. Cargar constante de límite de años (por defecto 1 año)
    let limiteAnios = 1;
    const constanteLimite: any = await Constantes.findOne({
        $or: [
            { key: 'estudios-complementarios-limite-anios' },
            { nombre: 'estudios-complementarios-limite-anios' }
        ]
    });
    if (constanteLimite) {
        const valStr = constanteLimite.nombre || constanteLimite.source;
        const parsed = parseInt(valStr, 10);
        if (!isNaN(parsed) && parsed > 0) {
            limiteAnios = parsed;
        }
    }

    // 2. Cargar constante de tipos de prestaciones/conceptos (por defecto Ecografías: "359659005")
    // let conceptIds: string[] = ['359659005'];90226004 pap
    let conceptIds: string[] = ['90226004'];
    const constanteConceptos: any = await Constantes.findOne({
        $or: [
            { key: 'estudios-complementarios-conceptos' },
            { nombre: 'estudios-complementarios-conceptos' }
        ]
    });
    if (constanteConceptos) {
        const sourceVal = constanteConceptos.source || constanteConceptos.nombre || constanteConceptos.value;
        if (Array.isArray(sourceVal)) {
            conceptIds = sourceVal.map(c => String(c));
        } else if (typeof sourceVal === 'string') {
            try {
                const parsed = JSON.parse(sourceVal);
                if (Array.isArray(parsed)) {
                    conceptIds = parsed.map(c => String(c));
                } else {
                    conceptIds = sourceVal.split(',').map(s => s.trim()).filter(Boolean);
                }
            } catch (e) {
                conceptIds = sourceVal.split(',').map(s => s.trim()).filter(Boolean);
            }
        }
    }

    // 3. Definir rango temporal
    const fechaDesde = options.fechaDesde
        ? moment(options.fechaDesde).startOf('day').toDate()
        : moment().subtract(limiteAnios, 'years').startOf('day').toDate();

    const fechaHasta = options.fechaHasta
        ? moment(options.fechaHasta).endOf('day').toDate()
        : moment().endOf('day').toDate();

    // 4. Buscar CDAs en GridFS
    const CDAFiles = makeFs();
    const cdaQuery: any = {
        'metadata.paciente': { $in: pacienteIds },
        'metadata.cdaId': null,
        'metadata.fecha': { $gte: fechaDesde, $lte: fechaHasta }
    };
    if (conceptIds.length > 0) {
        cdaQuery['metadata.prestacion.snomed.conceptId'] = { $in: conceptIds };
    }

    const cdaDocs = await CDAFiles.find(cdaQuery).sort({ 'metadata.fecha': -1 }).toArray();
    const cdaList = cdaDocs.map((item: any) => {
        const meta = item.metadata || {};
        return {
            id: item._id,
            fecha: meta.fecha,
            efector: {
                id: meta.organizacion?._id || meta.organizacion?.id,
                nombre: meta.organizacion?.nombre || meta.organizacion?.name
            },
            tipoPrestacion: {
                conceptId: meta.prestacion?.snomed?.conceptId,
                term: meta.prestacion?.snomed?.term,
                fsn: meta.prestacion?.snomed?.fsn
            },
            tipo: 'cda',
            accesoHuds: {
                id: item._id,
                tipo: 'cda'
            }
        };
    });

    // 5. Buscar prestaciones RUP validadas (con agenda o fuera de agenda)
    const prestacionQuery: any = {
        'paciente.id': { $in: pacienteIds },
        'estadoActual.tipo': 'validada',
        $or: [
            { 'ejecucion.fecha': { $gte: fechaDesde, $lte: fechaHasta } },
            { 'estadoActual.createdAt': { $gte: fechaDesde, $lte: fechaHasta } }
        ]
    };
    if (conceptIds.length > 0) {
        prestacionQuery['solicitud.tipoPrestacion.conceptId'] = { $in: conceptIds };
    }

    const rupDocs: any[] = await Prestacion.find(prestacionQuery);
    const rupList = rupDocs.map(p => {
        const raw = p.toJSON ? p.toJSON() : p;
        const lastState = raw.estados && raw.estados.length ? raw.estados[raw.estados.length - 1] : raw.estadoActual;
        return {
            id: raw._id,
            fecha: raw.ejecucion?.fecha || lastState?.createdAt || raw.solicitud?.fecha,
            efector: {
                id: raw.solicitud?.organizacion?.id || raw.ejecucion?.organizacion?.id,
                nombre: raw.solicitud?.organizacion?.nombre || raw.ejecucion?.organizacion?.nombre
            },
            tipoPrestacion: {
                conceptId: raw.solicitud?.tipoPrestacion?.conceptId,
                term: raw.solicitud?.tipoPrestacion?.term,
                fsn: raw.solicitud?.tipoPrestacion?.fsn
            },
            tipo: 'rup',
            accesoHuds: {
                id: raw._id,
                tipo: 'rup'
            }
        };
    });

    // 6. Unificar y ordenar por fecha descendente
    const result = [...cdaList, ...rupList].sort((a, b) => {
        return moment(b.fecha).diff(moment(a.fecha));
    });

    return result;
}
