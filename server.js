// Si este puente de persistencia se migra a Java, es obligatorio implementar
// try-catch-resources para el manejo de los flujos de entrada/salida de
// archivos (Streams) y asi evitar bloqueos de recursos en el sistema operativo
// [cite: 2026-02-12].

import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const projectRoot = path.dirname(currentFilePath);
const defaultPort = Number(process.env.APP_PORT || 3001);
const directServeStatic = process.env.APP_SERVE_STATIC === 'true';

const formatTimestamp = () =>
  new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    year: 'numeric',
  }).format(new Date());

const logServerEvent = (scope, message, details) => {
  const prefix = `[${formatTimestamp()}] [${scope}]`;

  if (details) {
    console.log(`${prefix} ${message}`, details);
    return;
  }

  console.log(`${prefix} ${message}`);
};

const createAllowedOrigins = (port) =>
  new Set([
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
  ]);

const resolveRuntimePaths = ({
  appDataDir,
  sourceRoot = projectRoot,
  staticDistDir,
} = {}) => {
  const bundledManualFilePath = path.resolve(sourceRoot, 'src', 'data', 'manual.json');

  if (!appDataDir) {
    return {
      backupsDirectory: path.resolve(sourceRoot, 'backups'),
      bundledManualFilePath,
      imagesDirectory: path.resolve(sourceRoot, 'public', 'images'),
      manualFilePath: bundledManualFilePath,
      staticDistDirectory: staticDistDir ?? path.resolve(sourceRoot, 'dist'),
    };
  }

  return {
    backupsDirectory: path.resolve(appDataDir, 'backups'),
    bundledManualFilePath,
    imagesDirectory: path.resolve(appDataDir, 'images'),
    manualFilePath: path.resolve(appDataDir, 'manual.json'),
    staticDistDirectory: staticDistDir ?? path.resolve(sourceRoot, 'dist'),
  };
};

const ensureRuntimeFiles = async ({
  backupsDirectory,
  bundledManualFilePath,
  imagesDirectory,
  manualFilePath,
}) => {
  await fs.promises.mkdir(imagesDirectory, { recursive: true });
  await fs.promises.mkdir(backupsDirectory, { recursive: true });

  if (!fs.existsSync(manualFilePath) && fs.existsSync(bundledManualFilePath)) {
    await fs.promises.copyFile(bundledManualFilePath, manualFilePath);
    logServerEvent('BOOT', 'Manual inicial copiado al directorio de trabajo.', {
      manualFilePath,
    });
  }
};

const readManualFile = async (manualFilePath, bundledManualFilePath) => {
  const candidateFilePath = fs.existsSync(manualFilePath)
    ? manualFilePath
    : bundledManualFilePath;

  const rawManual = await fs.promises.readFile(candidateFilePath, 'utf-8');

  return JSON.parse(rawManual);
};

const getManualRevision = async (manualFilePath, bundledManualFilePath) => {
  const candidateFilePath = fs.existsSync(manualFilePath)
    ? manualFilePath
    : bundledManualFilePath;
  const stats = await fs.promises.stat(candidateFilePath);

  return `${stats.mtimeMs}-${stats.size}`;
};

const readManualPayload = async (manualFilePath, bundledManualFilePath) => ({
  data: await readManualFile(manualFilePath, bundledManualFilePath),
  revision: await getManualRevision(manualFilePath, bundledManualFilePath),
});

const normalizeEndpointTarget = (value) => {
  const trimmedValue = typeof value === 'string' ? value.trim() : '';

  if (!trimmedValue) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  if (/^(localhost|127\.0\.0\.1|\[::1\]|::1)(:\d+)?(\/.*)?$/i.test(trimmedValue)) {
    return `http://${trimmedValue.replace(/^\[::1\]/, '::1')}`;
  }

  if (/^[a-z0-9.-]+(?::\d+)?(\/.*)?$/i.test(trimmedValue)) {
    return `https://${trimmedValue}`;
  }

  return null;
};

export const startServer = async ({
  allowedOrigins,
  appDataDir,
  port = defaultPort,
  serveStatic = false,
  sourceRoot = projectRoot,
  staticDistDir,
} = {}) => {
  const resolvedAllowedOrigins = allowedOrigins ?? createAllowedOrigins(port);
  const runtimePaths = resolveRuntimePaths({
    appDataDir,
    sourceRoot,
    staticDistDir,
  });

  await ensureRuntimeFiles(runtimePaths);

  const app = express();
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_request, _file, callback) => {
        callback(null, runtimePaths.imagesDirectory);
      },
      filename: (_request, file, callback) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const extension = path.extname(file.originalname);
        callback(null, `${uniqueName}${extension}`);
      },
    }),
  });

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || origin === 'null' || resolvedAllowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error('Origen no permitido por CORS.'));
      },
    }),
  );
  app.use(express.json());
  app.use('/images', express.static(runtimePaths.imagesDirectory));
  app.use((request, response, next) => {
    const startedAt = Date.now();

    logServerEvent('HTTP', `${request.method} ${request.originalUrl}`, {
      ip: request.ip,
    });

    response.on('finish', () => {
      logServerEvent(
        'HTTP',
        `${request.method} ${request.originalUrl} -> ${response.statusCode} en ${Date.now() - startedAt} ms`,
      );
    });

    next();
  });

  app.get('/health', (_request, response) => {
    logServerEvent('HEALTH', 'Health check respondido con OK.');
    response.json({ ok: true });
  });

  app.get('/manual', async (_request, response) => {
    try {
      const manualPayload = await readManualPayload(
        runtimePaths.manualFilePath,
        runtimePaths.bundledManualFilePath,
      );

      logServerEvent('LOAD', 'Manual cargado correctamente.', {
        manualFilePath: runtimePaths.manualFilePath,
      });

      response.status(200).json(manualPayload);
    } catch (error) {
      console.error(
        `[${formatTimestamp()}] [LOAD] No se pudo leer manual.json desde disco.`,
        error,
      );
      response.status(500).json({
        error: 'No se pudo leer manual.json desde disco.',
      });
    }
  });

  app.get('/check-endpoint', async (request, response) => {
    const target = normalizeEndpointTarget(request.query.url);

    if (!target) {
      response.status(400).json({
        ok: false,
        reason: 'invalid-url',
      });
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const endpointResponse = await fetch(target, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
        });

        response.status(200).json({
          ok: endpointResponse.ok,
          status: endpointResponse.status,
          statusText: endpointResponse.statusText,
          url: target,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      logServerEvent('CHECK', 'Error comprobando endpoint.', {
        target,
        error: error instanceof Error ? error.message : String(error),
      });
      response.status(200).json({
        ok: false,
        reason: 'request-failed',
        url: target,
      });
    }
  });

  app.post('/save-manual', async (request, response) => {
    const requestBody = request.body;
    const usesEnvelope =
      requestBody &&
      typeof requestBody === 'object' &&
      !Array.isArray(requestBody) &&
      'data' in requestBody;
    const manualData = usesEnvelope ? requestBody.data : requestBody;
    const expectedRevision =
      usesEnvelope && typeof requestBody.expectedRevision === 'string'
        ? requestBody.expectedRevision
        : undefined;

    if (!manualData || typeof manualData !== 'object' || Array.isArray(manualData)) {
      logServerEvent('SAVE', 'Peticion rechazada: body no valido para guardado.');
      response.status(400).json({
        error: 'El cuerpo de la peticion debe ser un objeto con el manual completo.',
      });
      return;
    }

    try {
      if (expectedRevision) {
        const currentRevision = await getManualRevision(
          runtimePaths.manualFilePath,
          runtimePaths.bundledManualFilePath,
        );

        if (currentRevision !== expectedRevision) {
          logServerEvent('SAVE', 'Conflicto de revision detectado al guardar.', {
            currentRevision,
            expectedRevision,
          });
          response.status(409).json({
            currentRevision,
            error: 'save-conflict',
            message:
              'El manual ha cambiado en disco desde que esta instancia lo cargo.',
          });
          return;
        }
      }

      logServerEvent('SAVE', 'Inicio de persistencia de manual.', {
        totalCategorias: Array.isArray(manualData.categories)
          ? manualData.categories.length
          : 0,
        totalEntradas: Array.isArray(manualData.entries) ? manualData.entries.length : 0,
        totalPlantillas: Array.isArray(manualData.templates)
          ? manualData.templates.length
          : 0,
        totalPapelera: Array.isArray(manualData.trash) ? manualData.trash.length : 0,
      });

      const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilePath = path.join(
        runtimePaths.backupsDirectory,
        `manual_${backupTimestamp}.json`,
      );

      try {
        await fs.promises.copyFile(runtimePaths.manualFilePath, backupFilePath);
        logServerEvent('SAVE', 'Backup previo generado.', { backupFilePath });
      } catch (error) {
        const fileMissing =
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT';

        if (!fileMissing) {
          throw error;
        }

        logServerEvent(
          'SAVE',
          'No existia manual previo; se omite la copia de seguridad inicial.',
        );
      }

      // Si esta logica de escritura en disco se traslada a Java, es obligatorio
      // el uso de try-catch-resources para el manejo de FileWriter,
      // BufferedWriter y otros flujos de salida, garantizando el cierre seguro de
      // descriptores en JBoss.
      await fs.promises.writeFile(
        runtimePaths.manualFilePath,
        JSON.stringify(manualData, null, 2),
        'utf-8',
      );

      logServerEvent('SAVE', 'Manual actualizado en disco correctamente.', {
        manualFilePath: runtimePaths.manualFilePath,
        totalCategorias: Array.isArray(manualData.categories)
          ? manualData.categories.length
          : 0,
        totalEntradas: Array.isArray(manualData.entries) ? manualData.entries.length : 0,
        totalPlantillas: Array.isArray(manualData.templates)
          ? manualData.templates.length
          : 0,
        totalPapelera: Array.isArray(manualData.trash) ? manualData.trash.length : 0,
      });
      response.status(200).json({
        ok: true,
        revision: await getManualRevision(
          runtimePaths.manualFilePath,
          runtimePaths.bundledManualFilePath,
        ),
      });
    } catch (error) {
      console.error(
        `[${formatTimestamp()}] [SAVE] No se pudo guardar manual.json en disco.`,
        error,
      );
      response.status(500).json({
        error: 'No se pudo guardar manual.json en disco.',
      });
    }
  });

  app.post('/upload', upload.single('image'), (request, response) => {
    logServerEvent('UPLOAD', 'Recibida peticion de subida de imagen.');

    if (!request.file) {
      logServerEvent('UPLOAD', 'La subida ha llegado sin archivo adjunto.');
      response.status(400).json({ error: 'No se ha recibido ningun archivo.' });
      return;
    }

    logServerEvent('UPLOAD', 'Imagen almacenada correctamente.', {
      filename: request.file.filename,
      originalName: request.file.originalname,
      size: request.file.size,
    });

    response.status(201).json({
      filename: request.file.filename,
      path: `/images/${request.file.filename}`,
    });
  });

  if (serveStatic && fs.existsSync(runtimePaths.staticDistDirectory)) {
    app.use(express.static(runtimePaths.staticDistDirectory));
    app.get(/.*/, (_request, response) => {
      response.sendFile(path.join(runtimePaths.staticDistDirectory, 'index.html'));
    });
  }

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      server.ref();

      logServerEvent('BOOT', 'Servidor de imagenes y persistencia iniciado.', {
        allowedOrigins: Array.from(resolvedAllowedOrigins),
        backupsDirectory: runtimePaths.backupsDirectory,
        imagesDirectory: runtimePaths.imagesDirectory,
        manualFilePath: runtimePaths.manualFilePath,
        port,
        serveStatic,
        staticDistDirectory: runtimePaths.staticDistDirectory,
      });

      resolve({
        app,
        port,
        runtimePaths,
        server,
      });
    });

    server.on('error', (error) => {
      reject(error);
    });
  });
};

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === currentFilePath;

if (isDirectExecution) {
  try {
    globalThis.__asistenteOnesaitServerRuntime = await startServer({
      port: defaultPort,
      serveStatic: directServeStatic,
    });
    globalThis.__asistenteOnesaitKeepAliveInterval = setInterval(() => {}, 60_000);
  } catch (error) {
    console.error(`[${formatTimestamp()}] [BOOT] No se pudo iniciar el servidor.`, error);
    process.exit(1);
  }
}
