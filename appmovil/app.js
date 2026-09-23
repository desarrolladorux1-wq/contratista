(() => {
  const $ = id => document.getElementById(id);
  const informes = [
    { id: 'END-IDT-RED-CU-257-G1', tipo: 'Informe diario', fecha: '12/08/2026', estado: 'Enviado', detalle: 'Red de distribución Sector 03' },
    { id: 'ISO-CU-REDES-039', tipo: 'Informe semanal', fecha: '08/08/2026', estado: 'Enviado', detalle: 'Resumen semanal de cuadrilla' },
    { id: 'END-IDT-LS-014-G2', tipo: 'Informe diario', fecha: '04/08/2026', estado: 'Borrador', detalle: 'Lima Sur · Etapa II' }
  ];
  const formulariosMoviles={
    redes:[
      {codigo:'C01',nombre:'Parte diario de ejecución Redes',secciones:[['Ubicación y tramo',['Fecha','Proyecto','Frente','Calle / sector','Progresiva inicial','Progresiva final','GPS inicio','GPS fin']],['Actividad',['Actividad','Diámetro','Material','Metrado declarado (ml)']],['Recursos y evidencia',['Personal','Equipos','Fotos georreferenciadas','Restricciones']]]},
      {codigo:'C02',nombre:'Registro de prueba Redes',secciones:[['Tramo y prueba',['Código de tramo','Tipo de prueba','Longitud ensayada (ml)','Diámetro','Hora inicio','Hora fin']],['Parámetros',['Presión inicial (bar)','Temperatura inicial (°C)','Presión final (bar)','Temperatura final (°C)','Resultado']],['Evidencia',['Foto manómetro / equipo','Observaciones']]]},
      {codigo:'C03',nombre:'Registro de gasificación',secciones:[['Red',['Tramo / malla','Longitud gasificada (ml)','Fecha / hora']],['Parámetros',['Concentración de CH4 (%)','Presión de red (bar)','Venteo realizado','Hermeticidad empalmes']],['Evidencia',['Fotos / detector multigás / manómetro','Observaciones']]]},
      {codigo:'C04',nombre:'Reposición de pavimento',secciones:[['Tramo',['Tramo','Tipo de pavimento','Longitud / área repuesta','Unidad']],['Control',['Fecha reposición','Fotos antes/después','Observaciones']]]}
    ],
    psr:[
      {codigo:'C01',nombre:'Parte diario de ejecución PSR',secciones:[['Jornada',['Fecha','Proyecto PSR','Frente / área','Especialidad','Actividad EDT','% avance declarado actividad']],['Recursos',['Personal total','Equipos principales','Horas trabajadas','Turno']],['Evidencias y restricciones',['Fotografías georreferenciadas','Incidentes / accidentes','Restricciones','Comentarios']]]},
      {codigo:'C03',nombre:'Solicitud de verificación de hito PSR',secciones:[['Hito',['Hito','Fecha de cumplimiento declarada','Resumen de lo ejecutado']],['Evidencias',['Documentos del hito','Registro fotográfico','Protocolos / actas internas']]]},
      {codigo:'C04',nombre:'Registro de prueba / pre-commissioning',secciones:[['Prueba',['Tipo','Equipo / sistema','Fecha / hora','Procedimiento aplicado']],['Resultado',['Valor / parámetro','Resultado','Evidencia','Observaciones']]]},
      {codigo:'C06',nombre:'Levantamiento de RNC PSR',secciones:[['RNC',['N.° RNC','Descripción del hallazgo','Causa raíz']],['Acciones',['Corrección inmediata','Acción correctiva','Acción preventiva','Responsable','Fecha compromiso','Evidencias']]]}
    ],
    tc:[
      {codigo:'C01',nombre:'Registro TC por suministro',secciones:[['Suministro',['N.° suministro','Dirección','GPS','Red asociada','Sector']],['Ejecución',['Fecha ejecución','TC instalada','Material / diámetro','Prueba realizada','Resultado prueba']],['Habilitación',['Instalación interna habilitada','Fecha de habilitación','Fotos georreferenciadas','Observaciones']]]}
    ]
  };
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

  function tipoCampo(nombre){const n=nombre.toLowerCase();if(/foto|evidencia|documento|acta|protocolo/.test(n))return 'file';if(/fecha|hora/.test(n))return 'date';if(/observaci|restricci|resumen|descripci|causa|corrección|correctiva|preventiva|equipos|procedimiento/.test(n))return 'textarea';if(/avance|presión|temperatura|longitud|metrado|personal|horas|concentración|área|parámetro/.test(n))return 'number';return 'text'}
  function renderFormularioMovil(){
    const infraestructura=$('infraFormulario').value,formatos=formulariosMoviles[infraestructura]||[];
    $('tipoFormulario').innerHTML=formatos.map((f,i)=>`<option value="${i}">${f.codigo} · ${f.nombre}</option>`).join('');
    renderCamposFormularioMovil();
  }
  function renderCamposFormularioMovil(){
    const formato=formulariosMoviles[$('infraFormulario').value]?.[Number($('tipoFormulario').value)];if(!formato)return;
    const campo=nombre=>{const tipo=tipoCampo(nombre);if(tipo==='textarea')return `<label class="campo-texto">${nombre}<textarea placeholder="Registrar información"></textarea></label>`;if(tipo==='file')return `<label class="campo-archivo">${nombre}<input type="file" multiple accept="image/*,video/*,.pdf"><small>Fotos, videos, PDF o evidencia de campo.</small></label>`;return `<label>${nombre}<input type="${tipo}" ${tipo==='number'?'step="any"':''}></label>`};
    $('camposFormularioMovil').innerHTML=`<article class="tarjeta-movil"><p class="eyebrow">${formato.codigo}</p><h3>${formato.nombre}</h3><p>Complete los datos y adjunte las evidencias del registro.</p></article>${formato.secciones.map(([titulo,campos])=>`<section class="grupo-campos"><h3>${titulo}</h3>${campos.map(campo).join('')}</section>`).join('')}`;
  }
  function registrarFormularioMovil(estado){
    const formato=formulariosMoviles[$('infraFormulario').value]?.[Number($('tipoFormulario').value)];if(!formato)return;
    informes.unshift({id:`${formato.codigo}-${String(informes.length+1).padStart(3,'0')}`,tipo:formato.nombre,fecha:new Date().toLocaleDateString('es-PE'),estado,detalle:$('infraFormulario').selectedOptions[0].textContent});
    renderInformes();ir('informes');mensaje(estado==='Borrador'?'Formulario guardado como borrador.':'Formulario enviado a revisión.');
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
  $('infraFormulario').addEventListener('change',renderFormularioMovil);
  $('tipoFormulario').addEventListener('change',renderCamposFormularioMovil);
  $('formularioMovil').addEventListener('submit',evento=>{evento.preventDefault();registrarFormularioMovil('Enviado')});
  $('guardarFormularioMovil').addEventListener('click',()=>registrarFormularioMovil('Borrador'));
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

  renderFormularioMovil();
  renderInformes();
})();
