(() => {
  const $ = id => document.getElementById(id);
  const informes = [
    { id: 'END-IDT-RED-CU-257-G1', tipo: 'Informe diario', fecha: '12/08/2026', estado: 'Enviado', detalle: 'Red de distribución Sector 03' },
    { id: 'ISO-CU-REDES-039', tipo: 'Informe semanal', fecha: '08/08/2026', estado: 'Enviado', detalle: 'Resumen semanal de cuadrilla' },
    { id: 'END-IDT-LS-014-G2', tipo: 'Informe diario', fecha: '04/08/2026', estado: 'Borrador', detalle: 'Lima Sur · Etapa II' }
  ];
  let tipoInforme = 'Diario';

  function mensaje(texto) {
    const caja = $('toast');
    caja.textContent = texto;
    caja.classList.add('visible');
    clearTimeout(mensaje.timer);
    mensaje.timer = setTimeout(() => caja.classList.remove('visible'), 2600);
  }

  function ir(vista) {
    document.querySelectorAll('.vista').forEach(item => item.classList.toggle('activa', item.id === vista));
    document.querySelectorAll('.navegacion [data-ir]').forEach(item => item.classList.toggle('activo', item.dataset.ir === vista));
    const contenido = document.querySelector('.contenido-movil');
    if (contenido) contenido.scrollTop = 0;
  }

  function renderInformes() {
    $('listaInformes').innerHTML = informes.map(informe => `
      <article class="informe-item">
        <div><span class="estado ${informe.estado === 'Borrador' ? 'borrador' : ''}">${informe.estado}</span><h3>${informe.id}</h3><p>${informe.tipo} · ${informe.fecha}</p><small>${informe.detalle}</small></div>
        <button type="button" data-descargar="${informe.id}">Descargar</button>
      </article>`).join('');
  }

  function registrarInforme(estado) {
    const numero = `END-${tipoInforme === 'Diario' ? 'IDT' : 'ISO'}-TAC-${String(informes.length + 1).padStart(3, '0')}`;
    informes.unshift({
      id: numero,
      tipo: `Informe ${tipoInforme.toLowerCase()}`,
      fecha: new Date().toLocaleDateString('es-PE'),
      estado,
      detalle: 'Proyecto Sur Oeste · Tacna'
    });
    renderInformes();
    ir('informes');
    mensaje(estado === 'Borrador' ? 'Informe guardado como borrador.' : 'Informe enviado correctamente.');
  }

  $('formLogin').addEventListener('submit', evento => {
    evento.preventDefault();
    $('pantallaLogin').hidden = true;
    $('appContratista').hidden = false;
    ir('inicio');
  });

  document.querySelectorAll('[data-ir]').forEach(boton => boton.addEventListener('click', () => ir(boton.dataset.ir)));
  document.querySelectorAll('[data-tipo]').forEach(boton => boton.addEventListener('click', () => {
    tipoInforme = boton.dataset.tipo;
    document.querySelectorAll('[data-tipo]').forEach(item => item.classList.toggle('seleccionado', item === boton));
  }));

  $('formInforme').addEventListener('submit', evento => {
    evento.preventDefault();
    registrarInforme('Enviado');
    evento.target.reset();
  });
  $('guardarInforme').addEventListener('click', () => registrarInforme('Borrador'));

  $('archivosInforme').addEventListener('change', evento => {
    if (evento.target.files.length) mensaje(`${evento.target.files.length} evidencia(s) preparada(s) para el informe.`);
  });
  $('cargarEvidencia').addEventListener('change', evento => {
    const archivos = [...evento.target.files];
    if (!archivos.length) return;
    $('listaEvidencias').innerHTML = archivos.map(archivo => `<article><span>Archivo adjunto</span><b>${archivo.name}</b><small>${Math.ceil(archivo.size / 1024)} KB</small></article>`).join('');
    mensaje(`${archivos.length} evidencia(s) adjuntada(s).`);
  });

  $('listaInformes').addEventListener('click', evento => {
    const boton = evento.target.closest('[data-descargar]');
    if (boton) mensaje(`Preparando descarga de ${boton.dataset.descargar}.`);
  });
  $('formPerfil').addEventListener('submit', evento => { evento.preventDefault(); mensaje('Datos del perfil guardados.'); });
  $('cerrarSesion').addEventListener('click', () => {
    $('appContratista').hidden = true;
    $('pantallaLogin').hidden = false;
    mensaje('Sesión cerrada.');
  });

  renderInformes();
})();
