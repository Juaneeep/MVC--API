/**
 * CONTROLADOR · Notas del semestre                                      (PARTE 3B de la guía)
 *
 * SABE: traducir lo que hace el usuario (eventos de la Vista) en órdenes para el Modelo,
 *       y qué mostrar cuando el Modelo rechaza una orden o no se puede completar.
 * NO SABE: HTML ni DOM (eso es de la Vista), ni las reglas del negocio (eso es del servidor),
 *          ni HTTP (eso es de cliente-api.js).
 *
 * Es "delgado": cada método hace tres cosas como máximo (leer → ordenar → reaccionar).
 *
 * Este es el Controlador de la clase pasada. Lo único que debe cambiar es esto: las órdenes al Modelo ahora
 * viajan por la red y TARDAN, así que devuelven promesas y el Controlador tiene que ESPERARLAS.
 * Tu trabajo: reemplazar cada "TODO" hasta que `npm run test:cliente` (grupo 3B) quede en verde.
 */

import { ErrorDeReglas, ErrorDeServicio } from './modelo-remoto.js';

const MENSAJE_SERVICIO = 'No se pudo completar la operación. Revisa tu conexión e inténtalo de nuevo.';

// "" → sin nota (null); "4.2" → 4.2
const aNota = (texto) => (String(texto).trim() === '' ? null : Number(texto));

export class NotasControlador {
  #modelo;
  #vista;

  constructor(modelo, vista) {
    this.#modelo = modelo;
    this.#vista = vista;

    vista.alAgregar((datos) => this.#agregar(datos));
    vista.alEliminar((id) => this.#intentar(() => modelo.eliminar(id)));
    vista.alCalificar((id, texto) => this.#intentar(() => modelo.calificar(id, aNota(texto))));
  }

 async #agregar(datos) {
  // Se espera la orden: el formulario solo se limpia si el servidor la aceptó
  const acepto = await this.#intentar(() =>
    this.#modelo.agregar({ nombre: datos.nombre, peso: Number(datos.peso), nota: aNota(datos.nota) }),
  );
  if (acepto) this.#vista.limpiarFormulario();
}

async #intentar(orden) {
  try {
    await orden(); // sin await, el catch no atraparía el rechazo de la promesa
    this.#vista.limpiarError();
    return true;
  } catch (error) {
    if (error instanceof ErrorDeReglas) {
      this.#vista.mostrarError(error.message);       // culpa del usuario: mensaje del servidor
    } else if (error instanceof ErrorDeServicio) {
      this.#vista.mostrarError(MENSAJE_SERVICIO);    // falló el cable o el servidor
    } else {
      throw error;                                   // fallo de programación: no se esconde
    }
    this.#vista.render(); // revierte lo que el usuario escribió y el servidor no aceptó
    return false;
  }
}
}
