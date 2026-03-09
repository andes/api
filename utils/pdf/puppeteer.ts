import puppeteer, { Browser, Page, PDFOptions } from 'puppeteer';
import * as sharp from 'sharp';

type ImgOpts = {
    maxWidth?: 1600;
    quality?: 75; // JPEG/WebP 60-85
    format?: 'jpeg' | 'webp';
};

/* Convierte un stream de imagen a un data URI de JPEG optimizado para web (rotado, redimensionado y comprimido).
    De esta manera se puede mostrar en el PDF sin que pese demasiado ni consuma mucha memoria
*/
export async function streamToJpegDataUri(
    stream: NodeJS.ReadableStream,
    opts: ImgOpts = {}
): Promise<string> {
    const maxWidth = opts.maxWidth ?? 1600;
    const quality = opts.quality ?? 75;

    const transformer = sharp()
        .rotate()
        .resize({ width: maxWidth, withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true });

    const buf: Buffer = await new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        transformer.on('data', (c) => chunks.push(c as Buffer));
        transformer.on('end', () => resolve(Buffer.concat(chunks)));
        transformer.on('error', reject);
        stream.on('error', reject);
        stream.pipe(transformer);
    });

    return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

// --------------------------------------------------------------

type PdfOpts = {
    format?: 'A4' | 'Letter';
    margin?: { top?: string; right?: string; bottom?: string; left?: string };
    headerTemplate?: string;
    footerTemplate?: string;
    timeoutMs?: number;
    landscape?: boolean;
    printBackground?: boolean;
    preferCSSPageSize?: boolean;
};

let browserPromise: Promise<Browser> | null = null;

const POOL_SIZE = 2;

let initPromise: Promise<void> | null = null;
const freePages: Page[] = [];
const waiters: Array<(page: Page) => void> = [];

async function getBrowser(): Promise<Browser> {
    if (!browserPromise) {
        browserPromise = puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
            ],
        });

        process.on('exit', async () => {
            try { (await browserPromise!).close(); } catch { }
        });
    }
    return browserPromise;
}

async function initPool() {
    if (initPromise) { return initPromise; }

    initPromise = (async () => {
        const browser = await getBrowser();
        for (let i = 0; i < POOL_SIZE; i++) {
            const p = await browser.newPage();
            p.setDefaultTimeout(60_000);
            p.setDefaultNavigationTimeout(60_000);
            freePages.push(p);
        }
    })();

    return initPromise;
}

// El pool es para evitar abrir y cerrar paginas (que es lo que mas tarda) y para limitar la concurrencia (puppeteer puede consumir mucha memoria)
async function acquirePage(): Promise<Page> {
    await initPool();

    if (freePages.length > 0) {
        return freePages.pop()!;
    }
    return new Promise<Page>((resolve) => waiters.push(resolve));
}

// Cuando se libera una pagina, se resuelve la promesa del siguiente en la cola (si hay) o se agrega a las paginas libres
function releasePage(page: Page) {
    const next = waiters.shift();
    if (next) {
        next(page);
    } else {
        freePages.push(page);
    }
}

// evita que se acumulen cosas entre renders y que se consuma mucha memoria
async function hardResetPage(page: Page) {
    try {
        await page.goto('about:blank', { waitUntil: 'domcontentloaded' });
    } catch { }
}

let renderCount = 0;

// reinicia el navegador cada 50 renders para evitar fugas de memoria o acumulacion de procesos
async function restartBrowser() {
    if (browserPromise) {
        try { (await browserPromise).close(); } catch { }
    }
    browserPromise = null;
    initPromise = null;
    freePages.length = 0;
}

export async function htmlToPdfBuffer(html: string, opts: PdfOpts = {}): Promise<Buffer> {
    renderCount++;
    if (renderCount % 50 === 0) {
        await restartBrowser();
    }

    const page = await acquirePage();
    const timeoutMs = opts.timeoutMs ?? 180_000;

    try {
        await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
        await new Promise((resolve) => setTimeout(resolve, 300));
        const pdfOptions: PDFOptions = {
            format: opts.format || 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: opts.margin,
            displayHeaderFooter: Boolean(opts.headerTemplate || opts.footerTemplate),
            headerTemplate: opts.headerTemplate || '<span></span>',
            footerTemplate: opts.footerTemplate || '<span></span>',
            landscape: opts.landscape || false
        };

        const pdfBytes = await page.pdf(pdfOptions);
        return Buffer.from(pdfBytes);
    } finally {
        await hardResetPage(page);
        releasePage(page);
    }
}
