import { InscripcionVacuna } from '../modules/vacunas/schemas/inscripcion-vacunas.schema';

async function run(done) {
    let i = 0;
    const inscripciones = InscripcionVacuna.find({}).cursor({ batchSize: 100 });
    for await (const inscripcion of inscripciones) {
        try {
            inscripcion._createTokens();
            if (i % 100 === 0) {
                // tslint:disable-next-line:no-console
                console.log(i++);
            }
            await InscripcionVacuna.update(
                { _id: inscripcion.id },
                {
                    $set: {
                        tokens: inscripcion.tokens
                    }
                }
            );
        } catch (e) {
            // tslint:disable-next-line:no-console
            console.error(inscripcion.id, e);
        }

    }

    done();
}

export = run;
