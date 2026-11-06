import puppeteer, { Browser, Page, PDFOptions } from 'puppeteer';
import * as sharp from 'sharp';

type ImgOpts = {
    maxWidth?: number; // px
    quality?: number; // JPEG/WebP 60-85
    format?: 'jpeg' | 'webp';
};

/* Convierte un stream de imagen a un data URI de JPEG optimizado para web (rotado, redimensionado y comprimido).
    De esta manera se puede mostrar en el PDF sin que pese demasiado ni consuma mucha memoria
*/
export async function streamToJpegDataUri(
    stream: NodeJS.ReadableStream,
    opts: ImgOpts = {}
): Promise<string> {
    const maxWidth = opts.maxWidth ?? 1200;
    const quality = opts.quality ?? 60;

    const transformer = sharp()
        .rotate()
        .resize({ width: maxWidth, fit: 'inside', withoutEnlargement: true })
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

const MAX_CONCURRENT_RENDERS = Number(process.env.PDF_MAX_CONCURRENT_RENDERS || 2);
const ACQUIRE_TIMEOUT_MS = Number(process.env.PDF_ACQUIRE_TIMEOUT_MS || 60_000);
const DEFAULT_RENDER_TIMEOUT_MS = 180_000;

let browserPromise: Promise<Browser> | null = null;
let activeRenders = 0;

interface Waiter {
    resolve: () => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
}

const pendingWaiters: Waiter[] = [];

function getBrowser(): Promise<Browser> {
    if (browserPromise) {
        return browserPromise;
    }

    browserPromise = puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ],
    }).then((browser) => {
        browser.on('disconnected', () => {
            browserPromise = null;
        });
        return browser;
    }).catch((error) => {
        browserPromise = null;
        throw error;
    });

    return browserPromise;
}

function acquireSlot(): Promise<void> {
    if (activeRenders < MAX_CONCURRENT_RENDERS) {
        activeRenders++;
        return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
        const waiter: Waiter = {
            resolve,
            reject,
            timer: setTimeout(() => {
                const index = pendingWaiters.indexOf(waiter);
                if (index >= 0) {
                    pendingWaiters.splice(index, 1);
                }
                reject(new Error('Timeout esperando slot para generar PDF'));
            }, ACQUIRE_TIMEOUT_MS)
        };
        pendingWaiters.push(waiter);
    });
}

function releaseSlot() {
    const next = pendingWaiters.shift();
    if (next) {
        clearTimeout(next.timer);
        next.resolve();
    } else {
        activeRenders--;
    }
}

async function shutdown() {
    if (!browserPromise) {
        return;
    }
    const browser = await browserPromise.catch(() => null);
    browserPromise = null;
    if (browser) {
        try {
            await browser.close();
        } catch {
            // el proceso está terminando
        }
    }
}

let shutdownRegistered = false;
function registerShutdown() {
    if (shutdownRegistered) {
        return;
    }
    shutdownRegistered = true;
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
}

export async function htmlToPdfBuffer(html: string, opts: PdfOpts = {}): Promise<Buffer> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_RENDER_TIMEOUT_MS;

    await acquireSlot();
    let page: Page = null;

    try {
        registerShutdown();
        const browser = await getBrowser();
        page = await browser.newPage();
        page.setDefaultTimeout(timeoutMs);
        page.setDefaultNavigationTimeout(timeoutMs);

        await page.setJavaScriptEnabled(false);
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const url = request.url();
            if (url === 'about:blank' || url.startsWith('data:')) {
                return request.continue();
            }
            return request.abort();
        });

        await page.setContent(html, { waitUntil: 'load', timeout: timeoutMs });

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
        if (page) {
            try {
                await page.close();
            } catch {
                // la página pudo haberse cerrado por un error
            }
        }
        releaseSlot();
    }
}
