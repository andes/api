import { Profesional } from '../core/tm/schemas/profesional';

async function run(done) {
    let i = 0;
    const profesionales = Profesional.find({}).cursor({ batchSize: 100 });
    for await (const profesional of profesionales) {
        try {
            profesional._createTokens();
            if (i % 100 === 0) {
                // tslint:disable-next-line:no-console
                console.log(i++);
            }
            await Profesional.update(
                { _id: profesional.id },
                {
                    $set: {
                        tokens: profesional.tokens
                    }
                }
            );
        } catch (e) {
            // tslint:disable-next-line:no-console
            console.error(profesional.id, e);
        }

    }

    done();
}

export = run;
