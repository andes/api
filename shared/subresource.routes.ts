import { Router, Response, Request } from '@andes/api';

export class SubresourceRoutes {
    resourceName: string;
    subresourceName: string;
    subresourceId = 'id';
    controllerSubresource;
    router = Router();

    constructor(controller) {
        this.controllerSubresource = controller;
        this.getRoutes();
    }

    getResource(req: Request) {
        return req.resources[this.resourceName];
    }

    async save(resource, req) {
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
        let lista = this.controllerSubresource.find(resource, req.query);
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
        const lista = this.controllerSubresource.findById(resource, req.params[this.subresourceId]);
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
        let newElement = this.controllerSubresource.make(req.body);
        this.controllerSubresource.store(resource, newElement);
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
        let subresource = this.controllerSubresource.findById(resource, req.params[this.subresourceId]);
        if (subresource) {
            let subresource_update = subresource.set(req.body);
            this.controllerSubresource.store(resource, subresource_update);
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
        let subresource = this.controllerSubresource.delete(resource, req.params[this.subresourceId]);
        await this.save(resource, req);
        return res.json(subresource);
    }

    getRoutes() {

    }


}
