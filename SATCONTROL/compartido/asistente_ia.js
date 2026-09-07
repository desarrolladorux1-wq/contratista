(function () {
  if (!document.getElementById('botonSoporteTecnico')) {
    document.body.insertAdjacentHTML('beforeend', `<button class="boton-soporte-tecnico" id="botonSoporteTecnico" type="button" aria-expanded="false" aria-controls="panelSoporteTecnico" aria-label="Abrir soporte técnico" title="Soporte técnico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 16 0"/><path d="M4 12v4a2 2 0 0 0 2 2h2v-6H6a2 2 0 0 0-2 2Zm16 0v4a2 2 0 0 1-2 2h-2v-6h2a2 2 0 0 1 2 2Z"/><path d="M16 18c0 1.1-.9 2-2 2h-2"/></svg></button><section class="panel-soporte-tecnico" id="panelSoporteTecnico" aria-label="Soporte técnico" hidden><header><div><span class="soporte-icono"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 16 0"/><path d="M4 12v4a2 2 0 0 0 2 2h2v-6H6a2 2 0 0 0-2 2Zm16 0v4a2 2 0 0 1-2 2h-2a2 2 0 0 1 2 2Z"/></svg></span><div><strong>Soporte técnico</strong><small>Equipo SATCONTROL</small></div></div><button id="cerrarSoporteTecnico" type="button" aria-label="Cerrar soporte">×</button></header><div class="soporte-cuerpo"><p>¿Necesitas ayuda con el módulo, datos o visualización del mapa?</p><a href="mailto:soporte@satcontrol.pe?subject=Solicitud%20de%20soporte%20SATCONTROL">Enviar solicitud</a><small>Describe el módulo, la acción realizada y, si es posible, adjunta una captura.</small></div></section>`);
    const botonSoporte = document.getElementById('botonSoporteTecnico');
    const panelSoporte = document.getElementById('panelSoporteTecnico');
    const alternarSoporte = abrir => { panelSoporte.hidden = !abrir; botonSoporte.setAttribute('aria-expanded', String(abrir)); };
    botonSoporte.addEventListener('click', () => alternarSoporte(panelSoporte.hidden));
    document.getElementById('cerrarSoporteTecnico').addEventListener('click', () => alternarSoporte(false));
    document.addEventListener('keydown', evento => { if (evento.key === 'Escape' && !panelSoporte.hidden) alternarSoporte(false); });
  }
  if (document.getElementById('botonAsistenteIA')) return;
  const rutaModulo = location.pathname.toLocaleLowerCase('es');
  const modulo = rutaModulo.includes('/admin/') ? 'Administración SATCONTROL' : rutaModulo.includes('mcter') ? 'MCTER' : rutaModulo.includes('vale-fise') ? 'Vale FISE' : rutaModulo.includes('masificacion') ? 'Masificación' : 'General';
  const respuestas = {
    'Consultar manual': 'Puedo ayudarte a ubicar procedimientos, definiciones y pasos operativos dentro de la maqueta.',
    'Buscar beneficiario': modulo === 'MCTER' ? 'Utiliza el buscador superior para consultar por código MCTER y luego activa la capa de beneficiarios.' : 'Utiliza el buscador de SATCONTROL para consultar por DNI, ID FISE o código de suministro.',
    'Generar reporte': 'El reporte demostrativo puede prepararse con los filtros y el período seleccionados actualmente.',
    'Validar ubicación': 'Selecciona un registro en el mapa para revisar departamento, provincia, distrito y coordenadas.',
    'Predicción de avance': 'La predicción es demostrativa. Se calcularía con el histórico mensual y la cobertura territorial.',
    'Monitoreo KPI': 'Puedes revisar estados, cobertura y distribución desde el resumen y la sección de gráficas.',
    'Consultar mapa': 'En Mapas puedes cambiar la base; en Capas puedes controlar los registros visibles y en Temáticos revisar densidad.'
  };
  document.body.insertAdjacentHTML('beforeend', `<button class="boton-asistente-ia" id="botonAsistenteIA" type="button" aria-expanded="false" aria-label="Abrir asistente IA"><svg viewBox="0 0 24 24"><rect x="5" y="7" width="14" height="11" rx="3"/><path d="M12 4v3M8 12h.01M16 12h.01M9 16h6"/></svg></button><section class="panel-asistente-ia" id="panelAsistenteIA" aria-label="Chat del asistente IA" hidden><header class="cabecera-asistente-ia"><div class="identidad-asistente-ia"><span class="avatar-asistente-ia"><svg viewBox="0 0 24 24"><rect x="5" y="7" width="14" height="11" rx="3"/><path d="M12 4v3M8 12h.01M16 12h.01M9 16h6"/></svg></span><div><strong>Asistente Paulet IA</strong><small>En línea · ${modulo}</small></div></div><button class="cerrar-asistente-ia" id="cerrarAsistenteIA" type="button" aria-label="Cerrar asistente">×</button></header><div class="conversacion-asistente-ia" id="conversacionAsistenteIA"><div class="mensaje-ia">Hola, ¿cómo puedo ayudarte hoy?</div><div class="acciones-rapidas-ia">${Object.keys(respuestas).map(texto => `<button type="button">${texto}</button>`).join('')}</div></div><form class="pie-asistente-ia" id="formularioAsistenteIA"><input id="mensajeAsistenteIA" type="text" placeholder="Escribe tu mensaje…" autocomplete="off"><button type="submit" aria-label="Enviar mensaje"><svg viewBox="0 0 24 24"><path d="m4 4 17 8-17 8 3-8-3-8Z"/><path d="M7 12h14"/></svg></button></form></section>`);
  const accionesCabecera=document.querySelector('.cabecera-satcontrol-acciones'); const indicadorEspacio=document.querySelector('.indicador-espacio-satcontrol');
  ['botonSoporteTecnico','botonAsistenteIA'].forEach(id=>{const botonCabecera=document.getElementById(id);if(botonCabecera&&accionesCabecera)accionesCabecera.insertBefore(botonCabecera,indicadorEspacio);});
  const boton=document.getElementById('botonAsistenteIA'); const panel=document.getElementById('panelAsistenteIA'); const conversacion=document.getElementById('conversacionAsistenteIA'); const formulario=document.getElementById('formularioAsistenteIA'); const entrada=document.getElementById('mensajeAsistenteIA');
  function alternar(abrir){panel.hidden=!abrir;boton.setAttribute('aria-expanded',String(abrir));if(abrir)setTimeout(()=>entrada.focus(),50);}
  function agregar(texto,clase=''){const mensaje=document.createElement('div');mensaje.className=`mensaje-ia ${clase}`.trim();mensaje.textContent=texto;conversacion.append(mensaje);conversacion.scrollTop=conversacion.scrollHeight;}
  function responder(texto){agregar(texto,'usuario');setTimeout(()=>agregar(respuestas[texto]||`He recibido tu consulta sobre “${texto}”. En esta maqueta puedo orientarte mediante los accesos rápidos y la información visible del módulo ${modulo}.`),350);}
  // Se delega desde el documento para que el botón continúe funcionando al
  // trasladarse al encabezado común de cualquier módulo.
  document.addEventListener('click',evento=>{
    const activador=evento.target.closest('#botonAsistenteIA');
    if(!activador)return;
    evento.preventDefault();
    alternar(panel.hidden);
  });
  document.getElementById('cerrarAsistenteIA').addEventListener('click',()=>alternar(false));
  conversacion.querySelectorAll('.acciones-rapidas-ia button').forEach(opcion=>opcion.addEventListener('click',()=>responder(opcion.textContent)));
  formulario.addEventListener('submit',evento=>{evento.preventDefault();const texto=entrada.value.trim();if(!texto)return;entrada.value='';responder(texto);});
  document.addEventListener('keydown',evento=>{if(evento.key==='Escape'&&!panel.hidden)alternar(false);});
})();
