import { Prestacion } from '../modules/rup/schemas/prestacion';


async function run(done) {
    const count = 1;
    // se corrigen las prestaciones en donde las OS quedaron de forma incorrecta
    const ultimasPrestaciones = {
        // Fechas entre las que hubo problema con OS de pacientes
        createdAt: {
            $gte: new Date('2024-01-04 00:00:00.000-03:00'),
            $lte: new Date('2024-01-06 00:00:00.000-03:00')
        },
        'paciente.obraSocial.nombre.nombre': { $exists: true }
    };

    const cursor = Prestacion.find(ultimasPrestaciones).cursor({ batchSize: 100 });
    const actualizarTurnos = async (prestacion) => {
        let obraSocial = {
            nombre: '',
            financiador: '',
            prepaga: false,
            codigoPuco: null
        };

        obraSocial = prestacion.paciente?.obraSocial?.nombre || null;

        if (obraSocial.nombre) {
            try {
                if (prestacion.paciente.obraSocial) {
                    await Prestacion.updateOne(
                        { _id: prestacion.id },
                        {
                            $set: { 'paciente.obraSocial': obraSocial }
                        }
                    );
                }
            } catch (error) {

            }
        }
    };

    await cursor.eachAsync(async (prestacion: any) => {
        await actualizarTurnos(prestacion);
    });
    done();
}

export = run;
