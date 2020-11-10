import { ProfesionalMeta } from '../schemas/profesionalMeta';

export async function actualizarFrecuentes(data) {

    const query = {
        // profesional
        ...(data.profesional) && { 'profesional.id': data.profesional.id },
        // organizacion
        ...(data.organizacion.id) && { 'organizacion.id': data.organizacion.id },
        // tipoPrestacion
        ...(data.tipoPrestacion.conceptId) && { 'tipoPrestacion.conceptId': data.tipoPrestacion.conceptId }
    };

    const resultado = await ProfesionalMeta.findOne(query);

    // si no existe agregamos el nuevo frecuente
    if (!resultado) {
        const frecuente = new ProfesionalMeta(data);
        await frecuente.save();
        return resultado;
    } else {
        if (data.frecuentes) {
            data.frecuentes.forEach(frecuente => {
                const indexConcepto = resultado.frecuentes.findIndex(x => x.concepto.conceptId === frecuente.concepto.conceptId);
                if (indexConcepto === -1) {

                    resultado.frecuentes.push({
                        concepto: frecuente.concepto,
                        esSolicitud: frecuente.esSolicitud,
                        frecuencia: 1,
                        lastUse: new Date()
                    });
                } else {

                    if (resultado.frecuentes[indexConcepto].frecuencia) {
                        resultado.frecuentes[indexConcepto].frecuencia = parseInt(resultado.frecuentes[indexConcepto].frecuencia as any, 0) + 1;
                    } else {
                        resultado.frecuentes[indexConcepto].frecuencia = 1;
                    }
                    resultado.frecuentes[indexConcepto].lastUse = new Date();
                }
            });
        }

        await resultado.save();
        return resultado;
    }
}
