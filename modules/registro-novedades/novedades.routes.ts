
import { MongoQuery, ResourceBase } from '@andes/core';
import { Novedades } from './novedades.schema';
import { readFile, storeFile } from './images/controller/imageStore';


class NovedadesResource extends ResourceBase {
    Model = Novedades;
    resourceName = 'novedades';
    searchFileds = {
        titulo: MongoQuery.partialString,
        descripcion: MongoQuery.partialString,
        fecha: MongoQuery.equalMatch,
        activa: MongoQuery.equalMatch,
        modulos: {
            field: 'modulo._id',
            fn: (value) => {
                return { $in: value };
            }
        }
    };
}


export const NovedadesCtr = new NovedadesResource({});
export const NovedadesRouter = NovedadesCtr.makeRoutes();

NovedadesRouter.get('/store/:id', (req, res, next) => {
    readFile(req.params.id).then((data: any) => {
        res.contentType(data.file.contentType);
        data.stream.on('data', (data2) => {
            res.write(data2);
        });

        data.stream.on('end', () => {
            res.end();
        });
    }).catch(next);
});

NovedadesRouter.post('/store', (req, res, next) => {
    const file = req.body.file;
    const metadata = req.body.metadata;
    storeFile(file, metadata).then((data) => {
        res.json(data);
    }).catch(next);
});
