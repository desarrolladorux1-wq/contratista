(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const titulos={'sat-control':'SAT control','informe-supervision':'Informe de obra','repositorio-informes':'Mis informes de obra','no-conformidades':'No conformidades'};
  const proyectos=[
    {nombre:'Cusco · Sector 03',depto:'Cusco',estado:'En ejecución',lat:-13.52,lng:-71.97,color:'#f0a51b'},
    {nombre:'Arequipa · Cono Norte',depto:'Arequipa',estado:'Instalada',lat:-16.39,lng:-71.54,color:'#34a56f'},
    {nombre:'Lima Sur · Etapa II',depto:'Lima',estado:'Proyectada',lat:-12.18,lng:-76.93,color:'#378bc0'}
  ];
  const clave='masificacion_informes_contratista_v1';
  let mapa,marcadores=[];
  const iniciales=[
    {id:'demo-1',fecha:'2026-08-12',numero:'END-IDT-RED-CU-257-G1',tipo:'Informe diario',responsable:'Andrea Contratista',proyecto:'Cusco · Red de distribución Sector 03',estado:'Registrado'},
    {id:'demo-2',fecha:'2026-08-08',numero:'ISO-CU-REDES-039',tipo:'Informe semanal',responsable:'Carlos Mendoza',proyecto:'Arequipa · Ampliación Cono Norte',estado:'Registrado'},
    {id:'demo-3',fecha:'2026-08-04',numero:'END-IDT-LS-014-G2',tipo:'Informe diario',responsable:'Rosa Quispe',proyecto:'Lima Sur · Etapa II',estado:'Borrador'}
  ];
  function leerInformes(){try{const guardados=JSON.parse(localStorage.getItem(clave));const datos=Array.isArray(guardados)?guardados:iniciales;return datos.map(item=>({...item,tipo:String(item.tipo||'').replace(/^(Parte|Informe) /,'Informe ')}))}catch{return iniciales}}
  function guardarInformes(datos){localStorage.setItem(clave,JSON.stringify(datos))}
  function hoy(){return new Date().toLocaleDateString('en-CA',{timeZone:'America/Lima'})}
  function aviso(texto){$('aviso').textContent=texto;$('aviso').classList.add('visible');clearTimeout(aviso.temporizador);aviso.temporizador=setTimeout(()=>$('aviso').classList.remove('visible'),2600)}
  function navegar(id){
    if(id!=='sat-control'){
      const contraidoEnSat=$('satcontrolCompleto')?.contentDocument?.body?.classList.contains('menu-colapsado');
      document.body.classList.toggle('menu-colapsado',Boolean(contraidoEnSat));
    }
    document.body.classList.toggle('satcontrol-activo',id==='sat-control');
    document.querySelectorAll('.vista').forEach(v=>{const activa=v.id===id;v.hidden=!activa;v.classList.toggle('activa',activa)});
    document.querySelectorAll('[data-vista]').forEach(b=>b.classList.toggle('activo',b.dataset.vista===id));
    $('tituloVista').textContent=titulos[id]||'Masificación';
    const tituloHeader=document.querySelector('.cabecera-satcontrol-identidad>strong');
    if(tituloHeader){const nombre=id==='sat-control'?'SATCONTROL':id==='informe-supervision'?'INFORME DE OBRA':id==='repositorio-informes'?'MIS INFORMES DE OBRA':'NO CONFORMIDADES';tituloHeader.innerHTML=`SATCONTROL <i>·</i> ${nombre}`}
    history.replaceState(null,'',`#${id}`);
    cerrarMenuMovil();
    if(id==='sat-control'&&mapa)setTimeout(()=>mapa.invalidateSize(),80);
    if(id==='repositorio-informes')renderRepositorio();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function iniciarMapa(){
    if(!window.L)return;
    mapa=L.map('mapaMasificacion',{zoomControl:false}).setView([-12.3,-74.8],5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(mapa);
    L.control.zoom({position:'bottomright'}).addTo(mapa);
    pintarProyectos(proyectos);
  }
  function pintarProyectos(lista){
    marcadores.forEach(m=>m.remove());marcadores=lista.map(p=>L.circleMarker([p.lat,p.lng],{radius:10,color:'#fff',weight:3,fillColor:p.color,fillOpacity:1}).addTo(mapa).bindPopup(`<strong>${p.nombre}</strong><br>${p.estado}`));
    $('kpiProyectos').textContent=lista.length;
  }
  function filtrarProyectos(){const q=$('buscarProyecto').value.toLowerCase(),d=$('filtroDepartamento').value,e=$('filtroEstado').value;pintarProyectos(proyectos.filter(p=>(!q||p.nombre.toLowerCase().includes(q))&&(!d||p.depto===d)&&(!e||p.estado===e)))}
  function renderRepositorio(){
    const q=$('buscarInforme').value.trim().toLowerCase(),tipo=$('filtrarTipo').value;
    const datos=leerInformes().filter(i=>(!tipo||i.tipo===tipo)&&(!q||[i.numero,i.responsable,i.proyecto].join(' ').toLowerCase().includes(q))).sort((a,b)=>b.fecha.localeCompare(a.fecha));
    $('listaInformes').innerHTML=datos.map(i=>`<tr><td>${formatearFecha(i.fecha)}</td><td>${esc(i.numero)}</td><td>${esc(i.tipo)}</td><td>${esc(i.responsable)}</td><td>${esc(i.proyecto)}</td><td><span class="estado ${i.estado==='Borrador'?'borrador':''}">${esc(i.estado)}</span></td><td><button class="accion-tabla" type="button" data-ver-informe="${esc(i.id)}">Ver detalle</button></td></tr>`).join('');
    $('cantidadInformes').textContent=`${datos.length} informe${datos.length===1?'':'s'}`;$('repositorioVacio').hidden=datos.length>0;$('listaInformes').closest('.tabla-contenedor').hidden=datos.length===0;
  }
  function verDetalleInforme(informe){
    let dialogo=$('modalDetalleInforme');
    if(!dialogo){
      document.body.insertAdjacentHTML('beforeend','<dialog class="modal-detalle-informe" id="modalDetalleInforme"><form method="dialog"><header><small>INFORME DE OBRA</small><h2 id="detalleInformeTitulo"></h2><button aria-label="Cerrar">×</button></header><section id="detalleInformeContenido"></section><footer><button>Cerrar</button></footer></form></dialog>');
      dialogo=$('modalDetalleInforme');
    }
    $('detalleInformeTitulo').textContent=informe.numero;
    $('detalleInformeContenido').innerHTML=`<article><small>Tipo</small><strong>${esc(informe.tipo)}</strong></article><article><small>Estado</small><strong>${esc(informe.estado)}</strong></article><article><small>Fecha</small><strong>${formatearFecha(informe.fecha)}</strong></article><article><small>Responsable</small><strong>${esc(informe.responsable)}</strong></article><article class="ancho"><small>Proyecto</small><strong>${esc(informe.proyecto)}</strong></article><p>Este informe fue registrado por el contratista y permanece disponible en el historial documental del proyecto.</p>`;
    dialogo.showModal();
  }
  function formatearFecha(fecha){if(!fecha)return '—';const [a,m,d]=fecha.split('-');return `${d}/${m}/${a}`}
  function esc(valor){return String(valor??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function datosFormulario(estado){return{id:`inf-${Date.now()}`,fecha:$('fechaInforme').value,numero:$('numeroInforme').value.trim(),tipo:$('tipoInforme').value,responsable:$('responsableInforme').value.trim(),proyecto:$('proyectoInforme').value,estado}}
  function almacenarInforme(estado){
    const numero=$('supervisionNumero').value.trim();if(!numero){$('supervisionNumero').focus();aviso('Ingrese el número o nombre del informe.');return}
    const diario=tipoSupervision()==='diario',proyecto=$('supervisionProyecto').selectedOptions[0]?.textContent||'—';
    const nuevo={id:`inf-${Date.now()}`,fecha:diario?$('supervisionFecha').value:hoy(),numero,tipo:diario?'Informe diario':'Informe semanal',responsable:$('supervisionSupervisor').value.trim()||'Responsable de obra',proyecto,estado};
    const datos=leerInformes();datos.unshift(nuevo);guardarInformes(datos);aviso(estado==='Borrador'?'Borrador guardado correctamente.':'Informe guardado en el repositorio.');
    if(estado==='Registrado')setTimeout(()=>navegar('repositorio-informes'),500);
  }
  const evidenciasMovil=[
    ['evidencia-1.jpg','Charla de seguridad','Registro de inducción de la cuadrilla'],['evidencia-2.jpg','Prueba de hermeticidad','Carpa primaria · Cusco'],['evidencia-3.jpg','Control de presión','Línea PEAD · 7.8 bar'],['evidencia-4.jpg','Frente secundario','Verificación previa a gasificación'],['evidencia-5.jpg','Lectura de manómetro','Control georreferenciado'],['evidencia-6.jpg','Área de trabajo','Señalización y control de acceso']
  ].map((f,i)=>({id:`movil-${i+1}`,src:`SATCONTROL/documentos/evidencias-movil/${f[0]}`,titulo:f[1],detalle:f[2],incluida:true}));
  let evidenciasManuales=[];
  function tipoSupervision(){return document.querySelector('[data-tipo-supervision].activo')?.dataset.tipoSupervision||'diario'}
  function configurarSupervision(tipo){
    document.querySelectorAll('[data-tipo-supervision]').forEach(b=>b.classList.toggle('activo',b.dataset.tipoSupervision===tipo));
    $('vistaInformeDiario').hidden=tipo!=='diario';$('vistaInformeSemanal').hidden=tipo!=='semanal';$('campoFechaSupervision').hidden=tipo!=='diario';$('campoPeriodoSupervision').hidden=tipo!=='semanal';
    $('supervisionNumero').value=tipo==='diario'?'END-IDT-RED-CU-259-G1-25-07-2026':'ISO-CU-REDES-039';$('estadoInformeSupervision').textContent=tipo==='diario'?'Informe diario listo para editar.':'Informe semanal listo para editar.';
  }
  function renderGaleria(){
    const todas=[...evidenciasMovil,...evidenciasManuales];$('galeriaFotosSupervision').innerHTML=todas.map(f=>`<article class="evidencia-movil ${f.incluida?'incluida':'descartada'}" data-evidencia-id="${f.id}"><div><img src="${f.src}" alt="${esc(f.titulo)}"><span>${f.file?'CARGA MANUAL':'GPS · Cusco'}</span></div><footer><strong>${esc(f.titulo)}</strong><small>${esc(f.detalle)}</small><button type="button" aria-pressed="${f.incluida}">${f.incluida?'✓ Incluir':'Restaurar'}</button></footer></article>`).join('');
  }
  function descargarCsv(){
    const fila={Fecha:tipoSupervision()==='diario'?$('supervisionFecha').value:$('supervisionPeriodo').value,Informe:$('supervisionNumero').value,Proyecto:$('supervisionProyecto').selectedOptions[0]?.textContent,Contratista:$('supervisionContratista').value,'Responsable de obra':$('supervisionSupervisor').value,Observaciones:$('supervisionObservaciones').value};
    const cols=Object.keys(fila),celda=v=>`"${String(v??'').replaceAll('"','""')}"`,csv='\ufeff'+cols.map(celda).join(',')+'\n'+cols.map(c=>celda(fila[c])).join(',');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`informe_obra_${tipoSupervision()}.csv`;a.click();URL.revokeObjectURL(a.href);$('estadoInformeSupervision').textContent='CSV generado correctamente.';
  }
  async function recursoDataUrl(url){const blob=await fetch(url).then(r=>r.blob());return await new Promise((resolve,reject)=>{const lector=new FileReader();lector.onload=()=>resolve(lector.result);lector.onerror=reject;lector.readAsDataURL(blob)})}
  async function descargarPdf(){
    if(!window.jspdf?.jsPDF){aviso('No se pudo cargar el generador PDF.');return}
    const generadorOriginal=$('satcontrolCompleto')?.contentWindow?.generarPdfSupervisionOriginal;
    const usarPlantillaSupervision=false; // El contratista genera su propio informe de obra, no el informe de supervisión.
    if(usarPlantillaSupervision&&typeof generadorOriginal==='function'){
      $('estadoInformeSupervision').textContent='Generando el PDF original de Masificación…';
      const manuales=[];for(const foto of evidenciasManuales){try{manuales.push({src:await recursoDataUrl(foto.src),titulo:foto.titulo,detalle:foto.detalle,incluida:foto.incluida})}catch{}}
      const estadosEvidencias=Object.fromEntries(evidenciasMovil.map(f=>[f.id,f.incluida]));
      await generadorOriginal({tipo:tipoSupervision(),numero:$('supervisionNumero').value,fecha:$('supervisionFecha').value,periodo:$('supervisionPeriodo').value,proyecto:$('supervisionProyecto').value,contratista:$('supervisionContratista').value,supervisor:$('supervisionSupervisor').value,cliente:$('supervisionCliente').value,lugar:$('supervisionLugar').value,avanceCivil:$('supervisionAvanceCivil').value,avanceMecanico:$('supervisionAvanceMecanico').value,personal:$('supervisionPersonal').value,equipos:$('supervisionEquipos').value,incidentes:$('supervisionIncidentes').value,accidentes:$('supervisionAccidentes').value,observaciones:$('supervisionObservaciones').value,conclusiones:$('supervisionConclusiones').value,estadosEvidencias,evidenciasManuales:manuales,logoContratista:urlLogoContratista?await recursoDataUrl(urlLogoContratista):''});
      $('estadoInformeSupervision').textContent='PDF original de Masificación generado correctamente.';aviso('PDF original generado correctamente.');return;
    }
    const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'a4'}),valor=id=>$(id)?.value?.trim()||'—',tipo=tipoSupervision(),fecha=tipo==='diario'?valor('supervisionFecha'):valor('supervisionPeriodo');
    $('estadoInformeSupervision').textContent='Generando PDF…';
    doc.setFillColor(27,33,61);doc.rect(0,0,210,34,'F');
    try{const logoFise=await recursoDataUrl('SATCONTROL/compartido/img/logo_fise.png');doc.addImage(logoFise,'PNG',14,6,22,22)}catch{}
    if(urlLogoContratista){try{const logo=await recursoDataUrl(urlLogoContratista);doc.addImage(logo,undefined,174,6,22,22)}catch{}}
    doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(14);doc.text(tipo==='diario'?'INFORME DIARIO DE OBRA':'INFORME SEMANAL DE OBRA',105,15,{align:'center'});doc.setFontSize(8);doc.setFont('helvetica','normal');doc.text(valor('supervisionNumero'),105,22,{align:'center'});
    doc.autoTable({startY:40,theme:'grid',styles:{fontSize:8,cellPadding:2.5},headStyles:{fillColor:[42,66,107]},head:[['DATOS DEL INFORME','VALOR']],body:[['Proyecto',$('supervisionProyecto').selectedOptions[0]?.textContent||'—'],['Fecha / periodo',fecha],['Contratista',valor('supervisionContratista')],['Responsable de obra',valor('supervisionSupervisor')],['Cliente',valor('supervisionCliente')],['Lugar',valor('supervisionLugar')],['Avance civil',valor('supervisionAvanceCivil')],['Avance mecánico',valor('supervisionAvanceMecanico')],['Personal / equipos',`${valor('supervisionPersonal')} / ${valor('supervisionEquipos')}`],['Incidentes / accidentes',`${valor('supervisionIncidentes')} / ${valor('supervisionAccidentes')}`]]});
    let y=doc.lastAutoTable.finalY+9;const bloque=(titulo,texto)=>{doc.setFillColor(237,242,249);doc.roundedRect(14,y,182,30,2,2,'F');doc.setTextColor(35,60,94);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(titulo,18,y+7);doc.setTextColor(45);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(doc.splitTextToSize(texto,174),18,y+13);y+=37};bloque('OBSERVACIONES',valor('supervisionObservaciones'));bloque('CONCLUSIONES / RESTRICCIONES',valor('supervisionConclusiones'));
    const pie=()=>{doc.setDrawColor(130);doc.line(14,280,196,280);doc.setTextColor(90);doc.setFontSize(7);doc.text('SATCONTROL · MASIFICACIÓN',14,286);doc.text(valor('supervisionNumero'),196,286,{align:'right'})};pie();
    const seleccionadas=[...evidenciasMovil,...evidenciasManuales].filter(f=>f.incluida),imagenes=[];
    for(const evidencia of seleccionadas){try{imagenes.push({...evidencia,data:await recursoDataUrl(evidencia.src)})}catch(error){console.warn('No se pudo incluir la evidencia',evidencia.titulo,error)}}
    for(let inicio=0;inicio<imagenes.length;inicio+=6){
      doc.addPage();doc.setFillColor(27,33,61);doc.rect(0,0,210,30,'F');
      try{const logoFise=await recursoDataUrl('SATCONTROL/compartido/img/logo_fise.png');doc.addImage(logoFise,'PNG',14,5,20,20)}catch{}
      if(urlLogoContratista){try{const logo=await recursoDataUrl(urlLogoContratista);doc.addImage(logo,undefined,176,5,20,20)}catch{}}
      doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('REGISTRO FOTOGRÁFICO',105,13,{align:'center'});doc.setFontSize(7);doc.setFont('helvetica','normal');doc.text(`${valor('supervisionNumero')} · ${fecha}`,105,20,{align:'center'});
      imagenes.slice(inicio,inicio+6).forEach((foto,i)=>{const columna=i%2,fila=Math.floor(i/2),x=14+columna*92,yFoto=38+fila*77;doc.setDrawColor(95,112,145);doc.setFillColor(241,244,249);doc.roundedRect(x,yFoto,88,68,2,2,'FD');try{doc.addImage(foto.data,undefined,x+3,yFoto+3,82,50,undefined,'FAST')}catch{}doc.setFillColor(42,66,107);doc.rect(x+3,yFoto+55,82,10,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(6.5);doc.text(`${inicio+i+1}. ${foto.titulo}`.slice(0,48),x+5,yFoto+59);doc.setFont('helvetica','normal');doc.setFontSize(5.5);doc.text((foto.detalle||'Evidencia agregada al informe').slice(0,60),x+5,yFoto+63)});pie();
    }
    doc.save(`informe-obra-${tipo}-${valor('supervisionNumero').replace(/[^a-z0-9-]+/gi,'_')}.pdf`);$('estadoInformeSupervision').textContent=`PDF generado con ${imagenes.length} fotografía(s) seleccionada(s).`;aviso('Informe de obra PDF generado correctamente.');
  }
  function cerrarMenuMovil(){$('panelLateral').classList.remove('movil-abierto');$('velo').classList.remove('visible')}
  document.querySelectorAll('[data-vista]').forEach(b=>b.addEventListener('click',()=>navegar(b.dataset.vista)));
  document.querySelectorAll('[data-ir]').forEach(b=>b.addEventListener('click',()=>navegar(b.dataset.ir)));
  document.querySelector('.cerrar-sesion')?.addEventListener('click',e=>{e.preventDefault();aviso('Cerrar sesión está deshabilitado en esta maqueta.')});
  $('contraerMenu').addEventListener('click',()=>{const c=$('panelLateral').classList.toggle('contraido');$('contraerMenu').textContent=c?'›':'‹';$('contraerMenu').setAttribute('aria-expanded',String(!c));setTimeout(()=>mapa?.invalidateSize(),270)});
  $('abrirMenu').addEventListener('click',()=>{$('panelLateral').classList.add('movil-abierto');$('velo').classList.add('visible')});$('velo').addEventListener('click',cerrarMenuMovil);
  const marcoSat=$('satcontrolCompleto');
  // El panel del contratista inicia siempre con la apariencia Paulet.
  document.body.classList.remove('tema-claro-contratista');
  function sincronizarTemaSatcontrol(){
    const cuerpoSat=marcoSat?.contentDocument?.body;
    if(cuerpoSat)cuerpoSat.classList.toggle('tema-claro-contratista',document.body.classList.contains('tema-claro-contratista'));
  }
  marcoSat.addEventListener('load',()=>{
    const doc=marcoSat.contentDocument;if(!doc)return;
    // El perfil Contratista no usa el asistente/chat; se elimina también dentro de SATCONTROL.
    doc.querySelector('#botonAsistenteIA')?.remove();
    doc.querySelectorAll('[id*="asistente" i],[class*="asistente" i],script[src*="asistente" i]').forEach(elemento=>elemento.remove());
    doc.querySelector('.cerrar-sesion')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();aviso('Cerrar sesión está deshabilitado en esta maqueta.')},{capture:true});
    doc.querySelector('.boton-mis-apps')?.remove();doc.querySelector('.modal-mis-apps')?.remove();
    const estilo=doc.createElement('style');estilo.textContent=`
      :root{--menu-ancho:260px!important}.menu-lateral{width:260px!important}.cabecera-satcontrol-global{left:260px!important}.menu-colapsado .cabecera-satcontrol-global{left:0!important}
      .menu-contenido{overflow-x:hidden!important}.menu-contenido .grupo-menu{display:grid!important;align-content:start!important;gap:6px!important}.menu-contenido .enlace-menu{width:100%!important;min-height:52px!important;display:grid!important;grid-template-columns:36px minmax(0,1fr)!important;align-items:center!important;gap:10px!important;margin:0!important;padding:10px 14px!important;overflow:hidden!important;border-color:transparent!important;background:transparent!important;font:inherit;text-align:left;cursor:pointer}.menu-contenido .enlace-menu .menu-icono{width:36px!important;margin:0!important}.menu-contenido .enlace-menu .enlace-texto{min-width:0!important;display:block!important;color:#c7d2e8!important;font-size:.72rem!important;font-weight:750!important;line-height:1.25!important;white-space:normal!important;overflow-wrap:anywhere!important}.menu-contenido .enlace-menu.activo{color:#fff!important;border-color:#5f87b7!important;background:#304369!important;box-shadow:inset 4px 0 #63a6d0!important;transform:none!important}.menu-contenido .enlace-menu.activo .enlace-texto{color:#fff!important}.menu-contenido .enlace-menu:not(.activo):hover{background:rgba(69,101,151,.18)!important}
      .menu-pie .usuario-contratista-sat{display:flex;align-items:center;gap:9px;margin:0 10px 9px;padding:10px;border:1px solid rgba(125,151,203,.18);border-radius:12px}.usuario-contratista-sat>span{width:35px;height:35px;display:grid;place-items:center;flex:none;color:#fff;border-radius:10px;background:#438eaf;font-size:.7rem;font-weight:800}.usuario-contratista-sat p{display:grid;margin:0}.usuario-contratista-sat strong{color:#fff;font-size:.68rem}.usuario-contratista-sat small{color:#91a0bb;font-size:.6rem}.menu-colapsado .menu-contenido .enlace-menu{grid-template-columns:36px!important;justify-content:center!important}.menu-colapsado .menu-contenido .enlace-texto,.menu-colapsado .usuario-contratista-sat p{display:none!important}
      .enlace-menu-contratista .menu-icono svg{fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
      html[data-tema="paulet"] .menu-contenido .enlace-menu{color:#415b7f!important;background:transparent!important}html[data-tema="paulet"] .menu-contenido .enlace-menu .enlace-texto{color:#415b7f!important}html[data-tema="paulet"] .menu-contenido .enlace-menu.activo{color:#254f82!important;border-color:#c8deed!important;background:#e9f5fc!important;box-shadow:inset 4px 0 #58aed6!important}html[data-tema="paulet"] .menu-contenido .enlace-menu.activo .enlace-texto,html[data-tema="paulet"] .menu-contenido .enlace-menu.activo .menu-icono{color:#254f82!important}
      /* SATCONTROL debe mantener Paulet, no la hoja clara institucional. */
      body{color:#eaf2ff!important;background:#0b1226!important}.contenido-principal{background:#0b1226!important}.cabecera-modulo h1{color:#f2f7ff!important}.cabecera-modulo p{color:#aebfdd!important}.filtros-masificacion,.resumen-cabecera,.avance-ciudades,.detalle-proyecto,.potencial-beneficiarios{color:#eaf2ff!important;border-color:#334975!important;background:#121f3e!important;box-shadow:none!important}.resumen-cabecera h2,.detalle-proyecto h2,.avance-ciudades h3,.potencial-beneficiarios h3{color:#f2f7ff!important}.resumen-cabecera p,.avance-ciudades p,.potencial-beneficiarios p,.resumen-cabecera small,.detalle-proyecto small,.potencial-beneficiarios small{color:#aebfdd!important}.filtros-masificacion input,.filtros-masificacion select{color:#edf5ff!important;border-color:#45608f!important;background:#0d1831!important}.panel-derecho{background:#0b1226!important}.kpis article,.metricas-potencial article,.detalle-proyecto dl div{color:#eaf2ff!important;border-color:#3a5080!important;background:#17294d!important}.kpis span,.metricas-potencial span,.detalle-proyecto dt{color:#aebfdd!important}.kpis strong,.metricas-potencial strong,.detalle-proyecto dd{color:#f2f7ff!important}.mapa-principal,.mapa-contenedor{border-color:#334975!important;background:#162747!important}.panel-derecho::-webkit-scrollbar-track{background:#101c37!important}.panel-derecho::-webkit-scrollbar-thumb{border-color:#101c37!important;background:#4c86b8!important}
    `;doc.head.appendChild(estilo);
    const enlaceSat=doc.querySelector('.enlace-menu[href="#satcontrol"]');
    if(enlaceSat&&!doc.querySelector('[data-vista-contratista="informe-supervision"]')){
      const crearEnlace=(id,texto,icono)=>{const b=doc.createElement('button');b.type='button';b.className='enlace-menu enlace-menu-contratista';b.dataset.vistaContratista=id;b.dataset.etiqueta=texto;b.innerHTML=`<span class="menu-icono" aria-hidden="true">${icono}</span><span class="enlace-texto">${texto}</span>`;b.addEventListener('click',()=>navegar(id));return b};
      const informe=crearEnlace('informe-supervision','Informe de obra','<svg viewBox="0 0 24 24"><path d="M7 3h10v4H7zM5 5H3v16h18V5h-2"/><path d="M7 11h10M7 15h7M7 19h5"/></svg>');
      const repositorio=crearEnlace('repositorio-informes','Mis informes de obra','<svg viewBox="0 0 24 24"><path d="M3 7h7l2 2h9v11H3zM3 7V4h7l2 2h7v3"/><path d="M8 13h8M8 17h5"/></svg>');
      const aplicativoMovil=doc.createElement('a');aplicativoMovil.className='enlace-menu enlace-menu-contratista enlace-app-movil';aplicativoMovil.href='../appmovil/index.html';aplicativoMovil.target='_top';aplicativoMovil.dataset.etiqueta='Aplicativo móvil';aplicativoMovil.innerHTML='<span class="menu-icono" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="6.5" y="2.5" width="11" height="19" rx="2"/><path d="M10 18.3h4"/></svg></span><span class="enlace-texto">Aplicativo móvil</span>';
      enlaceSat.after(informe);informe.after(repositorio);repositorio.after(aplicativoMovil);
    }
    const botonInforme=doc.getElementById('abrirInformesSupervision');
    if(botonInforme){
      botonInforme.querySelector('strong').textContent='Informe de obra';
      botonInforme.querySelector('small').textContent='Registrar informe diario o semanal';
      botonInforme.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();navegar('informe-supervision')},{capture:true});
    }
    // La paleta se elige dentro del iframe, pero Informe de obra pertenece al panel padre.
    // Se sincronizan ambos documentos para que FISE sea claro también fuera de SATCONTROL.
    doc.addEventListener('click',evento=>{
      const opcion=evento.target.closest('[data-tema]');if(!opcion)return;
      const tema=opcion.dataset.tema;if(tema!=='paulet'&&tema!=='oscuro')return;
      setTimeout(()=>{
        if(typeof window.aplicarTemaVisual==='function')window.aplicarTemaVisual(tema);else document.documentElement.dataset.tema=tema;
        document.body.classList.toggle('tema-claro-contratista',tema==='paulet');
        sincronizarTemaSatcontrol();
      },0);
    });
    doc.body.classList.add('paulet-contratista');
    doc.body.classList.remove('tema-claro-contratista');
    sincronizarTemaSatcontrol();
    $('estadoCargaSat').hidden=true;marcoSat.classList.add('cargado');
  });
  $('recargarSatcontrol').addEventListener('click',()=>{ $('estadoCargaSat').hidden=false;marcoSat.classList.remove('cargado');marcoSat.contentWindow.location.reload();aviso('Actualizando SATCONTROL…') });
  $('alternarTema').addEventListener('click',()=>{document.body.classList.toggle('tema-claro-contratista');sincronizarTemaSatcontrol();aviso(document.body.classList.contains('tema-claro-contratista')?'Tema claro activado.':'Tema oscuro activado.')});
  $('notificaciones').addEventListener('click',()=>aviso('Tiene 3 actualizaciones de proyectos pendientes de revisión.'));
  $('abrirLevantamiento')?.addEventListener('click',()=>$('modalLevantamiento').showModal());
  $('cerrarLevantamiento')?.addEventListener('click',()=>$('modalLevantamiento').close());
  $('guardarBorradorNc')?.addEventListener('click',()=>{ $('modalLevantamiento').close();aviso('Levantamiento guardado como borrador.'); });
  $('formLevantamiento')?.addEventListener('submit',evento=>{evento.preventDefault();$('modalLevantamiento').close();aviso('Levantamiento enviado a verificación.');});
  document.querySelectorAll('[data-nc]').forEach(boton=>boton.addEventListener('click',()=>{aviso(`NC ${boton.dataset.nc}: revise el detalle o registre su levantamiento.`)}));
  const accionesHeader=document.querySelector('.cabecera-satcontrol-acciones'),espacioHeader=document.querySelector('.indicador-espacio-satcontrol');
  if(accionesHeader&&!document.getElementById('herramientasContratistaHeader')){
    const herramienta=document.createElement('button');herramienta.id='herramientasContratistaHeader';herramienta.className='abrir-herramientas-fise boton-herramientas-icono herramientas-contratista-header';herramienta.type='button';herramienta.title='Herramientas';herramienta.setAttribute('aria-label','Abrir herramientas');herramienta.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a4.2 4.2 0 0 0-5.4 5.4L3.8 17.2a2.1 2.1 0 0 0 3 3l5.5-5.5a4.2 4.2 0 0 0 5.4-5.4l-2.6 2.6-3-3 2.6-2.6Z"/></svg>';
    herramienta.addEventListener('click',()=>aviso('Las herramientas cartográficas están disponibles en SAT control.'));
    accionesHeader.insertBefore(herramienta,accionesHeader.firstChild);
  }
  document.querySelector('.boton-mis-apps')?.remove();document.querySelector('.modal-mis-apps')?.remove();
  document.querySelectorAll('[data-tipo-supervision]').forEach(b=>b.addEventListener('click',()=>configurarSupervision(b.dataset.tipoSupervision)));
  $('guardarInformeRepositorio').addEventListener('click',()=>almacenarInforme('Registrado'));$('guardarBorrador').addEventListener('click',()=>almacenarInforme('Borrador'));$('exportarSupervisionCsv').addEventListener('click',descargarCsv);$('exportarSupervisionPdf').addEventListener('click',descargarPdf);
  $('sincronizarFotosSupervision').addEventListener('click',()=>{renderGaleria();$('estadoInformeSupervision').textContent='Evidencias móviles sincronizadas.';aviso('Fotografías sincronizadas correctamente.')});
  $('supervisionFotos').addEventListener('change',()=>{evidenciasManuales.forEach(f=>URL.revokeObjectURL(f.src));evidenciasManuales=[...$('supervisionFotos').files].map((file,i)=>({id:`manual-${i}`,src:URL.createObjectURL(file),titulo:file.name,detalle:'Fotografía agregada al informe',incluida:true,file}));renderGaleria();$('estadoInformeSupervision').textContent=`${evidenciasManuales.length} fotografía(s) manual(es) listas para revisar.`});
  let urlLogoContratista='';$('logoContratistaInforme').addEventListener('change',()=>{const archivo=$('logoContratistaInforme').files[0];if(!archivo)return;if(urlLogoContratista)URL.revokeObjectURL(urlLogoContratista);urlLogoContratista=URL.createObjectURL(archivo);$('vistaLogoContratista').innerHTML=`<img src="${urlLogoContratista}" alt="Logo del contratista"><small>${esc(archivo.name)}</small>`;aviso('Logo del contratista cargado para el informe.')});
  $('galeriaFotosSupervision').addEventListener('click',e=>{const card=e.target.closest('[data-evidencia-id]');if(!card||!e.target.closest('button'))return;const foto=[...evidenciasMovil,...evidenciasManuales].find(f=>f.id===card.dataset.evidenciaId);if(foto)foto.incluida=!foto.incluida;renderGaleria()});
  $('buscarInforme').addEventListener('input',renderRepositorio);$('filtrarTipo').addEventListener('change',renderRepositorio);
  $('listaInformes').addEventListener('click',e=>{const b=e.target.closest('[data-ver-informe]');if(!b)return;const i=leerInformes().find(x=>x.id===b.dataset.verInforme);if(i)verDetalleInforme(i)});
  $('supervisionFecha').value=hoy();if(!localStorage.getItem(clave))guardarInformes(iniciales);renderGaleria();configurarSupervision('diario');
  const inicial=location.hash.slice(1);navegar(titulos[inicial]?inicial:'sat-control');
})();
