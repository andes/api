import { asyncHandler, Request, Response, Router } from '@andes/api';
import { Auth } from '../auth/auth.class';

export interface IPermisos {
    get?: string;
    find?: string;
    post?: string;
    patch?: string;
    delete?: string;
}

export class SubresourceRoutes {
    /**
     * Nombre del recurso primario
     */
    resourceName: string;

    /**
     * nombre del recurso secundario
     */
    subresourceName: string;

    /**
     * Error devuelto cuando el recurso primario no existe
     */

    notFoundError: any = Error;

    subresourceId = 'id';

    subresourcesCtr;
    resourcesCtr;


    permisos: IPermisos = {};

    constructor(resourcesCtr, subresourcesCtr) {
        this.subresourcesCtr = subresourcesCtr;
        this.resourcesCtr = resourcesCtr;
    }

    /**
     * Devuelve el recurso primario almacenado en la request de Express.
     */

    getResource(req: Request) {
        return req.resources[this.resourceName];
    }

    /**
     * Etiqueta para express del recurso primario
     */

    resourceLabel() {
        return `id${this.resourceName}`;
    }

    /**
     * Busca un recurso primario.
     */

    async findResource(req: Request, res: Response, next) {
        const resourceId = this.resourceLabel();
        const resource = await this.resourcesCtr.findById(req.params[resourceId]);
        if (resource) {
            req.resources = req.resources || {};
            req.resources[this.resourceName] = resource;
            return next();
        } else {
            return next(new this.notFoundError());
        }
    }

    /**
     * Graba el recurso primario
     */

    async save(resource, req) {
        await this.resourcesCtr.store(resource, req);
    }

    /**
     * Genera las rutas de los subrecursos.
     */

    getRoutes() {
        const resourceId = this.resourceLabel();
        const router = Router();
        router.param(resourceId, asyncHandler(this.findResource.bind(this)));

        if (this.permisos['find']) {
            router.get(`/:${resourceId}/${this.subresourceName}`, Auth.authorize(this.permisos['find']), asyncHandler(this.find));
        } else {
            router.get(`/:${resourceId}/${this.subresourceName}`, asyncHandler(this.find));
        }

        if (this.permisos['get']) {
            router.get(`/:${resourceId}/${this.subresourceName}/:${this.subresourceId}`, Auth.authorize(this.permisos['get']), asyncHandler(this.get));
        } else {
            router.get(`/:${resourceId}/${this.subresourceName}/:${this.subresourceId}`, asyncHandler(this.get));
        }

        if (this.permisos['post']) {
            router.post(`/:${resourceId}/${this.subresourceName}`, Auth.authorize(this.permisos['post']), asyncHandler(this.post));
        } else {
            router.post(`/:${resourceId}/${this.subresourceName}`, asyncHandler(this.post));
        }

        if (this.permisos['patch']) {
            router.patch(`/:${resourceId}/${this.subresourceName}/:${this.subresourceId}`, Auth.authorize(this.permisos['patch']), asyncHandler(this.patch));
        } else {
            router.patch(`/:${resourceId}/${this.subresourceName}/:${this.subresourceId}`, asyncHandler(this.patch));
        }

        if (this.permisos['delete']) {
            router.delete(`/:${resourceId}/${this.subresourceName}/:${this.subresourceId}`, Auth.authorize(this.permisos['delete']), asyncHandler(this.delete));
        } else {
            router.delete(`/:${resourceId}/${this.subresourceName}/:${this.subresourceId}`, asyncHandler(this.delete));

        }
        return router;
    }

    /**
    * @api {get} /resource/:idResource/subresources
    * @apiName get
    * @apiGroup MPI
    *
    * @apiSuccess {Array} Listado
    */

    find = (req: Request, res: Response) => {
        const resource = this.getResource(req);
        let lista = this.subresourcesCtr.find(resource, req.query);
        return res.json(lista);
    }

    /**
    * @api {get} /resource/:idResource/subresources/:idSubresource
    * @apiName getSubresource
    * @apiGroup MPI
    *
    * @apiSuccess {ISubresource} Subresource.
    */

    get = async (req: Request, res: Response) => {
        const resource = this.getResource(req);
        const lista = this.subresourcesCtr.findById(resource, req.params[this.subresourceId]);
        return res.json(lista);
    }

    /**
    * @api {post} /resource/:idResource/subresources Creación de un nuevo subresource
    * @apiName post
    * @apiGroup MPI
    *
    */

    post = async (req: Request, res: Response) => {
        const resource = this.getResource(req);
        let newElement = this.subresourcesCtr.make(req.body);
        this.subresourcesCtr.store(resource, newElement);
        await this.save(resource, req);
        return res.json(newElement);
    }

    /**
    * @api {patch} /resource/:idResource/subresources/:idSubResource Modifica un subrecurso
    * @apiName patch
    * @apiGroup MPI
    *
    */

    public patch = async (req: Request, res: Response) => {
        const resource = this.getResource(req);
        let subresource = this.subresourcesCtr.findById(resource, req.params[this.subresourceId]);
        if (subresource) {
            let subresource_update = subresource.set(req.body);
            this.subresourcesCtr.store(resource, subresource_update);
            await this.save(resource, req);
        }
        return res.json(subresource);
    }

    /**
    * @api {delete} /pacientes/:idPaciente/contactos/:idSubResource Elimina un subrecurso de un paciente
    * @apiName delete
    * @apiGroup MPI
    *
    * @apiSuccess
    */

    public delete = async (req: Request, res: Response) => {
        const resource = this.getResource(req);
        let subresource = this.subresourcesCtr.delete(resource, req.params[this.subresourceId]);
        await this.save(resource, req);
        return res.json(subresource);
    }

}
