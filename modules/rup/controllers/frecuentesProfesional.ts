import { profesionalMeta } from '../schemas/profesionalMeta';

export function actualizarFrecuentes(data) {
    return new Promise((resolve, reject) => {
        const query = {
            // profesional
            ...(data.profesional) && { 'profesional.id': data.profesional.id },
            // organizacion
            ...(data.organizacion.id) && { 'organizacion.id': data.organizacion.id },
            // tipoPrestacion
            ...(data.tipoPrestacion.conceptId) && { 'tipoPrestacion.conceptId': data.tipoPrestacion.conceptId }
        };

        profesionalMeta.findOne(query, (err, resultado: any) => {
            if (err) {
                return reject(err);
            }

            // si no existe agregamos el nuevo frecuente
            if (typeof resultado === null || !resultado) {
                const frecuente = new profesionalMeta(data);

                frecuente.save((err2) => {
                    if (err2) {
                        return reject(err2);
                    }
                    resolve(resultado);
                });

            } else {

                if (data.frecuentes) {
                    data.frecuentes.forEach(frecuente => {
                        const indexConcepto = resultado.frecuentes.findIndex(x => x.concepto.conceptId === frecuente.concepto.conceptId);

                        if (indexConcepto === -1) {
                            resultado.frecuentes.push({
                                concepto: frecuente.concepto,
                                frecuencia: 1
                            });
                        } else {
                            resultado.frecuentes[indexConcepto].frecuencia = parseInt(resultado.frecuentes[indexConcepto].frecuencia, 0) + 1;
                        }
                    });
                }

                resultado.save((err2, data2) => {
                    if (err2) {
                        return reject(err2);
                    }
                    resolve(data2);
                });
            }
        });
    });
}
