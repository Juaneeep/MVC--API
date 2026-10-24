/**
 * RUTAS · los endpoints de la API                                         (PARTES 2 y 4 de la guía)
 *
 * Aquí está el DISEÑO de la API: qué recursos hay, qué método y qué URI usa cada operación y qué estado HTTP
 * devuelve cada resultado. En términos de MVC, estos manejadores son el CONTROLADOR del servidor:
 *   · traducen una solicitud HTTP en una orden para el Modelo;
 *   · traducen el resultado (o el error) del Modelo en una respuesta HTTP.
 * No contienen reglas de negocio: esas son del Modelo (servidor/modelo.js). Si te descubres escribiendo
 * "if (peso > 100)" aquí, detente: la pregunta ya la sabe contestar el Modelo.
 *
 * Tu trabajo: reemplazar cada "TODO" hasta que `npm run test:api` (Parte 2) y `npm run test:versionado`
 * (Parte 4) queden en verde. Lee antes servidor/nucleo.mjs (arriba del todo explica qué recibe y qué
 * devuelve un manejador) y tu diseño de la Parte 1 (ENTREGA.md, sección 1).
 *
 * Orden de trabajo sugerido:  2A leer → 2B crear (y la tabla de estados) → 2C modificar y borrar → 4A, 4B y 4C.
 */

import { ErrorDeReglas } from './modelo.js';
import { ErrorHttp, leerEntero, paraVersiones } from './nucleo.mjs';
import { representarEvaluacion, representarResumen, tipoDeProblema } from './representaciones.mjs';

// ---------------------------------------------------------------- 2B · De regla del Modelo a estado HTTP
// El Modelo no sabe qué es un 404. Cada error suyo trae un `codigo` (mira CODIGOS en servidor/modelo.js);
// esta tabla decide qué estado HTTP le corresponde a cada uno.
const ESTADO_POR_CODIGO = {
  // TODO 2B: asigna un estado a cada código. Piensa en tres grupos:
  //   · el recurso no existe ............................................... ¿404?
  //   · el CONTENIDO enviado incumple una regla (un valor inválido) ........ ¿400, 409 o 422?
  //   · el contenido choca con el ESTADO actual (duplicado, tope de pesos) . ¿400, 409 o 422?
  // Escribe también tu decisión, y su porqué, en ENTREGA.md (sección 2).
  //   NO_EXISTE: ...,

  // El recurso no existe → 404 Not Found.
  NO_EXISTE: 404,

  // El CONTENIDO se entiende (es JSON válido) pero un valor incumple una regla → 422 Unprocessable Content.
  NOMBRE_OBLIGATORIO: 422,
  NOMBRE_LARGO: 422,
  PESO_FUERA_DE_RANGO: 422,
  NOTA_FUERA_DE_RANGO: 422,

  // El valor por sí solo es válido, pero CHOCA con el estado actual del sistema → 409 Conflict.
  PESOS_EXCEDEN_100: 409,
  NOMBRE_DUPLICADO: 409,
};

/** El núcleo la llama con cada error que no es un ErrorHttp. Lo que no es del Modelo se devuelve igual (→ 500). */
export function traducirError(error) {
  // TODO 2B: si NO es un ErrorDeReglas, devuélvelo tal cual (el núcleo lo convertirá en un 500 sin filtrar detalles).
  //          Si lo es, devuelve new ErrorHttp(estado, error.message, tipoDeProblema(error.codigo)),
  //          donde `estado` sale de tu tabla ESTADO_POR_CODIGO (y si el código no está, usa 422).
  if (!(error instanceof ErrorDeReglas)) return error;
  const estado = ESTADO_POR_CODIGO[error.codigo] ?? 422;
  return new ErrorHttp(estado, error.message, tipoDeProblema(error.codigo));
}

// ---------------------------------------------------------------- Fechas del ciclo de vida de la v1 (Parte 4B)
const DEPRECIADA_DESDE = new Date('2026-10-01T00:00:00Z'); // RFC 9745: cabecera Deprecation
const SE_RETIRA_EN = new Date('2027-12-31T23:59:59Z'); // RFC 8594: cabecera Sunset

// Valores permitidos de ?orden= y ?estado= en la v2 (Parte 4A)
const ORDENES = ['id', 'nombre', '-nombre', 'peso', '-peso'];
const ESTADOS = ['pendiente', 'calificada'];

/** Ordena una lista de evaluaciones por 'id', 'nombre' o 'peso'; un guion delante invierte el orden. (Ya escrito.) */
function ordenar(lista, orden) {
  const campo = orden.replace('-', '');
  const sentido = orden.startsWith('-') ? -1 : 1;
  return [...lista].sort((a, b) => sentido * (typeof a[campo] === 'string' ? a[campo].localeCompare(b[campo], 'es') : a[campo] - b[campo]));
}

export function crearRutas(modelo) {
  /** Ya escrito: el id de la URI. Solo dígitos y sin ceros a la izquierda; cualquier otra cosa no identifica a nadie (→ NaN → 404). */
  const idDe = (solicitud) => (/^[1-9]\d*$/.test(solicitud.params.id) ? Number(solicitud.params.id) : NaN);

  // -------------------------------------------------------------- 2A · Leer
  const listarV1 = () => {
  // La v1 sigue devolviendo el mismo arreglo, pero avisa que está obsoleta
  return {
    status: 200,
    cuerpo: modelo.evaluaciones.map((e) => representarEvaluacion(e)),
    cabeceras: {
      Deprecation: `@${Math.floor(DEPRECIADA_DESDE.getTime() / 1000)}`,
      Sunset: SE_RETIRA_EN.toUTCString(),
      Link: '</v2/evaluaciones>; rel="successor-version"',
    },
  };
};

  const obtener = (solicitud) => {
    // TODO 2A: responde 200 con la representación de UNA evaluación. Usa modelo.obtener(idDe(solicitud)):
    //          si no existe, el Modelo lanza un error con código NO_EXISTE y tu tabla de estados (2B) lo vuelve 404.
    return { status: 200, cuerpo: representarEvaluacion(modelo.obtener(idDe(solicitud))) };
  };

  // EJEMPLO RESUELTO (así se ve un manejador completo): el resumen es un recurso CALCULADO, de solo lectura.
  const resumen = () => ({ status: 200, cuerpo: representarResumen(modelo.resumen()) });

  // -------------------------------------------------------------- 2B · Crear   y   2C · Modificar y borrar
  const crear = ({ cuerpo, base }) => {
    // TODO 2B: crea la evaluación con modelo.agregar({ nombre, peso, nota }) usando SOLO esos tres campos
    //          (el id lo decide el servidor, aunque el cliente mande uno).
    //          Responde 201 (no 200), con la cabecera Location apuntando a la evaluación nueva
    //          (`${base}/evaluaciones/${id}`) y con su representación en el cuerpo.
    const { nombre, peso, nota } = cuerpo; // solo estos tres: si el cliente manda un id, se ignora
    const nueva = modelo.agregar({ nombre, peso, nota });
    return {
      status: 201,
      cabeceras: { Location: `${base}/evaluaciones/${nueva.id}` },
      cuerpo: representarEvaluacion(nueva),
    };
  };

  const calificar = (solicitud) => {
    // TODO 2C: modelo.calificar(idDe(solicitud), solicitud.cuerpo.nota) y responde 200 con la evaluación actualizada.
    //          La nota puede ser un número entre 0 y 5, o null para quitarla.
    const actualizada = modelo.calificar(idDe(solicitud), solicitud.cuerpo.nota);
    return { status: 200, cuerpo: representarEvaluacion(actualizada) };
  };

  const eliminar = (solicitud) => {
    // TODO 2C: modelo.eliminar(...) y responde 204 (sin cuerpo): hecho, y no hay nada que devolver.
    modelo.eliminar(idDe(solicitud));
    return { status: 204 };
  };

  // -------------------------------------------------------------- 4A · v2: lista paginada, filtrada y ordenada
 const listarV2 = ({ query, ruta }) => {
  const pagina = leerEntero(query, 'pagina', { porDefecto: 1, min: 1 });
  const porPagina = leerEntero(query, 'porPagina', { porDefecto: 10, min: 1, max: 50 });

  const estado = query.get('estado');
  if (estado !== null && !ESTADOS.includes(estado)) {
    throw new ErrorHttp(400, `El parámetro "estado" debe ser uno de: ${ESTADOS.join(', ')}.`);
  }
  const ordenPedido = query.get('orden');
  const orden = ordenPedido ?? 'id';
  if (!ORDENES.includes(orden)) {
    throw new ErrorHttp(400, `El parámetro "orden" debe ser uno de: ${ORDENES.join(', ')}.`);
  }

  let lista = modelo.evaluaciones;
  if (estado === 'pendiente') lista = lista.filter((e) => e.nota === null);
  if (estado === 'calificada') lista = lista.filter((e) => e.nota !== null);
  lista = ordenar(lista, orden);

  const total = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const datos = lista
    .slice((pagina - 1) * porPagina, pagina * porPagina)
    .map((e) => representarEvaluacion(e));

  // Cabecera Link (RFC 8288): conserva estado, orden y porPagina
  const enlace = (n, rel) => {
    const params = new URLSearchParams({ pagina: n, porPagina });
    if (estado) params.set('estado', estado);
    if (ordenPedido) params.set('orden', ordenPedido);
    return `<${ruta}?${params}>; rel="${rel}"`;
  };
  const enlaces = [];
  if (pagina > 1) enlaces.push(enlace(Math.min(pagina - 1, totalPaginas), 'prev'));
  if (pagina < totalPaginas) enlaces.push(enlace(pagina + 1, 'next'));

  return {
    status: 200,
    cuerpo: { datos, paginacion: { pagina, porPagina, total, totalPaginas } },
    cabeceras: enlaces.length ? { Link: enlaces.join(', ') } : {},
  };
};

  // -------------------------------------------------------------- La tabla de rutas
  // Cada entrada es { metodo, ruta, manejador }. La ruta usa plantillas: '/v1/evaluaciones/{id}'.
  // Mira primero tu diseño de la Parte 1: una URI nombra un recurso (sustantivo), el método HTTP es la acción.
return [
  // Lo que cambió entre versiones: la lista
  { metodo: 'GET', ruta: '/v1/evaluaciones', manejador: listarV1 },
  { metodo: 'GET', ruta: '/v2/evaluaciones', manejador: listarV2 },

  // Lo que no cambió: igual en las dos versiones, sin copiar y pegar
  ...paraVersiones(['v1', 'v2'], [
    { metodo: 'GET',    ruta: '/evaluaciones/{id}', manejador: obtener },
    { metodo: 'GET',    ruta: '/resumen',           manejador: resumen },
    { metodo: 'POST',   ruta: '/evaluaciones',      manejador: crear },
    { metodo: 'PATCH',  ruta: '/evaluaciones/{id}', manejador: calificar },
    { metodo: 'DELETE', ruta: '/evaluaciones/{id}', manejador: eliminar },
  ]),
];
}
