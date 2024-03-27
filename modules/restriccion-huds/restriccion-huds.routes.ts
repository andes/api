import { MongoQuery, ResourceBase } from '@andes/core';
import { restriccionHuds } from './restriccion-huds.schema';
import { readFile, storeFile, deleteFile } from './archivos/controller/restriccionHudsStore';

class restriccionHudsResource extends ResourceBase {
    Model = restriccionHuds;
    resourceName = 'restriccionHuds';
    routesEnable = ['get', 'post', 'delete'];
    searchFileds = {
        id: {
            field: '_id',
            fn: MongoQuery.equalMatch
        },
    };
}

export const restriccionHudsCtr = new restriccionHudsResource({});
export const restriccionHudsRouter = restriccionHudsCtr.makeRoutes();

restriccionHudsRouter.get('/store/:id', (req, res, next) => {
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

restriccionHudsRouter.post('/store', (req, res, next) => {
    const file = req.body.file;
    const metadata = req.body.metadata;
    storeFile(file, metadata).then((data) => {
        res.json(data);
    }).catch(next);
});

restriccionHudsRouter.delete('/store/:id', async (req, res, next) => {
    const id = req.params.id;
    deleteFile(id).then((data) => {
        res.json(data);
    }).catch(next);
});

