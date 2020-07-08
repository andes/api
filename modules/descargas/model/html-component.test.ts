import { HTMLComponent } from './html-component.class';


it('no template throw error', () => {
    class MyComponent extends HTMLComponent {

    }
    const component = new MyComponent();
    try {
        component.render();
        expect(true).toBe(false);
    } catch {
        expect(true).toBe(true);
    }
});

it('simple template', async () => {
    class MyComponent extends HTMLComponent {
        template = '<div></div>';
        data: {};
    }
    const component = new MyComponent();
    const html = await component.render();
    expect(html).toBe('<div></div>');

});

it('simple template with data', async () => {
    class MyComponent extends HTMLComponent {
        template = '<div>{{nombre}}</div>';
        data = { nombre: 'JUAN' };
    }
    const component = new MyComponent();
    const html = await component.render();
    expect(html).toBe('<div>JUAN</div>');
});

it('template from file with data', async () => {
    class MyComponent extends HTMLComponent {
        templateUrl = './template-example.html';
        data = { nombre: 'JUAN' };
    }
    const component = new MyComponent();
    const html = await component.render();
    expect(html).toBe('<div>JUAN</div>');
});
