import { Profesional } from '../core/tm/schemas/profesional';

async function run(done) {
    let i = 0;
    const profesionales = Profesional.find({}).cursor({ batchSize: 100 });
    for await (const profesional of profesionales) {
        try {
            (profesional as any)._createTokens();
            if (i % 100 === 0) {
                // eslint-disable-next-line no-console
                console.log(i++);
            }
            await Profesional.updateOne(
                { _id: profesional.id },
                {
                    $set: {
                        tokens: (profesional as any).tokens
                    }
                }
            );
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(profesional.id, e);
        }

    }

    done();
}

export = run;
