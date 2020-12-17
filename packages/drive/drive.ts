
import { FileAdapter, MongoAdapter, SeaweedAdapter } from './adapters';
import MulterMiddleware from './middleware/multer';
import { IFileDescriptor } from './file-descriptor/schemas';
import { FileDescriptor } from './file-descriptor/controller';

export class AndesDrive {
    private static adapter = null;
    private static multer = null;

    static setup(params) {
        const adapterName = params.adapter || 'file';
        const options = params.options || {};
        switch (adapterName) {
            case 'file':
                this.adapter = new FileAdapter({ folder: options.folder || './' });
                break;
            case 'mongo':
                this.adapter = new MongoAdapter({ host: options.host });
                break;
            case 'seaweed':
                const server = options.host || '127.0.0.1';
                const port = options.port || '9333';
                this.adapter = new SeaweedAdapter({ port, server });
                break;
        }
        this.multer = MulterMiddleware(this.adapter);
    }

    public static install(router) {
        router.post('/', this.multer.single('file'), async (req: any, res, next) => {
            try {
                const file = req.file;
                const extension = file.originalname.split('.').pop();
                const data: IFileDescriptor = {
                    real_id: file.id,
                    adapter: file.adapter,
                    originalname: file.originalname,
                    extension,
                    mimetype: file.mimetype
                };
                if (req.body.origen) {
                    data.origin = req.body.origen;
                }
                const fd = await FileDescriptor.create(data, req);
                if (fd) {
                    return res.send({ id: fd._id });
                }
                return next(422);
            } catch (err) {
                return next(err);
            }
        });

        router.get('/:uuid', async (req: any, res, next) => {
            const uuid = req.params.uuid;
            const fd = await FileDescriptor.find(uuid);
            if (fd) {
                const stream = await this.adapter.read(fd.real_id);
                res.writeHead(200, {
                    'Content-Type': fd.mimetype.toString(),
                    'Content-Disposition': `attachment; filename=${fd.originalname}`
                });
                stream.pipe(res);
            } else {
                return next(404);
            }
        });

        router.delete('/:uuid', async (req: any, res, next) => {
            try {
                const uuid = req.params.uuid;
                const fd = await FileDescriptor.find(uuid);
                if (fd) {
                    await this.adapter.delete(fd.real_id);
                    await FileDescriptor.delete(fd._id);
                    return res.send({ id: fd._id });
                } else {
                    return next(404);
                }
            } catch (err) {
                return next(err);
            }
        });

        return router;
    }

    public static async find(id) {
        return FileDescriptor.find(id);
    }

    public static async read(file: IFileDescriptor) {
        return await this.adapter.read(file.real_id);
    }

    public static async writeFile(archivo, req) {
        let realid = await this.adapter.write(archivo.stream);
        const extension = archivo.file.filename.split('.').pop();
        const data: any = {
            _id: archivo.file._id,
            real_id: realid,
            adapter: archivo.file.adapter,
            originalname: archivo.file.filename,
            extension,
            mimetype: archivo.file.contentType,
            origin: 'com'
        };
        const fd = await FileDescriptor.create(data, req);
        return fd;
    }

}
