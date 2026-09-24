import { PacienteCtr } from '../../core-v2/mpi';
import { services } from './../../services';
import { IDENTIFICACION } from '../../shared/constantes';
import * as moment from 'moment';

function agrupar(elementos) {
    const setAreas = new Set(elementos.map(d => d.area));
    const areasStr = Array.from(setAreas);
    const areas = [];
    const toItem = (e) => ({
        nombre: e.item,
        esTitulo: e.esTitulo === 'True' ? true : false,
        resultado: e.Resultado || e.resultado,
        unidadMedida: e.UnidadMedida || e.unidadMedida,
        metodo: (e.Metodo || e.metodo || '').replace(/^m[ée]todo:\s*/i, '').trim(),
        valorReferencia: e.valorReferencia,
        firma: e.esTitulo === 'True' ? '' : e.userValida,
        codificaHiv: e.codificaHiv === 'True' ? true : false,
        fechaHoraValida: e.fechaHoraValida ? moment(e.fechaHoraValida).format('DD/MM/YYYY HH:mm') : ''
    });

    areasStr.forEach(area => {
        const detallesArea = elementos.filter(d => d.area === area);
        const setGrupos = new Set(detallesArea.map(d => d.grupo));
        const grupos = Array.from(setGrupos);
        const item = {
            area,
            grupos: grupos.map(g => {
                const detallesAreaGrupo = detallesArea.filter(da => da.grupo === g);
                const res: any = {};
                res.grupo = g;
                if (detallesAreaGrupo.length === 1 && detallesAreaGrupo[0].grupo === g) {
                    res.items = [toItem(detallesAreaGrupo[0])];
                    res.visible = true;
                } else {
                    res.items = detallesAreaGrupo.map(toItem);
                    res.visible = true;
                }

                return res;
            })
        };
        areas.push(item);
    });
    return areas;
}

export async function search(data) {
    let params;
    const service = 'get-LABAPI';
    try {

        if (data.idProtocolo) {
            params = {
                parametros: `nombre=LABAPI_GetResultadoProtocolo&parametros=${data.idProtocolo}`
            };
        } else {
            params = {
                parametros: `nombre=LABAPI_GetProtocolos&parametros=${data.estado}|${data.dni}|${data.fechaNac}|${data.apellido}|${data.fechaDesde}|${data.fechaHasta}`
            };
        }

        const response = await services.get(service).exec(params);

        if (!response || (Array.isArray(response) && response.length === 0)) {
            throw new Error('El servicio no devolvió datos');
        }

        const salida = data.idProtocolo ? agrupar(response[0].Data) : response;
        return salida;
    } catch (e) {
        const errorMessage = e.message || 'Error desconocido';
        throw new Error('Error al obtener laboratorio: ' + errorMessage);
    }
}

export async function searchByDocumento(pacienteId, fechaDesde?, fechaHasta?) {
    let dataSearch;
    fechaDesde = fechaDesde ? moment(fechaDesde).format('YYYYMMDD') : moment('01/01/2020', 'DD-MM-YYYY').format('YYYYMMDD');
    fechaHasta = fechaHasta ? moment(fechaHasta).format('YYYYMMDD') : moment().format('YYYYMMDD');
    try {
        const paciente = await PacienteCtr.findById(pacienteId);
        if (paciente) {
            let estado;
            let documento = paciente.documento;
            const documentosExtranjeros = IDENTIFICACION.enum.filter(item => item !== null);

            if (documento) { // dni argentino
                estado = 'validado';
            } else if (documentosExtranjeros.includes(paciente.tipoIdentificacion)) { // dni extranjero o pasaporte
                estado = 'EX';
                documento = paciente.numeroIdentificacion;
            } else {
                if (paciente.edad <= 5 && paciente.relaciones?.length) { // recien nacido (aún sin dni)
                    estado = 'RN';

                    // El bebé sin DNI queda asociado, del lado del laboratorio, a UN
                    // solo referente (padre, madre o tutor/a) — nunca a varios a la
                    // vez. No sabemos de antemano cuál de sus relaciones es la
                    // asociada, así que se prueba cada una hasta encontrar la que
                    // tiene laboratorios cargados.
                    const referentes = paciente.relaciones.filter(
                        rel => rel.relacion.nombre === 'progenitor/a' || rel.relacion.nombre === 'tutor'
                    );

                    if (!referentes.length) {
                        return [];
                    }

                    const documentosReferentes = referentes
                        .map(rel => rel.documento || rel.numeroIdentificacion)
                        .filter(doc => !!doc);

                    // Saco duplicados (ej: si por error padre y madre comparten el
                    // mismo documento cargado, no se hace la misma consulta dos veces)
                    const documentosUnicos = Array.from(new Set(documentosReferentes));

                    if (!documentosUnicos.length) {
                        return [];
                    }

                    const dataSearchBase = {
                        estado,
                        fechaNac: moment(paciente.fechaNacimiento).utc().format('YYYYMMDD'),
                        apellido: paciente.apellido,
                        fechaDesde,
                        fechaHasta
                    };

                    for (const dni of documentosUnicos) {
                        dataSearch = { ...dataSearchBase, dni };
                        try {
                            const resultado = await this.search(dataSearch);
                            if (Array.isArray(resultado) && resultado.length > 0) {
                                return resultado;
                            }
                        } catch (err) {
                            // Este referente no tiene laboratorios (o falló la consulta
                            // puntual): se sigue probando con el resto de los referentes.
                        }
                    }

                    // Ningún referente tenía laboratorios asociados
                    return [];
                }
            }
            if (!estado || !documento) {
                return [];
            }
            dataSearch = {
                estado,
                dni: documento,
                fechaNac: moment(paciente.fechaNacimiento).utc().format('YYYYMMDD'),
                apellido: paciente.apellido,
                fechaDesde,
                fechaHasta
            };
            return await this.search(dataSearch);
        }
    } catch (err) {
        return { err, dataSearch };
    }
}
