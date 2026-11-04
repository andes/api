export interface CodigoPrescripcion {
    fuente: string;
    valor: string;
}


export function getDatosPrescripcion(prescripcion) {
    let tipo: string, nombre: string, identificador: CodigoPrescripcion[];

    if (prescripcion.esMagistral) {
        tipo = 'magistral';
        identificador = prescripcion.magistral.codigo;
        nombre = prescripcion.magistral.nombre;

    } else {
        const esInsumo = ['dispositivo', 'nutricion'].includes(prescripcion.generico?.tipo) || ['dispositivo', 'nutricion'].includes(prescripcion.tipo);
        if (esInsumo) {
            tipo = prescripcion.generico?.tipo || prescripcion.tipo;
            identificador = prescripcion.generico.codigo || prescripcion.codigo; // creo que prescripcion.codigo no hace falta, sacar despues de pruebas
            nombre = prescripcion.generico.nombre || prescripcion.nombre;

        } else {
            tipo = 'medicamento';
            identificador = [{ valor: prescripcion.generico.conceptId || prescripcion.concepto?.conceptId, fuente: 'SNOMED' }];
            nombre = prescripcion.generico?.term || prescripcion.concepto?.term;

        }
    }
    // se eliminan ids de algunos codigos
    identificador = identificador.map(i => ({ valor: i.valor, fuente: i.fuente }));
    return { tipo, nombre, identificador };
}