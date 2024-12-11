import { services } from './../../services';


function agrupar(elementos) {
    const setAreas = new Set(elementos.map(d => d.area));
    const areasStr = Array.from(setAreas);
    const areas = [];
    const toItem = (e) => ({
        nombre: e.item,
        esTitulo: e.esTitulo === 'True' ? true : false,
        resultado: e.Resultado || e.resultado,
        unidadMedida: e.UnidadMedida || e.unidadMedida,
        metodo: e.Metodo,
        valorReferencia: e.valorReferencia,
        firma: e.esTitulo === 'True' ? '' : e.userValida
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
                    res.visible = false;
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
    } catch (e) {
        throw new Error('Error al obtener laboratorio.');
    }

    const response = await services.get(service).exec(params);
    const salida = data.idProtocolo ? agrupar(response[0].Data) : response;
    return salida;
}
