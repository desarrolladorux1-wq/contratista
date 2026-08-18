(function () {
  const cuerpo = document.body;
  // Los buscadores sin icono SVG propio reciben una lupa vectorial estable.
  document.querySelectorAll('input[type="search"]').forEach(campo => {
    if (!campo.parentElement?.querySelector('svg')) campo.classList.add('busqueda-con-lupa');
  });
  let panelHerramientasArrastre = null;
  const selectorPanelHerramientas = '.grupo-herramientas-fise, .grupo-herramientas-masificacion, .panel-herramientas-mcter, .grupo-herramientas-admin-rapidas';
  const iniciarArrastreGlobal = (evento, panel) => {
    panel = panel || evento.target.closest(selectorPanelHerramientas);
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    panel.style.setProperty('position', 'fixed', 'important');
    panel.style.setProperty('right', 'auto', 'important');
    panel.style.setProperty('left', `${rect.left}px`, 'important');
    panel.style.setProperty('top', `${rect.top}px`, 'important');
    panelHerramientasArrastre = { panel, x: evento.clientX - rect.left, y: evento.clientY - rect.top };
    evento.preventDefault();
  };
  document.addEventListener('pointerdown', evento => {
    const activador = evento.target.closest('[data-herramienta="mover"], [data-herramienta-gnv="mover"], [data-tool="mover"], [data-mover-panel]');
    if (activador) {
      const panel = activador.closest(selectorPanelHerramientas);
      if (panel) {
        // El botón Mover también es el asa: mantenerlo presionado y arrastrar
        // desplaza el panel en un único gesto, sin requerir un segundo clic.
        panel.classList.add('arrastre-habilitado');
        activador.classList.add('activo');
        iniciarArrastreGlobal(evento, panel);
      }
      return;
    }
    const panel = evento.target.closest(selectorPanelHerramientas);
    if (panel?.classList.contains('arrastre-habilitado')) iniciarArrastreGlobal(evento, panel);
  });
  document.addEventListener('pointermove', evento => {
    if (!panelHerramientasArrastre) return;
    const { panel, x, y } = panelHerramientasArrastre;
    panel.style.setProperty('left', `${Math.max(0, Math.min(innerWidth - panel.offsetWidth, evento.clientX - x))}px`, 'important');
    panel.style.setProperty('top', `${Math.max(0, Math.min(innerHeight - panel.offsetHeight, evento.clientY - y))}px`, 'important');
  });
  document.addEventListener('pointerup', () => { panelHerramientasArrastre = null; });
  if (!cuerpo.classList.contains('pagina-acceso') && !document.getElementById('cabeceraSatcontrolGlobal')) {
    cuerpo.classList.add('has-cabecera-satcontrol');
    const nombreBase = document.querySelector('.menu-marca-texto strong')?.textContent.trim() || document.title.split('|')[0].trim() || 'Módulo';
    const nombresCabecera = { 'Vale FISE': 'Beneficiarios FISE', Masificación: 'Masificación', BonoGas: 'BonoGas', 'Ahorro GNV': 'Ahorro GNV', MCTER: 'MCTER', Fotovoltaico: 'Fotovoltaico', 'Electricidad al Toque': 'Electricidad al Toque', Administración: 'Administración' };
    const nombreModulo = nombresCabecera[nombreBase] || nombreBase;
    const marcaMenu = document.querySelector('.menu-marca-texto');
    if (marcaMenu) {
      const tituloMarca = marcaMenu.querySelector('strong');
      const subtituloMarca = marcaMenu.querySelector('small');
      if (tituloMarca) tituloMarca.textContent = 'Paulet';
      if (subtituloMarca) subtituloMarca.hidden = true;
    }
    const primerGrupoMenu = document.querySelector('.menu-contenido .grupo-menu');
    const tituloPrimerGrupo = primerGrupoMenu?.querySelector('.grupo-titulo');
    if (tituloPrimerGrupo) tituloPrimerGrupo.innerHTML = `<i class="indicador-modulo-menu" aria-hidden="true">◈</i><span>${nombreBase}</span><b aria-hidden="true">⌃</b>`;
    cuerpo.insertAdjacentHTML('afterbegin', `<header class="cabecera-satcontrol-global" id="cabeceraSatcontrolGlobal"><div class="cabecera-satcontrol-identidad"><button class="cabecera-satcontrol-menu" type="button" aria-label="Contraer o ampliar menú" title="Menú"><span></span><span></span><span></span></button><strong>SATCONTROL <i>·</i> ${nombreModulo.toUpperCase()}</strong></div><div class="cabecera-satcontrol-acciones"><div class="indicador-espacio-satcontrol"><span>ESPACIO USADO <b>6.2 GB / 10 GB</b></span><i><em></em></i></div></div></header>`);
    const accionesCabecera = document.querySelector('.cabecera-satcontrol-acciones');
    const indicadorEspacio = document.querySelector('.indicador-espacio-satcontrol');
    const herramientasExistentes = document.querySelector('.barra-herramientas-fise, .herramientas-mcter');
    const botonHerramientasExistente = document.querySelector('.boton-herramientas-mapa');
    if (herramientasExistentes) {
      accionesCabecera?.insertBefore(herramientasExistentes, indicadorEspacio);
      const crearProyecto = herramientasExistentes.querySelector('.boton-crear-proyecto-toolbar');
      if (crearProyecto) accionesCabecera?.insertBefore(crearProyecto, herramientasExistentes);
    }
    else if (botonHerramientasExistente) accionesCabecera?.insertBefore(botonHerramientasExistente, indicadorEspacio);
    document.querySelector('.cabecera-satcontrol-menu')?.addEventListener('click', () => {
      if (window.innerWidth <= 760) {
        cuerpo.classList.toggle('menu-movil-abierto');
        return;
      }
      const alternar = document.querySelector('[data-accion="alternar-menu"]');
      if (alternar) alternar.click();
      else cuerpo.classList.toggle('menu-colapsado');
    });
  }
  const botonMenu = document.querySelector('[data-accion="alternar-menu"]');
  const botonMovil = document.querySelector('[data-accion="abrir-menu-movil"]');
  const veloMenu = document.querySelector('[data-accion="cerrar-menu-movil"]');
  const enlaces = [...document.querySelectorAll('.enlace-menu[data-etiqueta]')];
  const enlacesSeccion = enlaces.filter(function (enlace) {
    return enlace.getAttribute('href')?.startsWith('#');
  });
  const paneles = [...document.querySelectorAll('[data-seccion-modulo][id], .panel-modulo[id]')];

  if (localStorage.getItem('menuColapsado') === 'true' && window.innerWidth > 760) {
    cuerpo.classList.add('menu-colapsado');
  }

  botonMenu?.addEventListener('click', function () {
    if (window.innerWidth <= 760) {
      cuerpo.classList.remove('menu-movil-abierto');
      return;
    }

    cuerpo.classList.toggle('menu-colapsado');
    localStorage.setItem('menuColapsado', String(cuerpo.classList.contains('menu-colapsado')));
  });

  botonMovil?.addEventListener('click', function () {
    cuerpo.classList.add('menu-movil-abierto');
  });

  veloMenu?.addEventListener('click', function () {
    cuerpo.classList.remove('menu-movil-abierto');
  });

  function mostrarSeccion(id) {
    if (!document.getElementById(id)) return;

    paneles.forEach(function (panel) {
      panel.hidden = panel.id !== id;
    });

    enlacesSeccion.forEach(function (enlace) {
      enlace.classList.toggle('activo', enlace.getAttribute('href') === '#' + id);
    });

    // BonoGas: el nombre de la sección vive en el encabezado global, sin repetirlo en el contenido.
    if (cuerpo.classList.contains('pagina-bonogas')) {
      const etiqueta = id === 'validacion' ? 'Validaciones' : (id === 'solicitudes' ? 'Solicitudes' : 'BonoGas');
      const tituloGlobal = document.querySelector('.cabecera-satcontrol-identidad strong');
      if (tituloGlobal) tituloGlobal.innerHTML = `SATCONTROL <i>·</i> ${etiqueta.toUpperCase()}`;
      paneles.forEach(panel => {
        const tituloInterno = panel.querySelector(':scope > .cabecera-gestion');
        if (tituloInterno) tituloInterno.hidden = panel.id === 'validacion' || panel.id === 'solicitudes';
      });
    }

    document.dispatchEvent(new CustomEvent('seccionmodulo:cambio', { detail: { id } }));
  }

  enlacesSeccion.forEach(function (enlace) {
    enlace.addEventListener('click', function (evento) {
      evento.preventDefault();
      const id = enlace.getAttribute('href').slice(1);
      mostrarSeccion(id);
      history.replaceState(null, '', '#' + id);
      cuerpo.classList.remove('menu-movil-abierto');
    });
  });

  if (location.hash) mostrarSeccion(location.hash.slice(1));

  document.addEventListener('keydown', function (evento) {
    if (evento.key === 'Escape') cuerpo.classList.remove('menu-movil-abierto');
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 760) cuerpo.classList.remove('menu-movil-abierto');
  });

  /* Flujo reutilizable del login de la maqueta */
  const formularioLogin = document.getElementById('formularioLogin');
  const claveLogin = document.getElementById('clave');
  const verClaveLogin = document.getElementById('verClave');
  const selectorPerfil = document.getElementById('selectorPerfil');
  const botonPerfil = document.getElementById('botonPerfil');
  const listaPerfiles = document.getElementById('listaPerfiles');
  const perfilSeleccionado = document.getElementById('perfilSeleccionado');
  const perfilLogin = document.getElementById('perfil');
  const opcionesPerfil = [...document.querySelectorAll('.opcion-perfil')];

  if (formularioLogin) {
    const rutasModulos = {
      'administrador': '../admin/admin.html#satcontrol',
      'vale-fise': '../vale-fise/valefise.html',
      'electricidad-al-toque': '../ELECTRICIDAD%20AL%20TOQUE/electricidad-al-toque.html',
      'fotovoltaico': '../FOTOVOLTAICO/fotovoltaico.html',
      'ahorro-gnv': '../AHORRO%20GNV/ahorro-gnv.html',
      'masificacion': '../MASIFICACION/masificacion.html',
      'bonogas': '../BONOGAS/bonogas.html',
      'mcter': '../MCTER/mcter.html'
    };

    function cambiarEstadoSelector(abrir) {
      listaPerfiles.hidden = !abrir;
      botonPerfil.setAttribute('aria-expanded', String(abrir));
      selectorPerfil.classList.toggle('abierto', abrir);
    }

    function ingresarAlModulo(perfil) {
      const destino = rutasModulos[perfil];
      if (destino) window.location.href = destino;
    }

    verClaveLogin.addEventListener('click', function () {
      const mostrar = claveLogin.type === 'password';
      claveLogin.type = mostrar ? 'text' : 'password';
      verClaveLogin.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
      verClaveLogin.setAttribute('aria-pressed', String(mostrar));
      verClaveLogin.textContent = mostrar ? '◎' : '◉';
    });

    botonPerfil.addEventListener('click', function () {
      const abrir = listaPerfiles.hidden;
      cambiarEstadoSelector(abrir);
      if (abrir) opcionesPerfil.find(opcion => opcion.classList.contains('activa')).focus();
    });

    opcionesPerfil.forEach(function (opcion, indice) {
      opcion.addEventListener('click', function () {
        opcionesPerfil.forEach(function (item) {
          item.classList.remove('activa');
          item.setAttribute('aria-selected', 'false');
        });
        opcion.classList.add('activa');
        opcion.setAttribute('aria-selected', 'true');
        perfilLogin.value = opcion.dataset.value;
        perfilSeleccionado.textContent = opcion.textContent;
        cambiarEstadoSelector(false);
      });

      opcion.addEventListener('keydown', function (evento) {
        if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
          evento.preventDefault();
          const avance = evento.key === 'ArrowDown' ? 1 : -1;
          opcionesPerfil[(indice + avance + opcionesPerfil.length) % opcionesPerfil.length].focus();
        }
      });
    });

    formularioLogin.addEventListener('submit', function (evento) {
      evento.preventDefault();
      ingresarAlModulo(perfilLogin.value);
    });

    document.addEventListener('click', function (evento) {
      if (!selectorPerfil.contains(evento.target)) cambiarEstadoSelector(false);
    });
  }
})();

/* Vista inicial de Mis apps: identifica la aplicación actual en cada módulo. */
window.addEventListener('load', function () {
  const boton = document.querySelector('.boton-mis-apps');
  const modal = document.getElementById('modalMisApps');
  if (!boton || !modal) return;
  const ruta = location.pathname.toLowerCase();
  const catalogo = [
    ['vale-fise', 'Vale FISE', 'VF', 'Subsidio GLP, canjes y beneficiarios.'],
    ['ahorro gnv', 'Ahorro GNV', 'GNV', 'Conversiones vehiculares, consumos y recargas.'],
    ['bonogas', 'BonoGas', 'BG', 'Gestión de bonos y conexiones de gas.'],
    ['masificacion', 'Masificación', 'MAS', 'Proyectos, redes y cobertura territorial.'],
    ['mcter', 'MCTER', 'MC', 'Monitoreo y control territorial.'],
    ['fotovoltaico', 'Fotovoltaico', 'FV', 'Seguimiento de soluciones fotovoltaicas.'],
    ['electricidad', 'Electricidad al Toque', 'EAT', 'Atención y seguimiento de conexiones eléctricas.'],
    ['/admin/', 'Administración', 'ADM', 'Gestión de usuarios y configuración.']
  ];
  const actual = catalogo.find(([clave]) => ruta.includes(clave)) || ['general', 'SATCONTROL', 'SAT', 'Gestión territorial y servicios.'];
  const alterna = actual[1] === 'Ahorro GNV' ? catalogo[0] : catalogo[1];
  const vista = modal.querySelector('.apps-servicios');
  const autenticacion = modal.querySelector('.apps-autenticacion');
  const inicio = () => {
    vista.hidden = false; autenticacion.hidden = true;
    vista.innerHTML = `<div class="apps-titulo"><div><h3>Aplicaciones habilitadas</h3><p>Estos son los accesos disponibles para la cuenta de Renzo.</p></div></div><div class="apps-grilla apps-grilla-inicio"><article class="tarjeta-servicio actual"><span>${actual[2]}</span><strong>${actual[1]}</strong><p>${actual[3]}</p><small>Aplicación actual</small><button type="button">Continuar</button></article><article class="tarjeta-servicio"><span>${alterna[2]}</span><strong>${alterna[1]}</strong><p>${alterna[3]}</p><small>Acceso habilitado</small><button type="button">Ingresar</button></article><article class="tarjeta-servicio tarjeta-solicitud"><span>＋</span><strong>Solicitar acceso</strong><p>Consulta y autentica los servicios disponibles.</p><small>Autoservicio de accesos</small><button class="boton-solicitar-servicio" type="button">Ver servicios</button></article></div>`;
  };
  const servicios = [['VF','Vale FISE','Aplicación actual','actual'],['SIF','Sistema Integral FISE','Autenticar',''],['GNV','Sistema FISE GNV','Autenticar',''],['BG','BonoGas 2.0','Autenticar',''],['GAS','Gestión de Actividades de Afiliación y Seguimiento','Autenticar',''],['CST','Consulta tu saldo / Consulta Taller','Autenticar',''],['WF','Wiki FISE','Autenticar',''],['API','FISE CONSULTAS API','Autenticar',''],['API','GNV API','Autenticar',''],['PQR','PQR FISE','Autenticar',''],['RPT','Reportes operativos FISE','Autenticar','']];
  const mostrarServicios = () => { vista.hidden = false; autenticacion.hidden = true; vista.innerHTML = `<div class="apps-titulo"><div><h3>Servicios disponibles</h3><p>Selecciona un servicio para iniciar la autenticación correspondiente.</p></div><button class="apps-volver" type="button">Volver</button></div><div class="apps-grilla">${servicios.map(([sigla,nombre,estado,clase])=>`<button class="tarjeta-servicio ${clase}" type="button" data-servicio="${nombre}"><span>${sigla}</span><strong>${nombre}</strong><small>${estado}</small></button>`).join('')}</div>`; };
  boton.addEventListener('click', inicio);
  vista.addEventListener('click', evento => {
    if (evento.target.closest('.boton-solicitar-servicio')) { mostrarServicios(); return; }
    if (evento.target.closest('.apps-volver')) { inicio(); return; }
    const tarjeta = evento.target.closest('[data-servicio]'); if (!tarjeta || tarjeta.classList.contains('actual')) return;
    vista.hidden = true; autenticacion.hidden = false;
    modal.querySelector('#appsServicioSeleccionado').value = tarjeta.dataset.servicio;
    modal.querySelector('#appsUsuarioServicio').value = tarjeta.dataset.servicio === 'Sistema Integral FISE' ? 'integralfise' : '';
  });
  autenticacion.querySelector('.apps-volver').addEventListener('click', mostrarServicios);
});

/* Controles unificados para los filtros de todos los módulos. */
(function () {
  const formularios = [
    ...document.querySelectorAll(
      '.filtros-fise, .filtros-mcter, .filtros-masificacion, .filtros-bonogas'
    )
  ];

  formularios.forEach(function (formulario, indice) {
    if (formulario.dataset.filtrosUnificados === 'true') return;
    formulario.dataset.filtrosUnificados = 'true';

    const controlesFiltrado = [
      ...formulario.querySelectorAll('input:not([type="hidden"]), select')
    ].filter(control => !control.matches('input[type="file"], input[type="radio"], input[type="checkbox"]'));
    const soloBusqueda =
      controlesFiltrado.length === 1 &&
      controlesFiltrado[0].matches('input[type="search"]');

    let botonAplicar = formulario.querySelector('button[type="submit"]');
    let botonRestablecer = formulario.querySelector('button[type="reset"]');
    const anfitrionAcciones =
      botonAplicar?.parentElement ||
      botonRestablecer?.parentElement ||
      formulario.querySelector('.campos-filtros-mcter, .fila-filtros') ||
      formulario;

    if (!soloBusqueda) {
      const acciones = document.createElement('div');
      acciones.className = 'acciones-filtros-generales';

      if (!botonAplicar) {
        botonAplicar = document.createElement('button');
        botonAplicar.type = 'submit';
      }
      botonAplicar.className = 'aplicar-filtros-general';
      botonAplicar.textContent = 'Aplicar filtros';

      if (!botonRestablecer) {
        botonRestablecer = document.createElement('button');
        botonRestablecer.type = 'reset';
      }
      botonRestablecer.className = 'restablecer-filtros-general';
      botonRestablecer.textContent = 'Restablecer';
      acciones.append(botonAplicar, botonRestablecer);
      anfitrionAcciones.append(acciones);
    } else {
      botonAplicar?.remove();
      botonRestablecer?.remove();
      formulario.classList.add('solo-busqueda-general');
    }

    formulario.addEventListener('submit', function (evento) {
      evento.preventDefault();
      formulario.querySelectorAll('input, select').forEach(control => {
        control.dispatchEvent(new Event(control.matches('input[type="search"]') ? 'input' : 'change', { bubbles: true }));
      });
    });
    formulario.addEventListener('reset', function () {
      setTimeout(function () {
        formulario.querySelectorAll('input, select').forEach(control => {
          control.dispatchEvent(new Event(control.matches('input[type="search"]') ? 'input' : 'change', { bubbles: true }));
        });
      }, 0);
    });

    if (formulario.closest('.contenedor-filtros-fise')) return;

    const contenedor = document.createElement('div');
    contenedor.className = 'contenedor-filtros-general';
    const titulo = document.createElement('span');
    titulo.className = 'titulo-filtros-general';
    titulo.textContent = 'Filtros de búsqueda';
    formulario.parentNode.insertBefore(contenedor, formulario);
    contenedor.append(titulo, formulario);

    const botonAlternar = document.createElement('button');
    botonAlternar.className = 'alternar-filtros-general';
    botonAlternar.type = 'button';
    botonAlternar.setAttribute('aria-expanded', 'true');
    botonAlternar.setAttribute('aria-controls', formulario.id || `filtros-modulo-${indice}`);
    botonAlternar.setAttribute('aria-label', 'Ocultar filtros');
    botonAlternar.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    if (!formulario.id) formulario.id = `filtros-modulo-${indice}`;
    contenedor.append(botonAlternar);

    botonAlternar.addEventListener('click', function () {
      const ocultar = !formulario.hidden;
      formulario.hidden = ocultar;
      contenedor.classList.toggle('colapsado', ocultar);
      formulario.closest('section')?.classList.toggle('filtros-modulo-ocultos', ocultar);
      botonAlternar.setAttribute('aria-expanded', String(!ocultar));
      botonAlternar.setAttribute('aria-label', ocultar ? 'Mostrar filtros' : 'Ocultar filtros');
      setTimeout(() => window.dispatchEvent(new Event('resize')), 180);
    });
  });
})();

/* Perfil reutilizable para todos los módulos con menú lateral. */
(function () {
  const pieMenu = document.querySelector('.menu-pie');
  if (!pieMenu || document.getElementById('modalPerfilUsuario')) return;

  const cerrarSesion = pieMenu.querySelector('.cerrar-sesion');
  if (cerrarSesion) cerrarSesion.querySelector('.menu-icono').innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5v16h5"/><path d="m14 8 4 4-4 4M8 12h10"/></svg>';
  const esValeFise = location.pathname.toLowerCase().includes('vale-fise');
  const botonApps = document.createElement('button');
  botonApps.className = 'enlace-menu boton-mis-apps';
  botonApps.type = 'button';
  botonApps.dataset.etiqueta = 'Mis apps';
  botonApps.innerHTML = `<span class="menu-icono" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg></span><span class="enlace-texto">Mis apps</span>`;
  pieMenu.insertBefore(botonApps, cerrarSesion);

  const modalApps = document.createElement('div');
  modalApps.className = 'modal-mis-apps'; modalApps.id = 'modalMisApps'; modalApps.hidden = true;
  const servicios = [
    ['VF','Vale FISE','Aplicación actual · Ingresar','actual'],
    ['SIF','Sistema Integral FISE','Autenticar',''], ['GNV','Sistema FISE GNV','Autenticar',''],
    ['BG','BonoGas 2.0','Autenticar',''], ['GAS','Gestión de Actividades de Afiliación y Seguimiento','Autenticar',''],
    ['CST','Consulta tu saldo / Consulta Taller','Autenticar',''], ['WF','Wiki FISE','Autenticar',''],
    ['API','FISE CONSULTAS API','Autenticar',''], ['API','GNV API','Autenticar',''],
    ['PQR','PQR FISE','Autenticar',''], ['RPT','Reportes operativos FISE','Autenticar','']
  ];
  modalApps.innerHTML = `<button class="modal-mis-apps-fondo" type="button" data-cerrar-apps aria-label="Cerrar Mis apps"></button><section class="modal-mis-apps-contenido" role="dialog" aria-modal="true" aria-labelledby="tituloMisApps"><header class="apps-cabecera"><span class="apps-escudo" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg></span><div><h2 id="tituloMisApps">Acceso verificado</h2><p>Hola, Renzo · selecciona un servicio para continuar</p></div><button type="button" data-cerrar-apps aria-label="Cerrar">×</button></header><div class="apps-vista apps-servicios"><div class="apps-titulo"><div><h3>Servicios disponibles</h3><p>${esValeFise ? 'Vale FISE tiene ingreso directo. Los demás servicios requieren la autenticación correspondiente.' : 'Los servicios se habilitan desde el módulo Vale FISE.'}</p></div><button class="apps-volver" type="button" hidden>Volver</button></div><div class="apps-grilla">${servicios.map(([sigla,nombre,estado,clase])=>`<button class="tarjeta-servicio ${clase}" type="button" data-servicio="${nombre}" data-sigla="${sigla}" ${!esValeFise ? 'disabled' : ''}><span>${sigla}</span><strong>${nombre}</strong><small>${estado}</small></button>`).join('')}</div><button class="boton-solicitar-servicio" type="button">Solicitar acceso a un servicio</button></div><form class="apps-vista apps-autenticacion" hidden><button class="apps-volver" type="button">← Volver a servicios</button><h3>Autenticación del servicio</h3><p>Ingresa las credenciales asignadas para acceder al servicio seleccionado.</p><label>Sistema seleccionado<input id="appsServicioSeleccionado" value="Sistema Integral FISE" readonly></label><label>Usuario<input id="appsUsuarioServicio" value="integralfise" autocomplete="username"></label><label>Contraseña<input type="password" placeholder="Contraseña del servicio" autocomplete="current-password"></label><button class="boton-autenticar-servicio" type="submit">Autenticar</button><output class="apps-estado" aria-live="polite"></output></form></section>`;
  document.body.append(modalApps);
  const abrirApps = abrir => { modalApps.hidden = !abrir; document.body.classList.toggle('apps-abiertas', abrir); };
  botonApps.addEventListener('click', () => abrirApps(true));
  modalApps.querySelectorAll('[data-cerrar-apps]').forEach(boton => boton.addEventListener('click', () => abrirApps(false)));
  const vistaServicios = modalApps.querySelector('.apps-servicios'), vistaAutenticacion = modalApps.querySelector('.apps-autenticacion');
  const mostrarServicios = () => { vistaServicios.hidden = false; vistaAutenticacion.hidden = true; };
  modalApps.querySelectorAll('.apps-volver').forEach(boton => boton.addEventListener('click', mostrarServicios));
  modalApps.querySelectorAll('.tarjeta-servicio').forEach(tarjeta => tarjeta.addEventListener('click', () => {
    if (tarjeta.classList.contains('actual')) { modalApps.querySelector('.apps-estado').textContent = 'Vale FISE ya es la aplicación actual.'; return; }
    vistaServicios.hidden = true; vistaAutenticacion.hidden = false;
    modalApps.querySelector('#appsServicioSeleccionado').value = tarjeta.dataset.servicio;
    modalApps.querySelector('#appsUsuarioServicio').value = tarjeta.dataset.servicio === 'Sistema Integral FISE' ? 'integralfise' : '';
    modalApps.querySelector('.apps-estado').textContent = '';
    setTimeout(() => modalApps.querySelector('#appsUsuarioServicio').focus(), 30);
  }));
  modalApps.querySelector('.boton-solicitar-servicio').addEventListener('click', () => { modalApps.querySelector('.apps-titulo p').textContent = 'Selecciona uno de los servicios disponibles para iniciar la autenticación correspondiente.'; });
  vistaAutenticacion.addEventListener('submit', evento => { evento.preventDefault(); modalApps.querySelector('.apps-estado').textContent = 'Solicitud de autenticación registrada. La demostración no redirige a otro sistema.'; });
  const botonPerfil = document.createElement('button');
  botonPerfil.className = 'enlace-menu boton-ver-perfil';
  botonPerfil.type = 'button';
  botonPerfil.dataset.etiqueta = 'Perfil';
  botonPerfil.innerHTML = `
    <span class="menu-icono" aria-hidden="true">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="8.2" r="3.6"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="12" cy="12" r="9.5"/></svg>
    </span>
    <span class="enlace-texto">Perfil</span>`;
  pieMenu.insertBefore(botonPerfil, cerrarSesion);

  const modal = document.createElement('section');
  modal.className = 'vista-perfil-pagina';
  modal.id = 'modalPerfilUsuario';
  modal.hidden = true;
  modal.innerHTML = `
      <header class="perfil-vista-cabecera">
        <div class="perfil-avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/><circle cx="12" cy="12" r="10"/></svg>
        </div>
        <div><small>CUENTA DE USUARIO</small><h2 id="tituloPerfilUsuario">Mi perfil</h2><p>Administra tus datos personales y seguridad.</p></div>
        <button class="cerrar-modal-perfil" type="button" data-cerrar-perfil aria-label="Cerrar">×</button>
      </header>
      <div class="perfil-vista-secciones">
        <form class="perfil-bloque" id="formularioDatosPerfil">
          <div class="perfil-bloque-titulo"><span>01</span><div><h3>Datos personales</h3><p>Información principal de tu cuenta.</p></div></div>
          <div class="perfil-campos">
            <label>Nombres<input name="nombres" value="Renzo"></label>
            <label>Apellidos<input name="apellidos" value="Vicente Castro"></label>
            <label class="campo-completo">Dirección<input name="direccion" value="CALLE UNIVERSIDAD 303"></label>
            <label>Correo<input name="correo" type="email" value="renzovcastro1998@gmail.com"></label>
            <label>Teléfono<input name="telefono" type="tel" value="989765433"></label>
          </div>
          <button class="boton-guardar-perfil" type="submit">Guardar cambios</button>
        </form>
        <form class="perfil-bloque" id="formularioSeguridadPerfil">
          <div class="perfil-bloque-titulo"><span>02</span><div><h3>Seguridad</h3><p>Tu contraseña no se mostrará. Usa “Modificar contraseña” para actualizarla.</p></div></div>
          <div class="perfil-claves">
            <label>Contraseña actual<span><input name="claveActual" type="password" autocomplete="current-password"><button type="button" data-ver-clave aria-label="Mostrar contraseña" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-5.5 9.5-5.5S21.5 12 21.5 12 18.1 17.5 12 17.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/><path d="m4 4 16 16"/></svg></button></span></label>
            <label>Nueva contraseña<span><input name="claveNueva" type="password" autocomplete="new-password"><button type="button" data-ver-clave aria-label="Mostrar contraseña" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-5.5 9.5-5.5S21.5 12 21.5 12 18.1 17.5 12 17.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/><path d="m4 4 16 16"/></svg></button></span></label>
            <label>Repetir nueva contraseña<span><input name="claveRepetida" type="password" autocomplete="new-password"><button type="button" data-ver-clave aria-label="Mostrar contraseña" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-5.5 9.5-5.5S21.5 12 21.5 12 18.1 17.5 12 17.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/><path d="m4 4 16 16"/></svg></button></span></label>
          </div>
          <button class="boton-modificar-clave" type="submit">Modificar contraseña</button>
        </form>
      </div>
      <div class="mensaje-perfil" id="mensajePerfilUsuario" role="status" hidden></div>
    `;
  document.querySelector('.contenido-principal')?.append(modal);

  const mostrarMensaje = function (texto) {
    const mensaje = document.getElementById('mensajePerfilUsuario');
    mensaje.textContent = '✓ ' + texto;
    mensaje.hidden = false;
    clearTimeout(mostrarMensaje.temporizador);
    mostrarMensaje.temporizador = setTimeout(() => { mensaje.hidden = true; }, 2600);
  };
  const alternarPerfil = function (abrir) {
    modal.hidden = !abrir;
    document.querySelector('.contenido-principal')?.classList.toggle('perfil-en-vista', abrir);
    botonPerfil.classList.toggle('activo', abrir);
    if (abrir) setTimeout(() => modal.querySelector('input').focus(), 40);
    if (!abrir) setTimeout(() => window.dispatchEvent(new Event('resize')), 80);
  };

  botonPerfil.addEventListener('click', () => alternarPerfil(true));
  modal.querySelectorAll('[data-cerrar-perfil]').forEach(boton => boton.addEventListener('click', () => alternarPerfil(false)));
  document.querySelector('.menu-contenido')?.addEventListener('click', evento => {
    if (evento.target.closest('a.enlace-menu')) alternarPerfil(false);
  });
  modal.querySelectorAll('[data-ver-clave]').forEach(boton => boton.addEventListener('click', function () {
    const entrada = boton.previousElementSibling;
    const mostrar = entrada.type === 'password';
    entrada.type = mostrar ? 'text' : 'password';
    boton.classList.toggle('activo', mostrar);
    boton.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
    boton.setAttribute('aria-pressed', String(mostrar));
    boton.innerHTML = mostrar
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-5.5 9.5-5.5S21.5 12 21.5 12 18.1 17.5 12 17.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-5.5 9.5-5.5S21.5 12 21.5 12 18.1 17.5 12 17.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/><path d="m4 4 16 16"/></svg>';
  }));
  modal.querySelector('#formularioDatosPerfil').addEventListener('submit', function (evento) {
    evento.preventDefault();
    mostrarMensaje('Datos personales guardados');
  });
  modal.querySelector('#formularioSeguridadPerfil').addEventListener('submit', function (evento) {
    evento.preventDefault();
    const nueva = this.elements.claveNueva.value;
    const repetida = this.elements.claveRepetida.value;
    if (!nueva || nueva !== repetida) {
      mostrarMensaje('Revisa que las nuevas contraseñas coincidan');
      return;
    }
    this.reset();
    mostrarMensaje('Contraseña modificada');
  });
  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape' && !modal.hidden) alternarPerfil(false);
    if (evento.key === 'Escape' && !modalApps.hidden) abrirApps(false);
  });
})();
