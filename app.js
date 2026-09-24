(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const titulos={'ficha-proyecto-cusco':'Proyecto Especial de Masificación · Cusco','cronograma-actividades':'Cronograma y actividades','informe-supervision':'Informe de obra','formularios-obra':'Formularios de obra','repositorio-informes':'Mis informes de obra'};
  const formulariosObra={
    psr:{nombre:'Plantas · PSR-GNL',formularios:[
      ['C01','Parte diario de ejecución PSR','App + Web','Jornada|Fecha,Proyecto PSR,Frente / área,Especialidad,Actividad EDT,% avance declarado actividad','Recursos|Personal total,Equipos principales,Horas trabajadas,Turno','Evidencias y restricciones|Fotografías georreferenciadas,Incidentes / accidentes,Restricciones,Comentarios'],
      ['C02','Avance EDT PSR','Web','EDT|Código EDT,Actividad,Peso (%),Avance semana anterior (%),Avance semana actual (%),Avance acumulado (%)','Sustento|Evidencia,Comentario'],
      ['C03','Solicitud de verificación de hito PSR','Web + App','Hito|Hito,Fecha de cumplimiento declarada,Resumen de lo ejecutado','Evidencias|Documentos del hito,Registro fotográfico,Protocolos / actas internas'],
      ['C04','Registro de prueba / pre-commissioning','App + Web','Prueba|Tipo,Equipo / sistema,Fecha / hora,Procedimiento aplicado','Resultado|Valor / parámetro,Resultado,Evidencia,Observaciones'],
      ['C05','Valorización de hito PSR','Web','Valorización|Hito,Monto contractual PSR,Porcentaje del hito,Monto solicitado','Sustento|Acta del Interventor,Breve informe de cumplimiento,Precio / valor aplicable,Firma representante legal'],
      ['C06','Levantamiento de RNC PSR','Web + App','RNC|N.° RNC,Descripción del hallazgo,Causa raíz','Acciones|Corrección inmediata,Acción correctiva,Acción preventiva,Responsable,Fecha compromiso,Evidencias']
    ]},
    redes:{nombre:'Redes de distribución',formularios:[
      ['C01','Parte diario de ejecución Redes','App + Web','Ubicación / tramo|Fecha,Proyecto,Frente,Calle / sector,Progresiva inicial,Progresiva final,GPS inicio,GPS fin','Actividad|Actividad,Diámetro,Material,Metrado declarado (ml)','Recursos y evidencia|Personal,Equipos,Fotos georreferenciadas,Restricciones'],
      ['C02','Registro de prueba Redes','App + Web','Tramo / prueba|Código de tramo,Tipo de prueba,Longitud ensayada (ml),Diámetro,Hora inicio,Hora fin','Parámetros|Presión inicial (bar),Temperatura inicial (°C),Presión final (bar),Temperatura final (°C),Resultado','Evidencia|Foto manómetro / equipo,Observaciones'],
      ['C03','Registro de gasificación','App + Web','Red|Tramo / malla,Longitud gasificada (ml),Fecha / hora','Parámetros|Concentración de CH4 (%),Presión de red (bar),Venteo realizado,Hermeticidad empalmes','Evidencia|Fotos / detector multigás / manómetro,Observaciones'],
      ['C04','Reposición de pavimento','App + Web','Tramo|Tramo,Tipo de pavimento,Longitud / área repuesta,Unidad','Control|Fecha reposición,Fotos antes/después,Observaciones'],
      ['C05','Valorización Redes','Web','Base|Proyecto / libro de obra,Metrado verificado disponible,Precio unitario contractual,Monto solicitado','Sustento|Dossier del proyecto,Cuadro de metrados,Firma representante legal'],
      ['C06','Solicitud de Transferencia Redes','Web','Solicitud|Valorización validada,Monto solicitado,N.° proyecto / libro','Adjuntos|Dossier,Validación Interventor,Firma representante legal']
    ]},
    tc:{nombre:'Tuberías de conexión · TCs',formularios:[
      ['C01','Registro TC por suministro','App + Web','Suministro|N.° suministro,Dirección,GPS,Red asociada,Sector','Ejecución|Fecha ejecución,TC instalada,Material / diámetro,Prueba realizada,Resultado prueba','Habilitación|Instalación interna habilitada,Fecha de habilitación,Fotos georreferenciadas,Observaciones'],
      ['C02','Valorización de TCs','Web','Lote|Grupo / lote,N.° suministros habilitados,Precio unitario TC,Monto solicitado','Sustento|Listado de suministros + fecha habilitación,Firma representante legal'],
      ['C03','Solicitud de Transferencia TCs','Web','Solicitud|Valorización validada,Listado de suministros validados,Monto total','Firma|Representante legal,Firma']
    ]}
  };
  let grupoFormulariosActivo='psr';
  const proyectos=[
    {nombre:'Cusco · Sector 03',depto:'Cusco',estado:'En ejecución',lat:-13.52,lng:-71.97,color:'#f0a51b'},
    {nombre:'Arequipa · Cono Norte',depto:'Arequipa',estado:'Instalada',lat:-16.39,lng:-71.54,color:'#34a56f'},
    {nombre:'Lima Sur · Etapa II',depto:'Lima',estado:'Proyectada',lat:-12.18,lng:-76.93,color:'#378bc0'}
  ];
  const clave='masificacion_informes_contratista_v1';
  let mapa,marcadores=[];
  let actividadesCronograma=[
    {actividad:'Permisos, difusión y señalización',inicio:'2026-08-04',fin:'2026-08-16',predecesora:'—',sucesora:'02',avance:100,estado:'Completada',inicioGantt:2,duracion:18,nivel:0,recursos:[{nombre:'Equipo social',tipo:'Personal',cantidad:'2'}]},
    {actividad:'Excavación y tendido de red PE',inicio:'2026-08-18',fin:'2026-09-26',predecesora:'01',sucesora:'03',avance:76,estado:'En curso',inicioGantt:18,duracion:40,nivel:0,recursos:[{nombre:'Cuadrilla de redes',tipo:'Cuadrilla',cantidad:'3'}]},
    {actividad:'Pruebas de hermeticidad',inicio:'2026-09-29',fin:'2026-10-10',predecesora:'02',sucesora:'04',avance:28,estado:'En curso',inicioGantt:48,duracion:15,nivel:1,recursos:[]},
    {actividad:'Gasificación y puesta en servicio',inicio:'2026-10-13',fin:'2026-10-31',predecesora:'03',sucesora:'05',avance:0,estado:'Por iniciar',inicioGantt:63,duracion:18,nivel:0,recursos:[]},
    {actividad:'Reposición y cierre de observaciones',inicio:'2026-11-03',fin:'2026-11-28',predecesora:'04',sucesora:'—',avance:0,estado:'Por iniciar',inicioGantt:79,duracion:22,nivel:0,recursos:[]}
  ];
  const seleccionCronograma=new Set();
  const calendarioCronograma={dias:new Set([1,2,3,4,5,6]),feriados:[]};
  let indiceRecursoCronograma=-1;
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
    if(id==='sat-control')id='ficha-proyecto-cusco';
    document.body.classList.remove('satcontrol-activo');
    document.querySelectorAll('.vista').forEach(v=>{const activa=v.id===id;v.hidden=!activa;v.classList.toggle('activa',activa)});
    document.querySelectorAll('[data-vista]').forEach(b=>b.classList.toggle('activo',b.dataset.vista===id&&(!b.dataset.grupoFormularios||b.dataset.grupoFormularios===grupoFormulariosActivo)));
    $('tituloVista').textContent=titulos[id]||'Masificación';
    const tituloHeader=document.querySelector('.cabecera-satcontrol-identidad>strong');
    if(tituloHeader){const nombre=id==='ficha-proyecto-cusco'?'FICHA DEL PROYECTO':id==='cronograma-actividades'?'CRONOGRAMA Y ACTIVIDADES':id==='informe-supervision'?'INFORME DE OBRA':id==='repositorio-informes'?'LISTADO DE INFORMES':'FORMULARIOS DE OBRA';tituloHeader.innerHTML=`MASIFICACIÓN <i>·</i> ${nombre}`}
    history.replaceState(null,'',`#${id}`);
    cerrarMenuMovil();
    if(id==='repositorio-informes')renderRepositorio();
    if(id==='formularios-obra')renderCatalogoFormularios();
    if(id==='cronograma-actividades')renderCronogramaContratista();
    if(id==='ficha-proyecto-cusco')iniciarMapaFichaCusco();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  window.addEventListener('message',evento=>{
    if(evento.origin!==location.origin)return;
    if(evento.data?.tipo!=='contratista:navegar')return;
    navegar(evento.data.id);
  });
  window.addEventListener('hashchange',()=>{
    const destino=location.hash.slice(1);
    navegar(titulos[destino]?destino:'ficha-proyecto-cusco');
  });
  function renderCronogramaContratista(){
    const tabla=$('tablaCronogramaContratista');if(!tabla)return;
    tabla.innerHTML=actividadesCronograma.map((item,indice)=>`<tr draggable="true" data-actividad-cronograma="${indice}"><td><input type="checkbox" data-seleccion-cronograma="${indice}" ${seleccionCronograma.has(indice)?'checked':''} aria-label="Seleccionar actividad ${indice+1}"></td><td>${String(indice+1).padStart(2,'0')}</td><td><span class="arrastre-cronograma" title="Arrastre para ordenar">⠿</span><span class="sangria-cronograma" style="width:${Number(item.nivel||0)*16}px"></span><input aria-label="Actividad ${indice+1}" data-campo-cronograma="actividad" value="${esc(item.actividad)}"></td><td><input aria-label="Inicio ${indice+1}" data-campo-cronograma="inicio" type="date" value="${item.inicio}"></td><td><input aria-label="Fin ${indice+1}" data-campo-cronograma="fin" type="date" value="${item.fin}"></td><td><input aria-label="Predecesora ${indice+1}" data-campo-cronograma="predecesora" value="${item.predecesora||''}"></td><td><input aria-label="Sucesora ${indice+1}" data-campo-cronograma="sucesora" value="${item.sucesora||''}"></td><td><label class="avance-actividad"><input aria-label="Avance ${indice+1}" data-campo-cronograma="avance" type="number" min="0" max="100" value="${item.avance}"><span>%</span></label></td><td><button type="button" class="recursos-actividad-contratista" data-recursos-cronograma="${indice}" aria-label="Gestionar recursos">♟<b>${item.recursos?.length||0}</b></button></td><td><select aria-label="Estado ${indice+1}" data-campo-cronograma="estado">${['Por iniciar','En curso','Completada','Observada'].map(estado=>`<option${item.estado===estado?' selected':''}>${estado}</option>`).join('')}</select></td><td><button type="button" class="eliminar-actividad-contratista" aria-label="Eliminar actividad ${indice+1}" title="Eliminar actividad"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg></button></td></tr>`).join('');
    $('ganttCronogramaContratista').innerHTML=actividadesCronograma.map((item,indice)=>`<div class="fila-gantt-contratista"><span>${String(indice+1).padStart(2,'0')}</span><i><b class="${item.estado.toLowerCase().replace(' ','-')}" style="left:${item.inicioGantt}%;width:${item.duracion}%"><em>${item.avance}%</em></b></i></div>`).join('');
    const total=actividadesCronograma.length,avance=total?Math.round(actividadesCronograma.reduce((suma,item)=>suma+Number(item.avance||0),0)/total):0,enCurso=actividadesCronograma.filter(item=>item.estado==='En curso').length,proximo=actividadesCronograma.find(item=>item.estado!=='Completada');
    $('avanceCronogramaContratista').textContent=`${avance}%`;$('barraAvanceCronogramaContratista').style.width=`${avance}%`;$('totalActividadesCronograma').textContent=total;$('actividadesEnCursoCronograma').textContent=enCurso;$('proximoHitoCronograma').textContent=proximo?proximo.fin.split('-').reverse().join('/'):'—';
    $('contadorSeleccionCronogramaContratista').textContent=`${seleccionCronograma.size} seleccionada${seleccionCronograma.size===1?'':'s'}`;
    $('seleccionarTodoCronogramaContratista').checked=!!total&&seleccionCronograma.size===total;
    actualizarDeslizadoresCronogramaContratista();
  }
  function actualizarDeslizadoresCronogramaContratista(){
    requestAnimationFrame(()=>{
      const pares=[[document.querySelector('.tabla-cronograma-contratista'),$('deslizadorTablaCronogramaContratista')],[document.querySelector('.gantt-contratista'),$('deslizadorGanttCronogramaContratista')]];
      pares.forEach(([panel,deslizador])=>{if(!panel||!deslizador)return;const maximo=Math.max(0,panel.scrollWidth-panel.clientWidth);deslizador.max=maximo;deslizador.value=Math.min(maximo,panel.scrollLeft);deslizador.disabled=maximo<2;});
    });
  }
  function leerCronogramaContratista(){
    $('tablaCronogramaContratista')?.querySelectorAll('[data-campo-cronograma]').forEach(control=>{const indice=Number(control.closest('tr').dataset.actividadCronograma),campo=control.dataset.campoCronograma,item=actividadesCronograma[indice];if(!item)return;item[campo]=campo==='avance'?Math.max(0,Math.min(100,Number(control.value)||0)):control.value;});
  }

$('agregarActividadContratista')?.addEventListener('click',()=>{
  leerCronogramaContratista();
  const numero=actividadesCronograma.length+1;
  actividadesCronograma.push({actividad:`Nueva actividad ${numero}`,inicio:'2026-12-01',fin:'2026-12-10',predecesora:numero>1?String(numero-1).padStart(2,'0'):'—',sucesora:'—',avance:0,estado:'Por iniciar',inicioGantt:88,duracion:10,nivel:0,recursos:[]});
  renderCronogramaContratista();
});
$('tablaCronogramaContratista')?.addEventListener('change',evento=>{if(evento.target.matches('[data-seleccion-cronograma]')){const indice=Number(evento.target.dataset.seleccionCronograma);evento.target.checked?seleccionCronograma.add(indice):seleccionCronograma.delete(indice);renderCronogramaContratista();return;}leerCronogramaContratista();renderCronogramaContratista();});
$('tablaCronogramaContratista')?.addEventListener('click',evento=>{
  const boton=evento.target.closest('.eliminar-actividad-contratista');
  const recursos=evento.target.closest('[data-recursos-cronograma]');
  if(recursos){indiceRecursoCronograma=Number(recursos.dataset.recursosCronograma);renderRecursosCronograma();$('modalRecursosCronogramaContratista').showModal();return;}
  if(boton){const indice=Number(boton.closest('tr').dataset.actividadCronograma);actividadesCronograma.splice(indice,1);seleccionCronograma.clear();renderCronogramaContratista();}
});
  $('exportarCronogramaContratista')?.addEventListener('click',()=>{
  leerCronogramaContratista();
  const escapar=valor=>`"${String(valor).replaceAll('"','""')}"`;
  const filas=[['N.°','Actividad','Inicio','Fin','Predecesora','Sucesora','Avance','Estado'],...actividadesCronograma.map((item,indice)=>[indice+1,item.actividad,item.inicio,item.fin,item.predecesora,item.sucesora,`${item.avance}%`,item.estado])];
  const archivo=new Blob([filas.map(fila=>fila.map(escapar).join(',')).join('\n')],{type:'text/csv;charset=utf-8'});
    const enlace=document.createElement('a');enlace.href=URL.createObjectURL(archivo);enlace.download='cronograma-actividades-cusco.csv';enlace.click();URL.revokeObjectURL(enlace.href);
  });
  function alternarCronogramaAmpliado(ampliar){
    const panel=document.querySelector('.panel-cronograma-contratista'),boton=$('ampliarCronogramaContratista');
    if(!panel)return;
    const activo=typeof ampliar==='boolean'?ampliar:!panel.classList.contains('cronograma-ampliado');
    panel.classList.toggle('cronograma-ampliado',activo);
    document.body.classList.toggle('cronograma-ampliado-activo',activo);
    if(boton){boton.textContent=activo?'× Cerrar':'⛶ Ampliar';boton.setAttribute('title',activo?'Cerrar vista ampliada':'Ampliar cronograma');}
    setTimeout(actualizarDeslizadoresCronogramaContratista,40);
  }
  $('ampliarCronogramaContratista')?.addEventListener('click',()=>alternarCronogramaAmpliado());
  document.addEventListener('keydown',evento=>{if(evento.key==='Escape'&&document.querySelector('.panel-cronograma-contratista.cronograma-ampliado'))alternarCronogramaAmpliado(false);});
  $('seleccionarTodoCronogramaContratista')?.addEventListener('change',evento=>{seleccionCronograma.clear();if(evento.target.checked)actividadesCronograma.forEach((_,indice)=>seleccionCronograma.add(indice));renderCronogramaContratista();});
  function ajustarNivelCronogramaContratista(delta){seleccionCronograma.forEach(indice=>actividadesCronograma[indice].nivel=Math.max(0,Math.min(3,Number(actividadesCronograma[indice].nivel||0)+delta)));renderCronogramaContratista();}
  $('bajarNivelCronogramaContratista')?.addEventListener('click',()=>ajustarNivelCronogramaContratista(1));
  $('subirNivelCronogramaContratista')?.addEventListener('click',()=>ajustarNivelCronogramaContratista(-1));
  let arrastreCronograma=-1;
  $('tablaCronogramaContratista')?.addEventListener('dragstart',evento=>{arrastreCronograma=Number(evento.target.closest('tr')?.dataset.actividadCronograma);});
  $('tablaCronogramaContratista')?.addEventListener('dragover',evento=>evento.preventDefault());
  $('tablaCronogramaContratista')?.addEventListener('drop',evento=>{evento.preventDefault();const destino=Number(evento.target.closest('tr')?.dataset.actividadCronograma);if(Number.isInteger(arrastreCronograma)&&Number.isInteger(destino)&&arrastreCronograma!==destino){const [actividad]=actividadesCronograma.splice(arrastreCronograma,1);actividadesCronograma.splice(destino,0,actividad);seleccionCronograma.clear();renderCronogramaContratista();}arrastreCronograma=-1;});
  function renderRecursosCronograma(){const lista=$('listaRecursosCronogramaContratista'),actividad=actividadesCronograma[indiceRecursoCronograma];if(!lista||!actividad)return;$('tituloRecursosCronogramaContratista').textContent=`Recursos · ${actividad.actividad}`;lista.innerHTML=(actividad.recursos||[]).map((recurso,indice)=>`<p class="recurso-cronograma-local"><b>${esc(recurso.nombre)}</b><span>${esc(recurso.tipo)} · ${esc(recurso.cantidad)}</span><button type="button" data-quitar-recurso="${indice}">Quitar</button></p>`).join('')||'<p>No hay recursos asignados.</p>';}
  $('agregarRecursoCronogramaContratista')?.addEventListener('click',()=>{const nombre=$('nombreRecursoCronogramaContratista').value.trim();if(!nombre)return;const actividad=actividadesCronograma[indiceRecursoCronograma];(actividad.recursos??=[]).push({nombre,tipo:$('tipoRecursoCronogramaContratista').value,cantidad:$('cantidadRecursoCronogramaContratista').value||'1'});$('nombreRecursoCronogramaContratista').value='';renderRecursosCronograma();renderCronogramaContratista();});
  $('listaRecursosCronogramaContratista')?.addEventListener('click',evento=>{const boton=evento.target.closest('[data-quitar-recurso]');if(!boton)return;actividadesCronograma[indiceRecursoCronograma].recursos.splice(Number(boton.dataset.quitarRecurso),1);renderRecursosCronograma();renderCronogramaContratista();});
  const nombresDias=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  function renderCalendarioCronograma(){const dias=$('diasCalendarioContratista'),lista=$('listaFeriadosCronogramaContratista');if(!dias)return;dias.innerHTML=nombresDias.map((nombre,indice)=>`<label><input type="checkbox" data-dia-calendario="${indice}" ${calendarioCronograma.dias.has(indice)?'checked':''}> ${nombre}</label>`).join('');lista.innerHTML=calendarioCronograma.feriados.map((f,indice)=>`<p class="recurso-cronograma-local"><b>${f.fecha}</b><span>${esc(f.nombre)}</span><button type="button" data-quitar-feriado="${indice}">Quitar</button></p>`).join('')||'<p>No hay feriados registrados.</p>';}
  $('calendarioCronogramaContratista')?.addEventListener('click',()=>{renderCalendarioCronograma();$('modalCalendarioCronogramaContratista').showModal();});
  $('diasCalendarioContratista')?.addEventListener('change',evento=>{const dia=Number(evento.target.dataset.diaCalendario);evento.target.checked?calendarioCronograma.dias.add(dia):calendarioCronograma.dias.delete(dia);});
  $('agregarFeriadoCronogramaContratista')?.addEventListener('click',()=>{const fecha=$('fechaFeriadoCronogramaContratista').value;if(!fecha)return;calendarioCronograma.feriados.push({fecha,nombre:$('nombreFeriadoCronogramaContratista').value.trim()||'Día no laborable'});$('fechaFeriadoCronogramaContratista').value='';$('nombreFeriadoCronogramaContratista').value='';renderCalendarioCronograma();});
  $('listaFeriadosCronogramaContratista')?.addEventListener('click',evento=>{const boton=evento.target.closest('[data-quitar-feriado]');if(!boton)return;calendarioCronograma.feriados.splice(Number(boton.dataset.quitarFeriado),1);renderCalendarioCronograma();});
  document.querySelectorAll('[data-cerrar-cronograma-modal]').forEach(boton=>boton.addEventListener('click',()=>boton.closest('dialog').close()));
  $('importarCronogramaContratista')?.addEventListener('change',async evento=>{const archivo=evento.target.files?.[0];if(!archivo)return;const filas=(await archivo.text()).split(/\r?\n/).filter(Boolean).slice(1).map(fila=>fila.match(/("(?:[^"]|"")*"|[^,])+/g)?.map(valor=>valor.replace(/^"|"$/g,'').replaceAll('""','"'))||[]).filter(fila=>fila.length>=2);if(!filas.length){$('estadoCronogramaContratista').textContent='No se encontraron actividades válidas en el CSV.';return;}actividadesCronograma=filas.map((f,indice)=>({actividad:f[1]||`Actividad ${indice+1}`,inicio:f[2]||'',fin:f[3]||'',predecesora:f[4]||'—',sucesora:f[5]||'—',avance:Number(String(f[6]||'0').replace('%',''))||0,estado:f[7]||'Por iniciar',inicioGantt:indice*14,duracion:12,nivel:0,recursos:[]}));seleccionCronograma.clear();$('estadoCronogramaContratista').textContent=`${actividadesCronograma.length} actividades cargadas desde ${archivo.name}.`;renderCronogramaContratista();evento.target.value='';});
  [['deslizadorTablaCronogramaContratista','.tabla-cronograma-contratista'],['deslizadorGanttCronogramaContratista','.gantt-contratista']].forEach(([id,selector])=>{$(id)?.addEventListener('input',evento=>{const panel=document.querySelector(selector);if(panel)panel.scrollLeft=Number(evento.target.value);});document.querySelector(selector)?.addEventListener('scroll',evento=>{const deslizador=$(id);if(deslizador&&document.activeElement!==deslizador)deslizador.value=evento.currentTarget.scrollLeft;});});
  window.addEventListener('resize',actualizarDeslizadoresCronogramaContratista);
  function tipoCampo(nombre){const n=nombre.toLowerCase();if(/foto|evidencia|documento|acta|dossier|firma|listado|registro fotográfico/.test(n))return 'file';if(/fecha|hora/.test(n))return 'date';if(/comentario|observaci|restricci|descripci|causa|corrección|correctiva|preventiva|procedimiento|equipos/.test(n))return 'textarea';if(/monto|precio|avance|peso|presión|temperatura|longitud|metrado|cantidad|personal|horas|concentración|porcentaje|área/.test(n))return 'number';return 'text'}
  function renderCatalogoFormularios(){
    const catalogo=$('catalogoFormularios');if(!catalogo)return;
    const datos=formulariosObra[grupoFormulariosActivo]||formulariosObra.psr;
    if($('contenedorFormulario').open)$('contenedorFormulario').close();
    catalogo.innerHTML=`<article class="grupo-formularios grupo-formularios-activo"><header><small>INFRAESTRUCTURA · ${datos.formularios.length} FORMULARIOS</small><h3>${datos.nombre}</h3></header>${datos.formularios.map((f,i)=>`<button type="button" data-formulario="${grupoFormulariosActivo}:${i}"><strong>${f[0]} · ${f[1]}</strong><small>Abrir formulario</small></button>`).join('')}</article>`;
    catalogo.querySelectorAll('[data-formulario]').forEach(b=>b.addEventListener('click',()=>abrirFormulario(b.dataset.formulario)));
  }
  function abrirFormulario(clave){
    const [grupo,indice]=clave.split(':');const formulario=formulariosObra[grupo]?.formularios[Number(indice)];if(!formulario)return;
    document.querySelectorAll('[data-formulario]').forEach(b=>b.classList.toggle('activo',b.dataset.formulario===clave));
    const [codigo,nombre,_canal,...secciones]=formulario,contenedor=$('contenedorFormulario');
    const campo=etiqueta=>{const tipo=tipoCampo(etiqueta),id=`campo-${clave.replace(':','-')}-${etiqueta.replace(/[^a-z0-9]/gi,'').slice(0,16)}`;if(tipo==='textarea')return `<label>${esc(etiqueta)}<textarea id="${id}" placeholder="Registrar información"></textarea></label>`;if(tipo==='file')return `<label class="campo-archivo">${esc(etiqueta)}<input id="${id}" type="file" multiple><small>Adjunte los documentos o evidencias correspondientes.</small></label>`;return `<label>${esc(etiqueta)}<input id="${id}" type="${tipo}" ${tipo==='number'?'step="any"':''}></label>`};
    contenedor.innerHTML=`<header><div><small>${codigo}</small><h3>${esc(nombre)}</h3><p>Registro primario del contratista. Al enviarlo queda disponible para el siguiente actor del flujo.</p></div><button class="cerrar-modal-formulario" type="button" aria-label="Cerrar formulario">×</button></header><div class="cuerpo-modal-formulario">${secciones.map(s=>{const [titulo,campos]=s.split('|');return `<section class="seccion-formulario"><h4>${esc(titulo)}</h4><div class="campos-dinamicos">${campos.split(',').map(campo).join('')}</div></section>`}).join('')}</div><footer><button type="button" data-guardar-formulario="${esc(codigo)}">Guardar borrador</button><button type="button" data-enviar-formulario="${esc(codigo)}">Enviar a revisión</button></footer>`;
    if(contenedor.open)contenedor.close();contenedor.showModal();
    contenedor.querySelector('.cerrar-modal-formulario').addEventListener('click',()=>contenedor.close());
    contenedor.querySelector('[data-guardar-formulario]').addEventListener('click',()=>{aviso(`${codigo} guardado como borrador.`);contenedor.close()});
    contenedor.querySelector('[data-enviar-formulario]').addEventListener('click',()=>{aviso(`${codigo} enviado a revisión del Interventor.`);contenedor.close()});
  }
  function iniciarMapa(){
    if(!window.L)return;
    mapa=L.map('mapaMasificacion',{zoomControl:false}).setView([-12.3,-74.8],5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(mapa);
    L.control.zoom({position:'bottomright'}).addTo(mapa);
    pintarProyectos(proyectos);
  }
  let mapaFichaCusco;
  function alternarMapaFichaCusco(ampliar){
    const contenedor=$('mapaFichaCusco'),cerrar=$('cerrarMapaFichaCusco');
    if(!contenedor)return;
    const activo=typeof ampliar==='boolean'?ampliar:!contenedor.classList.contains('mapa-ampliado');
    contenedor.classList.toggle('mapa-ampliado',activo);
    document.body.classList.toggle('mapa-ficha-ampliado',activo);
    contenedor.setAttribute('aria-label',activo?'Mapa ampliado del proyecto en Cusco. Doble clic o Escape para cerrar.':'Ubicación del proyecto en Cusco. Doble clic para ampliar.');
    if(cerrar)cerrar.hidden=!activo;
    requestAnimationFrame(()=>mapaFichaCusco?.invalidateSize());
  }
  function iniciarMapaFichaCusco(){
    const contenedor=$('mapaFichaCusco');
    if(!contenedor||!window.L)return;
    if(!mapaFichaCusco){
      mapaFichaCusco=L.map(contenedor,{zoomControl:false,attributionControl:true,doubleClickZoom:false}).setView([-13.53195,-71.96746],13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(mapaFichaCusco);
      L.control.zoom({position:'bottomleft'}).addTo(mapaFichaCusco);
      L.marker([-13.53195,-71.96746]).addTo(mapaFichaCusco).bindPopup('<strong>Proyecto Especial de Masificación · Cusco</strong><br>San Jerónimo').openPopup();
      mapaFichaCusco.on('dblclick',()=>alternarMapaFichaCusco());
      const cerrar=$('cerrarMapaFichaCusco');
      if(cerrar)cerrar.addEventListener('click',()=>alternarMapaFichaCusco(false));
      document.addEventListener('keydown',evento=>{if(evento.key==='Escape'&&contenedor.classList.contains('mapa-ampliado'))alternarMapaFichaCusco(false);});
    }
    requestAnimationFrame(()=>mapaFichaCusco.invalidateSize());
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
  // El registro se inicia vacío: las fotos solo se incorporan cuando el contratista las adjunta.
  const evidenciasMovil=[];
  let evidenciasManuales=[];
  function tipoSupervision(){return document.querySelector('[data-tipo-supervision].activo')?.dataset.tipoSupervision||'diario'}
  function configurarSupervision(tipo){
    document.querySelectorAll('[data-tipo-supervision]').forEach(b=>{b.classList.toggle('activo',b.dataset.tipoSupervision===tipo);b.hidden=b.dataset.tipoSupervision===tipo});
    $('vistaInformeDiario').hidden=tipo!=='diario';$('vistaInformeSemanal').hidden=tipo!=='semanal';$('campoFechaSupervision').hidden=tipo!=='diario';$('campoPeriodoSupervision').hidden=tipo!=='semanal';
    $('supervisionNumero').value=tipo==='diario'?'END-IDT-RED-CU-259-G1-25-07-2026':'ISO-CU-REDES-039';$('estadoInformeSupervision').textContent=tipo==='diario'?'Informe diario listo para editar.':'Informe semanal listo para editar.';
  }
  function renderGaleria(){
    const todas=[...evidenciasMovil,...evidenciasManuales];$('galeriaFotosSupervision').innerHTML=todas.map(f=>`<article class="evidencia-movil ${f.incluida?'incluida':'descartada'}" data-evidencia-id="${f.id}"><div><img src="${f.src}" alt="${esc(f.titulo)}"><span>${f.file?'CARGA MANUAL':'GPS · Cusco'}</span></div><footer><strong>${esc(f.titulo)}</strong><small>${esc(f.detalle)}</small><button type="button" aria-pressed="${f.incluida}">${f.incluida?'✓ Incluir':'Restaurar'}</button></footer></article>`).join('');
  }
  function descargarCsv(){
    const fila={Fecha:tipoSupervision()==='diario'?$('supervisionFecha').value:$('supervisionPeriodo').value,Informe:$('supervisionNumero').value,Proyecto:$('supervisionProyecto').selectedOptions[0]?.textContent,Contratista:$('supervisionContratista').value,'Responsable de obra':$('supervisionSupervisor').value,'Avance constructivo':$('supervisionAvanceConstructivo').value,'Gestión del tiempo':$('supervisionGestionTiempo').value,'RNC abiertas':$('supervisionRncAbiertas').value,'RNC cerradas':$('supervisionRncCerradas').value,'Charla de seguridad':$('supervisionCharla').value,'Tema de seguridad':$('supervisionTemaSeguridad').value,Observaciones:$('supervisionObservaciones').value};
    const cols=Object.keys(fila),celda=v=>`"${String(v??'').replaceAll('"','""')}"`,csv='\ufeff'+cols.map(celda).join(',')+'\n'+cols.map(c=>celda(fila[c])).join(',');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`informe_obra_${tipoSupervision()}.csv`;a.click();URL.revokeObjectURL(a.href);$('estadoInformeSupervision').textContent='CSV generado correctamente.';
  }
  async function recursoDataUrl(url){const blob=await fetch(url).then(r=>r.blob());return await new Promise((resolve,reject)=>{const lector=new FileReader();lector.onload=()=>resolve(lector.result);lector.onerror=reject;lector.readAsDataURL(blob)})}
  async function descargarPdf(){
    if(!window.jspdf?.jsPDF){aviso('No se pudo cargar el generador PDF.');return}
    const generadorOriginal=$('satcontrolCompleto')?.contentWindow?.generarPdfSupervisionOriginal;
    // La plantilla técnica reproduce el formato IDT END/FISE entregado para el informe diario.
    const usarPlantillaSupervision=true;
    if(usarPlantillaSupervision&&typeof generadorOriginal==='function'){
      $('estadoInformeSupervision').textContent='Generando el PDF original de Masificación…';
      const manuales=[];for(const foto of evidenciasManuales){try{manuales.push({src:await recursoDataUrl(foto.src),titulo:foto.titulo,detalle:foto.detalle,incluida:foto.incluida})}catch{}}
      const estadosEvidencias=Object.fromEntries(evidenciasMovil.map(f=>[f.id,f.incluida]));
      await generadorOriginal({tipo:tipoSupervision(),numero:$('supervisionNumero').value,fecha:$('supervisionFecha').value,periodo:$('supervisionPeriodo').value,proyecto:$('supervisionProyecto').value,contratista:$('supervisionContratista').value,supervisor:$('supervisionSupervisor').value,cliente:$('supervisionCliente').value,lugar:$('supervisionLugar').value,avanceCivil:$('supervisionAvanceCivil').value,avanceMecanico:$('supervisionAvanceMecanico').value,personal:$('supervisionPersonal').value,equipos:$('supervisionEquipos').value,incidentes:$('supervisionIncidentes').value,accidentes:$('supervisionAccidentes').value,observaciones:$('supervisionObservaciones').value,conclusiones:$('supervisionConclusiones').value,detalles:{avanceConstructivo:$('supervisionAvanceConstructivo').value,gestionTiempo:$('supervisionGestionTiempo').value,rncAbiertas:$('supervisionRncAbiertas').value,rncCerradas:$('supervisionRncCerradas').value,charla:$('supervisionCharla').value,temaSeguridad:$('supervisionTemaSeguridad').value},estadosEvidencias,evidenciasManuales:manuales,logoContratista:urlLogoContratista?await recursoDataUrl(urlLogoContratista):''});
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
  document.querySelectorAll('[data-vista]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.grupoFormularios)grupoFormulariosActivo=b.dataset.grupoFormularios;navegar(b.dataset.vista)}));
  $('toggleInformes')?.addEventListener('click',()=>{const boton=$('toggleInformes'),submenus=$('submenusInformes'),abierto=boton.getAttribute('aria-expanded')==='true';boton.setAttribute('aria-expanded',String(!abierto));submenus.hidden=abierto;});
  $('toggleProyectos')?.addEventListener('click',()=>{const boton=$('toggleProyectos'),submenus=$('submenusProyectos'),abierto=boton.getAttribute('aria-expanded')==='true';boton.setAttribute('aria-expanded',String(!abierto));submenus.hidden=abierto;});
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
      .grupo-formularios-sat{display:grid;gap:3px}.menu-contenido .enlace-formularios-sat{display:grid!important;grid-template-columns:36px minmax(0,1fr) 20px!important;min-height:52px!important}.menu-contenido .enlace-formularios-sat .flecha-formularios-sat{display:block!important;grid-column:3!important;grid-row:1!important;justify-self:end;font-size:1rem!important;line-height:1!important;transition:transform .2s}.enlace-formularios-sat[aria-expanded="false"] .flecha-formularios-sat{transform:rotate(-90deg)}.submenus-formularios-sat{display:grid;gap:3px;margin-left:14px;padding-left:10px;border-left:1px solid rgba(102,158,204,.42)}.submenus-formularios-sat[hidden]{display:none!important}.submenus-formularios-sat .enlace-menu{min-height:42px!important;padding:8px 10px!important}.submenus-formularios-sat .enlace-texto{font-size:.66rem!important}.submenus-formularios-sat b{font-size:.52rem}
      .grupo-informes-sat{display:grid;gap:3px}.menu-contenido .enlace-informes-sat{display:grid!important;grid-template-columns:36px minmax(0,1fr) 20px!important;min-height:52px!important}.menu-contenido .enlace-informes-sat .flecha-informes-sat{display:block!important;grid-column:3!important;grid-row:1!important;justify-self:end;font-size:1rem!important;line-height:1!important;transition:transform .2s}.enlace-informes-sat[aria-expanded="false"] .flecha-informes-sat{transform:rotate(-90deg)}.submenus-informes-sat{display:grid;gap:3px;margin-left:14px;padding-left:10px;border-left:1px solid rgba(102,158,204,.42)}.submenus-informes-sat[hidden]{display:none!important}.submenus-informes-sat .enlace-menu{min-height:42px!important;padding:8px 10px!important}.submenus-informes-sat .enlace-texto{font-size:.66rem!important}.submenus-informes-sat b{font-size:.52rem}
      html[data-tema="paulet"] .menu-contenido .enlace-menu{color:#415b7f!important;background:transparent!important}html[data-tema="paulet"] .menu-contenido .enlace-menu .enlace-texto{color:#415b7f!important}html[data-tema="paulet"] .menu-contenido .enlace-menu.activo{color:#254f82!important;border-color:#c8deed!important;background:#e9f5fc!important;box-shadow:inset 4px 0 #58aed6!important}html[data-tema="paulet"] .menu-contenido .enlace-menu.activo .enlace-texto,html[data-tema="paulet"] .menu-contenido .enlace-menu.activo .menu-icono{color:#254f82!important}
      /* SATCONTROL debe mantener Paulet, no la hoja clara institucional. */
      body{color:#eaf2ff!important;background:#0b1226!important}.contenido-principal{background:#0b1226!important}.cabecera-modulo h1{color:#f2f7ff!important}.cabecera-modulo p{color:#aebfdd!important}.filtros-masificacion,.resumen-cabecera,.avance-ciudades,.detalle-proyecto,.potencial-beneficiarios{color:#eaf2ff!important;border-color:#334975!important;background:#121f3e!important;box-shadow:none!important}.resumen-cabecera h2,.detalle-proyecto h2,.avance-ciudades h3,.potencial-beneficiarios h3{color:#f2f7ff!important}.resumen-cabecera p,.avance-ciudades p,.potencial-beneficiarios p,.resumen-cabecera small,.detalle-proyecto small,.potencial-beneficiarios small{color:#aebfdd!important}.filtros-masificacion input,.filtros-masificacion select{color:#edf5ff!important;border-color:#45608f!important;background:#0d1831!important}.panel-derecho{background:#0b1226!important}.kpis article,.metricas-potencial article,.detalle-proyecto dl div{color:#eaf2ff!important;border-color:#3a5080!important;background:#17294d!important}.kpis span,.metricas-potencial span,.detalle-proyecto dt{color:#aebfdd!important}.kpis strong,.metricas-potencial strong,.detalle-proyecto dd{color:#f2f7ff!important}.mapa-principal,.mapa-contenedor{border-color:#334975!important;background:#162747!important}.panel-derecho::-webkit-scrollbar-track{background:#101c37!important}.panel-derecho::-webkit-scrollbar-thumb{border-color:#101c37!important;background:#4c86b8!important}
    `;doc.head.appendChild(estilo);
    const enlaceSat=doc.querySelector('.enlace-menu[href="#satcontrol"]');
    if(enlaceSat&&!doc.querySelector('[data-vista-contratista="informe-supervision"]')){
      enlaceSat.hidden=true;
      enlaceSat.setAttribute('aria-hidden','true');
      const crearEnlace=(id,texto,icono,accion)=>{const b=doc.createElement('button');b.type='button';b.className='enlace-menu enlace-menu-contratista';b.dataset.vistaContratista=id;b.dataset.etiqueta=texto;b.innerHTML=`<span class="menu-icono" aria-hidden="true">${icono}</span><span class="enlace-texto">${texto}</span>`;if(accion)b.addEventListener('click',accion);else b.setAttribute('onclick',`window.parent.postMessage({tipo:'contratista:navegar',id:${JSON.stringify(id)}},window.location.origin)`);return b};
      const grupoInformes=doc.createElement('section');grupoInformes.className='grupo-informes-sat';
      const cabeceraInformes=doc.createElement('button');cabeceraInformes.type='button';cabeceraInformes.className='enlace-menu enlace-menu-contratista enlace-informes-sat';cabeceraInformes.setAttribute('aria-expanded','true');cabeceraInformes.innerHTML='<span class="menu-icono" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6zM15 3v5h5M9 12h6M9 16h6"/></svg></span><span class="enlace-texto">Informes</span><span class="flecha-informes-sat" aria-hidden="true">⌄</span>';
      const submenusInformesSat=doc.createElement('div');submenusInformesSat.className='submenus-informes-sat';
      submenusInformesSat.appendChild(crearEnlace('informe-supervision','Informe de obra','<b>01</b>'));submenusInformesSat.appendChild(crearEnlace('repositorio-informes','Listado de informes','<b>02</b>'));
      cabeceraInformes.addEventListener('click',()=>{const abierto=cabeceraInformes.getAttribute('aria-expanded')==='true';cabeceraInformes.setAttribute('aria-expanded',String(!abierto));submenusInformesSat.hidden=abierto});grupoInformes.append(cabeceraInformes,submenusInformesSat);
      const grupoProyectos=doc.createElement('section');grupoProyectos.className='grupo-informes-sat';
      const cabeceraProyectos=doc.createElement('button');cabeceraProyectos.type='button';cabeceraProyectos.className='enlace-menu enlace-menu-contratista enlace-informes-sat';cabeceraProyectos.setAttribute('aria-expanded','true');cabeceraProyectos.innerHTML='<span class="menu-icono" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4zM8 8h8M8 12h5M8 16h7"/></svg></span><span class="enlace-texto">Proyectos</span><span class="flecha-informes-sat" aria-hidden="true">⌄</span>';
      const submenusProyectosSat=doc.createElement('div');submenusProyectosSat.className='submenus-informes-sat';
      const proyectoCusco=doc.createElement('a');proyectoCusco.className='enlace-menu enlace-menu-contratista';proyectoCusco.href='../index.html#ficha-proyecto-cusco';proyectoCusco.target='_top';proyectoCusco.dataset.etiqueta='Proyecto Especial de Masificación · Cusco';proyectoCusco.innerHTML='<span class="menu-icono" aria-hidden="true"><b>01</b></span><span class="enlace-texto">Proyecto Especial de Masificación · Cusco</span>';submenusProyectosSat.append(proyectoCusco);
      proyectoCusco.addEventListener('click',(evento)=>{evento.preventDefault();window.parent.postMessage({tipo:'contratista:navegar',id:'ficha-proyecto-cusco'},window.location.origin)});
      cabeceraProyectos.addEventListener('click',()=>{const abierto=cabeceraProyectos.getAttribute('aria-expanded')==='true';cabeceraProyectos.setAttribute('aria-expanded',String(!abierto));submenusProyectosSat.hidden=abierto});grupoProyectos.append(cabeceraProyectos,submenusProyectosSat);
      const aplicativoMovil=doc.createElement('a');aplicativoMovil.className='enlace-menu enlace-menu-contratista enlace-app-movil';aplicativoMovil.href='../appmovil/index.html';aplicativoMovil.target='_top';aplicativoMovil.dataset.etiqueta='Aplicativo móvil';aplicativoMovil.innerHTML='<span class="menu-icono" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="6.5" y="2.5" width="11" height="19" rx="2"/><path d="M10 18.3h4"/></svg></span><span class="enlace-texto">Aplicativo móvil</span>';
      const cronograma=doc.createElement('a');cronograma.className='enlace-menu enlace-menu-contratista';cronograma.href='../index.html#cronograma-actividades';cronograma.target='_top';cronograma.dataset.etiqueta='Cronograma y actividades';cronograma.innerHTML='<span class="menu-icono" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M12 18h.01"/></svg></span><span class="enlace-texto">Cronograma y actividades</span>';
      grupoInformes.hidden=true;
      enlaceSat.after(grupoProyectos);grupoProyectos.after(cronograma);cronograma.after(grupoInformes);grupoInformes.after(aplicativoMovil);
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
  $('recargarSatcontrol')?.addEventListener('click',()=>{ $('estadoCargaSat').hidden=false;marcoSat.classList.remove('cargado');marcoSat.contentWindow.location.reload();aviso('Actualizando contenido…') });
  $('alternarTema').addEventListener('click',()=>{document.body.classList.toggle('tema-claro-contratista');sincronizarTemaSatcontrol();aviso(document.body.classList.contains('tema-claro-contratista')?'Tema claro activado.':'Tema oscuro activado.')});
  $('notificaciones').addEventListener('click',()=>aviso('Tiene 3 actualizaciones de proyectos pendientes de revisión.'));
  const accionesHeader=document.querySelector('.cabecera-satcontrol-acciones'),espacioHeader=document.querySelector('.indicador-espacio-satcontrol');
  if(accionesHeader&&!document.getElementById('herramientasContratistaHeader')){
    const herramientas=document.createElement('div');herramientas.id='herramientasContratistaHeader';herramientas.className='herramientas-contratista-header';herramientas.setAttribute('aria-label','Herramientas de informes');
    const alternarHerramientas=document.createElement('button');alternarHerramientas.type='button';alternarHerramientas.className='boton-herramientas-toggle';alternarHerramientas.title='Herramientas';alternarHerramientas.setAttribute('aria-label','Abrir herramientas de informes');alternarHerramientas.setAttribute('aria-expanded','false');alternarHerramientas.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a4.2 4.2 0 0 0-5.4 5.4L3.8 17.2a2.1 2.1 0 0 0 3 3l5.5-5.5a4.2 4.2 0 0 0 5.4-5.4l-2.6 2.6-3-3 2.6-2.6Z"/></svg>';
    alternarHerramientas.addEventListener('click',()=>{const abierta=herramientas.classList.toggle('abierta');alternarHerramientas.setAttribute('aria-expanded',String(abierta));alternarHerramientas.setAttribute('aria-label',abierta?'Cerrar herramientas de informes':'Abrir herramientas de informes');});
    const crearHerramientaInforme=(tipo,etiqueta,icono)=>{const boton=document.createElement('button');boton.type='button';boton.className='abrir-herramientas-fise boton-herramientas-icono';boton.title=etiqueta;boton.setAttribute('aria-label',etiqueta);boton.innerHTML=`${icono}<span>${tipo==='diario'?'D':'S'}</span>`;boton.addEventListener('click',()=>{navegar('informe-supervision');configurarSupervision(tipo);});return boton};
    herramientas.append(
      alternarHerramientas,
      crearHerramientaInforme('diario','Informe diario','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6zM15 3v5h5M9 12h6M9 16h6"/></svg>'),
      crearHerramientaInforme('semanal','Informe semanal','<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01"/></svg>')
    );
    accionesHeader.insertBefore(herramientas,accionesHeader.firstChild);
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
  const inicial=location.hash.slice(1);navegar(titulos[inicial]?inicial:'ficha-proyecto-cusco');
})();
