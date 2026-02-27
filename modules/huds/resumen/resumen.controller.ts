import { searchByPatient } from '../../../modules/cda/controller/CDAPatient';
import { FormsEpidemiologia } from '../../../modules/forms/forms-epidemiologia/forms-epidemiologia-schema';
import { Prestacion } from '../../../modules/rup/schemas/prestacion';

const SemanticTags = {
    hallazgos: ['hallazgo', 'situación', 'evento'],
    trastornos: ['trastorno'],
    procedimientos: ['procedimiento', 'entidad observable', 'régimen/tratamiento'],
    planes: ['procedimiento', 'régimen/tratamiento'],
    productos: ['producto', 'objeto físico', 'medicamento clínico', 'fármaco de uso clínico'],
    elementosderegistro: ['elemento de registro']
};

// Conceptos SNOMED para CDAs
const filtrosCDA = { laboratorioCDA: '4241000179101', laboratorioSISA: '3031000246109', vacuna: '33879002' };

function buscarSemanticTag(semanticTag: string): string | undefined {
    for (const key in SemanticTags) {
        if (SemanticTags[key].includes(semanticTag)) {
            return key;
        }
    }

    return undefined;
}

// Recupera todos los registros de la prestación
function buscarRegistros(registros) {
    const resultado = [];

    registros.forEach((registro) => {
        // Busca sección de tipo Colono o Epicrisis
        if (registro.hasSections) {
            const nuevasSecciones = registro.registros
                .filter(seccion => seccion.isSection && !seccion.noIndex)
                .flatMap(seccion => buscarRegistros(seccion.registros));

            resultado.push(...nuevasSecciones);
        }

        resultado.push(registro);
    });

    return resultado;
}

// Función principal: Contabiliza los tipos de registros de las prestaciones del paciente
async function contarRegistros(idPaciente: string) {
    const prestaciones = await obtenerPrestaciones(idPaciente);
    const solicitudesTop = await obtenerSolicitudesTop(idPaciente);
    const cdaPaciente = await obtenerCDA(idPaciente);
    const grupoRegistros = obtenerGrupoRegistros(prestaciones);
    const laboratorios = filtrarLaboratorios(cdaPaciente);
    const otrosCDA = filtrarOtrosCDA(cdaPaciente);
    const epidemiologia = await obtenerEpidemiologia(idPaciente);

    // Inicializa el objeto de tipos de registros
    const tiposDeRegistros: Record<string, number> = {
        solicitudes: solicitudesTop.length,
        laboratorios: laboratorios.length,
        prestaciones: prestaciones.length + otrosCDA.length + epidemiologia.length,
        hallazgos: 0,
        trastornos: 0,
        procedimientos: 0,
        vacunas: 0,
        productos: 0
    };

    // Contabiliza los tipos de registros por semanticTag
    contabilizarTiposDeRegistros(grupoRegistros, tiposDeRegistros);

    return tiposDeRegistros;
}

// Obtiene las prestaciones del paciente
async function obtenerPrestaciones(idPaciente: string): Promise<any[]> {
    const queryPrestaciones = {
        'paciente.id': idPaciente,
        'estadoActual.tipo': 'validada',
        inicio: { $ne: 'top' },
    };
    return Prestacion.find(queryPrestaciones);
}

// Obtiene las solicitudes inicializadas en módulo TOP
async function obtenerSolicitudesTop(idPaciente: string): Promise<any[]> {
    const querySolicitudes = {
        'paciente.id': idPaciente,
        'solicitud.prestacionOrigen': { $exists: false },
        inicio: 'top',
    };
    return Prestacion.find(querySolicitudes);
}

// Obtiene los CDA del paciente
async function obtenerCDA(idPaciente: string): Promise<any[]> {
    return searchByPatient(idPaciente, null, { skip: 0, limit: 0 });
}

// Obtiene los registros de las prestaciones
function obtenerGrupoRegistros(prestaciones: any[]): any[] {
    return prestaciones.reduce((acc, prestacion) => {
        const registros = buscarRegistros(prestacion.ejecucion?.registros);
        return acc.concat(registros);
    }, []);
}

// Filtra laboratorios de los CDA del paciente
function filtrarLaboratorios(cdaPaciente: any[]): any[] {
    return cdaPaciente.filter(cda => cda.prestacion.snomed.conceptId === filtrosCDA.laboratorioCDA);
}

// Filtra otros CDA (que no son laboratorios)
function filtrarOtrosCDA(cdaPaciente: any[]): any[] {
    return cdaPaciente.filter(cda => !Object.values(filtrosCDA).includes(cda.prestacion.snomed.conceptId));
}

// Función para obtener fichas epidemiológicas del paciente
async function obtenerEpidemiologia(idPaciente: string): Promise<any[]> {
    return FormsEpidemiologia.find({
        'paciente.id': idPaciente
    });
}

// Contabiliza los tipos de registros por semanticTag
function contabilizarTiposDeRegistros(grupoRegistros: any[], tiposDeRegistros: Record<string, number>): void {
    grupoRegistros.forEach(registro => {
        const semanticTag = registro.esSolicitud ? 'solicitudes' : buscarSemanticTag(registro.concepto?.semanticTag);

        // Filtra los registros que son evoluciones
        if (!registro.valor?.idRegistroOrigen) {
            tiposDeRegistros[semanticTag] = (tiposDeRegistros[semanticTag] || 0) + 1;
        }
    });
}


export const ResumenController = {
    contarRegistros
};
