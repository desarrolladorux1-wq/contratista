(function () {
  const $ = id => document.getElementById(id);
  const modoContratista = new URLSearchParams(window.location.search).get('contratista') === '1';
  const botonResumenMasificacion = $('botonResumenMasificacion');
  const colores = { Proyectada: '#4e7de1', 'En ejecución': '#e5a510', Instalada: '#3fac79' };
  const fasesMapa = {
    Anteproyecto: {abreviatura:'ANT', color:'#657fe0'},
    Proyecto: {abreviatura:'PRO', color:'#3f8fc4'},
    Construcción: {abreviatura:'CON', color:'#d89222'},
    Operación: {abreviatura:'OPE', color:'#35a06f'}
  };
  const iconoProyecto = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M6 20V5h9M6 8h13M15 5l4 3-4 3M11 8v5"/><path d="M8.5 13h5v5h-5z"/></svg>';
  const ciudadesBase = [
    ['FISE-2026-001','PROYECTO SAUNA 1','Arequipa','Arequipa','Cerro Colorado',-16.37,-71.56,'En evaluación',0,0],
    ['MAS-002','Red Metropolitana Sur','Lima','Lima','Villa El Salvador',-12.21,-76.94,'En ejecución',61,24.8],
    ['MAS-003','Corredor Gas Arequipa','Arequipa','Arequipa','Cerro Colorado',-16.37,-71.56,'Instalada',77,15.2],
    ['MAS-004','Expansión Trujillo','La Libertad','Trujillo','Trujillo',-8.11,-79.03,'Proyectada',32,29.6],
    ['MAS-005','Red Urbana Chiclayo','Lambayeque','Chiclayo','José Leonardo Ortiz',-6.76,-79.84,'En ejecución',58,21.1],
    ['MAS-006','Conexión Cusco','Cusco','Cusco','San Sebastián',-13.53,-71.89,'Proyectada',27,17.8],
    ['MAS-007','Anillo Piura','Piura','Piura','Castilla',-5.19,-80.63,'Instalada',91,13.7],
    ['MAS-008','Expansión Ica','Ica','Ica','Subtanjalla',-14.02,-75.76,'En ejecución',69,16.3],
    ['MAS-009','Red Huancayo','Junín','Huancayo','El Tambo',-12.04,-75.22,'Proyectada',38,19.5],
    ['MAS-010','Conexión Chimbote','Áncash','Santa','Nuevo Chimbote',-9.12,-78.52,'Instalada',88,14.9]
  ].map((p,i)=>({codigo:p[0],nombre:p[1],departamento:p[2],provincia:p[3],distrito:p[4],lat:p[5],lng:p[6],estado:p[7],avance:p[8],longitud:p[9],responsableLider:p[0]==='FISE-2026-001'?'Oliver Gonzales':'-- Seleccione --',empresaContratista:'',elementos:`Válvulas ${8+i} · Tuberías PE ${12+i} · Estaciones ${1+i%3}`}));
  let ciudades = ciudadesBase.map(prepararVersionesProyecto);
  const estadosVisibles = new Set(Object.keys(colores));
  let mapa, capaBase, capaProyectos, capaGis, capaManzanas, capaPredios, capaInfluencia, proyectoSeleccionado=null, datosGeo=[], manzanasUrbanas=[], estratosInei=[], filtroEstratoActivo='todos';
  let herramientaActiva=null,capaDibujo,puntosDibujo=[],centroCirculo=null,figuraTemporal=null,dibujoProyectoPendiente=null,geometriaProyectoBorrador=null;
  let seleccionMapa=[],beneficiarioSeleccionadoMasificacion=null,datosExportacionActual=[],registrosProyectoPosicionados=[];
  let proyectoEdicionSeleccionado=null, proyectoPendienteEliminar=null;
  let cronogramaBorrador=[];
  let planificacionBorrador=null;
  const requisitosTerrenoBase=[
    ['Área del terreno','≥ 3,500 m²'],['Geometría del terreno','Preferentemente rectangular, aprox. 60 m × 60 m'],['Pendiente del terreno','≤ 5%'],['Disponibilidad de planos','Ubicación, área, perímetro y accesos'],['Partida registral','Titular público y vigencia preferente de 3 meses'],['Zonificación o tipo de uso','Compatible con una planta PSR-GNL'],['Estudio de mecánica de suelos','Napa freática, relleno y conformidad de uso'],['Interferencias en superficie','Sin edificaciones, árboles o cables incompatibles'],['Interferencias subterráneas','Sin cauces, canales, acequias u otras interferencias'],['Vía de acceso para GNL','Ancho mínimo de 4 a 6 m y giro para cisterna'],['Suministro eléctrico','Factibilidad entre 12 kW y 45 kW'],['Distancia a residencias','Máximo 5 km del centro de consumo'],['Puntos de reunión cercanos','Alejado de iglesias, estadios y concurrencia masiva']
  ];
  let calendarioCronograma={dias:new Set([1,2,3,4,5]),horarios:{1:['08:00','13:00','14:00','17:00'],2:['08:00','13:00','14:00','17:00'],3:['08:00','13:00','14:00','17:00'],4:['08:00','13:00','14:00','17:00'],5:['08:00','13:00','14:00','17:00'],6:['08:00','13:00','14:00','17:00'],0:['08:00','13:00','14:00','17:00']},feriados:[]};
  let versionCartograficaActiva='planificacion';
  let subproyectoSeleccionado='';
  const proyectosExpandidos=new Set();
  const beneficiariosEdicionPorProyecto=new Map();
  const capasContexto={};
  const bases = {};
  const mapasVersiones={planificacion:null,asbuilt:null};
  const capasMapasVersiones={planificacion:null,asbuilt:null};

  function prepararVersionesProyecto(proyecto) {
    if(proyecto.versiones)return proyecto;
    const datosBase={estado:proyecto.estado,avance:proyecto.avance,longitud:proyecto.longitud,elementos:proyecto.elementos};
    proyecto.versiones={
      planificacion:{...datosBase,estado:proyecto.codigo==='FISE-2026-001'?'En evaluación':'Proyectada',avance:proyecto.codigo==='FISE-2026-001'?0:Math.min(100,Math.round((proyecto.avance||0)*.35))},
      asbuilt:{...datosBase}
    };
    proyecto.versionActiva='planificacion';
    return proyecto;
  }
  function aplicarVersionCartografica(proyecto,version=versionCartograficaActiva) {
    prepararVersionesProyecto(proyecto);
    proyecto.versionActiva=version;
    Object.assign(proyecto,proyecto.versiones[version]);
  }
  function cambiarVersionCartografica(version) {
    versionCartograficaActiva=version;
    ciudades.forEach(proyecto=>aplicarVersionCartografica(proyecto,version));
    document.querySelectorAll('[data-version-proyecto]').forEach(boton=>boton.classList.toggle('activo',boton.dataset.versionProyecto===version));
    document.querySelectorAll('[data-version-modal]').forEach(boton=>boton.classList.toggle('activo',boton.dataset.versionModal===version));
    const descripcionVersion=$('descripcionVersionProyecto');
    if(descripcionVersion)descripcionVersion.textContent=version==='asbuilt'?'Estado construido validado en campo (as-built).':'Alcance del anteproyecto e ingeniería básica/detalle.';
    document.querySelector('.mapa-panel')?.classList.toggle('vista-asbuilt',version==='asbuilt');
    const indicadorVersion=$('indicadorVersionMapa');
    if(indicadorVersion){indicadorVersion.textContent=version==='asbuilt'?'AS-BUILT · RED CONSTRUIDA':'PLANIFICACIÓN · ANTEPROYECTO';indicadorVersion.classList.toggle('asbuilt',version==='asbuilt');}
    actualizarFiltros(); actualizar();
    if(proyectoSeleccionado)mostrarDetalle(ciudades.find(p=>p.codigo===proyectoSeleccionado.codigo)||proyectoSeleccionado);
  }
  function renderizarMapasVersiones(codigoProyecto) {
    if(typeof L==='undefined')return;
    const proyecto=ciudades.find(item=>item.codigo===codigoProyecto)||proyectoSeleccionado||ciudades[0];
    if(!proyecto)return;
    ['planificacion','asbuilt'].forEach(version=>{
      const id=version==='planificacion'?'mapaVersionPlanificacion':'mapaVersionAsBuilt';
      if(!mapasVersiones[version]){
        mapasVersiones[version]=L.map(id,{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false});
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(mapasVersiones[version]);
        capasMapasVersiones[version]=L.layerGroup().addTo(mapasVersiones[version]);
      }
      const mapaVersion=mapasVersiones[version],capa=capasMapasVersiones[version];
      capa.clearLayers();
      const factor=version==='asbuilt'?1:.64;
      const desplazamiento=.06;
      const puntos=[[proyecto.lat,proyecto.lng-desplazamiento*factor],[proyecto.lat+.025*factor,proyecto.lng-.018*factor],[proyecto.lat-.012*factor,proyecto.lng+.025*factor],[proyecto.lat+.015*factor,proyecto.lng+desplazamiento*factor]];
      const datosVersion=proyecto.versiones?.[version]||proyecto;
      const color=version==='asbuilt'?(colores[datosVersion.estado]||'#3fac79'):'#4e7de1';
      capa.addLayer(L.polyline(puntos,{color,weight:version==='asbuilt'?7:4,opacity:.9,dashArray:version==='asbuilt'?null:'10 8'}));
      capa.addLayer(L.circleMarker([proyecto.lat,proyecto.lng],{radius:8,color:'#fff',weight:2,fillColor:color,fillOpacity:1}).bindTooltip(`${proyecto.nombre} · ${datosVersion.avance||0}%`));
      mapaVersion.setView([proyecto.lat,proyecto.lng],11,{animate:false});
      setTimeout(()=>mapaVersion.invalidateSize(),0);
    });
  }

  function opciones(select, valores, inicial) {
    const valor = select.value;
    select.replaceChildren(new Option(inicial, ''));
    [...new Set(valores)].sort((a,b)=>a.localeCompare(b,'es')).forEach(v=>select.add(new Option(v,v)));
    if ([...select.options].some(o=>o.value===valor)) select.value=valor;
  }
  function fasePrincipalProyecto(proyecto, indice=0) {
    if(proyecto?.fase && fasesMapa[proyecto.fase])return proyecto.fase;
    if(proyecto?.estado==='Instalada')return 'Operación';
    if(proyecto?.estado==='En ejecución')return 'Construcción';
    if(proyecto?.estado==='Proyectada')return 'Proyecto';
    return indice===0?'Anteproyecto':'Proyecto';
  }
  function construirCatalogoProyectosDesdeGeojson(features) {
    const proyectos = features.filter(f=>f?.properties?.tipo==='proyecto').map((feature,indice)=>{
      const [lng,lat] = feature.geometry?.coordinates || [];
      const beneficiarios = features.filter(f=>f?.properties?.tipo==='beneficiario'&&f.properties.proyecto===feature.properties.codigo).length;
      const lotes = features.filter(f=>f?.properties?.tipo==='lote'&&f.properties.proyecto===feature.properties.codigo).length;
      const esProyectoSauna = feature.properties.codigo === 'MAS-001';
      return {
        codigo: esProyectoSauna ? 'FISE-2026-001' : (feature.properties.codigo || feature.id || `MAS-${String(indice+1).padStart(3,'0')}`),
        codigoFuente: feature.properties.codigo || '',
        nombre: esProyectoSauna ? 'PROYECTO SAUNA 1' : (feature.properties.nombre || 'Proyecto sin nombre'),
        departamento: esProyectoSauna ? 'Arequipa' : (feature.properties.departamento || '—'),
        provincia: feature.properties.provincia || '—',
        distrito: feature.properties.distrito || '—',
        lat: Number(lat) || 0,
        lng: Number(lng) || 0,
        estado: esProyectoSauna ? 'En evaluación' : (feature.properties.estado || 'En evaluación'),
        fase: esProyectoSauna ? 'Anteproyecto' : fasePrincipalProyecto(feature.properties,indice),
        avance: Number(feature.properties.avance) || 0,
        longitud: Number(feature.properties.longitud) || 0,
        elementos: feature.properties.elementos || '—',
        tipo: 'Masificación de gas FISE',
        fechaInicio: feature.properties.fechaInicio || '',
        fechaFin: feature.properties.fechaFin || '',
        responsableLider: esProyectoSauna ? 'Oliver Gonzales' : (feature.properties.responsableLider || '-- Seleccione --'),
        empresaContratista: feature.properties.empresaContratista || '',
        equipo: feature.properties.equipo || ['Equipo GIS','Equipo Social','Mesa Técnica'],
        beneficiarios: beneficiarios,
        areaInfluencia: feature.properties.areaInfluencia || `Área de influencia · ${lotes} lote(s)`,
        localizacion: `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`
      };
    });
    return (proyectos.length ? proyectos : [...ciudadesBase]).map(prepararVersionesProyecto);
  }
  function actualizarFiltros() {
    opciones($('filtroProyecto'), ciudades.map(x=>`${x.codigo} · ${x.nombre}`), 'Todos los proyectos');
    opciones($('filtroDepartamento'), ciudades.map(x=>x.departamento), 'Todos');
    const provinciales=ciudades.filter(x=>!$('filtroDepartamento').value||x.departamento===$('filtroDepartamento').value);
    opciones($('filtroProvincia'), provinciales.map(x=>x.provincia), 'Todas');
    const distritales=provinciales.filter(x=>!$('filtroProvincia').value||x.provincia===$('filtroProvincia').value);
    opciones($('filtroDistrito'), distritales.map(x=>x.distrito), 'Todos');
  }
  function filtrados() {
    const q=$('buscarProyecto').value.trim().toLowerCase();
    return ciudades.filter(x=>(!q||Object.values(x).some(v=>String(v).toLowerCase().includes(q)))&&
      (!$('filtroProyecto').value||`${x.codigo} · ${x.nombre}`===$('filtroProyecto').value)&&
      (!$('filtroDepartamento').value||x.departamento===$('filtroDepartamento').value)&&
      (!$('filtroProvincia').value||x.provincia===$('filtroProvincia').value)&&
      (!$('filtroDistrito').value||x.distrito===$('filtroDistrito').value)&&
      (!$('filtroEstado').value||x.estado===$('filtroEstado').value));
  }
  function fasesDeProyecto(proyecto){
    const sufijo=proyecto.codigo.replace(/[^A-Z0-9]/gi,'').slice(-4);
    return [
      {codigo:`${sufijo}-ANT`,nombre:'Anteproyecto',estado:'Diseño y evaluación'},
      {codigo:`${sufijo}-ASB`,nombre:'Construcción / As-Built',estado:proyecto.estado==='Proyectada'?'Programado':'Seguimiento de obra'},
      {codigo:`${sufijo}-OPE`,nombre:'Operación',estado:proyecto.estado==='Instalada'?'Activo':'Pendiente'}
    ];
  }
  function ordenarProyectosAnidados(proyectos) {
    const disponibles=new Map(proyectos.map(proyecto=>[proyecto.codigo,proyecto]));
    const resultado=[];
    const agregar=(proyecto,nivel=0)=>{
      if(!disponibles.has(proyecto.codigo))return;
      disponibles.delete(proyecto.codigo);
      resultado.push({proyecto,nivel});
      proyectos.filter(hijo=>hijo.proyectoPadre===proyecto.codigo).forEach(hijo=>agregar(hijo,nivel+1));
    };
    proyectos.filter(proyecto=>!proyecto.proyectoPadre||!disponibles.has(proyecto.proyectoPadre)).forEach(proyecto=>agregar(proyecto));
    disponibles.forEach(proyecto=>agregar(proyecto));
    return resultado;
  }
  function renderBarraProyectos(){
    const lista=$('listaProyectosMapa');
    if(!lista)return;
    const consulta=($('buscarBarraProyectos')?.value||'').trim().toLowerCase();
    const proyectos=filtrados().filter(proyecto=>!consulta||[
      proyecto.codigo,proyecto.nombre,proyecto.departamento,proyecto.provincia,proyecto.distrito,
      ...fasesDeProyecto(proyecto).flatMap(fase=>[fase.codigo,fase.nombre])
    ].some(valor=>String(valor).toLowerCase().includes(consulta)));
    $('contadorBarraProyectos').textContent=`${proyectos.length} visible${proyectos.length===1?'':'s'}`;
    lista.replaceChildren();
    if(!proyectos.length){
      const vacio=document.createElement('p');
      vacio.className='proyectos-mapa-vacio';
      vacio.textContent='No hay proyectos que coincidan con la búsqueda.';
      lista.append(vacio);
      return;
    }
    ordenarProyectosAnidados(proyectos).forEach(({proyecto,nivel})=>{
      const abierto=proyectosExpandidos.has(proyecto.codigo)||proyectoSeleccionado?.codigo===proyecto.codigo;
      const articulo=document.createElement('article');
      articulo.className=`proyecto-arbol${abierto?' abierto':''}${proyectoSeleccionado?.codigo===proyecto.codigo?' seleccionado':''}${nivel?' proyecto-hijo':''}`;
      articulo.style.setProperty('--nivel-proyecto',nivel);
      articulo.dataset.codigo=proyecto.codigo;
      const cabecera=document.createElement('div');
      cabecera.className='proyecto-arbol-cabecera';
      const seleccionar=document.createElement('button');
      seleccionar.type='button';
      seleccionar.className='seleccionar-proyecto-mapa';
      seleccionar.dataset.seleccionarProyecto=proyecto.codigo;
      seleccionar.innerHTML=`<i style="--color-proyecto:${colores[proyecto.estado]||'#5b8fb0'}"></i><span><strong>${proyecto.nombre}</strong><small class="codigo-proyecto-barra">${proyecto.codigo}</small><em>${proyecto.estado}</em><b class="datos-proyecto-barra"><small><span>Líder:</span><strong>${proyecto.responsableLider||'Sin asignar'}</strong></small><small><span>Ubicación:</span><strong>${nivel?`Subproyecto de ${ciudades.find(p=>p.codigo===proyecto.proyectoPadre)?.nombre||proyecto.proyectoPadre}`:proyecto.departamento}</strong></small></b></span>`;
      seleccionar.querySelector('i').style.background=colores[proyecto.estado]||'#5b8fb0';
      const alternar=document.createElement('button');
      alternar.type='button';
      alternar.className='alternar-subproyectos';
      alternar.dataset.alternarSubproyectos=proyecto.codigo;
      alternar.setAttribute('aria-label',`${abierto?'Ocultar':'Mostrar'} subproyectos de ${proyecto.nombre}`);
      alternar.innerHTML='<span aria-hidden="true"></span>';
      const acciones=document.createElement('div');
      acciones.className='acciones-proyecto-mapa';
      acciones.innerHTML=modoContratista?'':`<button type="button" class="crear-subproyecto" data-accion-barra="subproyecto" data-codigo="${proyecto.codigo}" aria-label="Crear subproyecto de ${proyecto.nombre}" title="Crear subproyecto">+</button><button type="button" data-accion-barra="editar" data-codigo="${proyecto.codigo}" aria-label="Editar ${proyecto.nombre}" title="Editar proyecto"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 9.6-9.6-3.2-3.2L5 15.8 4 20Z"/><path d="m12.8 5.8 3.2 3.2"/></svg></button><button type="button" class="eliminar" data-accion-barra="eliminar" data-codigo="${proyecto.codigo}" aria-label="Eliminar ${proyecto.nombre}" title="Eliminar proyecto"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg></button>`;
      cabecera.append(seleccionar,acciones,alternar);
      const subproyectos=document.createElement('div');
      subproyectos.className='subproyectos-mapa';
      fasesDeProyecto(proyecto).forEach(fase=>{
        const boton=document.createElement('button');
        boton.type='button';
        boton.className=`subproyecto-mapa${subproyectoSeleccionado===fase.codigo?' activo':''}`;
        boton.dataset.subproyecto=fase.codigo;
        boton.dataset.proyecto=proyecto.codigo;
        boton.dataset.fase=fase.nombre;
        boton.innerHTML=`<strong>${fase.codigo} · ${fase.nombre}</strong><small>${fase.estado}</small>`;
        subproyectos.append(boton);
      });
      articulo.append(cabecera,subproyectos);
      lista.append(articulo);
    });
  }
  function seleccionarProyectoDesdeBarra(codigo,fase=''){
    const proyecto=ciudades.find(item=>item.codigo===codigo);
    if(!proyecto)return;
    proyectosExpandidos.add(codigo);
    subproyectoSeleccionado=fase?fasesDeProyecto(proyecto).find(item=>item.nombre===fase)?.codigo||'':'';
    if(fase)proyecto.faseSeleccionada=fase;
    else delete proyecto.faseSeleccionada;
    mostrarDetalle(proyecto);
  }
  function categoriaBeneficiario(feature, indice=0) {
    const categoria=feature?.properties?.categoria;
    if(categoria==='Registrado'||categoria==='Potencial')return categoria;
    return indice%3===0?'Registrado':'Potencial';
  }
  function renderAvanceProyecto(p) {
    const final=Math.max(5,Number(p.avance)||0);
    const factores=[.18,.36,.57,.78,1];
    $('listaAvanceProyecto').replaceChildren(...factores.map((factor,indice)=>{
      const valor=Math.min(100,Math.max(2,Math.round(final*factor)));
      const fila=document.createElement('div');
      fila.className='avance-item';
      fila.innerHTML=`<span>P${indice+1}</span><span class="barra-avance"><i style="width:${valor}%"></i></span><b>${valor}%</b>`;
      return fila;
    }));
  }
  function semillaTexto(valor) {
    return [...String(valor || '')].reduce((acum, caracter)=>acum + caracter.charCodeAt(0), 0) || 1;
  }
  function ruidoSemilla(valor, paso) {
    const x = Math.sin(valor * 12.9898 + paso * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }
  function anilloALatLng(anillo) {
    return anillo.map(([lng, lat]) => [lat, lng]);
  }
  function poligonoOrganicoDesdeCaja(caja, referencia='') {
    const [minLng, minLat, maxLng, maxLat] = caja;
    const semilla = semillaTexto(referencia);
    const ancho = maxLng - minLng;
    const alto = maxLat - minLat;
    const centroLng = (minLng + maxLng) / 2;
    const centroLat = (minLat + maxLat) / 2;
    const puntos = [
      [minLng, minLat],
      [minLng + ancho * 0.35, minLat - alto * (0.05 + ruidoSemilla(semilla, 1) * 0.06)],
      [minLng + ancho * 0.65, minLat - alto * (0.03 + ruidoSemilla(semilla, 2) * 0.05)],
      [maxLng, minLat],
      [maxLng + ancho * (0.04 + ruidoSemilla(semilla, 3) * 0.05), minLat + alto * 0.22],
      [maxLng + ancho * (0.05 + ruidoSemilla(semilla, 4) * 0.06), centroLat],
      [maxLng + ancho * (0.03 + ruidoSemilla(semilla, 5) * 0.04), maxLat - alto * 0.18],
      [maxLng, maxLat],
      [minLng + ancho * 0.68, maxLat + alto * (0.03 + ruidoSemilla(semilla, 6) * 0.05)],
      [minLng + ancho * 0.32, maxLat + alto * (0.04 + ruidoSemilla(semilla, 7) * 0.06)],
      [minLng, maxLat],
      [minLng - ancho * (0.04 + ruidoSemilla(semilla, 8) * 0.05), maxLat - alto * 0.2],
      [minLng - ancho * (0.05 + ruidoSemilla(semilla, 9) * 0.06), centroLat],
      [minLng - ancho * (0.03 + ruidoSemilla(semilla, 10) * 0.04), minLat + alto * 0.24],
      [minLng, minLat]
    ];
    return puntos.map(([lng, lat]) => [lat + (ruidoSemilla(semilla, lat + lng) - 0.5) * alto * 0.03, lng + (ruidoSemilla(semilla, lng + lat) - 0.5) * ancho * 0.03]);
  }
  function cajaDesdeLote(feature) {
    const coords = feature?.geometry?.coordinates?.[0] || [];
    const lngs = coords.map(p => p[0]);
    const lats = coords.map(p => p[1]);
    return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
  }
  function estiloManzanaReal(feature) {
    const cobertura = Number(feature?.properties?.LUZP ?? feature?.properties?.AGUAP ?? feature?.properties?.TIERRAP ?? 0);
    if (!Number.isFinite(cobertura)) return { color: '#7cc990', weight: 1.1, fillColor: '#7ad38b', fillOpacity: 0.35, interactive: false };
    if (cobertura >= 80) return { color: '#2f9d78', weight: 1.1, fillColor: '#66c28a', fillOpacity: 0.34, interactive: false };
    if (cobertura >= 50) return { color: '#e5a510', weight: 1.1, fillColor: '#f0c95b', fillOpacity: 0.34, interactive: false };
    return { color: '#a46bd6', weight: 1.1, fillColor: '#caa7ea', fillOpacity: 0.30, interactive: false };
  }
  function normalizarUbicacion(valor='') {
    return String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
  }
  function centroGeometria(feature) {
    const puntos=[];
    (function recorrer(coordenadas){
      if(!Array.isArray(coordenadas))return;
      if(typeof coordenadas[0]==='number'){puntos.push(coordenadas);return;}
      coordenadas.forEach(recorrer);
    })(feature?.geometry?.coordinates);
    if(!puntos.length)return {lat:0,lng:0};
    const suma=puntos.reduce((acc,[lng,lat])=>({lng:acc.lng+lng,lat:acc.lat+lat}),{lat:0,lng:0});
    return {lat:suma.lat/puntos.length,lng:suma.lng/puntos.length};
  }
  function cascoConvexo(puntos) {
    const unicos=[...new Map(puntos.map(p=>[`${p.lng.toFixed(6)}:${p.lat.toFixed(6)}`,p])).values()]
      .sort((a,b)=>a.lng-b.lng||a.lat-b.lat);
    if(unicos.length<3)return unicos;
    const giro=(o,a,b)=>(a.lng-o.lng)*(b.lat-o.lat)-(a.lat-o.lat)*(b.lng-o.lng);
    const inferior=[];
    unicos.forEach(p=>{while(inferior.length>=2&&giro(inferior.at(-2),inferior.at(-1),p)<=0)inferior.pop();inferior.push(p);});
    const superior=[];
    [...unicos].reverse().forEach(p=>{while(superior.length>=2&&giro(superior.at(-2),superior.at(-1),p)<=0)superior.pop();superior.push(p);});
    return inferior.slice(0,-1).concat(superior.slice(0,-1));
  }
  function contornoEstratos(centros,margen=1.035) {
    const casco=cascoConvexo(centros);
    if(casco.length<3)return [];
    const centro=casco.reduce((acc,p)=>({lat:acc.lat+p.lat/casco.length,lng:acc.lng+p.lng/casco.length}),{lat:0,lng:0});
    return casco.map(p=>[centro.lat+(p.lat-centro.lat)*margen,centro.lng+(p.lng-centro.lng)*margen]);
  }
  function puntoCuantil(puntos,fraccion) {
    if(!puntos.length)return null;
    return puntos[Math.min(puntos.length-1,Math.max(0,Math.round((puntos.length-1)*fraccion)))];
  }
  function estratosCercanosAlProyecto(proyecto) {
    const departamento=normalizarUbicacion(proyecto.departamento);
    const asignados=estratosInei.filter(feature=>feature?.properties?.PROYECTO===proyecto.codigo);
    const candidatos=asignados.length?asignados:estratosInei
      .filter(feature=>normalizarUbicacion(feature?.properties?.DEPARTAMENTO)===departamento);
    return candidatos
      .map(feature=>{
        const centro=centroGeometria(feature);
        return {feature,distancia:Math.hypot(centro.lat-proyecto.lat,centro.lng-proyecto.lng)};
      })
      .sort((a,b)=>a.distancia-b.distancia)
      .map(item=>item.feature);
  }
  function estiloEstratoInei(feature) {
    const estrato=Number(feature?.properties?.ESTRATO ?? feature?.properties?.ESTRA ?? 0);
    const paleta={1:'#3454a5',2:'#4d79cf',3:'#51a8d7',4:'#79c88a',5:'#e4bf55'};
    return {pane:'estratosPane',color:'#f8fbff',weight:1.05,opacity:.95,fillColor:paleta[estrato]||'#9aa9bf',fillOpacity:.66,smoothFactor:.55,interactive:false,className:'estrato-inei'};
  }
  function aplicarFiltroEstratos(nivel='todos') {
    filtroEstratoActivo=String(nivel);
    document.querySelectorAll('[data-filtro-estrato]').forEach(boton=>{
      const activo=boton.dataset.filtroEstrato===filtroEstratoActivo;
      boton.classList.toggle('activo',activo);
      boton.setAttribute('aria-pressed',String(activo));
    });
    capasContexto.estrato?.eachLayer(layer=>{
      const nivelCapa=String(layer.options?.estratoNivel ?? layer.feature?.properties?.ESTRATO ?? layer.feature?.properties?.ESTRA ?? '');
      const visible=filtroEstratoActivo==='todos'||nivelCapa===filtroEstratoActivo;
      if(typeof layer.setStyle==='function'){
        layer.setStyle(visible?estiloEstratoInei(layer.feature):{opacity:0,fillOpacity:0});
      }
    });
    capasContexto.beneficiarios?.eachLayer(layer=>{
      const nivelCapa=String(layer.options?.estratoNivel ?? '');
      const visible=filtroEstratoActivo==='todos'||nivelCapa===filtroEstratoActivo;
      if(typeof layer.setStyle==='function'){
        const zonaClick=Boolean(layer.options?.esZonaClick);
        layer.setStyle({
          opacity:visible?(zonaClick?0:1):0,
          fillOpacity:visible?(zonaClick?.01:1):0
        });
      }
      const zonaClick=Boolean(layer.options?.esZonaClick);
      layer.options.interactive=visible&&zonaClick;
      if(layer._path)layer._path.style.pointerEvents=visible&&zonaClick?'auto':'none';
    });
  }
  function alternarCapasGenerales(mostrar) {
    const capas=[
      [capaProyectos,true],
      [capaManzanas,$('mostrarManzanas').checked],
      [capaPredios,$('mostrarPredios').checked],
      [capaInfluencia,$('mostrarInfluencia').checked],
      [capaGis,$('mostrarCapaCargada').checked]
    ];
    capas.forEach(([capa,activa])=>{
      if(!capa)return;
      if(mostrar&&activa){if(!mapa.hasLayer(capa))capa.addTo(mapa);}
      else if(mapa.hasLayer(capa))mapa.removeLayer(capa);
    });
  }
  function mostrarDetalle(p) {
    proyectoSeleccionado=p;
    beneficiarioSeleccionadoMasificacion=null;
    seleccionMapa=[];
    $('resumenMasificacion').hidden=true;
    $('detalleBeneficiario').hidden=true;
    $('detalleProyecto').hidden=false;
    $('capasGenerales').hidden=true;
    $('capasProyecto').hidden=false;
    $('nombreCapasProyecto').textContent=`${p.codigo} · ${p.nombre}`;
    alternarCapasGenerales(false);
    dibujarCapasProyecto(p);
    $('detalleNombre').textContent=p.faseSeleccionada?`${p.nombre} · ${p.faseSeleccionada}`:p.nombre;
    const indice=ciudades.indexOf(p), manzanas=3+(indice%4), predios=manzanas*(18+(indice%5)*3);
    const tuberiaPrincipal=(p.longitud*.62).toFixed(2),tuberiaRamales=(p.longitud*.38).toFixed(2),valvulas=8+Math.max(0,indice);
    const responsableLider=!p.responsableLider||String(p.responsableLider).includes('Seleccione')?'Equipo de Masificación':p.responsableLider;
    const datos=[['Código',p.codigo],['Fase / subproyecto',p.faseSeleccionada||'Proyecto general'],['Responsable líder',responsableLider],['Estado',p.estado],['Departamento',p.departamento],['Provincia',p.provincia],['Distrito',p.distrito],['Avance',`${p.avance}%`],['Longitud total de red',`${p.longitud} km`],['Tubería troncal PEAD 200 mm',`${tuberiaPrincipal} km`],['Tuberías de ramales PEAD 63–110 mm',`${tuberiaRamales} km`],['Válvulas registradas',`${valvulas} unidades`],['Manzanas abastecidas',manzanas],['Predios potenciales',predios],['Proyección concesionario',Math.round(predios*(1.08+(indice%3)*.035))],['Elementos indexados',p.elementos]];
    $('datosProyecto').replaceChildren(...datos.map(([k,v])=>{const d=document.createElement('div');const dt=document.createElement('dt');const dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;d.append(dt,dd);return d;}));
    renderAvanceProyecto(p);
    renderBarraProyectos();
    $('panelDerecho').scrollTo({top:0,behavior:'smooth'});
    setTimeout(()=>mapa?.invalidateSize({pan:false}),80);
  }
  function mostrarDetalleTuberia(p,detalle) {
    proyectoSeleccionado=p;
    beneficiarioSeleccionadoMasificacion=null;
    seleccionMapa=[];
    $('resumenMasificacion').hidden=true;
    $('detalleBeneficiario').hidden=true;
    $('detalleSeleccion').hidden=true;
    $('detalleProyecto').hidden=false;
    $('detalleNombre').textContent=`${detalle.tipo} · ${detalle.codigo}`;
    const datos=[
      ['Proyecto',`${p.codigo} · ${p.nombre}`],
      ['Elemento GIS',detalle.codigo],
      ['Tipo de red',detalle.tipo],
      ['Estado',p.estado],
      ['Material',detalle.material],
      ['Diámetro',detalle.diametro],
      ['Longitud referencial',detalle.longitud],
      ['Departamento',p.departamento],
      ['Provincia',p.provincia],
      ['Distrito',p.distrito],
      ['Avance del proyecto',`${p.avance}%`],
      ['Observación','Elemento de red seleccionado directamente en el mapa.']
    ];
    $('datosProyecto').replaceChildren(...datos.map(([k,v])=>{
      const d=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');
      dt.textContent=k;dd.textContent=v;d.append(dt,dd);return d;
    }));
    $('panelDerecho').scrollTo({top:0,behavior:'smooth'});
  }
  function agregarTuberia(grupo,puntos,estilo,p,detalle) {
    const visible=L.polyline(puntos,{...estilo,pane:estilo.pane||'troncalPane',interactive:false});
    const zonaClick=L.polyline(puntos,{pane:estilo.pane||'troncalPane',color:'#15304a',opacity:.01,weight:Math.max(18,(estilo.weight||4)+12)});
    zonaClick.bindTooltip(`${detalle.codigo} · ${detalle.tipo}`,{sticky:true});
    zonaClick.on('click',e=>{
      if(['poligono','circulo'].includes(herramientaActiva)){
        if(e.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);
        clickDibujo(e);return;
      }
      if(e.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);
      mostrarDetalleTuberia(p,detalle);
    });
    grupo.addLayer(visible);
    grupo.addLayer(zonaClick);
  }
  function mostrarBeneficiario(p,numero,lat,lng,lote,categoria='Potencial',nombrePersonalizado=''){
    const nombres=['María Elena Ramos','Carlos Quispe Flores','Rosa Huamán Soto','Luis Alberto Torres','Ana Lucía Mendoza','Jorge Paredes Díaz'];
    const nombre=nombrePersonalizado||nombres[numero%nombres.length];
    seleccionMapa=[];
    beneficiarioSeleccionadoMasificacion={tipo:'Beneficiario',codigo:`BEN-${p.codigo.slice(-3)}-${String(numero+1).padStart(3,'0')}`,nombre,departamento:p.departamento,provincia:p.provincia,distrito:p.distrito,estado:categoria,lat,lng,proyecto:p.nombre};
    $('detalleProyecto').hidden=true;
    $('detalleBeneficiario').hidden=false;
    $('nombreBeneficiario').textContent=nombre;
    $('tipoBeneficiarioDetalle').textContent=categoria==='Registrado'?'BENEFICIARIO REGISTRADO':'BENEFICIARIO POTENCIAL';
    $('iconoBeneficiarioDetalle').classList.toggle('normal',categoria==='Registrado');
    const datos=[['Código',`BEN-${p.codigo.slice(-3)}-${String(numero+1).padStart(3,'0')}`],['Proyecto',p.nombre],['Tipo',categoria==='Registrado'?'Beneficiario conectado':'Unidad residencial potencial'],['Lote',`Lote ${lote}`],['Distrito',p.distrito],['Provincia',p.provincia],['Departamento',p.departamento],['Estado',categoria],['Suministro de referencia',`SUM-${592600+numero}`],['Coordenadas',`${lat.toFixed(5)}, ${lng.toFixed(5)}`],['Cobertura',categoria==='Registrado'?'Conexión registrada en la red':'Dentro del área de influencia'],['Concesionaria',categoria==='Registrado'?'Registro confirmado':'Proyección incluida']];
    $('datosBeneficiario').replaceChildren(...datos.map(([k,v])=>{const d=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;d.append(dt,dd);return d;}));
    $('panelDerecho').scrollTo({top:0,behavior:'smooth'});
  }
  function dibujarCapasProyecto(p){
    Object.values(capasContexto).forEach(c=>c.clearLayers());
    registrosProyectoPosicionados=[];
    const estratosProyecto=estratosCercanosAlProyecto(p);
    const centrosEstratos=estratosProyecto.map(centroGeometria).filter(c=>Number.isFinite(c.lat)&&Number.isFinite(c.lng)&&c.lat&&c.lng);
    const porLongitud=[...centrosEstratos].sort((a,b)=>a.lng-b.lng||a.lat-b.lat);
    const porLatitud=[...centrosEstratos].sort((a,b)=>a.lat-b.lat||a.lng-b.lng);
    const centroProyecto=centrosEstratos.length
      ? centrosEstratos.reduce((acc,c)=>({lat:acc.lat+c.lat/centrosEstratos.length,lng:acc.lng+c.lng/centrosEstratos.length}),{lat:0,lng:0})
      : {lat:p.lat,lng:p.lng};
    const lat=centroProyecto.lat,lng=centroProyecto.lng;
    const contorno=contornoEstratos(centrosEstratos);
    if(contorno.length){
      capasContexto.cobertura.addLayer(L.polygon(contorno,{pane:'coberturaPane',color:'#3d6fd6',weight:2,fillColor:'#75b8e8',fillOpacity:.035,interactive:false,className:'perimetro-proyecto'}));
    }
    agregarTuberia(
      capasContexto.troncal,
      [.06,.34,.66,.94].map(q=>puntoCuantil(porLongitud,q)).filter(Boolean).map(c=>[c.lat,c.lng]),
      {pane:'troncalPane',color:'#e8564f',weight:7,opacity:.98},
      p,
      {codigo:`TRON-${p.codigo.slice(-3)}-01`,tipo:'Troncal principal',material:'Polietileno de alta densidad',diametro:'200 mm',longitud:`${(p.longitud*.62).toFixed(2)} km`}
    );
    const detalleValvula={codigo:`VAL-${p.codigo.slice(-3)}-01`,tipo:'Válvula de seccionamiento',material:'PEAD / acero',diametro:'200 mm',longitud:'Elemento puntual'};
    const puntoValvula=puntoCuantil(porLongitud,.34)||centroProyecto;
    const valvula=L.circleMarker([puntoValvula.lat,puntoValvula.lng],{radius:9,color:'#fff',weight:3,fillColor:'#e27612',fillOpacity:1,pane:'beneficiariosPane'})
      .bindTooltip(`${detalleValvula.codigo} · ${detalleValvula.tipo}`,{sticky:true});
    valvula.on('click',e=>{
      if(['poligono','circulo'].includes(herramientaActiva)){
        if(e.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);
        clickDibujo(e);return;
      }
      if(e.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);
      mostrarDetalleTuberia(p,detalleValvula);
    });
    capasContexto.troncal.addLayer(valvula);
    agregarTuberia(
      capasContexto.concesionaria,
      [.10,.50,.90].map(q=>puntoCuantil(porLatitud,q)).filter(Boolean).map(c=>[c.lat,c.lng]),
      {pane:'concesionariaPane',color:'#438cca',weight:5,dashArray:'10 7',opacity:.96},
      p,
      {codigo:`CONC-${p.codigo.slice(-3)}-01`,tipo:'Red de concesionaria',material:'Polietileno',diametro:'110 mm',longitud:`${(p.longitud*.48).toFixed(2)} km`}
    );
    for(let i=0;i<3&&centrosEstratos.length;i++){
      const inicio=puntoCuantil(porLongitud,.18+i*.24),fin=puntoCuantil(porLongitud,.30+i*.24);
      agregarTuberia(
        capasContexto.ramales,
        [inicio,fin].filter(Boolean).map(c=>[c.lat,c.lng]),
        {pane:'ramalesPane',color:'#f0a632',weight:4,opacity:.98},
        p,
        {codigo:`RAM-${p.codigo.slice(-3)}-${String(i+1).padStart(2,'0')}`,tipo:'Ramal secundario',material:'Polietileno',diametro:'63 mm',longitud:`${(0.42+i*.17).toFixed(2)} km`}
      );
    }
    const beneficiariosGeo=datosGeo.filter(f=>f.properties.tipo==='beneficiario'&&f.properties.proyecto===(p.codigoFuente||p.codigo)).slice(0,12);
    beneficiariosGeo.forEach((beneficiarioGeo,numero)=>{
      const indiceEstrato=Math.min(estratosProyecto.length-1,Math.round((numero+1)*estratosProyecto.length/(beneficiariosGeo.length+1)));
      const estratoDestino=estratosProyecto[indiceEstrato];
      const nivelEstrato=Number(estratoDestino?.properties?.ESTRATO ?? estratoDestino?.properties?.ESTRA ?? 0);
      const ubicacion=estratoDestino?centroGeometria(estratoDestino):centroProyecto;
      const by=ubicacion.lat,bx=ubicacion.lng;
      const categoria=categoriaBeneficiario(beneficiarioGeo,numero),color=categoria==='Registrado'?'#2f9d78':'#7655a8';
      const lote=estratoDestino?.properties?.IDMANZANA||estratoDestino?.properties?.OBJECTID||numero+1;
      registrosProyectoPosicionados.push({
        tipo:'Beneficiario',
        codigo:beneficiarioGeo.id||`BEN-${p.codigo.slice(-3)}-${String(numero+1).padStart(3,'0')}`,
        nombre:beneficiarioGeo.properties.nombre,
        lat:by,
        lng:bx,
        detalle:`${categoria} · ${p.distrito}`,
        estado:categoria,
        estrato:nivelEstrato,
        proyecto:p.nombre,
        departamento:p.departamento,
        provincia:p.provincia,
        distrito:p.distrito
      });
      const puntoVisible=L.circleMarker([by,bx],{radius:5.5,color:'#fff',weight:2,fillColor:color,fillOpacity:1,className:`beneficiario-mapa ${categoria==='Registrado'?'beneficiario-normal':'beneficiario-potencial'}`,pane:'beneficiariosPane',interactive:false});
      const zonaClick=L.circleMarker([by,bx],{radius:13,color:'transparent',weight:0,fillColor:color,fillOpacity:.01,pane:'beneficiariosPane'}).bindTooltip(`${beneficiarioGeo.properties.nombre} · ${categoria}`);
      puntoVisible.options.estratoNivel=nivelEstrato;
      puntoVisible.options.esZonaClick=false;
      zonaClick.options.estratoNivel=nivelEstrato;
      zonaClick.options.esZonaClick=true;
      zonaClick.on('click',e=>{
        if(['poligono','circulo'].includes(herramientaActiva)){
          if(e.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);
          clickDibujo(e);return;
        }
        mostrarBeneficiario(p,numero,by,bx,lote,categoria,beneficiarioGeo.properties.nombre);
      });
      capasContexto.beneficiarios.addLayer(puntoVisible);
      capasContexto.beneficiarios.addLayer(zonaClick);
    });
    const limitesEstratos=L.latLngBounds();
    estratosProyecto.forEach(feature=>{
      const capa=L.geoJSON(feature,{style:estiloEstratoInei,interactive:false,className:'estrato-inei'});
      capa.eachLayer(layer=>{
        layer.options.estratoNivel=Number(feature?.properties?.ESTRATO ?? feature?.properties?.ESTRA ?? 0);
        capasContexto.estrato.addLayer(layer);
        if(typeof layer.getBounds==='function')limitesEstratos.extend(layer.getBounds());
      });
    });
    aplicarFiltroEstratos(filtroEstratoActivo);
    if(!estratosProyecto.length){
      const aviso=$('estadoCarga');
      aviso.hidden=false;
      aviso.textContent=`Sin estratos INEI disponibles para ${p.departamento}`;
      setTimeout(()=>{aviso.hidden=true;},2600);
    }
    if(limitesEstratos.isValid()){
      // Un margen amplio permite ver el distrito completo y evita que los
      // estratos ubicados en los extremos queden pegados o fuera del mapa.
      const limitesConMargen=limitesEstratos.pad(.06);
      mapa.flyToBounds(limitesConMargen,{padding:[30,30],maxZoom:12,duration:.6});
    }
    else mapa.flyTo([lat,lng],11,{duration:.6});
  }
  function cerrarProyecto(){
    proyectoSeleccionado=null;
    beneficiarioSeleccionadoMasificacion=null;
    subproyectoSeleccionado='';
    ciudades.forEach(proyecto=>delete proyecto.faseSeleccionada);
    seleccionMapa=[];
    registrosProyectoPosicionados=[];
    Object.values(capasContexto).forEach(c=>c.clearLayers());
    $('detalleProyecto').hidden=true;$('detalleBeneficiario').hidden=true;$('resumenMasificacion').hidden=false;
    $('capasProyecto').hidden=true;$('capasGenerales').hidden=false;
    alternarCapasGenerales(true);
    renderBarraProyectos();
    $('panelDerecho').scrollTo({top:0,behavior:'smooth'});
    // La X devuelve al alcance nacional inicial, no conserva el zoom del proyecto cerrado.
    mapa.setView([-10.6,-75.2],5,{animate:true});
  }
  function registrosSeleccionables(){
    // Cuando existe un proyecto abierto se usan exactamente las coordenadas
    // que se dibujaron dentro de los estratos, no las coordenadas antiguas del JSON.
    if(proyectoSeleccionado&&registrosProyectoPosicionados.length){
      return registrosProyectoPosicionados.filter(registro=>
        filtroEstratoActivo==='todos'||String(registro.estrato)===filtroEstratoActivo
      );
    }
    const proyectos=filtrados().map(p=>({tipo:'Proyecto',codigo:p.codigo,nombre:p.nombre,lat:p.lat,lng:p.lng,detalle:p.estado}));
    const beneficiarios=datosGeo.filter(f=>f.properties.tipo==='beneficiario').map(f=>({tipo:'Beneficiario',codigo:f.id,nombre:f.properties.nombre,lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0],detalle:f.properties.distrito}));
    return [...proyectos,...beneficiarios];
  }
  function puntoEnPoligono(r,puntos){
    let dentro=false;for(let i=0,j=puntos.length-1;i<puntos.length;j=i++){const xi=puntos[i].lng,yi=puntos[i].lat,xj=puntos[j].lng,yj=puntos[j].lat;if((yi>r.lat)!==(yj>r.lat)&&r.lng<((xj-xi)*(r.lat-yi))/(yj-yi)+xi)dentro=!dentro;}return dentro;
  }
  function mostrarSeleccion(registros,titulo){
    seleccionMapa=[...registros];
    beneficiarioSeleccionadoMasificacion=null;
    registros.forEach(r=>{
      if(!Number.isFinite(r.lat)||!Number.isFinite(r.lng))return;
      L.circleMarker([r.lat,r.lng],{
        pane:'seleccionPane',radius:9,color:'#fff',weight:3,
        fillColor:'#1c86c8',fillOpacity:.92,interactive:false
      }).addTo(capaDibujo);
    });
    $('resumenMasificacion').hidden=true;$('detalleProyecto').hidden=true;$('detalleBeneficiario').hidden=true;$('detalleSeleccion').hidden=false;
    $('tituloSeleccion').textContent=titulo;$('resumenSeleccion').textContent=`${registros.length} registro(s) dentro del área`;
    $('listaSeleccion').replaceChildren(...registros.slice(0,40).map(r=>{const a=document.createElement('article');a.innerHTML=`<strong>${r.codigo} · ${r.nombre}</strong><small>${r.tipo} · ${r.detalle}</small>`;return a;}));
    $('panelDerecho').scrollTo({top:0,behavior:'smooth'});
  }
  function limpiarSeleccion(){
    seleccionMapa=[];beneficiarioSeleccionadoMasificacion=null;
    puntosDibujo=[];centroCirculo=null;figuraTemporal=null;if(capaDibujo)capaDibujo.clearLayers();
    $('detalleSeleccion').hidden=true;$('detalleProyecto').hidden=true;$('detalleBeneficiario').hidden=true;$('resumenMasificacion').hidden=false;
    $('panelDerecho').scrollTo({top:0,behavior:'smooth'});
  }
  function clickDibujo(e){
    if(herramientaActiva==='poligono'){puntosDibujo.push(e.latlng);if(figuraTemporal)figuraTemporal.setLatLngs(puntosDibujo);else figuraTemporal=L.polyline(puntosDibujo,{pane:'dibujoPane',color:'#d98b24',weight:3}).addTo(capaDibujo);}
    else if(herramientaActiva==='circulo'&&!centroCirculo){centroCirculo=e.latlng;figuraTemporal=L.circle(centroCirculo,{pane:'dibujoPane',radius:100,color:'#7657c7',fillColor:'#9a7de0',fillOpacity:.16,weight:3}).addTo(capaDibujo);}
  }
  function moverDibujo(e){
    if(herramientaActiva==='poligono'&&puntosDibujo.length&&figuraTemporal)figuraTemporal.setLatLngs([...puntosDibujo,e.latlng]);
    if(herramientaActiva==='circulo'&&centroCirculo&&figuraTemporal)figuraTemporal.setRadius(mapa.distance(centroCirculo,e.latlng));
  }
  function desactivarHerramientasMapa(limpiarDibujo=false) {
    herramientaActiva=null;puntosDibujo=[];centroCirculo=null;figuraTemporal=null;dibujoProyectoPendiente=null;
    document.querySelectorAll('[data-herramienta]').forEach(boton=>boton.classList.remove('activo'));
    if(limpiarDibujo)capaDibujo?.clearLayers();
    mapa?.doubleClickZoom.enable();mapa?.getContainer().classList.remove('modo-dibujo');
  }
  function prepararGeometriaProyecto(forma,datos,figura) {
    geometriaProyectoBorrador={forma,datos,figura};
    dibujoProyectoPendiente=null;
    desactivarHerramientasMapa(false);
    $('modalAccionesGeometria').showModal();
  }
  function activarEdicionGeometriaProyecto() {
    const borrador=geometriaProyectoBorrador;if(!borrador)return;
    $('modalAccionesGeometria').close();
    const icono=L.divIcon({className:'vertice-edicion-geometria',iconSize:[15,15],iconAnchor:[7.5,7.5]});
    const marcadores=[];
    if(borrador.forma==='poligono'){
      borrador.datos.puntos.forEach((punto,indice)=>{
        const marcador=L.marker(punto,{pane:'seleccionPane',icon:icono,draggable:true}).addTo(capaDibujo);
        marcador.on('drag',evento=>{borrador.datos.puntos[indice]=evento.target.getLatLng();borrador.figura.setLatLngs(borrador.datos.puntos);});
        marcadores.push(marcador);
      });
    }else{
      const centro=borrador.datos.centro,radio=borrador.datos.radio;
      const borde=L.latLng(centro.lat,centro.lng+(radio/(111320*Math.max(.2,Math.cos(centro.lat*Math.PI/180)))));
      const marcadorCentro=L.marker(centro,{pane:'seleccionPane',icon:icono,draggable:true}).addTo(capaDibujo);
      const marcadorRadio=L.marker(borde,{pane:'seleccionPane',icon:icono,draggable:true}).addTo(capaDibujo);
      marcadorCentro.on('drag',evento=>{borrador.datos.centro=evento.target.getLatLng();borrador.figura.setLatLng(borrador.datos.centro);});
      marcadorRadio.on('drag',evento=>{borrador.datos.radio=mapa.distance(borrador.datos.centro,evento.target.getLatLng());borrador.figura.setRadius(borrador.datos.radio);});
      marcadores.push(marcadorCentro,marcadorRadio);
    }
    borrador.marcadoresEdicion=marcadores;
    $('accionesGeometriaMapa').hidden=false;mapa.getContainer().classList.add('mapa-editando-vertices');
  }
  function finalizarEdicionGeometriaProyecto() {
    const borrador=geometriaProyectoBorrador;if(!borrador)return;
    (borrador.marcadoresEdicion||[]).forEach(marcador=>capaDibujo.removeLayer(marcador));borrador.marcadoresEdicion=[];
    $('accionesGeometriaMapa').hidden=true;mapa.getContainer().classList.remove('mapa-editando-vertices');
    $('modalAccionesGeometria').showModal();
  }
  function eliminarGeometriaProyectoBorrador() {
    capaDibujo.clearLayers();geometriaProyectoBorrador=null;$('accionesGeometriaMapa').hidden=true;
    mapa.getContainer().classList.remove('mapa-editando-vertices');
    if($('modalAccionesGeometria').open)$('modalAccionesGeometria').close();
    desactivarHerramientasMapa(false);
  }
  function completarDibujoProyecto() {
    if(!geometriaProyectoBorrador||!dibujoProyectoPendiente)return false;
    const {forma,datos,figura}=geometriaProyectoBorrador;
    const {tipo,nombre}=dibujoProyectoPendiente;
    const centro=forma==='poligono'
      ? datos.puntos.reduce((acumulado,punto)=>({lat:acumulado.lat+punto.lat/datos.puntos.length,lng:acumulado.lng+punto.lng/datos.puntos.length}),{lat:0,lng:0})
      : datos.centro;
    const geometria=forma==='poligono'
      ? {tipo:'Polígono',nombre,categoria:tipo,coordenadas:datos.puntos.map(punto=>[Number(punto.lat.toFixed(6)),Number(punto.lng.toFixed(6))])}
      : {tipo:'Círculo',nombre,categoria:tipo,centro:[Number(centro.lat.toFixed(6)),Number(centro.lng.toFixed(6))],radio:Number(datos.radio.toFixed(2))};
    const codigoProyecto=dibujoProyectoPendiente.codigoProyecto;
    const proyecto=ciudades.find(item=>item.codigo===codigoProyecto);
    const area=`${tipo} · ${nombre}`,localizacion=`${centro.lat.toFixed(6)}, ${centro.lng.toFixed(6)}`;
    if(proyecto){Object.assign(proyecto,{areaInfluencia:area,localizacion,geometria,lat:centro.lat,lng:centro.lng});renderBarraProyectos();actualizar();}
    $('proyectoAreaInfluencia').value=area;
    $('proyectoLocalizacion').value=localizacion;
    $('proyectoGeometria').value=JSON.stringify(geometria);
    const estado=$('estadoZonaProyecto');
    estado.textContent=`${nombre} guardada como ${geometria.tipo.toLowerCase()}. Centro: ${centro.lat.toFixed(5)}, ${centro.lng.toFixed(5)}.`;
    estado.classList.add('exito');
    figura?.bindTooltip(nombre);
    dibujoProyectoPendiente=null;geometriaProyectoBorrador=null;
    desactivarHerramientasMapa(false);
    $('accionesGeometriaMapa').hidden=true;
    $('modalDibujoArea').close();
    return true;
  }
  function cerrarDibujo(e){
    if(herramientaActiva==='poligono'&&puntosDibujo.length>=3){const puntos=[...puntosDibujo];capaDibujo.clearLayers();const figura=L.polygon(puntos,{pane:'dibujoPane',color:'#d98b24',fillColor:'#f2ad50',fillOpacity:.18,weight:3}).addTo(capaDibujo);if(dibujoProyectoPendiente?.modo==='captura')prepararGeometriaProyecto('poligono',{puntos},figura);else{mostrarSeleccion(registrosSeleccionables().filter(r=>puntoEnPoligono(r,puntos)),'Selección por polígono');desactivarHerramientasMapa(false);}}
    else if(herramientaActiva==='circulo'&&centroCirculo&&figuraTemporal){const centro=centroCirculo,radio=mapa.distance(centro,e.latlng);figuraTemporal.setRadius(radio);if(dibujoProyectoPendiente?.modo==='captura')prepararGeometriaProyecto('circulo',{centro,radio},figuraTemporal);else{mostrarSeleccion(registrosSeleccionables().filter(r=>mapa.distance(centro,L.latLng(r.lat,r.lng))<=radio),'Selección por círculo');desactivarHerramientasMapa(false);}}
  }
  function activarTabLiquidacion(nombre){
    document.querySelectorAll('[data-tab-liquidacion]').forEach(boton=>{
      const activa=boton.dataset.tabLiquidacion===nombre;
      boton.classList.toggle('activa',activa);
      boton.setAttribute('aria-selected',String(activa));
    });
    document.querySelectorAll('[data-panel-liquidacion]').forEach(panel=>panel.hidden=panel.dataset.panelLiquidacion!==nombre);
  }
  function cambiarZonaExpediente(){
    const nuevaZona=$('zonaAnalisisExpediente').value;
    const zonaActual=$('zonaActualExpediente').textContent.trim();
    if(nuevaZona===zonaActual)return;
    $('zonaActualExpediente').textContent=nuevaZona;
    $('faseZonaExpediente').textContent=`Análisis de ${nuevaZona.toLowerCase()}`;
    const fila=document.createElement('tr');
    fila.innerHTML=`<td>27/07/2026 · 12:10</td><td>Análisis territorial</td><td><b class="movimiento-actual">Cambio de ámbito</b></td><td>Renzo Vicente</td><td>Transición de ${zonaActual.toLowerCase()} a ${nuevaZona.toLowerCase()} registrada para continuar el análisis.</td>`;
    $('auditoriaExpediente').prepend(fila);
    $('totalMovimientosExpediente').textContent=String($('auditoriaExpediente').children.length);
  }
  const historialTrazabilidad={
    1:{titulo:'1. Planificación',inicio:'01/07/2026',fin:'02/07/2026',usuario:'Renzo',anterior:'Registro',nuevo:'Planificación',estado:'Completado'},
    2:{titulo:'2. Registro de la agrupación',inicio:'03/07/2026',fin:'04/07/2026',usuario:'Renzo',anterior:'Planificación',nuevo:'Registro de la agrupación',estado:'Completado'},
    3:{titulo:'3. Evaluación GIS',inicio:'05/07/2026',fin:'07/07/2026',usuario:'Analista GIS',anterior:'Registro',nuevo:'Evaluación GIS',estado:'Completado'},
    4:{titulo:'4. Validación técnica',inicio:'08/07/2026',fin:'10/07/2026',usuario:'Carolina Jara',anterior:'Evaluación GIS',nuevo:'Validación técnica',estado:'Completado'},
    5:{titulo:'5. Validación concesionaria',inicio:'11/07/2026',fin:'14/07/2026',usuario:'Concesionaria',anterior:'Validación técnica',nuevo:'Validación concesionaria',estado:'Completado'},
    6:{titulo:'6. Programación de obra',inicio:'15/07/2026',fin:'En curso',usuario:'Operaciones',anterior:'Validación concesionaria',nuevo:'Programación de obra',estado:'En curso'},
    7:{titulo:'7. Ejecución de red',inicio:'Pendiente',fin:'Pendiente',usuario:'Sin asignar',anterior:'Programación de obra',nuevo:'Ejecución de red',estado:'No completado'},
    8:{titulo:'8. Liquidación',inicio:'Pendiente',fin:'Pendiente',usuario:'Sin asignar',anterior:'Ejecución de red',nuevo:'Liquidación',estado:'No completado'},
    9:{titulo:'9. Monitoreo',inicio:'Pendiente',fin:'Pendiente',usuario:'Sin asignar',anterior:'Liquidación',nuevo:'Monitoreo',estado:'No completado'}
  };
  function renderHistorialFase(numero){
    const dato=historialTrazabilidad[numero]||historialTrazabilidad[1];
    $('tituloHistorialFase').textContent=`Historial · ${dato.titulo}`;
    const fila=document.createElement('tr');
    fila.innerHTML=`<td>${dato.inicio}</td><td>${dato.fin}</td><td>${dato.usuario}</td><td>${dato.anterior}</td><td>${dato.nuevo}</td><td><select class="estado-historial"><option ${dato.estado==='Completado'?'selected':''}>Completado</option><option ${dato.estado==='En curso'?'selected':''}>En curso</option><option ${dato.estado==='No completado'?'selected':''}>No completado</option></select></td><td><div class="acciones-historial"><button data-accion-historial="editar" title="Editar">✎</button><button class="eliminar" data-accion-historial="eliminar" title="Eliminar">⌫</button><button data-accion-historial="adjuntar" title="Adjuntar PDF">⇧</button></div></td>`;
    $('historialFaseBody').replaceChildren(fila);
  }
  function inicializarTrazabilidad(){
    renderHistorialFase(1);
    $('fasesTrazabilidad').addEventListener('click',e=>{
      const fase=e.target.closest('[data-fase]');if(!fase)return;
      document.querySelectorAll('#fasesTrazabilidad [data-fase]').forEach(x=>x.classList.toggle('activa',x===fase));
      renderHistorialFase(Number(fase.dataset.fase));
    });
    $('registrarExpediente').addEventListener('click',()=>{
      $('nuevoExpCodigo').value=$('trazaCodigo').value;
      $('nuevoExpTipo').value=$('trazaTipo').value;
      $('nuevoExpZona').value=$('trazaZona').value;
      $('formularioExpediente').hidden=false;
      $('formularioExpediente').scrollIntoView({behavior:'smooth',block:'nearest'});
    });
    $('cerrarFormularioExpediente').addEventListener('click',()=>{$('formularioExpediente').hidden=true;});
    $('documentoExpediente').addEventListener('change',e=>{$('nombreDocumentoExpediente').textContent=e.target.files[0]?.name||'Ningún PDF seleccionado';});
    $('guardarExpediente').addEventListener('click',()=>{
      $('trazaCodigo').value=$('nuevoExpCodigo').value||'FISE-2026-001';
      $('estadoFormularioExpediente').textContent=`Expediente ${$('trazaCodigo').value} guardado correctamente en la maqueta.`;
      setTimeout(()=>{$('formularioExpediente').hidden=true;$('estadoFormularioExpediente').textContent='';},900);
    });
    $('historialFaseBody').addEventListener('click',e=>{
      const boton=e.target.closest('[data-accion-historial]');if(!boton)return;
      const fila=boton.closest('tr'),accion=boton.dataset.accionHistorial;
      if(accion==='editar'){
        const editando=fila.classList.toggle('editando');
        Array.from(fila.cells).slice(0,5).forEach(c=>c.contentEditable=String(editando));
        boton.textContent=editando?'✓':'✎';boton.title=editando?'Guardar cambios':'Editar';
      }else if(accion==='eliminar'){
        fila.remove();
      }else $('archivoHistorialFase').click();
    });
    $('archivoHistorialFase').addEventListener('change',e=>{
      const nombre=e.target.files[0]?.name;if(!nombre)return;
      const boton=$('historialFaseBody').querySelector('[data-accion-historial="adjuntar"]');
      if(boton){boton.textContent='✓';boton.title=`Adjunto: ${nombre}`;}
    });
    $('exportarAuditoriaTraza').addEventListener('click',()=>{
      const filas=Object.values(historialTrazabilidad).map(x=>[x.inicio,x.fin,x.usuario,x.anterior,x.nuevo,x.estado].join(';'));
      const blob=new Blob([`Inicio;Fin;Usuario;Estado anterior;Nuevo estado;Estado\n${filas.join('\n')}`],{type:'text/csv;charset=utf-8'});
      const enlace=document.createElement('a');enlace.href=URL.createObjectURL(blob);enlace.download='auditoria-trazabilidad-FISE-2026-001.csv';enlace.click();setTimeout(()=>URL.revokeObjectURL(enlace.href),500);
    });
  }
  function actualizarLiquidacion(){
    const total=$('liquidacionTotal').checked;
    const campo=$('porcentajeLiquidacion');
    if(total){
      if(!campo.disabled)campo.dataset.parcial=String(Math.min(99,Math.max(1,Number(campo.value)||60)));
      campo.value='100';campo.disabled=true;
    }else{
      if(campo.disabled||Number(campo.value)>=100)campo.value=campo.dataset.parcial||'60';
      campo.disabled=false;campo.value=String(Math.min(99,Math.max(1,Number(campo.value)||60)));
    }
    const porcentaje=Number(campo.value),factor=porcentaje/100;
    $('etiquetaPorcentajeLiquidacion').firstChild.textContent=total?'% Liquidación total':'% Liquidación parcial';
    $('tituloAnexoLiquidacion').textContent=`ANEXO 1: LIQUIDACIÓN ${total?'TOTAL':'PARCIAL'} DE LAS INVERSIONES EN BIENES DE CAPITAL CON RECURSOS DEL FISE`;
    $('subtituloLiquidacion').textContent=`Reporte de Transferencia ${total?'total':'parcial'} · Malla N.° PPEO-25-0594 CL-SECTOR-000100-MALLA-000`;
    $('columnaMontoLiquidacion').textContent=total?'Monto total':`Monto parcial (${porcentaje}%)`;
    let suma=0;
    document.querySelectorAll('#partidasLiquidacion .monto-liquidacion').forEach(celda=>{const valor=(Number(celda.dataset.total)||0)*factor;suma+=valor;celda.textContent=`US$ ${valor.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;});
    $('estadoLiquidacion').textContent=`Liquidación ${total?'total':'parcial'} aplicada al ${porcentaje}% · Total: US$ ${suma.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}.`;
  }
  function activarHerramienta(nombre,boton){
    if(nombre==='area-proyecto'){
      capaDibujo.clearLayers();geometriaProyectoBorrador=null;$('accionesGeometriaMapa').hidden=true;
      dibujoProyectoPendiente={modo:'captura',forma:'poligono'};
      herramientaActiva='poligono';puntosDibujo=[];centroCirculo=null;figuraTemporal=null;
      document.querySelectorAll('[data-herramienta]').forEach(b=>b.classList.toggle('activo',b===boton));
      mapa.doubleClickZoom.disable();mapa.getContainer().classList.add('modo-dibujo');return;
    }
    if(nombre==='liquidaciones'){activarTabLiquidacion('liquidacion');$('modalLiquidaciones').showModal();return;}
    if(nombre==='informes'){$('modalInformes').showModal();return;}
    if(nombre==='ampliar'){$('barraHerramientas').classList.toggle('ampliada');return;}if(nombre==='opciones'||nombre==='mover')return;
    herramientaActiva=herramientaActiva===nombre?null:nombre;
    document.querySelectorAll('[data-herramienta]').forEach(b=>b.classList.toggle('activo',b.dataset.herramienta===herramientaActiva));
    puntosDibujo=[];centroCirculo=null;figuraTemporal=null;capaDibujo.clearLayers();
    const dibujando=['poligono','circulo'].includes(herramientaActiva);
    if(dibujando)mapa.doubleClickZoom.disable();else mapa.doubleClickZoom.enable();
    mapa.getContainer().classList.toggle('modo-dibujo',dibujando);
  }
  function restablecerTodo(){
    limpiarSeleccion();cerrarProyecto();herramientaActiva=null;document.querySelectorAll('[data-herramienta]').forEach(b=>b.classList.remove('activo'));
    mapa.doubleClickZoom.enable();mapa.getContainer().classList.remove('modo-dibujo');mapa.setView([-10.6,-75.2],5);
  }
  function actualizar() {
    const datos=filtrados();
    capaProyectos.clearLayers();
    capaManzanas.clearLayers(); capaPredios.clearLayers(); capaInfluencia.clearLayers();
    let totalPredios=0, totalConcesionario=0, totalManzanas=0;
    // El cambio de cartografía modifica el trazado, no la presencia de los proyectos.
    // Así se conservan los íconos y los puntos de referencia del mapa principal.
    datos.forEach((p,i)=>{
      const desplazamiento=.055+(i%3)*.012;
      const factorVersion=versionCartograficaActiva==='asbuilt'?1:.64;
      const puntos=[[p.lat,p.lng-desplazamiento*factorVersion],[p.lat+.025*factorVersion,p.lng-.018*factorVersion],[p.lat-.012*factorVersion,p.lng+.025*factorVersion],[p.lat+.015*factorVersion,p.lng+desplazamiento*factorVersion]];
      const colorVersion=versionCartograficaActiva==='asbuilt'?(colores[p.estado]||'#3fac79'):'#4e7de1';
      const etapaMapa=fasePrincipalProyecto(p,i);
      const estiloFase=fasesMapa[etapaMapa]||fasesMapa.Proyecto;
      const linea=L.polyline(puntos,{color:colorVersion,weight:versionCartograficaActiva==='asbuilt'?7:4,opacity:versionCartograficaActiva==='asbuilt'?.9:.82,dashArray:versionCartograficaActiva==='asbuilt'?null:'10 8',className:`tramo-red ${versionCartograficaActiva==='asbuilt'?'tramo-asbuilt':'tramo-planificacion'}`}).bindTooltip(`${p.codigo} · ${p.nombre}<br>Etapa: ${etapaMapa} · ${p.avance}%`);
      linea.on('click',e=>{
        if(['poligono','circulo'].includes(herramientaActiva)){clickDibujo(e);return;}
        subproyectoSeleccionado='';
        delete p.faseSeleccionada;
        mostrarDetalle(p);
      }); capaProyectos.addLayer(linea);
      const icono=L.divIcon({className:'marcador-proyecto',html:`<span class="marcador-proyecto-con-etapa" title="Fase: ${etapaMapa}"><span class="icono-proyecto-mapa ${versionCartograficaActiva==='asbuilt'?'asbuilt':'planificacion'}" style="--color-proyecto:${estiloFase.color}">${iconoProyecto}<small>${estiloFase.abreviatura}</small></span></span>`,iconSize:[46,46],iconAnchor:[23,23]});
      const punto=L.marker([p.lat,p.lng],{icon:icono}).bindTooltip(`${p.codigo} · ${p.nombre}<br>Etapa: ${etapaMapa}`).on('click',e=>{
        if(['poligono','circulo'].includes(herramientaActiva)){clickDibujo(e);return;}
        subproyectoSeleccionado='';
        delete p.faseSeleccionada;
        mostrarDetalle(p);
      });
      capaProyectos.addLayer(punto);
      const manzanas=3+(i%4), predios=manzanas*(18+(i%5)*3), concesionario=Math.round(predios*(1.08+(i%3)*.035));
      totalManzanas+=manzanas; totalPredios+=predios; totalConcesionario+=concesionario;
      capaInfluencia.addLayer(L.circle([p.lat,p.lng],{radius:6500+(i%3)*1500,className:'area-influencia'}).bindTooltip(`Área de influencia · ${p.nombre}`));
      const estratosProyecto=estratosCercanosAlProyecto(p).slice(0,90);
      if(estratosProyecto.length){
        estratosProyecto.forEach((feature,indice)=>{
          const capa=L.geoJSON(feature,{style:estiloEstratoInei,interactive:false});
          capa.eachLayer(layer=>capaManzanas.addLayer(layer));
          const centro=centroGeometria(feature);
          if(!centro)return;
          for(let u=0;u<3;u++){
            const normal=(u+indice+i)%3===0;
            capaPredios.addLayer(L.circleMarker([centro.lat+(u-1)*.0007,centro.lng+(u-1)*.00055],{radius:3.2,color:'#fff',weight:1,fillColor:normal?'#2f9d78':'#7655a8',fillOpacity:.95,className:normal?'predio-normal':'predio-potencial'}).bindTooltip(normal?'Beneficiario registrado':'Beneficiario potencial'));
          }
        });
      } else {
      const manzanasProyecto=manzanasUrbanas.filter(feature=>feature?.properties?.proyecto===p.codigo);
      if(manzanasProyecto.length){
        manzanasProyecto.forEach((feature,indice)=>{
          const capa=L.geoJSON(feature,{style:estiloManzanaReal(feature),onEachFeature:(f,l)=>l.bindTooltip(`Manzana ${f.properties?.CODMZ || f.properties?.LLAVE_IDMANZANA || indice+1} · ${f.properties?.NOMBCCPP || f.properties?.NOMDIST || 'INEI'}`)});
          capa.eachLayer(layer=>capaManzanas.addLayer(layer));
          const conteoPredios=Math.max(4,Math.round(predios/Math.max(1,manzanasProyecto.length)));
          const centro=feature.geometry?.coordinates?.[0]?.[0] || [];
          const baseLat=centro[1] || p.lat;
          const baseLng=centro[0] || p.lng;
          for(let u=0;u<Math.min(6,conteoPredios);u++){
            const normal=(u+indice+i)%3===0;
            capaPredios.addLayer(L.circleMarker([baseLat-.004+(u%3)*.004,baseLng-.008+Math.floor(u/3)*.010],{radius:3.2,color:'#fff',weight:1,fillColor:normal?'#2f9d78':'#7655a8',fillOpacity:.95,className:normal?'predio-normal':'predio-potencial'}).bindTooltip(normal?'Beneficiario registrado':'Beneficiario potencial'));
          }
        });
      } else {
        for(let m=0;m<manzanas;m++){
          const fila=Math.floor(m/2), col=m%2, lat=p.lat+.018+(fila*.017), lng=p.lng-.035+(col*.04);
          const caja=[lng-.012,lat-.007,lng+.012,lat+.007];
          capaManzanas.addLayer(L.polygon(anilloALatLng(poligonoOrganicoDesdeCaja(caja, `${p.codigo}-${m}`)),{className:'manzana-potencial',color:'#7cc990',weight:1.1,fillColor:'#7ad38b',fillOpacity:.55,smoothFactor:1.4,interactive:false}).bindTooltip(`Manzana ${m+1} · ${Math.round(predios/manzanas)} predios`));
          for(let u=0;u<Math.min(6,Math.round(predios/manzanas));u++){
            const normal=(u+m+i)%3===0;
            capaPredios.addLayer(L.circleMarker([lat-.004+(u%3)*.004,lng-.008+Math.floor(u/3)*.010],{radius:3.2,color:'#fff',weight:1,fillColor:normal?'#2f9d78':'#7655a8',fillOpacity:.95,className:normal?'predio-normal':'predio-potencial'}).bindTooltip(normal?'Beneficiario registrado':'Beneficiario potencial'));
          }
        }
      }
      }
    });
    $('contadorMapa').textContent=`${datos.length} proyectos visibles`;
    $('kpiTotal').textContent=datos.length;
    const km=e=>datos.filter(x=>x.estado===e).reduce((s,x)=>s+x.longitud,0).toFixed(1)+' km';
    $('kpiInstalada').textContent=km('Instalada'); $('kpiEjecucion').textContent=km('En ejecución'); $('kpiProyectada').textContent=km('Proyectada');
    $('kpiResidenciales').textContent=totalPredios.toLocaleString('es-PE');
    $('kpiConcesionario').textContent=totalConcesionario.toLocaleString('es-PE');
    $('kpiManzanas').textContent=totalManzanas;
    $('kpiCobertura').textContent=(datos.length?Math.round(datos.reduce((s,x)=>s+x.avance,0)/datos.length):0)+'%';
    $('listaAvance').replaceChildren(...datos.slice(0,6).map(p=>{const d=document.createElement('div');d.className='avance-item';d.innerHTML=`<span>${p.distrito}</span><span class="barra-avance"><i style="width:${p.avance}%"></i></span><b>${p.avance}%</b>`;return d;}));
    renderBarraProyectos();
  }

  function calcularPotencial() {
    const proyectos=filtrados();
    const filas=proyectos.slice(0,8).map((p,i)=>{
      const manzanas=3+(i%4),predios=manzanas*(18+(i%5)*3),cobertura=Math.round(predios*(.72+(i%3)*.06)),concesionario=Math.max(3,Math.round(predios*(.16+(i%2)*.04)));
      return {manzana:`${p.codigo} · MZ-${String(i+1).padStart(2,'0')}`,predios,cobertura,concesionario,potenciales:Math.round(cobertura+concesionario*.72)};
    });
    return {
      filas,
      predios:filas.reduce((s,f)=>s+f.predios,0),
      residenciales:filas.reduce((s,f)=>s+f.cobertura,0),
      concesionario:filas.reduce((s,f)=>s+f.concesionario,0),
      potenciales:filas.reduce((s,f)=>s+f.potenciales,0)
    };
  }

  function abrirModalPotencial() {
    const resumen=calcularPotencial();
    $('kpiPrediosAnalizados').textContent=resumen.predios.toLocaleString('es-PE');
    $('kpiResidenciales').textContent=resumen.residenciales.toLocaleString('es-PE');
    $('kpiConcesionario').textContent=resumen.concesionario.toLocaleString('es-PE');
    $('kpiPotenciales').textContent=resumen.potenciales.toLocaleString('es-PE');
    $('tablaPotencial').replaceChildren(...resumen.filas.map(f=>{
      const tr=document.createElement('tr');
      [f.manzana,f.predios,f.cobertura,f.concesionario,f.potenciales].forEach(valor=>{const td=document.createElement('td');td.textContent=valor;tr.append(td);});
      return tr;
    }));
    $('modalPotencial').showModal();
  }

  function filaProyecto(p) {
    return {
      Código:p.codigo||'—',
      Tipo:p.tipo||'Proyecto',
      Nombre:p.nombre||'—',
      Departamento:p.departamento||'—',
      Provincia:p.provincia||'—',
      Distrito:p.distrito||p.detalle||'—',
      Estado:p.estado||p.detalle||'—',
      Avance:p.avance!==undefined?`${p.avance}%`:'—',
      'Longitud de red':p.longitud!==undefined?`${p.longitud} km`:'—',
      Latitud:Number.isFinite(p.lat)?p.lat.toFixed(5):'—',
      Longitud:Number.isFinite(p.lng)?p.lng.toFixed(5):'—'
    };
  }

  function obtenerAlcanceExportacion() {
    if(seleccionMapa.length){
      return {alcance:$('tituloSeleccion').textContent||'Selección realizada en el mapa',datos:seleccionMapa.map(item=>filaProyecto(ciudades.find(p=>p.codigo===item.codigo)||item))};
    }
    if(beneficiarioSeleccionadoMasificacion){
      return {alcance:'Beneficiario potencial seleccionado',datos:[filaProyecto(beneficiarioSeleccionadoMasificacion)]};
    }
    if(proyectoSeleccionado){
      return {alcance:'Proyecto seleccionado',datos:[filaProyecto(proyectoSeleccionado)]};
    }
    return {alcance:'Todos los proyectos filtrados',datos:filtrados().map(filaProyecto)};
  }

  function abrirModalExportacion() {
    const resultado=obtenerAlcanceExportacion();
    datosExportacionActual=resultado.datos;
    $('alcanceExportacionMasificacion').textContent=resultado.alcance;
    $('cantidadExportacionMasificacion').textContent=datosExportacionActual.length.toLocaleString('es-PE');
    $('descripcionExportacionMasificacion').textContent=`${resultado.alcance}. El archivo incluirá únicamente ${datosExportacionActual.length} registro(s).`;
    if($('modalPotencial').open)$('modalPotencial').close();
    $('modalExportacionMasificacion').showModal();
  }

  function descargarArchivo(contenido,nombre,tipo) {
    const enlace=document.createElement('a');
    enlace.href=URL.createObjectURL(new Blob([contenido],{type:tipo}));
    enlace.download=nombre;
    enlace.click();
    setTimeout(()=>URL.revokeObjectURL(enlace.href),800);
  }

  function exportarCsvMasificacion(datos) {
    const columnas=Object.keys(datos[0]||{Código:''});
    const escapar=v=>`"${String(v??'').replaceAll('"','""')}"`;
    const csv=[columnas.map(escapar).join(','),...datos.map(f=>columnas.map(c=>escapar(f[c])).join(','))].join('\n');
    descargarArchivo('\ufeff'+csv,'reporte_masificacion.csv','text/csv;charset=utf-8');
  }

  function exportarXlsxMasificacion(datos) {
    if(!window.XLSX){exportarCsvMasificacion(datos);return;}
    const libro=XLSX.utils.book_new(),hoja=XLSX.utils.json_to_sheet(datos);
    hoja['!cols']=Object.keys(datos[0]||{}).map(c=>({wch:Math.max(14,c.length+3)}));
    XLSX.utils.book_append_sheet(libro,hoja,'Masificación');
    XLSX.writeFile(libro,'reporte_masificacion.xlsx');
  }

  function exportarPdfMasificacion(datos) {
    if(!window.jspdf?.jsPDF){window.print();return;}
    const {jsPDF}=window.jspdf,doc=new jsPDF({orientation:'landscape'});
    const columnas=Object.keys(datos[0]||{Código:''});
    doc.setTextColor(28,42,72);doc.setFontSize(17);doc.text('MASIFICACIÓN · Reporte de selección',14,18);
    doc.setFontSize(9);doc.setTextColor(93,108,132);doc.text(`Alcance: ${$('alcanceExportacionMasificacion').textContent}`,14,25);
    doc.text(`Registros: ${datos.length} · Fecha: ${new Date().toLocaleDateString('es-PE')}`,14,31);
    doc.autoTable({startY:37,head:[columnas],body:datos.map(f=>columnas.map(c=>f[c])),styles:{fontSize:7,cellPadding:2},headStyles:{fillColor:[47,137,171]},alternateRowStyles:{fillColor:[239,246,250]}});
    doc.save('reporte_masificacion.pdf');
  }

  function confirmarExportacionMasificacion() {
    if(!datosExportacionActual.length)return;
    const formato=document.querySelector('input[name="formatoExportacionMasificacion"]:checked')?.value||'pdf';
    if(formato==='csv')exportarCsvMasificacion(datosExportacionActual);
    else if(formato==='xlsx')exportarXlsxMasificacion(datosExportacionActual);
    else exportarPdfMasificacion(datosExportacionActual);
    $('modalExportacionMasificacion').close();
  }

  function tipoInformeSupervisionActivo() {
    return document.querySelector('[data-tipo-supervision].activo')?.dataset.tipoSupervision || 'diario';
  }

  const evidenciasMovilSupervision = [
    {id:'movil-1',src:'documentos/evidencias-movil/evidencia-1.jpg',titulo:'Charla de seguridad',detalle:'Registro de inducción de la cuadrilla',incluida:true},
    {id:'movil-2',src:'documentos/evidencias-movil/evidencia-2.jpg',titulo:'Prueba de hermeticidad',detalle:'Carpa primaria · Cusco',incluida:true},
    {id:'movil-3',src:'documentos/evidencias-movil/evidencia-3.jpg',titulo:'Control de presión',detalle:'Línea PEAD · 7.8 bar',incluida:true},
    {id:'movil-4',src:'documentos/evidencias-movil/evidencia-4.jpg',titulo:'Frente secundario',detalle:'Verificación previa a gasificación',incluida:true},
    {id:'movil-5',src:'documentos/evidencias-movil/evidencia-5.jpg',titulo:'Lectura de manómetro',detalle:'Control georreferenciado',incluida:true},
    {id:'movil-6',src:'documentos/evidencias-movil/evidencia-6.jpg',titulo:'Área de trabajo',detalle:'Señalización y control de acceso',incluida:true}
  ];
  let evidenciasCargadasSupervision=[];

  function renderizarGaleriaSupervision() {
    const galeria=$('galeriaFotosSupervision');
    if(!galeria)return;
    const movil=evidenciasMovilSupervision.map(f=>`<article class="evidencia-movil ${f.incluida?'incluida':'descartada'}" data-evidencia-id="${f.id}"><div><img src="${f.src}" alt="${f.titulo}"><span>GPS · Cusco</span></div><footer><strong>${f.titulo}</strong><small>${f.detalle}</small><button type="button" aria-pressed="${f.incluida}">${f.incluida?'✓ Incluir':'Restaurar'}</button></footer></article>`).join('');
    const cargadas=evidenciasCargadasSupervision.map(f=>`<article class="evidencia-movil ${f.incluida?'incluida':'descartada'}" data-evidencia-id="${f.id}"><div><img src="${f.src}" alt="${f.titulo}"><span>CARGA MANUAL</span></div><footer><strong>${f.titulo}</strong><small>Fotografía agregada al informe</small><button type="button" aria-pressed="${f.incluida}">${f.incluida?'✓ Incluir':'Restaurar'}</button></footer></article>`).join('');
    galeria.innerHTML=movil+cargadas;
    galeria.querySelectorAll('[data-evidencia-id] button').forEach(b=>b.addEventListener('click',()=>{
      const id=b.closest('[data-evidencia-id]').dataset.evidenciaId;
      const foto=[...evidenciasMovilSupervision,...evidenciasCargadasSupervision].find(f=>f.id===id);
      if(foto)foto.incluida=!foto.incluida;
      renderizarGaleriaSupervision();
    }));
  }

  function cargarFotosManualesSupervision() {
    evidenciasCargadasSupervision.forEach(f=>URL.revokeObjectURL(f.src));
    evidenciasCargadasSupervision=[...($('supervisionFotos')?.files||[])].map((file,i)=>({id:`manual-${i}`,src:URL.createObjectURL(file),titulo:file.name,incluida:true,file}));
    renderizarGaleriaSupervision();
    $('estadoInformeSupervision').textContent=`${evidenciasCargadasSupervision.length} fotografía(s) manual(es) listas para revisar.`;
  }

  function configurarInformeSupervision(tipo) {
    document.querySelectorAll('[data-tipo-supervision]').forEach(b=>b.classList.toggle('activo',b.dataset.tipoSupervision===tipo));
    $('vistaInformeDiario').hidden=tipo!=='diario';
    $('vistaInformeSemanal').hidden=tipo!=='semanal';
    $('campoFechaSupervision').hidden=tipo!=='diario';
    $('campoPeriodoSupervision').hidden=tipo!=='semanal';
    $('supervisionNumero').value=tipo==='diario'?'END-IDT-RED-CU-259-G1-25-07-2026':'ISO-CU-REDES-039';
    $('estadoInformeSupervision').textContent=tipo==='diario'?'Informe diario listo para editar.':'Informe semanal listo para editar.';
  }

  function abrirInformesSupervision() {
    const selector=$('supervisionProyecto');
    selector.replaceChildren(...ciudades.map(p=>new Option(`${p.codigo} · ${p.nombre}`,p.codigo)));
    selector.value=proyectoSeleccionado?.codigo||ciudades[0]?.codigo||'';
    configurarInformeSupervision('diario');
    renderizarGaleriaSupervision();
    $('modalInformesSupervision').showModal();
  }

  function filasInformeSupervision(tipo) {
    const proyecto=ciudades.find(p=>p.codigo===$('supervisionProyecto').value)||proyectoActual();
    const base={Proyecto:`${proyecto.codigo} · ${proyecto.nombre}`,Departamento:proyecto.departamento,Provincia:proyecto.provincia,Distrito:proyecto.distrito,Informe:$('supervisionNumero').value};
    if(tipo==='diario') return [
      {...base,Sección:'Avance constructivo',Indicador:'Red construida',Valor:'24,994.94 ml',Estado:'Completado'},
      {...base,Sección:'Gasificación',Indicador:'Red gasificada',Valor:'19,277.37 ml',Estado:'En seguimiento'},
      {...base,Sección:'Observaciones',Indicador:'RNC abiertas / cerradas',Valor:'5 / 9',Estado:'14 total'},
      {...base,Sección:'Recursos',Indicador:'Personal / equipos',Valor:'29 / 6',Estado:'Registrado'},
      {...base,Sección:'Seguridad',Indicador:'Incidentes / accidentes',Valor:'0 / 0',Estado:'Sin novedades'},
      {...base,Sección:'Evidencias',Indicador:'Registro fotográfico',Valor:'22 fotos',Estado:'Georreferenciado'}
    ];
    return [
      {...base,Sección:'Avance contractual',Indicador:'Fase 1 + 2',Valor:'100%',Estado:'Concluido'},
      {...base,Sección:'Construcción',Indicador:'Red construida',Valor:'24,994.94 ml',Estado:'32 mallas'},
      {...base,Sección:'Gasificación',Indicador:'Red gasificada',Valor:'19,277.37 ml',Estado:'77.13%'},
      {...base,Sección:'Reposición',Indicador:'Metraje repuesto',Valor:'18,244.23 ml',Estado:'92.84%'},
      {...base,Sección:'Programación',Indicador:'SPI',Valor:'1.00',Estado:'Según programa'},
      {...base,Sección:'Pendiente',Indicador:'Gasificación restante',Valor:'5,717.57 ml',Estado:'Programado'},
      {...base,Sección:'Recursos',Indicador:'Personal',Valor:'44',Estado:'Registrado'}
    ];
  }

  function exportarSupervisionCsv() {
    const tipo=tipoInformeSupervisionActivo(),filas=filasInformeSupervision(tipo),columnas=Object.keys(filas[0]);
    const celda=v=>`"${String(v??'').replaceAll('"','""')}"`;
    descargarArchivo('\ufeff'+[columnas.map(celda).join(','),...filas.map(f=>columnas.map(c=>celda(f[c])).join(','))].join('\n'),`informe_supervision_${tipo}.csv`,'text/csv;charset=utf-8');
    $('estadoInformeSupervision').textContent='CSV generado correctamente.';
  }

  function recursoADataUrl(recurso) {
    if(recurso.file)return new Promise((resolve,reject)=>{const lector=new FileReader();lector.onload=()=>resolve(lector.result);lector.onerror=reject;lector.readAsDataURL(recurso.file);});
    return fetch(recurso.src).then(r=>r.blob()).then(blob=>new Promise((resolve,reject)=>{const lector=new FileReader();lector.onload=()=>resolve(lector.result);lector.onerror=reject;lector.readAsDataURL(blob);}));
  }

  async function exportarSupervisionPdf(evento) {
    if(evento&&!evento.isTrusted)return;
    if(!window.jspdf?.jsPDF){$('estadoInformeSupervision').textContent='No se pudo cargar el generador PDF.';return;}
    const tipo=tipoInformeSupervisionActivo(),proyecto=ciudades.find(p=>p.codigo===$('supervisionProyecto').value)||proyectoActual(),detalle=window.detalleIdtExportacion||{};
    const valor=id=>$(id)?.value?.trim()||'';
    const fecha=tipo==='diario'?valor('supervisionFecha'):valor('supervisionPeriodo');
    const titulo=tipo==='diario'?'INFORME DIARIO DE TRABAJO - IDT':'INFORME SEMANAL DE TRABAJO - ISO';
    const formato=tipo==='diario'?'END-FPY-FI-04':'END-FPY-FI-05';
    const {jsPDF}=window.jspdf,doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    $('estadoInformeSupervision').textContent='Generando el informe con los datos y fotografías seleccionadas...';
    const usarPlantillaComoFondo=false;
    if(tipo==='diario'&&usarPlantillaComoFondo){
      // Modo de referencia interna. El modo normal genera cada tabla de forma nativa,
      // sin usar la página de plantilla como imagen de fondo.
      const escribirCelda=(texto,x,y,ancho,alto,tamano=4.6,color=[255,255,255])=>{
        doc.setFillColor(...color);doc.rect(x,y,ancho,alto,'F');doc.setTextColor(18,18,18);doc.setFont('helvetica','normal');doc.setFontSize(tamano);
        doc.text(doc.splitTextToSize(String(texto||'—'),ancho-1).slice(0,Math.max(1,Math.floor(alto/(tamano+1)))),x+.8,y+tamano+.2);
      };
      try{
        for(let pagina=1;pagina<=3;pagina++){
          if(pagina>1)doc.addPage();
          const imagen=await recursoADataUrl({src:`../plantillas/idt-base-${pagina}.png`});
          doc.addImage(imagen,'PNG',0,0,210,297,undefined,'FAST');
          if(pagina!==1)continue;
          // Encabezado y datos que el contratista puede editar desde el formulario.
          escribirCelda(valor('supervisionNumero'),127,28.9,69,4.2,4.2,[255,255,0]);
          escribirCelda(valor('supervisionProyecto'),28.5,28.9,80,4.2,3.9);
          escribirCelda(valor('supervisionSupervisor'),28.5,33.5,52.5,3.5,3.9);
          escribirCelda(valor('supervisionContratista'),93.8,33.5,12,3.5,3.8);
          escribirCelda(valor('supervisionLugar'),127,33.5,69,3.5,3.2);
          escribirCelda(valor('supervisionCliente'),28.5,37.4,79.5,3.5,3.6);
          escribirCelda(fecha,127,37.4,69,3.5,3.8);
          // Celdas de control dentro de las secciones 3, 4 y 5 del formato END-FPY-FI-04.
          escribirCelda(detalle.rncAbiertas||'0',64,116.5,8,4.5,4.8);
          escribirCelda(detalle.rncCerradas||'0',64,121,8,4.5,4.8);
          escribirCelda(detalle.gestionTiempo||valor('supervisionConclusiones'),17,120,178,25,4);
          escribirCelda(detalle.temaSeguridad||detalle.charla||'—',86,149,108,3.5,4.2);
          escribirCelda(valor('supervisionPersonal'),88,236.7,10,3.5,4.8);
          escribirCelda(valor('supervisionEquipos'),88,266.4,10,3.5,4.8);
        }
        doc.save(`informe-diario-idt-${valor('supervisionNumero').replace(/[^a-z0-9-]+/gi,'_')}.pdf`);
        $('estadoInformeSupervision').textContent='PDF IDT de 3 hojas generado con el formato técnico y los datos editados.';
        return;
      }catch(error){console.warn('No se pudo cargar la plantilla IDT.',error);}
    }
    if(tipo==='diario'){
      // Hoja 1 construida como documento PDF: grilla, celdas combinadas y tablas nativas.
      // No se usa una captura de Excel ni una imagen de fondo.
      const azul=[91,142,211],naranja=[238,109,0],gris=[130,130,130],negro=[20,20,20];
      const borde=()=>{doc.setDrawColor(75);doc.setLineWidth(.10);};
      const rect=(x,y,w,h,relleno=null)=>{borde();if(relleno){doc.setFillColor(...relleno);doc.rect(x,y,w,h,'FD');}else doc.rect(x,y,w,h);};
      const texto=(valor,x,y,w,h,{tam=4.1,negrita=false,centrado=false,color=negro}={})=>{
        // Todas las celdas del formato técnico usan como mínimo 3 pt. Esto evita
        // mezclas de 2.6/2.7 pt en las subtablas de mano de obra.
        tam=Math.max(3,tam);
        doc.setTextColor(...color);doc.setFont('helvetica',negrita?'bold':'normal');doc.setFontSize(tam);
        // jsPDF recibe la fuente en puntos y las celdas están en milímetros. Convertimos
        // antes de calcular el número de líneas: el cálculo anterior comparaba unidades
        // distintas y por eso reducía/cortaba el texto de la sección 4.
        const altoLinea=tam*.3528*1.12;
        const lineas=doc.splitTextToSize(String(valor||'—'),Math.max(2,w-1.8)).slice(0,Math.max(1,Math.floor((h-1)/altoLinea)));
        const inicio=y+Math.min(h-.55,Math.max(tam*.3528*.86,(h-lineas.length*altoLinea)/2+tam*.3528*.8));
        doc.text(lineas,centrado?x+w/2:x+.9,inicio,{align:centrado?'center':'left',lineHeightFactor:1.12});
      };
      const celda=(x,y,w,h,valor,opciones={})=>{rect(x,y,w,h,opciones.relleno||null);texto(valor,x,y,w,h,opciones);};
      const banda=(numero,titulo,y)=>{celda(14,y,11,5,numero,{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:4.6});celda(25,y,171,5,titulo,{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:4.6});};
      const fechaCorta=fecha?new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'}):'—';
      let logoFise=null;
      try{logoFise=await recursoADataUrl({src:'../logo_fise.png'});}catch(error){console.warn('No se encontró logo FISE',error);}
      // Cabecera combinada
      rect(14,8,30,10);if(logoFise)doc.addImage(logoFise,'PNG',22,9,14,8,undefined,'FAST');else texto('FISE',14,8,30,10,{tam:5,negrita:true,centrado:true});
      celda(44,8,102,3,'FORMATO',{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:3});
      celda(44,11,102,7,'INFORME DIARIO DE TRABAJO - IDT',{negrita:true,centrado:true,tam:3.5});
      celda(146,8,50,3,'END-FPY-FI-04',{negrita:true,centrado:true,tam:3});
      celda(146,11,25,3.5,'Fecha',{centrado:true,tam:3});celda(171,11,25,3.5,fechaCorta,{centrado:true,tam:3});
      celda(146,14.5,25,3.5,'Versión',{centrado:true,tam:3});celda(171,14.5,25,3.5,'001',{centrado:true,tam:3});
      // Datos generales, con uniones equivalentes al formato END-FPY-FI-04.
      celda(14,19,11,9,'PROYECTO.',{relleno:gris,color:[255,255,255],negrita:true,centrado:true,tam:3.5});celda(25,19,82,9,valor('supervisionProyecto')||proyecto.nombre,{tam:3.6});
      celda(107,19,23,9,'N° INFORME',{relleno:gris,color:[255,255,255],negrita:true,centrado:true,tam:3.6});celda(130,19,66,9,valor('supervisionNumero'),{relleno:[240,255,0],tam:4.1});
      celda(14,28,11,6,'SUPERVISIÓN',{relleno:gris,color:[255,255,255],negrita:true,centrado:true,tam:3.1});celda(25,28,47,6,valor('supervisionSupervisor'),{tam:3.6});celda(72,28,16,6,'CONTRATISTA',{relleno:gris,color:[255,255,255],negrita:true,centrado:true,tam:3.1});celda(88,28,19,6,valor('supervisionContratista'),{tam:3.6});celda(107,28,23,6,'LUGAR DE SUPERVISIÓN',{relleno:gris,color:[255,255,255],negrita:true,centrado:true,tam:2.8});celda(130,28,66,6,valor('supervisionLugar'),{tam:3.1});
      celda(14,34,11,5,'CLIENTE',{relleno:gris,color:[255,255,255],negrita:true,centrado:true,tam:3.3});celda(25,34,47,5,valor('supervisionCliente'),{tam:3.1});celda(72,34,16,5,'HOJA',{relleno:gris,color:[255,255,255],negrita:true,centrado:true,tam:3.4});celda(88,34,19,5,'1 DE 3',{centrado:true,tam:3.5});celda(107,34,23,5,'FECHA DE EJECUCIÓN',{relleno:gris,color:[255,255,255],negrita:true,centrado:true,tam:2.9});celda(130,34,66,5,fechaCorta,{tam:3.3});
      celda(14,39,182,4,'ESPECIALIDAD CIVIL - MECÁNICA - ELÉCTRICA - INSTRUMENTACIÓN',{relleno:azul,color:[255,255,255],negrita:true,centrado:true,tam:3.8});
      banda('1','DESCRIPCIÓN DEL AVANCE CONSTRUCTIVO',43);
      // Dos imágenes de cronograma de la hoja técnica, situadas en sus propias celdas.
      celda(14,48,91,27,'',{tam:3});celda(105,48,91,27,'',{tam:3});
      try{const cronograma1=await recursoADataUrl({src:'../plantillas/avance-constructivo-1.jpg'});doc.addImage(cronograma1,'JPEG',15,49,89,25,undefined,'FAST');}catch(error){texto('Cronograma de actividades',14,48,91,27,{centrado:true,tam:3.5});}
      try{const cronograma2=await recursoADataUrl({src:'../plantillas/avance-constructivo-2.jpg'});doc.addImage(cronograma2,'JPEG',106,49,89,25,undefined,'FAST');}catch(error){texto(detalle.avanceConstructivo||valor('supervisionObservaciones'),105,48,91,27,{tam:3.2});}
      banda('2','RESUMEN EJECUTIVO - CONSTRUCCIÓN',75);
      // Sección 2: mismas filas combinadas, encabezados grises y comentarios del formato END.
      const filaResumen=(numero,y,alto,titulo,detalleFila,comentario)=>{celda(14,y,11,alto,numero,{centrado:true,negrita:true,tam:3});celda(25,y,85,4,titulo,{relleno:gris,color:[255,255,255],negrita:true,centrado:true,tam:3});celda(110,y,86,4,'Comentarios',{relleno:gris,color:[255,255,255],negrita:true,centrado:true,tam:3});celda(25,y+4,85,alto-4,detalleFila,{centrado:true,tam:3});celda(110,y+4,86,alto-4,comentario,{centrado:true,tam:3});};
      filaResumen('2.1',80,8,'Permisos para la ejecución del proyecto',detalle.permisos||'Permisos de la 2 da fase al 100%','Se firmó el acta de inicio de la 2 da fase 12-01-2026');
      filaResumen('2.1',88,7,'Recorrido informativo y difusión inicio de obra',detalle.recorrido||'-----','-----');
      filaResumen('2.3',95,10,'señalización y detección de interferencia',detalle.senalizacion||'Se realizó la señalización correspondiente de los trabajos de pruebas de gasificación y hermeticidad','-----');
      filaResumen('2.4',105,7,'Excavación de calicatas',detalle.excavacion||'-----','-----');
      const rncAbiertas=detalle.rncAbiertas||'5',rncCerradas=detalle.rncCerradas||'9',rncTotal=(Number(rncAbiertas)||0)+(Number(rncCerradas)||0);
      celda(14,112,11,10,'3.1',{centrado:true,negrita:true,tam:3});celda(25,112,19,10,'OBSERVACIONES\nAUDITORÍAS',{centrado:true,negrita:true,tam:3});celda(44,112,66,10,`RNC ABIERTAS                         ${rncAbiertas}\nRNC CERRADAS                        ${rncCerradas}\nTOTAL                                      ${rncTotal}`,{tam:3});celda(110,112,86,10,`RNC ABIERTAS                         ${rncAbiertas}\nRNC CERRADAS                        ${rncCerradas}\nTOTAL                                      ${rncTotal}`,{tam:3});
      celda(14,122,182,3,'Se recibió propuesta de Acción correctiva de los RNC: RNC 019 / RNC 020 / RNC 021 / RNC 023 / RNC 024 se encuentran abiertas y sin subsanar.',{tam:3});
      const gestionBase=`Nagasco ejecutó, en turno Diurno y nocturno
-NGC realizó trabajos de prueba de presión del proyecto GN-LM-PE-MSJ-S000500-MA-001(Finalizado), GN-LM-PE-MSJ-S000400-MA-006(Iniciado), GN-LM-PE-MSJ-S000400-MA-000-03/S000200-MA-000/S000500-MA-000/S000300-MA-000(Finalizado) troncal
-NGC realizó trabajos de gasificación de 10 proyectos: GN-LM-PE-MSJ-S000400-MA-000-03/S000200-MA-000/S000500-MA-000/S000300-MA-000/S000300-MA-001/S000300-MA-002/S000300-MA-003/S000300-MA-004/S000200-MA-001/S000500-MA-003
Se informa que los indicadores de avance se presentan sobre el metrado asignado vigente del proyecto, el cual se actualiza progresivamente conforme al avance de la instalación y a la incorporación de tramos ejecutados; en consecuencia, los porcentajes de avance se calculan respecto al metrado asignado vigente, que a la fecha asciende a 25,000.52 ml.
24,400.27 ml → respaldado por la Carta N.° 01356-2026-FISE.
24,994.94 ml → metrado asignado vigente/final sobre el cual se calcularon los indicadores al cierre de la construcción.
Asimismo, se precisa que a la fecha se ha culminado la ejecución de las obras de construcción del proyecto, incluyendo los tramos de reubicación incorporados al metrado asignado vigente; en adelante, los reportes reflejarán únicamente las actividades pendientes para el cierre del proyecto.`;
      // El texto de gestión corresponde al registro entregado para esta hoja del IDT.
      banda('4','GESTIÓN DEL TIEMPO (CRONOGRAMA)',125);celda(14,130,182,26,gestionBase,{tam:3});
      banda('5','SEGURIDAD',162);
      celda(14,167,9,9,'5.1',{centrado:true,negrita:true,tam:3.5});celda(23,167,39,4,'CHARLA DE SEGURIDAD',{negrita:true,tam:3.3});celda(62,167,7,4,'X',{centrado:true,negrita:true,tam:3.5});celda(23,171,39,5,'CAPACIDAD        :',{negrita:true,tam:3.1});celda(62,171,7,5,'',{tam:3});
      celda(69,167,7,9,'5.3',{centrado:true,negrita:true,tam:3.5});celda(76,167,120,9,'TEMA    :    "Duelo distracción", EXPOSITORES Omar Edinson Chamorro\n----------',{tam:3.1});
      celda(14,176,9,5,'5.2',{centrado:true,negrita:true,tam:3.3});celda(23,176,46,2.5,`INCIDENTES                 SÍ      □       NO      ☒`,{negrita:true,tam:2.7});celda(69,176,127,2.5,'Describir si aplica:  ----------',{negrita:true,tam:2.7});celda(23,178.5,46,2.5,`ACCIDENTES                SÍ      □       NO      ☒`,{negrita:true,tam:2.7});celda(69,178.5,127,2.5,'Describir si aplica:  ----------',{negrita:true,tam:2.7});
      // La versión compacta queda desactivada: la mano de obra requiere las dos
      // subtablas de observaciones del formato técnico.
      if(true){
      banda('6','MANO DE OBRA - CONTRATISTA',181);
      const personalTotal=Math.max(0,Number(valor('supervisionPersonal'))||0),personalCivil=Math.max(0,personalTotal-8),equiposTotal=Math.max(0,Number(valor('supervisionEquipos'))||0),minicargadores=Math.max(0,equiposTotal-3);
      const mano=[['1','RESIDENTE','1'],['2','PREVENCIONISTA','1'],['3','SUPERVISOR DE CONTROL CALIDAD','1'],['4','TOPÓGRAFO','0'],['5','RELACIONISTA COMUNITARIO','1'],['6','PERSONAL CIVIL',personalCivil],['7','CAPATAZ','1'],['8','SUPERVISOR CONSTRUCTIVO','1'],['9','OPERADOR','3'],['10','FUSIONISTA','1'],['11','ARQUEÓLOGA','1']];
      celda(14,186,10,4,'ITEM',{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:2.7});celda(24,186,60,4,'DESCRIPCIÓN',{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:2.7});celda(84,186,18,4,'UNIDAD',{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:2.7});celda(102,186,10,4,'CANT.',{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:2.7});celda(112,186,42,4,'PRUEBAS / HERMETICIDAD',{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:2.7});celda(154,186,42,4,'GASIFICACIÓN',{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:2.7});
      mano.forEach((fila,i)=>{const yy=190+i*3.2;celda(14,yy,10,3.2,fila[0],{centrado:true,tam:2.7});celda(24,yy,60,3.2,fila[1],{tam:2.7});celda(84,yy,18,3.2,'Und.',{centrado:true,tam:2.7});celda(102,yy,10,3.2,String(fila[2]),{centrado:true,tam:2.7});});
      celda(112,190,42,35.2,'GRUPO DE PRUEBAS - HERMETICIDAD\nGN-LM-PE-MSJ-S000400-MA-000-03/S000200-MA-000\nExtensión de red 25 mm: 3258.85 ml\nCP Final 7.8Bar · 16°C\nCS Final 7.8Bar · 13°C\n\nGN-LM-PE-MSJ-S000500-MA-001\nExtensión de red 25 mm: 547.57 ml\n\nGN-LM-PE-MSJ-S000400-MA-006\nExtensión de red 25 mm: 1345.54 ml',{tam:2.7,negrita:true});
      celda(154,190,42,35.2,'GRUPO DE GASIFICACIÓN\nGN-LM-PE-MSJ-S000300-MA-001 · 1891.44 ml\nGN-LM-PE-MSJ-S000300-MA-002 · 1668.30 ml\nGN-LM-PE-MSJ-S000300-MA-003 · 1390.10 ml\nGN-LM-PE-MSJ-S000300-MA-004 · 1497.26 ml\nGN-LM-PE-MSJ-S000200-MA-001 · 1104.71 ml\nGN-LM-PE-MSJ-S000500-MA-003 · 1903.25 ml\nGasificación 100% de metano · 4.5 bar',{tam:2.7,negrita:true});
      celda(14,225.2,98,4,'Total',{negrita:true,centrado:true,tam:2.7});celda(102,225.2,10,4,String(personalTotal),{negrita:true,centrado:true,tam:2.7});celda(112,225.2,84,4,'Tubería instalada y zanja excavada · Fase 2: 100% · Fase 1 - Fase 2: 100%.',{tam:2.7});
      banda('7','NAGASCO - EQUIPOS',229.2);const equipos=[['1','RETROEXCAVADORA','0'],['2','CORTADORA','1'],['3','MINICARGADOR',minicargadores],['4','CANGURO','2'],['5','RODILLO','0']];celda(14,234.2,10,4,'ITEM',{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:3.1});celda(24,234.2,60,4,'DESCRIPCIÓN DE EQUIPOS',{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:3.1});celda(84,234.2,18,4,'UNIDAD',{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:3.1});celda(102,234.2,10,4,'CANT.',{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:3.1});celda(112,234.2,84,4,'OBSERVACIONES',{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:3.1});equipos.forEach((fila,i)=>{const yy=238.2+i*3.6;celda(14,yy,10,3.6,fila[0],{centrado:true,tam:2.9});celda(24,yy,60,3.6,fila[1],{tam:2.9});celda(84,yy,18,3.6,'Und.',{centrado:true,tam:2.9});celda(102,yy,10,3.6,String(fila[2]),{centrado:true,tam:2.9});celda(112,yy,84,3.6,'—',{centrado:true,tam:2.9});});celda(14,256.2,98,4,'Total',{negrita:true,centrado:true,tam:3.3});celda(102,256.2,10,4,String(equiposTotal),{negrita:true,centrado:true,tam:3.3});celda(112,256.2,84,4,'—',{centrado:true,tam:3.1});
      banda('8','PERSONAL',260.2);celda(14,265.2,91,4,'SUPERVISIÓN END PERÚ S.A.C.',{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:3.3});celda(105,265.2,91,4,'SUPERVISIÓN F.I.S.E.',{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:3.3});celda(14,269.2,91,20,'',{tam:3});celda(105,269.2,91,20,'',{tam:3});doc.line(25,285,82,285);doc.line(116,285,184,285);texto(valor('supervisionSupervisor')||'Responsable de supervisión',25,286,57,3,{negrita:true,tam:3.2,centrado:true});texto('Representante FISE',116,286,68,3,{negrita:true,tam:3.2,centrado:true});
      }

      // Referencia ampliada, sin emitir: la sección 6 compacta se muestra en la hoja 1.
      if(false){
      // Hoja 2: mano de obra con sus dos subtablas de pruebas y gasificación.
      doc.addPage();
      banda('6','MANO DE OBRA - CONTRATISTA',10);
      const personalTotal=Math.max(0,Number(valor('supervisionPersonal'))||0),personalCivil=Math.max(0,personalTotal-8),equiposTotal=Math.max(0,Number(valor('supervisionEquipos'))||0),minicargadores=Math.max(0,equiposTotal-3);
      const mano=[['1','RESIDENTE','1'],['2','PREVENCIONISTA','1'],['3','SUPERVISOR DE CONTROL DE CALIDAD','1'],['4','TOPÓGRAFO','0'],['5','RELACIONISTA COMUNITARIO','1'],['6','PERSONAL CIVIL',personalCivil],['7','CAPATAZ','1'],['8','SUPERVISOR CONSTRUCTIVO','1'],['9','OPERADOR','3'],['10','FUSIONISTA','1'],['11','ARQUEÓLOGA','1']];
      const columnas=[['ITEM',14,12],['DESCRIPCIÓN',26,65],['UNIDAD',91,18],['CANTIDAD',109,12]];
      columnas.forEach(([titulo,x,ancho])=>celda(x,15,ancho,5,titulo,{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:5}));
      celda(121,15,75,5,'OBSERVACIONES',{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:5});
      const altoMano=101;
      celda(121,20,37.5,altoMano,`GRUPO DE PRUEBAS - HERMETICIDAD\nGN-LM-PE-MSJ-S000400-MA-000-03/S000200-MA-000/S000500-MA-000/S000300-MA-000\nExtensión de red 25 mm: 3258.85 ml + PP:10.0 ml\n  Final       P          T°\nCP Final     7.8Bar     16°C\nCS Final     7.8Bar     13°C\nPrueba de 24 Horas\n\nGN-LM-PE-MSJ-S000500-MA-001\nExtensión de red 25 mm: 547.57 ml + PP:12.50 ml\n  Final       P          T°\nCP Final     8.1Bar     11°C\nCS Final     8.1Bar     14°C\n\nGN-LM-PE-MSJ-S000400-MA-006\nExtensión de red 25 mm: 1345.54 ml + PP:10.0 ml\nInicio       P          T°\nCP Inicio    8.1Bar     24°C\nCS Inicio    8.1Bar     24°C`,{tam:4.1,negrita:true});
      celda(158.5,20,37.5,altoMano,`GRUPO DE GASIFICACIÓN\nGN-LM-PE-MSJ-S000400-MA-000-03/S000200-MA-000/S000500-MA-000/S000300-MA-000\nExtensión de red 200-110 mm:3257.05\nGasificación 100% de metano(CH4)\npresión de red:4.5bar\nGN-LM-PE-MSJ-S000300-MA-001\nExtensión de red 25 mm:1891.44 ml\nGasificación 100% de metano(CH4)\npresión de red:4.5bar\nGN-LM-PE-MSJ-S000300-MA-002\nExtensión de red 25 mm:1668.30 ml\nGasificación 100% de metano(CH4)\npresión de red:4.5bar\nGN-LM-PE-MSJ-S000300-MA-003\nExtensión de red 25 mm:1390.10 ml\nGasificación 100% de metano(CH4)\npresión de red:4.5bar\nGN-LM-PE-MSJ-S000300-MA-004\nExtensión de red 25 mm:1497.26 ml\nGasificación 100% de metano(CH4)\npresión de red:4.5bar\nGN-LM-PE-MSJ-S000200-MA-001\nExtensión de red 25 mm:1104.71 ml\nGasificación 100% de metano(CH4)\npresión de red:4.5bar\nGN-LM-PE-MSJ-S000500-MA-003\nExtensión de red 25 mm:1903.25 ml\nGasificación 100% de metano(CH4)`,{tam:3.75,negrita:true});
      mano.forEach((fila,i)=>{const y=20+i*7.2,h=i===10?29:7.2;celda(14,y,12,h,fila[0],{centrado:true,tam:5});celda(26,y,65,h,fila[1],{tam:5});celda(91,y,18,h,'Und.',{centrado:true,tam:5});celda(109,y,12,h,String(fila[2]),{centrado:true,tam:5});});
      celda(14,121,95,19,'Total',{centrado:true,negrita:true,tam:6});celda(109,121,12,19,String(personalTotal),{centrado:true,negrita:true,tam:6});celda(121,121,37.5,5,'TUBERÍA INSTALADA Y ZANJA EXCAVADA:',{negrita:true,tam:4.6});celda(158.5,121,37.5,5,'Total de reposición:  —',{negrita:true,tam:4.6});celda(121,126,75,14,'FASE 2 GENERAL\nAcumulado : ((24029.74/24029.76)*100)= 100%\n\nFASE 1 - FASE 2\nAcumulado : ((24994.94/24029.76)*100)= 100%',{centrado:true,tam:4.4});
      banda('7','NAGASCO - EQUIPOS',143);celda(14,148,12,5,'ITEM',{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:4.7});celda(26,148,83,5,'DESCRIPCIÓN DE EQUIPOS',{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:4.7});celda(109,148,12,5,'CANT.',{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:4.7});celda(121,148,75,5,'OBSERVACIONES',{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:4.7});
      const equipos=[['1','RETROEXCAVADORA','0'],['2','CORTADORA','1'],['3','MINICARGADOR',minicargadores],['4','CANGURO','2'],['5','RODILLO','0']];equipos.forEach((fila,i)=>{const y=153+i*5;celda(14,y,12,5,fila[0],{centrado:true,tam:4.5});celda(26,y,83,5,fila[1],{tam:4.5});celda(109,y,12,5,String(fila[2]),{centrado:true,tam:4.5});celda(121,y,75,5,'-----',{centrado:true,tam:4.5});});celda(14,178,95,5,'Total',{centrado:true,negrita:true,tam:5});celda(109,178,12,5,String(equiposTotal),{centrado:true,negrita:true,tam:5});celda(121,178,75,5,'-----',{centrado:true,tam:4.5});
      banda('8','PERSONAL',186);celda(14,191,91,5,'SUPERVISIÓN END PERÚ S.A.C.',{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:4.7});celda(105,191,91,5,'SUPERVISIÓN F.I.S.E.',{relleno:azul,color:[255,255,255],centrado:true,negrita:true,tam:4.7});celda(14,196,91,47,'',{tam:3});celda(105,196,91,47,'',{tam:3});doc.line(25,231,82,231);doc.line(116,231,184,231);texto(valor('supervisionSupervisor')||'Responsable de supervisión',25,233,57,4,{negrita:true,tam:5,centrado:true});texto('Representante FISE',116,233,68,4,{negrita:true,tam:5,centrado:true});
      }
      // Hojas 2 y 3: registro fotográfico con imágenes extraídas de la plantilla real.
      const fotos=[];for(const pagina of [2,3])for(let fila=1;fila<=4;fila++)for(let columna=1;columna<=3;columna++){try{fotos.push(await recursoADataUrl({src:`../plantillas/fotos/idt-${pagina}-${fila}-${columna}.jpg`}));}catch{}}
      for(let hoja=0;hoja<2;hoja++){doc.addPage();celda(14,8,182,5,'REGISTRO FOTOGRÁFICO',{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:4.8});celda(14,13,182,4,`INFORME DIARIO DE TRABAJO - IDT · HOJA ${hoja+2} DE 3`,{relleno:azul,color:[255,255,255],negrita:true,centrado:true,tam:3.5});for(let i=0;i<12;i++){const indice=hoja*12+i,col=i%3,fila=Math.floor(i/3),x=14+col*61,y=19+fila*63;rect(x,y,59,63);if(fotos[indice]){try{doc.addImage(fotos[indice],'JPEG',x+1,y+1,57,46,undefined,'FAST');}catch{}}celda(x,y+47,59,16,`${indice+1}. Evidencia de campo\nRegistro fotográfico de obra`,{relleno:gris,color:[255,255,255],tam:3});}celda(14,282,91,5,'SUPERVISIÓN END PERÚ S.A.C.',{relleno:azul,color:[255,255,255],centrado:true,tam:3.1});celda(105,282,91,5,'SUPERVISIÓN F.I.S.E.',{relleno:azul,color:[255,255,255],centrado:true,tam:3.1});}
      doc.save(`informe-diario-idt-${valor('supervisionNumero').replace(/[^a-z0-9-]+/gi,'_')}.pdf`);
      $('estadoInformeSupervision').textContent='PDF IDT de 3 hojas generado con grilla nativa y fotografías de la plantilla.';
      return;
    }
    if(tipo==='semanal'){
      // Formato ISO END-FPY-FI-05 construido como tablas PDF nativas.
      // Mantiene la estructura de la hoja semanal: cabecera, resumen, restricciones,
      // avance por especialidad, entregables y firmas; no utiliza una captura como fondo.
      const azul=[84,140,210],naranja=[255,102,0],gris=[133,133,133],negro=[18,18,18];
      const borde=()=>{doc.setDrawColor(100);doc.setLineWidth(.12);};
      const caja=(x,y,w,h,relleno=null)=>{borde();if(relleno){doc.setFillColor(...relleno);doc.rect(x,y,w,h,'FD');}else doc.rect(x,y,w,h);};
      const textoSemanal=(contenido,x,y,w,h,{tam=3.3,negrita=false,centrado=false,color=negro}={})=>{
        doc.setTextColor(...color);doc.setFont('helvetica',negrita?'bold':'normal');doc.setFontSize(Math.max(3,tam));
        const interlineado=Math.max(1.18,tam*.3528*1.08),lineas=doc.splitTextToSize(String(contenido||'-'),Math.max(2,w-1.8));
        const visibles=lineas.slice(0,Math.max(1,Math.floor((h-1)/interlineado)));
        const inicio=y+Math.max(tam*.3528*.9,(h-visibles.length*interlineado)/2+tam*.3528*.82);
        doc.text(visibles,centrado?x+w/2:x+.9,inicio,{align:centrado?'center':'left',lineHeightFactor:1.08});
      };
      let desplazarContenidoHojaUno=false;
      const celdaSemanal=(x,y,w,h,contenido,opciones={})=>{if(desplazarContenidoHojaUno){if(y>=75&&y<153)y-=20;else if(y>=153&&y<229)y-=34;}caja(x,y,w,h,opciones.relleno||null);textoSemanal(contenido,x,y,w,h,opciones);};
      const bandaSemanal=(romano,titulo,y)=>{celdaSemanal(14,y,182,5,`${romano}                                      ${titulo}`,{relleno:azul,color:[255,255,255],negrita:true,centrado:true,tam:4.1});};
      const fechaBonita=fecha||'03/08/2026 - 09/08/2026';
      const partesPeriodo=fechaBonita.split(/[–-]/).map(p=>p.trim());
      const personal=Math.max(0,Number(valor('supervisionPersonal'))||44),incidentes=valor('supervisionIncidentes')||'0',accidentes=valor('supervisionAccidentes')||'0';
      const avanceCivil=valor('supervisionAvanceCivil')||'100.00%',avanceMecanico=valor('supervisionAvanceMecanico')||'100.00%';
      const restriccionesPredeterminadas=`Actualmente la contratista cuenta con un grupo de reposición, realizando trabajos de las siguientes mallas (S000400-MA-000-04 / S000400-MA-002 / S000300-MA-000 / S000400-MA-000-03 / S000500-MA-000 / S000500-MA-001 / S000500-MA-002 / S000500-MA-003 / S000400-MA-000-02), actualmente se encuentra con retrasos de reposición en asfalto 1,295.15 ml, y concreto pendiente de reponer 111.85 ml la cual está aun dentro de los días hábiles por reponer.\nSin embargo la malla S000300-MA-004 se encuentra observado los trabajos de reposición de una longitud de 76.7 ml (trabajos de la semana 21), de igual manera la malla S000200-MA-002 se encuentra observado los trabajos de reposición de una longitud de 100.0 ml (trabajos de la semana 25); en ese sentido la reposición pendiente de asfalto y rígido asciende en 1,407.00 ml por reponer. El proyecto S000200-MA-002 / S000300-MA-004 cuenta con no conformidad por reposición de asfalto en temperaturas bajas.\n- NGC viene realizando trabajos de reposición de pavimento flexible, rígido y levantamiento de observaciones; el 04-08-26 la mezcla asfáltica fue observado y rechazado por NGC.\n- El 08/09-08-2026 se tenía programado trabajos de reposición de asfalto; por inconvenientes técnicos de los proveedores de NGC no se llegó a realizar los trabajos.\n- Conforme a la Carta N.° 01356-2026-FISE, se aprobó la modificación del trazo mediante la desestimación de determinados tramos, actualizándose el metrado asignado del proyecto para el seguimiento de los indicadores de avance.\n- En esta semana la contratista no ha presentado ninguna factura o presupuesto de valorización ejecutado.`;
      const restricciones=detalle.gestionTiempo||valor('supervisionConclusiones')||restriccionesPredeterminadas;
      let logoFiseSemanal=null;try{logoFiseSemanal=await recursoADataUrl({src:'../logo_fise.png'});}catch(error){console.warn('Logo FISE no disponible',error);}
      const cabeceraSemanal=(hoja)=>{
        celdaSemanal(14,8,42,14,'',{tam:3});
        doc.setTextColor(...naranja);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('END',20,16);
        if(logoFiseSemanal)doc.addImage(logoFiseSemanal,'PNG',45,9,7,11,undefined,'FAST');else{doc.setTextColor(20);doc.setFontSize(6);doc.text('FISE',44,16);}
        celdaSemanal(56,8,92,3,'FORMATO',{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:3.3});
        celdaSemanal(56,11,92,11,'INFORME SEMANAL DE TRABAJO - ISO',{negrita:true,centrado:true,tam:3.6});
        celdaSemanal(148,8,48,3,'END-FPY-FI-05',{negrita:true,centrado:true,tam:3});
        celdaSemanal(148,11,24,3,'Fecha',{centrado:true,tam:2.7});celdaSemanal(172,11,24,3,partesPeriodo[0]||fechaBonita,{centrado:true,tam:2.7});
        celdaSemanal(148,14,24,3,'Versión',{centrado:true,tam:2.7});celdaSemanal(172,14,24,3,'001',{centrado:true,tam:2.7});
        celdaSemanal(148,17,24,5,'HOJA',{relleno:gris,color:[255,255,255],negrita:true,centrado:true,tam:2.8});celdaSemanal(172,17,24,5,`${hoja} DE 4`,{centrado:true,tam:2.8});
      };
      const pieSemanal=()=>{doc.setDrawColor(80);doc.line(14,289,196,289);doc.setFont('helvetica','normal');doc.setFontSize(4.5);doc.setTextColor(70);doc.text(`${valor('supervisionSupervisor')} - ${valor('supervisionCliente')}`,14,293);doc.text(valor('supervisionNumero'),196,293,{align:'right'});};
      const datosGenerales=(hoja)=>{
        cabeceraSemanal(hoja);
        celdaSemanal(14,22,23,7,'PROYECTO:',{relleno:gris,color:[255,255,255],negrita:true,tam:2.9});celdaSemanal(37,22,70,7,proyecto.nombre||valor('supervisionProyecto'),{tam:2.9});
        celdaSemanal(107,22,37,7,'CONTRATISTA:',{relleno:gris,color:[255,255,255],negrita:true,tam:2.9});celdaSemanal(144,22,52,7,valor('supervisionContratista'),{tam:3});
        celdaSemanal(14,29,23,6,'SUPERVISIÓN:',{relleno:gris,color:[255,255,255],negrita:true,tam:2.9});celdaSemanal(37,29,70,6,valor('supervisionSupervisor'),{tam:3});
        celdaSemanal(107,29,37,6,'LUGAR DE SUPERVISIÓN:',{relleno:gris,color:[255,255,255],negrita:true,tam:2.6});celdaSemanal(144,29,52,6,valor('supervisionLugar'),{tam:2.7});
        celdaSemanal(14,35,23,4,'CLIENTE:',{relleno:gris,color:[255,255,255],negrita:true,tam:2.8});celdaSemanal(37,35,70,4,valor('supervisionCliente'),{tam:2.7});celdaSemanal(107,35,37,4,'FECHA DEL INFORME:',{relleno:gris,color:[255,255,255],negrita:true,tam:2.6});celdaSemanal(144,35,52,4,fechaBonita,{tam:2.7});
        celdaSemanal(14,39,23,4,'PLAZO:',{relleno:gris,color:[255,255,255],negrita:true,tam:2.8});celdaSemanal(37,39,45,4,'270 días',{tam:2.8});celdaSemanal(82,39,14,4,'HOJA',{relleno:gris,color:[255,255,255],negrita:true,centrado:true,tam:2.7});celdaSemanal(96,39,11,4,`${hoja} DE 4`,{centrado:true,tam:2.7});celdaSemanal(107,39,37,4,'MONTO CONTRACTUAL:',{relleno:gris,color:[255,255,255],negrita:true,tam:2.6});celdaSemanal(144,39,52,4,'$ 5,552,825.29 + IGV',{tam:2.8});
        celdaSemanal(14,43,23,4,'AVANCE FASE 1 - FASE 2:',{relleno:gris,color:[255,255,255],negrita:true,tam:2.4});celdaSemanal(37,43,18,4,avanceCivil,{centrado:true,negrita:true,tam:2.7});celdaSemanal(55,43,32,4,'AVANCE FASE 2:',{relleno:gris,color:[255,255,255],negrita:true,centrado:true,tam:2.5});celdaSemanal(87,43,20,4,avanceMecanico,{centrado:true,negrita:true,tam:2.7});celdaSemanal(107,43,37,4,'N° INFORME:',{relleno:gris,color:[255,255,255],negrita:true,tam:2.6});celdaSemanal(144,43,52,4,valor('supervisionNumero'),{relleno:[240,255,0],tam:3});
        celdaSemanal(14,47,23,4,'AVANCE PRUEBAS DE HERMETICIDAD:',{relleno:gris,color:[255,255,255],negrita:true,tam:2.3});celdaSemanal(37,47,70,4,avanceMecanico,{centrado:true,negrita:true,tam:2.7});celdaSemanal(107,47,37,4,'PERIODO (DEL - AL):',{relleno:gris,color:[255,255,255],negrita:true,tam:2.6});celdaSemanal(144,47,26,4,partesPeriodo[0]||fechaBonita,{centrado:true,tam:2.5});celdaSemanal(170,47,26,4,partesPeriodo[1]||fechaBonita,{centrado:true,tam:2.5});
      };
      datosGenerales(1);desplazarContenidoHojaUno=false;
      bandaSemanal('I','RESUMEN DE OBRA',54);
      const encabezado=(x,y,w,titulo,columnas)=>{celdaSemanal(x,y,w,2.5,titulo,{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:2.5});columnas.forEach(c=>celdaSemanal(c.x,y,c.w,2.5,c.titulo,{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:2.4}));};
      encabezado(18,60,78,'COMUNICACIONES',[{x:55,w:16,titulo:'EMITIDOS'},{x:71,w:25,titulo:'RESPONDIDOS'}]);
      [['Requerimiento de información (RFI)','0','000'],['Comunicación NAGASCO - END','6','6'],['Comunicación END - FISE','4','4']].forEach((r,i)=>{const y=62.5+i*2.5;celdaSemanal(18,y,37,2.5,r[0],{centrado:true,tam:2.4});celdaSemanal(55,y,16,2.5,r[1],{centrado:true,tam:2.4});celdaSemanal(71,y,25,2.5,r[2],{centrado:true,tam:2.4});});
      encabezado(102,60,82,'SEGURIDAD Y SALUD LABORAL',[{x:142,w:14,titulo:'ANTER.'},{x:156,w:14,titulo:'ACTUAL'},{x:170,w:14,titulo:'ACUM.'}]);
      [['Accidentes','0',accidentes,accidentes],['Incidentes','2',incidentes,'2'],['Días perdidos','000','000','000']].forEach((r,i)=>{const y=62.5+i*2.5;celdaSemanal(102,y,40,2.5,r[0],{centrado:true,tam:2.4});celdaSemanal(142,y,14,2.5,r[1],{centrado:true,tam:2.4});celdaSemanal(156,y,14,2.5,r[2],{centrado:true,tam:2.4});celdaSemanal(170,y,14,2.5,r[3],{centrado:true,tam:2.4});});
      encabezado(18,70.5,78,'MANO DE OBRA',[{x:55,w:16,titulo:'NAGASCO'},{x:71,w:25,titulo:'SUB. CONTRAT.'}]);
      [['Mano de obra directa',String(personal),'0'],['Mano de obra Staff','9','0'],['TOTAL DE PERSONAS EN OBRA',String(personal+9),'0']].forEach((r,i)=>{const y=73+i*2.5;celdaSemanal(18,y,37,2.5,r[0],{centrado:true,negrita:i===2,tam:2.4});celdaSemanal(55,y,16,2.5,r[1],{centrado:true,negrita:i===2,tam:2.4});celdaSemanal(71,y,25,2.5,r[2],{centrado:true,negrita:i===2,tam:2.4});});
      encabezado(102,70.5,82,'MEDIO AMBIENTE',[{x:142,w:14,titulo:'ANTER.'},{x:156,w:14,titulo:'ACTUAL'},{x:170,w:14,titulo:'ACUM.'}]);
      celdaSemanal(102,73,40,2.5,'Accidentes',{centrado:true,tam:2.4});celdaSemanal(142,73,14,2.5,'000',{centrado:true,tam:2.4});celdaSemanal(156,73,14,2.5,'000',{centrado:true,tam:2.4});celdaSemanal(170,73,14,2.5,'000',{centrado:true,tam:2.4});
      bandaSemanal('II','CONTROL DE PROYECTO - RESTRICCIONES',82);
      celdaSemanal(14,87,182,13,restricciones,{tam:2.8});
      celdaSemanal(14,105,9,4,'2.1',{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:3});celdaSemanal(23,105,70,4,'PARTE CIVIL',{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:3});celdaSemanal(93,105,18,4,'% DE AVANCE',{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:2.7});
      const civil=[['2.1.1','Recorrido informativo y inicio de obra','100.00%'],['2.1.2','Señalización y detección de interferencia','100.00%'],['2.1.3','Excavación de calicatas','100.00%'],['2.1.4','Corte de pavimento','100.00%'],['2.1.5','Rotura y demolición de pavimento','100.00%'],['2.1.6','Excavación de zanja','100.00%'],['2.1.7','Bajado de tubería','100.00%'],['2.1.8','Relleno','100.00%'],['2.1.9','Compactación de base y sub base','99.70%'],['2.1.10','Reposición de pavimento','92.84%']];
      civil.forEach((r,i)=>{const y=109+i*3.5;celdaSemanal(14,y,9,3.5,r[0],{centrado:true,tam:2.6});celdaSemanal(23,y,70,3.5,r[1],{tam:2.6});celdaSemanal(93,y,18,3.5,r[2],{centrado:true,tam:2.6});});
      celdaSemanal(117,105,9,4,'2.2',{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:3});celdaSemanal(126,105,51,4,'PARTE MECÁNICA',{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:3});celdaSemanal(177,105,19,4,'% DE AVANCE',{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:2.7});celdaSemanal(117,109,9,4,'2.2.1',{centrado:true,tam:2.6});celdaSemanal(126,109,51,4,'Soldadura de tubería PE',{tam:2.7});celdaSemanal(177,109,19,4,'100.00%',{centrado:true,tam:2.7});
      celdaSemanal(117,113,9,4,'2.3',{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:3});celdaSemanal(126,113,51,4,'PRUEBA DE HERMETICIDAD',{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:2.9});celdaSemanal(177,113,19,4,'% DE AVANCE',{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:2.6});celdaSemanal(117,117,9,4,'2.3.1',{centrado:true,tam:2.6});celdaSemanal(126,117,51,4,'Prueba de hermeticidad (24 horas)',{tam:2.6});celdaSemanal(177,117,19,4,'100.00%',{centrado:true,tam:2.7});
      celdaSemanal(117,121,79,5,'Comentarios:  Mallas intervenidas durante el período. Grupo de reposición y control de calidad en seguimiento.',{tam:2.6});
      celdaSemanal(117,126,79,15,'GRUPO DE REPOSICIÓN\nGN-LM-PE-MSJ-S000400-MA-004        ML repuesto: 28.70 ml\nGN-LM-PE-MSJ-S000400-MA-002        ML repuesto: 14.00 ml\nGN-LM-PE-MSJ-S000300-MA-000        ML repuesto: 366.94 ml\nTotal semanal repuesto: 601.70 ml',{negrita:true,tam:2.6});
      celdaSemanal(23,145,88,4,'2.4                                      GASIFICACIÓN',{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:3});celdaSemanal(111,145,85,4,'% DE AVANCE',{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:2.7});
      [['2.4.1','Excavación, relleno y compactación de base y sub base','70.00%'],['2.4.2','Reposición de pavimento','50.00%'],['2.4.3','Limpieza de obra','50.00%'],['2.4.4','Entrega de obra','0.00%']].forEach((r,i)=>{const y=149+i*3.5;celdaSemanal(23,y,18,3.5,r[0],{centrado:true,tam:2.6});celdaSemanal(41,y,70,3.5,r[1],{tam:2.6});celdaSemanal(111,y,85,3.5,r[2],{centrado:true,tam:2.6});});
      celdaSemanal(23,163,173,4,'Comentarios:  En proceso de construcción y cierre de observaciones.',{tam:2.7});
      // El resumen ejecutivo se incorpora también en la hoja 1, en una tabla compacta.
      bandaSemanal('III','RESUMEN EJECUTIVO DE EJECUCIÓN DE REDES EXTERNAS - ESTADO DE PRINCIPALES ENTREGABLES',168);
      celdaSemanal(38,173,18,2.6,'ITEM',{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:2.4});celdaSemanal(56,173,100,2.6,'DESCRIPCIÓN',{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:2.4});celdaSemanal(156,173,26,2.6,'% DE AVANCE',{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:2.4});
      const entregablesHojaUno=['Recorrido informativo (difusión de obra) y inicio de obra','Detección de interferencia','Excavación de calicatas','Excavación de zanja','Registro de trazabilidad de soldadura electrofusión','Registro de trazabilidad de soldadura termofusión','Informe técnico de compactación de base y sub base','Formato de prueba de hermeticidad','Acta de prueba de hermeticidad','Acta de barrido y llenado de Redes PE (Gasificación)'];
      entregablesHojaUno.forEach((descripcion,i)=>{const y=175.6+i*2.6;celdaSemanal(38,y,18,2.6,String(i+1),{centrado:true,tam:2.35});celdaSemanal(56,y,100,2.6,descripcion,{tam:2.35});celdaSemanal(156,y,26,2.6,i===6?'99.70%':i===9?'76.21%':'100.00%',{centrado:true,tam:2.35});});
      celdaSemanal(14,204,91,4,'SUPERVISIÓN END PERÚ S.A.C.',{relleno:azul,color:[255,255,255],negrita:true,centrado:true,tam:3.2});celdaSemanal(105,204,91,4,'SUPERVISIÓN F.I.S.E.',{relleno:azul,color:[255,255,255],negrita:true,centrado:true,tam:3.2});celdaSemanal(14,208,91,32,'',{tam:3});celdaSemanal(105,208,91,32,'',{tam:3});
      doc.setDrawColor(30);doc.line(27,232,87,232);doc.line(118,232,184,232);textoSemanal(valor('supervisionSupervisor')||'Ing. Tony Blas Cristobal',27,233,60,5,{negrita:true,centrado:true,tam:3.2});textoSemanal('Ing. Francisco Benites Bocanegra',118,233,66,5,{negrita:true,centrado:true,tam:3.2});pieSemanal();
      doc.addPage();cabeceraSemanal(2);bandaSemanal('ANEXO','DETALLE COMPLEMENTARIO DE ENTREGABLES',35);
      celdaSemanal(38,40,18,5,'ITEM',{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:3.3});celdaSemanal(56,40,100,5,'DESCRIPCIÓN',{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:3.3});celdaSemanal(156,40,26,5,'% DE AVANCE',{relleno:naranja,color:[255,255,255],negrita:true,centrado:true,tam:3.3});
      const entregables=['Recorrido informativo (difusión de obra) y inicio de obra','Detección de interferencia','Excavación de calicatas','Excavación de zanja','Registro de trazabilidad de soldadura electrofusión','Registro de trazabilidad de soldadura termofusión','Informe técnico de compactación de base y sub base','Formato de prueba de hermeticidad','Acta de prueba de hermeticidad','Acta de barrido y llenado de Redes PE (Gasificación)'];
      entregables.forEach((descripcion,i)=>{const y=45+i*5;celdaSemanal(38,y,18,5,String(i+1),{centrado:true,tam:3.2});celdaSemanal(56,y,100,5,descripcion,{tam:3.2});celdaSemanal(156,y,26,5,i===6?'99.70%':i===9?'76.21%':'100.00%',{centrado:true,tam:3.2});});
      celdaSemanal(14,97,91,5,'SUPERVISIÓN END PERÚ S.A.C.',{relleno:azul,color:[255,255,255],negrita:true,centrado:true,tam:3.5});celdaSemanal(105,97,91,5,'SUPERVISIÓN F.I.S.E.',{relleno:azul,color:[255,255,255],negrita:true,centrado:true,tam:3.5});celdaSemanal(14,102,91,42,'',{tam:3});celdaSemanal(105,102,91,42,'',{tam:3});
      doc.setDrawColor(30);doc.line(27,133,87,133);doc.line(118,133,184,133);textoSemanal(valor('supervisionSupervisor')||'Ing. Tony Blas Cristobal',27,134,60,6,{negrita:true,centrado:true,tam:3.5});textoSemanal('Ing. Francisco Benites Bocanegra',118,134,66,6,{negrita:true,centrado:true,tam:3.5});pieSemanal();
      const seleccionadas=[...evidenciasMovilSupervision,...evidenciasCargadasSupervision].filter(f=>f.incluida);const imagenes=[];for(const evidencia of seleccionadas){try{imagenes.push({...evidencia,data:await recursoADataUrl(evidencia)});}catch(error){console.warn('No se pudo cargar evidencia semanal',error);}}
      // El reporte de referencia END-FPY-FI-05 aporta evidencias reales para que las
      // hojas fotográficas no queden vacías antes de que el contratista cargue las suyas.
      if(!imagenes.length){
        for(let numero=1;numero<=12;numero++){
          try{
            const src=`documentos/evidencias/semanal/evidencia-semanal-${String(numero).padStart(2,'0')}.jpg`;
            imagenes.push({titulo:`Evidencia semanal ${numero}`,detalle:'Registro fotográfico de obra · END-FPY-FI-05',src,data:await recursoADataUrl({src})});
          }catch(error){console.warn('No se pudo cargar evidencia semanal de referencia',error);}
        }
      }
      for(let pagina=3;pagina<=4;pagina++){doc.addPage();cabeceraSemanal(pagina);bandaSemanal('IV','REGISTRO FOTOGRÁFICO',35);for(let i=0;i<6;i++){const evidencia=imagenes[(pagina-3)*6+i],col=i%2,fila=Math.floor(i/2),x=18+col*89,y=43+fila*76;caja(x,y,85,71,[246,247,249]);if(evidencia){try{doc.addImage(evidencia.data,'JPEG',x+2,y+2,81,51,undefined,'FAST');}catch{try{doc.addImage(evidencia.data,'PNG',x+2,y+2,81,51,undefined,'FAST');}catch{}}}celdaSemanal(x,y+53,85,18,`${i+1+(pagina-3)*6}. ${evidencia?.titulo||'Evidencia semanal'}\n${evidencia?.detalle||'Sin fotografía adjunta'}`,{relleno:gris,color:[255,255,255],tam:3});}pieSemanal();}
      doc.save(`informe-semanal-iso-${valor('supervisionNumero').replace(/[^a-z0-9-]+/gi,'_')}.pdf`);$('estadoInformeSupervision').textContent=`PDF ISO de 4 hojas generado con la estructura semanal nativa y ${imagenes.length} fotografía(s).`;return;
    }
    const azul=[36,74,121],naranja=[221,107,26],gris=[92,98,108],claro=[243,246,250];
    const cabecera=(hoja,subtitulo='ESPECIALIDAD CIVIL - MECÁNICA - SEGURIDAD')=>{
      doc.setDrawColor(90);doc.setLineWidth(.25);doc.rect(14,10,182,31);
      doc.setFont('helvetica','bold');doc.setTextColor(...naranja);doc.setFontSize(18);doc.text('END',18,22);
      doc.setTextColor(20);doc.setFontSize(7);doc.text('FISE',42,22);
      doc.setFillColor(...naranja);doc.rect(55,10,90,6,'F');doc.setTextColor(255);doc.setFontSize(6);doc.text('FORMATO',100,14,{align:'center'});
      doc.setTextColor(20);doc.setFontSize(8);doc.text(titulo,100,23,{align:'center'});doc.setFontSize(5.5);doc.text(formato,171,14,{align:'center'});doc.text(`HOJA ${hoja}`,171,21,{align:'center'});
      doc.setFillColor(...gris);doc.rect(14,42,182,13,'F');doc.setTextColor(255);doc.setFontSize(5.6);doc.text(`PROYECTO: ${proyecto.nombre}`.slice(0,95),17,47);doc.text(`INFORME: ${valor('supervisionNumero')}`,112,47);doc.text(`CONTRATISTA: ${valor('supervisionContratista')}`,17,52);doc.text(`FECHA / PERIODO: ${fecha}`,112,52);
      doc.setFillColor(...azul);doc.rect(14,56,182,5,'F');doc.setTextColor(255);doc.setFontSize(6);doc.text(subtitulo,105,59.5,{align:'center'});
    };
    const pie=()=>{doc.setDrawColor(170);doc.line(14,284,196,284);doc.setTextColor(80);doc.setFontSize(5.5);doc.text(`${valor('supervisionSupervisor')} · ${valor('supervisionCliente')}`,14,288);doc.text(valor('supervisionNumero'),196,288,{align:'right'});};
    cabecera(1);
    doc.autoTable({startY:64,margin:{left:14,right:14},theme:'grid',styles:{fontSize:5.6,cellPadding:1.4,textColor:[22,30,45],lineColor:[170,176,185]},headStyles:{fillColor:azul,textColor:255,fontStyle:'bold'},head:[['SUPERVISIÓN',valor('supervisionSupervisor'),'CONTRATISTA',valor('supervisionContratista')]],body:[
      ['CLIENTE',valor('supervisionCliente'),'LUGAR DE SUPERVISIÓN',valor('supervisionLugar')],['N.º INFORME',valor('supervisionNumero'),'FECHA DE EJECUCIÓN',fecha],['PROYECTO',proyecto.codigo,'ESPECIALIDAD','CIVIL - MECÁNICA - ELÉCTRICA - INSTRUMENTACIÓN']
    ]});
    let y=doc.lastAutoTable.finalY+6;
    doc.setFillColor(...azul);doc.rect(14,y,182,6,'F');doc.setTextColor(255);doc.setFontSize(7);doc.setFont('helvetica','bold');doc.text('RESUMEN EJECUTIVO Y CONTROL DE OBRA',17,y+4);y+=8;
    const filas=[
      ['1. Avance constructivo','Descripción del avance',detalle.avanceConstructivo||valor('supervisionObservaciones')||'Sin información registrada','Registrado'],
      ['2. Resumen ejecutivo','Permisos para la ejecución',detalle.permisos||'Sin información registrada','Registrado'],
      ['2. Resumen ejecutivo','Señalización y detección de interferencia',detalle.senalizacion||'Sin información registrada','Registrado'],
      ['3. Observaciones y auditorías','RNC abiertas / cerradas',`${detalle.rncAbiertas||'0'} / ${detalle.rncCerradas||'0'}`,'En seguimiento'],
      ['5. Seguridad','Charla / incidentes / accidentes',`${detalle.charla||'Sin registro'} / ${valor('supervisionIncidentes')||'0'} / ${valor('supervisionAccidentes')||'0'}`,'Registrado']
    ];
    doc.autoTable({startY:y,margin:{left:14,right:14},theme:'grid',styles:{fontSize:6,cellPadding:2,textColor:[22,30,45]},headStyles:{fillColor:naranja,textColor:255},head:[['Sección','Indicador','Valor','Estado']],body:filas});
    y=doc.lastAutoTable.finalY+7;
    const bloque=(etiqueta,texto)=>{doc.setFillColor(...claro);doc.setDrawColor(175);doc.roundedRect(14,y,182,21,1.5,1.5,'FD');doc.setTextColor(...azul);doc.setFontSize(6.3);doc.setFont('helvetica','bold');doc.text(etiqueta,17,y+4.5);doc.setTextColor(30);doc.setFont('helvetica','normal');doc.setFontSize(5.4);doc.text(doc.splitTextToSize(texto||'Sin información registrada.',174).slice(0,2),17,y+9);y+=24;};
    bloque('4. GESTIÓN DEL TIEMPO (CRONOGRAMA)',detalle.gestionTiempo||valor('supervisionConclusiones'));
    bloque('5. CHARLA DE SEGURIDAD',`${detalle.charla||'Charla de seguridad'} · Tema: ${detalle.temaSeguridad||'Sin tema registrado'}.`);
    const personalTotal=Math.max(0,Number(valor('supervisionPersonal'))||0),equiposTotal=Math.max(0,Number(valor('supervisionEquipos'))||0),personalCivil=Math.max(0,personalTotal-8),minicargadores=Math.max(0,equiposTotal-3);
    doc.autoTable({startY:y,margin:{left:14,right:14},theme:'grid',styles:{fontSize:4.5,cellPadding:.75,textColor:[22,30,45]},headStyles:{fillColor:naranja,textColor:255},head:[['6. MANO DE OBRA - CONTRATISTA','','','']],body:[['ITEM','DESCRIPCIÓN','UNIDAD','CANTIDAD'],['1','RESIDENTE','Und.','1'],['2','PREVENCIONISTA','Und.','1'],['3','SUPERVISOR DE CONTROL DE CALIDAD','Und.','1'],['4','TOPÓGRAFO','Und.','0'],['5','RELACIONISTA COMUNITARIO','Und.','1'],['6','PERSONAL CIVIL','Und.',String(personalCivil)],['7','CAPATAZ','Und.','1'],['8','SUPERVISOR CONSTRUCTIVO','Und.','1'],['9','OPERADOR','Und.','3'],['10','FUSIONISTA','Und.','1'],['11','ARQUEÓLOGA','Und.','1'],['','TOTAL','',''+personalTotal]]});
    y=doc.lastAutoTable.finalY+2;
    doc.autoTable({startY:y,margin:{left:14,right:14},theme:'grid',styles:{fontSize:4.7,cellPadding:.8,textColor:[22,30,45]},headStyles:{fillColor:naranja,textColor:255},head:[['7. NAGASCO - EQUIPOS','','','']],body:[['ITEM','DESCRIPCIÓN','UNIDAD','CANTIDAD'],['1','RETROEXCAVADORA','Und.','0'],['2','CORTADORA','Und.','1'],['3','MINICARGADOR','Und.',String(minicargadores)],['4','CANGURO','Und.','2'],['5','RODILLO','Und.','0'],['','TOTAL','',''+equiposTotal]]});
    const firmaY=Math.min(271,doc.lastAutoTable.finalY+7);doc.setDrawColor(80);doc.line(28,firmaY,88,firmaY);doc.line(122,firmaY,182,firmaY);doc.setFontSize(6);doc.setTextColor(40);doc.text('SUPERVISIÓN',58,firmaY+4,{align:'center'});doc.text('CLIENTE FISE',152,firmaY+4,{align:'center'});pie();
    const seleccionadas=[...evidenciasMovilSupervision,...evidenciasCargadasSupervision].filter(f=>f.incluida);
    const imagenes=[];for(const f of seleccionadas){try{imagenes.push({...f,data:await recursoADataUrl(f)});}catch(error){console.warn('No se pudo cargar evidencia',f.src,error);}}
    // Si el contratista aún no adjuntó fotos, el informe diario usa las evidencias
    // extraídas de la plantilla técnica original. Las fotos nunca son espacios vacíos.
    if(tipo==='diario'&&!imagenes.length){
      for(const pagina of [2,3])for(let fila=1;fila<=4;fila++)for(let columna=1;columna<=3;columna++){
        try{
          const src=`../plantillas/fotos/idt-${pagina}-${fila}-${columna}.jpg`;
          imagenes.push({titulo:'Evidencia de obra',detalle:`Registro fotográfico IDT · hoja ${pagina}`,src,data:await recursoADataUrl({src})});
        }catch(error){console.warn('No se pudo cargar fotografía IDT',error);}
      }
    }
    const registrosPorHoja=tipo==='diario'?9:6,registrosTotales=tipo==='diario'?Math.max(18,imagenes.length):imagenes.length;
    for(let inicio=0;inicio<registrosTotales;inicio+=registrosPorHoja){
      doc.addPage();cabecera(doc.getNumberOfPages(),'9. REGISTRO FOTOGRÁFICO');
      const grupo=imagenes.slice(inicio,inicio+registrosPorHoja);
      for(let i=0;i<registrosPorHoja;i++){
        const f=grupo[i],col=tipo==='diario'?i%3:i%2,fila=tipo==='diario'?Math.floor(i/3):Math.floor(i/2),x=tipo==='diario'?16+col*60:16+col*91,yFoto=tipo==='diario'?68+fila*69:68+fila*67,ancho=tipo==='diario'?57:87,alto=tipo==='diario'?62:60;
        doc.setDrawColor(125);doc.setFillColor(246,247,249);doc.rect(x,yFoto,ancho,alto,'FD');
        if(f){try{doc.addImage(f.data,'JPEG',x+2,yFoto+2,ancho-4,tipo==='diario'?43:45,undefined,'FAST');}catch{try{doc.addImage(f.data,'PNG',x+2,yFoto+2,ancho-4,tipo==='diario'?43:45,undefined,'FAST');}catch{}}}
        doc.setFillColor(...gris);doc.rect(x,yFoto+(tipo==='diario'?46:48),ancho,tipo==='diario'?16:12,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(5.2);doc.text(`${inicio+i+1}. ${f?.titulo||'Evidencia por registrar'}`.slice(0,tipo==='diario'?31:46),x+2,yFoto+(tipo==='diario'?50:52));doc.setFont('helvetica','normal');doc.setFontSize(4.4);doc.text((f?.detalle||'Sin fotografía adjunta').slice(0,tipo==='diario'?35:55),x+2,yFoto+(tipo==='diario'?55:56));
      }
      pie();
    }
    doc.save(`informe-supervision-${tipo}-${valor('supervisionNumero').replace(/[^a-z0-9-]+/gi,'_')}.pdf`);
    $('estadoInformeSupervision').textContent=`PDF generado con tablas nativas y ${imagenes.length} fotografía(s).`;
  }

  window.generarPdfSupervisionOriginal = async function(datos={}) {
    const selector=$('supervisionProyecto');
    if(!selector.options.length)selector.replaceChildren(...ciudades.map(p=>new Option(`${p.codigo} · ${p.nombre}`,p.codigo)));
    const asignar=(id,valor)=>{if(valor!==undefined&&$(id))$(id).value=valor};
    window.detalleIdtExportacion=datos.detalles||{};
    asignar('supervisionNumero',datos.numero);asignar('supervisionFecha',datos.fecha);asignar('supervisionPeriodo',datos.periodo);asignar('supervisionContratista',datos.contratista);asignar('supervisionSupervisor',datos.supervisor);asignar('supervisionCliente',datos.cliente);asignar('supervisionLugar',datos.lugar);asignar('supervisionAvanceCivil',datos.avanceCivil);asignar('supervisionAvanceMecanico',datos.avanceMecanico);asignar('supervisionPersonal',datos.personal);asignar('supervisionEquipos',datos.equipos);asignar('supervisionIncidentes',datos.incidentes);asignar('supervisionAccidentes',datos.accidentes);asignar('supervisionObservaciones',datos.observaciones);asignar('supervisionConclusiones',datos.conclusiones);
    if(datos.proyecto&&[...selector.options].some(o=>o.value===datos.proyecto))selector.value=datos.proyecto;
    configurarInformeSupervision(datos.tipo||'diario');
    if(datos.numero)asignar('supervisionNumero',datos.numero);
    evidenciasMovilSupervision.forEach(f=>{if(datos.estadosEvidencias&&f.id in datos.estadosEvidencias)f.incluida=datos.estadosEvidencias[f.id]});
    evidenciasCargadasSupervision=(datos.evidenciasManuales||[]).map((f,i)=>({id:`externa-${i}`,src:f.src,titulo:f.titulo,detalle:f.detalle||'Fotografía agregada al informe',incluida:f.incluida!==false}));
    await exportarSupervisionPdf();
  };

  function alternarPanel(boton,panel) {
    const abrir=panel.hidden; document.querySelectorAll('.panel-flotante').forEach(p=>p.hidden=true); document.querySelectorAll('.controles-mapa button').forEach(b=>b.setAttribute('aria-expanded','false'));
    panel.hidden=!abrir; boton.setAttribute('aria-expanded',String(abrir));
  }

  function alternarResumenMasificacion() {
    const tablero = document.querySelector('.tablero-masificacion');
    const oculto = tablero.classList.toggle('resumen-oculto');
    botonResumenMasificacion.setAttribute('aria-expanded', String(!oculto));
    botonResumenMasificacion.setAttribute('aria-label', oculto ? 'Mostrar resumen' : 'Ocultar resumen');
    actualizarTamanoMapaMasificacion();
  }
  function actualizarTamanoMapaMasificacion() {
    [0,80,180,320].forEach(demora=>setTimeout(()=>{
      mapa?.invalidateSize({pan:false,animate:false});
    },demora));
  }
  function ajustarAlturaTableroMasificacion() {
    const tablero=document.querySelector('.tablero-masificacion');
    if(!tablero)return;
    if(innerWidth<=1050){
      tablero.style.removeProperty('--alto-tablero-masificacion');
    }else{
      const alturaDisponible=Math.max(380,innerHeight-tablero.getBoundingClientRect().top-10);
      tablero.style.setProperty('--alto-tablero-masificacion',`${alturaDisponible}px`);
    }
    requestAnimationFrame(()=>mapa?.invalidateSize({pan:false}));
  }
  function normalizarTexto(valor) {
    return String(valor ?? '').trim();
  }
  function crearOpcionEstadoBeneficiario(valor='Pendiente') {
    const opciones=['Pendiente','Registrado','Observado'];
    return opciones.map(opcion=>`<option ${opcion===valor?'selected':''}>${opcion}</option>`).join('');
  }
  function crearFilaBeneficiarioProyecto(datos={}, indice=0) {
    const fila=document.createElement('tr');
    fila.innerHTML=`
      <td class="indice-beneficiario-proyecto">${indice+1}</td>
      <td><input type="text" class="campo-beneficiario-proyecto" data-campo="nombre" value="${normalizarTexto(datos.nombre)}" placeholder="Nombre completo"></td>
      <td><input type="text" class="campo-beneficiario-proyecto" data-campo="documento" value="${normalizarTexto(datos.documento)}" placeholder="DNI / RUC"></td>
      <td><input type="text" class="campo-beneficiario-proyecto" data-campo="codigo" value="${normalizarTexto(datos.codigo)}" placeholder="Código"></td>
      <td><select class="campo-beneficiario-proyecto" data-campo="estado">${crearOpcionEstadoBeneficiario(normalizarTexto(datos.estado)||'Pendiente')}</select></td>
      <td><button type="button" class="accion-eliminar-beneficiario" data-accion="eliminar-beneficiario" aria-label="Eliminar registro">×</button></td>
    `;
    return fila;
  }
  function actualizarIndicesBeneficiariosProyecto() {
    const filasReales=[...document.querySelectorAll('#tablaBeneficiariosProyecto tr')].filter(fila=>!fila.classList.contains('fila-vacia-beneficiarios'));
    filasReales.forEach((fila,indice)=>{
      const celda=fila.querySelector('.indice-beneficiario-proyecto');
      if(celda)celda.textContent=String(indice+1);
    });
    const total=filasReales.length;
    $('tituloBeneficiariosProyecto').textContent=`Beneficiarios (${total})`;
  }
  function agregarFilaBeneficiarioProyecto(datos={}) {
    const tabla=$('tablaBeneficiariosProyecto');
    tabla.append(crearFilaBeneficiarioProyecto(datos,tabla.children.length));
    actualizarIndicesBeneficiariosProyecto();
  }
  function limpiarBeneficiariosProyecto() {
    $('tablaBeneficiariosProyecto').replaceChildren();
    const fila=document.createElement('tr');
    fila.className='fila-vacia-beneficiarios';
    fila.innerHTML='<td colspan="6">No hay beneficiarios cargados. Importe un Excel o agregue un registro.</td>';
    $('tablaBeneficiariosProyecto').append(fila);
    actualizarIndicesBeneficiariosProyecto();
  }
  function extraerBeneficiariosProyecto() {
    return [...document.querySelectorAll('#tablaBeneficiariosProyecto tr')]
      .filter(fila=>!fila.classList.contains('fila-vacia-beneficiarios'))
      .map(fila=>({
        nombre: fila.querySelector('[data-campo="nombre"]')?.value.trim()||'',
        documento: fila.querySelector('[data-campo="documento"]')?.value.trim()||'',
        codigo: fila.querySelector('[data-campo="codigo"]')?.value.trim()||'',
        estado: fila.querySelector('[data-campo="estado"]')?.value||'Pendiente'
      }));
  }
  function sincronizarBeneficiariosProyecto(codigoProyecto) {
    if(!codigoProyecto)return;
    beneficiariosEdicionPorProyecto.set(codigoProyecto,extraerBeneficiariosProyecto());
  }
  function cargarBeneficiariosDelProyecto(codigoProyecto) {
    if(!codigoProyecto){
      limpiarBeneficiariosProyecto();
      return;
    }
    const guardados=beneficiariosEdicionPorProyecto.get(codigoProyecto);
    if(guardados){
      $('tablaBeneficiariosProyecto').replaceChildren();
      if(!guardados.length){
        limpiarBeneficiariosProyecto();
        return;
      }
      guardados.forEach((registro,indice)=>agregarFilaBeneficiarioProyecto(registro,indice));
      return;
    }
    const proyecto=ciudades.find(item=>item.codigo===codigoProyecto);
    const codigoFuente=proyecto?.codigoFuente||codigoProyecto;
    const beneficiarios=datosGeo.filter(f=>f?.properties?.tipo==='beneficiario'&&f.properties.proyecto===codigoFuente);
    $('tablaBeneficiariosProyecto').replaceChildren();
    if(!beneficiarios.length){
      limpiarBeneficiariosProyecto();
      return;
    }
    beneficiarios.forEach((feature,indice)=>{
      agregarFilaBeneficiarioProyecto({
        nombre: feature.properties.nombre || '',
        documento: feature.properties.suministro || feature.id || '',
        codigo: feature.id || `${codigoProyecto}-BEN-${String(indice+1).padStart(3,'0')}`,
        estado: feature.properties.estado || 'Pendiente'
      });
    });
  }
  function asegurarTablaBeneficiariosProyecto() {
    const tabla=$('tablaBeneficiariosProyecto');
    if(!tabla)return;
    if(!tabla.children.length)limpiarBeneficiariosProyecto();
  }
  function obtenerTextoSeleccionMultiple(select) {
    return [...select.selectedOptions].map(opcion=>opcion.value).filter(Boolean);
  }
  function actualizarResumenEquipoProyecto() {
    const select=$('proyectoEquipo');
    if(!select)return;
    const total=[...select.selectedOptions].length;
    const resumen=select.multiple ? `${total} seleccionado(s): ${obtenerTextoSeleccionMultiple(select).join(', ') || 'ninguno'}` : select.value;
    let nodo=$('resumenEquipoProyecto');
    if(!nodo){
      nodo=document.createElement('small');
      nodo.id='resumenEquipoProyecto';
      nodo.className='resumen-equipo-proyecto';
      select.insertAdjacentElement('afterend',nodo);
    }
    nodo.textContent=resumen;
  }
  function normalizarProyectoEdicion(p) {
    return {
      codigo:p.codigo||'',
      nombre:p.nombre||'',
      proyectoPadre:p.proyectoPadre||'',
      fase:p.fase||'Anteproyecto',
      cronograma:Array.isArray(p.cronograma)?p.cronograma:[],
      departamento:p.departamento||'',
      provincia:p.provincia||'',
      distrito:p.distrito||'',
      responsableLider:p.responsableLider||'-- Seleccione --',
      empresaContratista:p.empresaContratista||'',
      equipo:Array.isArray(p.equipo)?p.equipo:[p.equipo].filter(Boolean),
      tipo:p.tipo||'Masificación de gas FISE',
      estado:p.estado||'En evaluación',
      beneficiarios:p.beneficiarios ?? p.predios ?? '',
      areaInfluencia:p.areaInfluencia||'',
      localizacion:p.localizacion||'',
      fechaInicio:p.fechaInicio||'',
      fechaFin:p.fechaFin||''
    };
  }
  function renderListaProyectosEdicion() {
    const lista=$('listaProyectosEdicion');
    if(!lista)return;
    const q=$('buscarProyectoEdicion')?.value.trim().toLowerCase()||'';
    const proyectos=ciudades.filter(p=>!q||[p.codigo,p.nombre,p.departamento,p.provincia,p.distrito,p.estado].some(valor=>String(valor).toLowerCase().includes(q)));
    $('contadorProyectosEdicion').textContent=`${proyectos.length} proyecto(s)`;
    lista.replaceChildren();
    if(!proyectos.length){
      const vacio=document.createElement('div');
      vacio.className='item-proyecto-vacio';
      vacio.textContent='No hay proyectos que coincidan con la búsqueda.';
      lista.append(vacio);
      return;
    }
    proyectos.forEach(p=>{
      const tarjeta=document.createElement('article');
      tarjeta.className=`item-proyecto-edicion${proyectoEdicionSeleccionado?.codigo===p.codigo?' activo':''}`;
      tarjeta.innerHTML=`<div><strong>${p.codigo}</strong><span>${p.nombre}</span><small>${p.departamento} · ${p.provincia} · ${p.estado} · ${p.fase||'Anteproyecto'}</small></div><div class="acciones-item-proyecto"><button type="button" data-accion="editar-proyecto" data-codigo="${p.codigo}">Editar</button><button type="button" data-accion="crear-subproyecto" data-codigo="${p.codigo}">Subproyecto</button><button type="button" class="peligro" data-accion="eliminar-proyecto" data-codigo="${p.codigo}">Eliminar</button></div>`;
      lista.append(tarjeta);
    });
  }
  function poblarProyectoPadre(codigoActual='') {
    const selector=$('proyectoPadre');
    if(!selector)return;
    const valorActual=selector.value||codigoActual;
    selector.replaceChildren(new Option('Proyecto principal (sin padre)',''));
    ciudades.filter(p=>p.codigo!==codigoActual).forEach(p=>selector.add(new Option(`${p.codigo} · ${p.nombre}`,p.codigo)));
    if([...selector.options].some(opcion=>opcion.value===valorActual))selector.value=valorActual;
  }
  function cargarProyectoEnFormulario(proyecto) {
    if(!proyecto)return;
    proyectoEdicionSeleccionado=proyecto;
    $('etiquetaCrearProyecto').textContent='MODIFICAR PROYECTO';
    $('tituloCrearProyecto').textContent='Modificar proyecto';
    $('descripcionCrearProyecto').textContent='Actualice los datos, el equipo, el área y los beneficiarios asociados al proyecto.';
    $('proyectoCodigo').value=proyecto.codigo||'';
    $('proyectoNombre').value=proyecto.nombre||'';
    poblarProyectoPadre(proyecto.codigo);
    $('proyectoPadre').value=proyecto.proyectoPadre||'';
    $('proyectoFase').value=proyecto.fase||'Anteproyecto';
    cronogramaBorrador=structuredClone(proyecto.cronograma?.length?proyecto.cronograma:crearCronogramaBase());
    $('proyectoFechaInicio').value=proyecto.fechaInicio||'';
    $('proyectoFechaFin').value=proyecto.fechaFin||'';
    $('proyectoResponsableLider').value=proyecto.responsableLider||'-- Seleccione --';
    $('proyectoEmpresaContratista').value=proyecto.empresaContratista||'';
    const selectEquipo=$('proyectoEquipo');
    [...selectEquipo.options].forEach(opcion=>{opcion.selected=(proyecto.equipo||[]).includes(opcion.value);});
    $('proyectoDepartamento').value=proyecto.departamento||'';
    $('proyectoProvincia').value=proyecto.provincia||'';
    $('proyectoDistrito').value=proyecto.distrito||'';
    $('proyectoTipo').value=proyecto.tipo||'Masificación de gas FISE';
    $('proyectoEstado').value=proyecto.estado||'En evaluación';
    $('proyectoBeneficiarios').value=proyecto.beneficiarios ?? '';
    $('proyectoAreaInfluencia').value=proyecto.areaInfluencia||'';
    $('proyectoLocalizacion').value=proyecto.localizacion||'';
    $('proyectoGeometria').value=proyecto.geometria?JSON.stringify(proyecto.geometria):'';
    $('estadoZonaProyecto').textContent=proyecto.geometria?`${proyecto.geometria.nombre||'Geometría'} cargada y vinculada al proyecto.`:'Defina el nombre y la forma; finalice el dibujo con doble clic.';
    $('estadoZonaProyecto').classList.toggle('exito',Boolean(proyecto.geometria));
    actualizarResumenEquipoProyecto();
    renderListaProyectosEdicion();
    cargarBeneficiariosDelProyecto(proyecto.codigo);
    planificacionBorrador=crearPlanificacionProyecto(proyecto.planificacionTecnica);
  }
  function limpiarFormularioProyecto() {
    proyectoEdicionSeleccionado=null;
    $('etiquetaCrearProyecto').textContent='NUEVO PROYECTO';
    $('tituloCrearProyecto').textContent='Crear proyecto';
    $('descripcionCrearProyecto').textContent='Registre los datos, el equipo, el área y los beneficiarios del nuevo proyecto.';
    $('proyectoCodigo').value='';
    $('proyectoNombre').value='';
    poblarProyectoPadre();
    $('proyectoPadre').value='';
    $('proyectoFase').value='Anteproyecto';
    cronogramaBorrador=crearCronogramaBase();
    $('proyectoFechaInicio').value='';
    $('proyectoFechaFin').value='';
    $('proyectoResponsableLider').value='-- Seleccione --';
    $('proyectoEmpresaContratista').value='';
    [...$('proyectoEquipo').options].forEach(opcion=>{opcion.selected=false;});
    $('proyectoDepartamento').value='';
    $('proyectoProvincia').value='';
    $('proyectoDistrito').value='';
    $('proyectoTipo').value='Masificación de gas FISE';
    $('proyectoEstado').value='En evaluación';
    $('proyectoBeneficiarios').value='';
    $('proyectoAreaInfluencia').value='';
    $('proyectoLocalizacion').value='';
    $('proyectoGeometria').value='';
    $('nombreZonaProyecto').value='';
    $('estadoZonaProyecto').textContent='Defina el nombre y la forma; finalice el dibujo con doble clic.';
    $('estadoZonaProyecto').classList.remove('exito');
    actualizarResumenEquipoProyecto();
    limpiarBeneficiariosProyecto();
    planificacionBorrador=crearPlanificacionProyecto();
  }
  function obtenerDatosFormularioProyecto() {
    const [latitudTexto,longitudTexto]=String($('proyectoLocalizacion').value||'').split(',').map(valor=>Number(valor.trim()));
    return {
      codigo: normalizarTexto($('proyectoCodigo').value),
      nombre: normalizarTexto($('proyectoNombre').value),
      proyectoPadre: $('proyectoPadre').value,
      fase: $('proyectoFase').value,
      cronograma: structuredClone(cronogramaBorrador),
      fechaInicio: $('proyectoFechaInicio').value,
      fechaFin: $('proyectoFechaFin').value,
      responsableLider: $('proyectoResponsableLider').value,
      empresaContratista: normalizarTexto($('proyectoEmpresaContratista').value),
      equipo: obtenerTextoSeleccionMultiple($('proyectoEquipo')),
      departamento: $('proyectoDepartamento').value,
      provincia: $('proyectoProvincia').value,
      distrito: $('proyectoDistrito').value,
      tipo: $('proyectoTipo').value,
      estado: $('proyectoEstado').value,
      beneficiarios: $('proyectoBeneficiarios').value,
      areaInfluencia: normalizarTexto($('proyectoAreaInfluencia').value),
      localizacion: normalizarTexto($('proyectoLocalizacion').value),
      geometria: $('proyectoGeometria').value?JSON.parse($('proyectoGeometria').value):null,
      lat: Number.isFinite(latitudTexto)?latitudTexto:(proyectoEdicionSeleccionado?.lat ?? -10.6),
      lng: Number.isFinite(longitudTexto)?longitudTexto:(proyectoEdicionSeleccionado?.lng ?? -75.2),
      avance: proyectoEdicionSeleccionado?.avance ?? 0,
      longitud: proyectoEdicionSeleccionado?.longitud ?? 0,
      elementos: proyectoEdicionSeleccionado?.elementos ?? ''
      ,planificacionTecnica: structuredClone(planificacionBorrador||crearPlanificacionProyecto())
    };
  }

  function crearPlanificacionProyecto(datos={}){
    const requisitos=(datos.requisitos?.length?datos.requisitos:requisitosTerrenoBase.map(([nombre,parametro])=>({nombre,parametro,estado:'pendiente',comentario:'',responsable:'',fechaLimite:'',subsanado:false}))).map(item=>({...item}));
    return {requisitos,fecha:datos.fecha||'',localidad:datos.localidad||'',responsable:datos.responsable||'',asistentes:datos.asistentes||'',coordenadas:datos.coordenadas||'',tipoVisita:datos.tipoVisita||'Inspección inicial',ayudaMemoria:datos.ayudaMemoria||'',evidencias:[...(datos.evidencias||[])],conclusiones:datos.conclusiones||'',cerrada:Boolean(datos.cerrada),fechaCierre:datos.fechaCierre||''};
  }
  function escapePlanificacion(valor=''){return String(valor).replace(/[&<>"]/g,caracter=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[caracter]));}
  function leerPlanificacionFormulario(){
    if(!planificacionBorrador)planificacionBorrador=crearPlanificacionProyecto();
    planificacionBorrador.requisitos=[...$('tablaRequisitosPlanificacion').querySelectorAll('tr')].map(fila=>({nombre:fila.dataset.nombre||'',parametro:fila.dataset.parametro||'',estado:fila.querySelector('[data-requisito-estado]').value,comentario:fila.querySelector('[data-requisito-comentario]').value,responsable:fila.dataset.responsable||'',fechaLimite:fila.dataset.fechaLimite||'',subsanado:fila.dataset.subsanado==='true'}));
    planificacionBorrador.fecha=$('planificacionFecha').value;planificacionBorrador.localidad=$('planificacionLocalidad').value.trim();planificacionBorrador.responsable=$('planificacionResponsable').value.trim();planificacionBorrador.asistentes=$('planificacionAsistentes').value.trim();planificacionBorrador.coordenadas=$('planificacionCoordenadas').value.trim();planificacionBorrador.tipoVisita=$('planificacionTipoVisita').value;planificacionBorrador.ayudaMemoria=$('planificacionAyudaMemoria').value.trim();planificacionBorrador.conclusiones=$('conclusionesPlanificacion').value.trim();
  }
  function metricasPlanificacion(){
    const requisitos=planificacionBorrador?.requisitos||[],evaluados=requisitos.filter(r=>r.estado!=='pendiente'),cumplidos=requisitos.filter(r=>r.estado==='cumple'||(r.estado==='no-cumple'&&r.subsanado)),observados=requisitos.filter(r=>r.estado==='no-cumple'&&!r.subsanado),avance=requisitos.length?Math.round(cumplidos.length/requisitos.length*100):0;
    return {total:requisitos.length,evaluados:evaluados.length,cumplidos:cumplidos.length,observados:observados.length,avance,resultado:evaluados.length<requisitos.length?'En evaluación':observados.length?'Apto con observaciones':'Apto'};
  }
  function renderObservacionesPlanificacion(){
    const contenedor=$('listaObservacionesPlanificacion'),observaciones=(planificacionBorrador?.requisitos||[]).map((r,i)=>({...r,indice:i})).filter(r=>r.estado==='no-cumple');
    if(!observaciones.length){contenedor.innerHTML='<div class="observacion-planificacion-vacia">No hay requisitos incumplidos.</div>';return;}
    contenedor.innerHTML=observaciones.map(r=>`<article class="observacion-planificacion"><div><strong>${escapePlanificacion(r.nombre)}</strong><p>${escapePlanificacion(r.comentario||'Registre el detalle de la observación en Requisitos.')}</p></div><label>Responsable<input data-observacion-responsable="${r.indice}" value="${escapePlanificacion(r.responsable)}" placeholder="Asignar responsable"></label><label>Fecha límite<input type="date" data-observacion-fecha="${r.indice}" value="${escapePlanificacion(r.fechaLimite)}"></label><label><input type="checkbox" data-observacion-subsanada="${r.indice}" ${r.subsanado?'checked':''}> Subsanada</label></article>`).join('');
  }
  function actualizarResumenPlanificacion(){
    const m=metricasPlanificacion();$('avancePlanificacionTecnica').textContent=`${m.avance}%`;$('barraPlanificacionTecnica').style.width=`${m.avance}%`;$('cumplidosPlanificacionTecnica').textContent=`${m.cumplidos} de ${m.total}`;$('observadosPlanificacionTecnica').textContent=m.observados;$('resultadoPlanificacionTecnica').textContent=m.resultado;$('fechaPlanificacionTecnica').textContent=planificacionBorrador.fecha?`Inspección: ${planificacionBorrador.fecha}`:'Sin fecha de inspección';$('estadoCierrePlanificacion').textContent=m.resultado;$('mensajeCierrePlanificacion').textContent=m.evaluados<m.total?`Faltan evaluar ${m.total-m.evaluados} requisito(s).`:m.observados?`Existen ${m.observados} observación(es) pendientes de subsanar.`:'Todos los requisitos fueron evaluados favorablemente.';const habilitado=m.evaluados===m.total&&m.observados===0&&$('confirmarCierrePlanificacion').checked;$('cerrarEtapaPlanificacion').disabled=!habilitado;
  }
  function renderPlanificacionTecnica(){
    if(!planificacionBorrador)planificacionBorrador=crearPlanificacionProyecto();
    $('tablaRequisitosPlanificacion').innerHTML=planificacionBorrador.requisitos.map((r,i)=>`<tr data-nombre="${escapePlanificacion(r.nombre)}" data-parametro="${escapePlanificacion(r.parametro)}" data-responsable="${escapePlanificacion(r.responsable)}" data-fecha-limite="${escapePlanificacion(r.fechaLimite)}" data-subsanado="${r.subsanado}"><td>${i+1}</td><td>${escapePlanificacion(r.nombre)}</td><td>${escapePlanificacion(r.parametro)}</td><td><select data-requisito-estado data-estado="${r.estado}"><option value="pendiente">Pendiente</option><option value="cumple">Sí cumple</option><option value="no-cumple">No cumple</option></select></td><td><input data-requisito-comentario value="${escapePlanificacion(r.comentario)}" placeholder="Comentario técnico"></td></tr>`).join('');
    [...$('tablaRequisitosPlanificacion').querySelectorAll('tr')].forEach((fila,i)=>fila.querySelector('select').value=planificacionBorrador.requisitos[i].estado);
    $('planificacionFecha').value=planificacionBorrador.fecha;$('planificacionLocalidad').value=planificacionBorrador.localidad;$('planificacionResponsable').value=planificacionBorrador.responsable;$('planificacionAsistentes').value=planificacionBorrador.asistentes;$('planificacionCoordenadas').value=planificacionBorrador.coordenadas;$('planificacionTipoVisita').value=planificacionBorrador.tipoVisita;$('planificacionAyudaMemoria').value=planificacionBorrador.ayudaMemoria;$('conclusionesPlanificacion').value=planificacionBorrador.conclusiones;$('confirmarCierrePlanificacion').checked=planificacionBorrador.cerrada;
    $('listaEvidenciasPlanificacion').innerHTML=planificacionBorrador.evidencias.length?planificacionBorrador.evidencias.map(a=>`<div class="evidencia-planificacion"><b>${escapePlanificacion(a.nombre)}</b><small>${escapePlanificacion(a.tipo||'Archivo')} · ${a.tamano||0} KB</small></div>`).join(''):'<p>No hay evidencias adjuntas.</p>';
    renderObservacionesPlanificacion();actualizarResumenPlanificacion();
  }
  function abrirPlanificacionTecnica(proyecto){
    if(proyecto)planificacionBorrador=crearPlanificacionProyecto(proyecto.planificacionTecnica);
    else if(!planificacionBorrador)planificacionBorrador=crearPlanificacionProyecto();
    const codigo=proyecto?.codigo||$('proyectoCodigo').value||'Proyecto nuevo',nombre=proyecto?.nombre||$('proyectoNombre').value||'';$('subtituloPlanificacionTecnica').textContent=`${codigo}${nombre?' · '+nombre:''} · evaluación previa al inicio de la ejecución.`;renderPlanificacionTecnica();$('modalPlanificacionTecnica').showModal();
  }
  function proponerSubproyecto(codigoPadre) {
    const padre=ciudades.find(proyecto=>proyecto.codigo===codigoPadre);
    if(!padre||proyectoEdicionSeleccionado)return;
    const codigo=$('proyectoCodigo'),nombre=$('proyectoNombre');
    if(!codigo.value)codigo.value=`${padre.codigo}-SP-01`;
    if(!nombre.value)nombre.value=`${padre.nombre} - Subproyecto`;
    $('proyectoFase').value=padre.fase||'Anteproyecto';
    if(!$('proyectoFechaInicio').value)$('proyectoFechaInicio').value=padre.fechaInicio||'';
    if(!$('proyectoFechaFin').value)$('proyectoFechaFin').value=padre.fechaFin||'';
  }
  function crearCronogramaBase() {
    const fase=$('proyectoFase')?.value||'Anteproyecto';
    return [
      {codigo:'ACT-01',actividad:'Estudios y preparación',fase,inicio:'2026-08-17',fin:'2026-09-04',predecesora:'',sucesora:'2,3',avance:61,nivel:0,recursos:[{nombre:'Equipo de planificación',tipo:'Personal',cantidad:'3',horas:'8'}]},
      {codigo:'ACT-02',actividad:'Levantamiento y validación de información',fase,inicio:'2026-08-17',fin:'2026-08-21',predecesora:'1',sucesora:'3,4',avance:100,nivel:1,recursos:[{nombre:'Brigada de campo',tipo:'Cuadrilla',cantidad:'1',horas:'8'}]},
      {codigo:'ACT-03',actividad:'Diseño de red / ingeniería',fase,inicio:'2026-08-24',fin:'2026-09-02',predecesora:'2',sucesora:'5',avance:65,nivel:1,recursos:[{nombre:'Especialista GIS',tipo:'Personal',cantidad:'2',horas:'8'}]},
      {codigo:'ACT-04',actividad:'Permisos y coordinación',fase,inicio:'2026-08-27',fin:'2026-09-04',predecesora:'2',sucesora:'5',avance:35,nivel:1,recursos:[{nombre:'Gestor territorial',tipo:'Personal',cantidad:'1',horas:'8'}]},
      {codigo:'ACT-05',actividad:'Ejecución / construcción',fase:'Construcción',inicio:'2026-09-07',fin:'2026-09-25',predecesora:'3,4',sucesora:'6',avance:20,nivel:0,recursos:[{nombre:'Cuadrilla de instalación',tipo:'Cuadrilla',cantidad:'2',horas:'8'},{nombre:'Retroexcavadora',tipo:'Equipo',cantidad:'1',horas:'6'}]},
      {codigo:'ACT-06',actividad:'Pruebas, cierre y As-Built',fase:'Operación',inicio:'2026-09-28',fin:'2026-10-02',predecesora:'5',sucesora:'',avance:0,nivel:0,recursos:[{nombre:'Supervisor técnico',tipo:'Personal',cantidad:'1',horas:'8'}]},
      {codigo:'ACT-07',actividad:'Nueva actividad',fase,inicio:'2026-10-05',fin:'2026-10-09',predecesora:'6',sucesora:'',avance:0,nivel:1,recursos:[]}
    ];
  }
  function crearFilaCronograma(actividad={}) {
    const fila=document.createElement('tr');
    const indice=cronogramaBorrador.length+1;
    fila.dataset.nivel=String(actividad.nivel||0);
    fila.draggable=true;
    fila.innerHTML=`<td><input data-seleccion-cronograma type="checkbox" aria-label="Seleccionar actividad"></td><td><input data-cronograma="codigo" value="${actividad.codigo||`ACT-${String(indice).padStart(2,'0')}`}"></td><td><input data-cronograma="actividad" value="${actividad.actividad||''}" placeholder="Ej. Elaborar expediente"></td><td><select data-cronograma="fase"><option>Anteproyecto</option><option>Proyecto</option><option>Construcción</option><option>Operación</option></select></td><td><input data-cronograma="inicio" type="date" value="${actividad.inicio||''}"></td><td><input data-cronograma="fin" type="date" value="${actividad.fin||''}"></td><td><input data-cronograma="predecesora" value="${actividad.predecesora||''}" placeholder="ACT-01"></td><td><input data-cronograma="sucesora" value="${actividad.sucesora||''}" placeholder="ACT-03"></td><td><input data-cronograma="avance" type="number" min="0" max="100" value="${actividad.avance??0}"></td><td><button type="button" data-accion="eliminar-actividad" aria-label="Eliminar actividad">×</button></td>`;
    fila.querySelector('[data-cronograma="fase"]').value=actividad.fase||$('proyectoFase').value||'Anteproyecto';
    return fila;
  }
  function renderCronogramaProyecto() {
    const tabla=$('tablaCronogramaProyecto');
    tabla.replaceChildren();
    const actividades=cronogramaBorrador.length?cronogramaBorrador:[{actividad:'',fase:$('proyectoFase').value||'Anteproyecto'}];
    actividades.forEach(actividad=>tabla.append(crearFilaCronograma(actividad)));
    const codigo=$('proyectoCodigo').value||'Proyecto nuevo',nombre=$('proyectoNombre').value;
    $('cronogramaProyectoActual').textContent=nombre?`${codigo} · ${nombre}`:codigo;
    renderGanttCronograma();
  }
  function leerCronogramaProyecto() {
    cronogramaBorrador=[...$('tablaCronogramaProyecto').querySelectorAll('tr')].map(fila=>({...Object.fromEntries([...fila.querySelectorAll('[data-cronograma]')].map(campo=>[campo.dataset.cronograma,campo.value.trim()])),nivel:Number(fila.dataset.nivel||0)})).filter(actividad=>actividad.codigo||actividad.actividad);
  }
  function actualizarSeleccionCronograma() {
    const filas=[...$('tablaCronogramaProyecto').querySelectorAll('tr')],seleccionadas=filas.filter(fila=>fila.querySelector('[data-seleccion-cronograma]')?.checked);
    $('contadorSeleccionCronograma').textContent=`${seleccionadas.length} seleccionada${seleccionadas.length===1?'':'s'}`;
    $('seleccionarTodoCronograma').checked=!!filas.length&&seleccionadas.length===filas.length;
  }
  function ajustarNivelCronograma(delta) {
    const filas=[...$('tablaCronogramaProyecto').querySelectorAll('tr')];
    filas.forEach(fila=>{if(fila.querySelector('[data-seleccion-cronograma]')?.checked)fila.dataset.nivel=String(Math.max(0,Math.min(3,Number(fila.dataset.nivel||0)+delta)));});
    leerCronogramaProyecto();renderCronogramaProyecto();
  }
  function renderGanttCronograma() {
    const cabecera=$('cabeceraGanttCronograma'),contenedor=$('ganttCronogramaProyecto');
    if(!cabecera||!contenedor)return;
    const actividades=cronogramaBorrador.filter(item=>item.inicio&&item.fin);
    if(!actividades.length){cabecera.replaceChildren();contenedor.innerHTML='<p class="gantt-vacio">Agrega inicio y fin a una actividad para visualizar el Gantt.</p>';return;}
    const dia=86400000,fechas=actividades.flatMap(item=>[new Date(`${item.inicio}T00:00:00`),new Date(`${item.fin}T00:00:00`)]);
    let inicio=new Date(Math.min(...fechas)),fin=new Date(Math.max(...fechas));
    inicio.setDate(inicio.getDate()-1);fin.setDate(fin.getDate()+1);
    const total=Math.min(60,Math.max(7,Math.round((fin-inicio)/dia)+1));
    cabecera.style.cssText='background:#ffffff!important;color:#77849a!important;border-bottom:1px solid #e7ebf1!important;';
    cabecera.replaceChildren(...Array.from({length:total},(_,i)=>{const fecha=new Date(inicio.getTime()+i*dia),celda=document.createElement('span');celda.style.cssText='background:#ffffff!important;color:#77849a!important;border-right:1px solid #eef1f5!important;';celda.textContent=`${String(fecha.getDate()).padStart(2,'0')}/${String(fecha.getMonth()+1).padStart(2,'0')}`;return celda;}));
    contenedor.style.minWidth=`${total*42+58}px`;
    contenedor.replaceChildren(...cronogramaBorrador.map((item,indice)=>{
      const nivel=Math.max(0,Number(item.nivel)||0),esFase=nivel===0;
      const fila=document.createElement('div');fila.className=`gantt-fila gantt-nivel-${Math.min(nivel,3)}${esFase?' gantt-fase-principal':''}`;fila.style.width=`${total*42+58}px`;
      if(!item.inicio||!item.fin)return fila;
      const desde=new Date(`${item.inicio}T00:00:00`),hasta=new Date(`${item.fin}T00:00:00`);
      const izquierda=Math.max(0,Math.round((desde-inicio)/dia))*42;
      const ancho=Math.max(42,(Math.round((hasta-desde)/dia)+1)*42);
      const colores=['#59bdc5','#f79661','#df6db8','#7184df','#55b675'];
      const barra=document.createElement('div');barra.className=`gantt-barra${esFase?' gantt-barra-fase':''}`;barra.style.left=`${izquierda}px`;barra.style.width=`${ancho}px`;barra.style.background=esFase?'#2d4276':colores[indice%colores.length];barra.textContent=`${indice+1}. ${item.actividad||item.codigo}`;
      const avance=document.createElement('div');avance.className='gantt-avance';avance.style.left=`${izquierda}px`;avance.style.width=`${ancho}px`;const progreso=document.createElement('i');progreso.style.width=`${Math.min(100,Math.max(0,Number(item.avance)||0))}%`;avance.append(progreso);
      const porcentaje=document.createElement('b');porcentaje.className='gantt-porcentaje';porcentaje.style.left=`${izquierda+ancho+10}px`;porcentaje.textContent=`${Number(item.avance)||0}%`;
      fila.append(barra,avance,porcentaje);return fila;
    }));
  }
  let indiceRecursoCronograma=-1;
  function crearFilaCronograma(actividad={},indice=0) {
    const fila=document.createElement('tr'),numero=indice+1,recursos=Array.isArray(actividad.recursos)?actividad.recursos:[];
    fila.dataset.nivel=String(actividad.nivel||0);fila.draggable=true;
    fila.innerHTML=`<td><input data-seleccion-cronograma type="checkbox" aria-label="Seleccionar actividad"></td><td class="numero-cronograma"><b>${numero}</b><input type="hidden" data-cronograma="codigo" value="${actividad.codigo||`ACT-${String(numero).padStart(2,'0')}`}"></td><td><input data-cronograma="actividad" value="${actividad.actividad||''}" placeholder="Ej. Elaborar expediente"></td><td><select data-cronograma="fase"><option>Anteproyecto</option><option>Proyecto</option><option>Construcción</option><option>Operación</option></select></td><td><input data-cronograma="inicio" type="date" value="${actividad.inicio||''}"></td><td><input data-cronograma="fin" type="date" value="${actividad.fin||''}"></td><td><input data-cronograma="predecesora" value="${actividad.predecesora||''}" placeholder="N° fila"></td><td><input data-cronograma="sucesora" value="${actividad.sucesora||''}" placeholder="N° fila"></td><td><input data-cronograma="avance" type="number" min="0" max="100" value="${actividad.avance??0}"><span class="porcentaje-cronograma">%</span></td><td><button class="boton-recursos-cronograma" type="button" data-recurso-cronograma="${indice}" aria-label="Gestionar recursos"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="7" r="3"></circle><path d="M3.5 19c.6-4 2.4-6 5.5-6s4.9 2 5.5 6M18 12v8M14 16h8"></path></svg><b>${recursos.length}</b></button></td><td><button type="button" data-accion="eliminar-actividad" aria-label="Eliminar actividad">×</button></td>`;
    fila.querySelector('[data-cronograma="fase"]').value=actividad.fase||$('proyectoFase').value||'Anteproyecto';
    return fila;
  }
  function renderCronogramaProyecto() {
    if(!cronogramaBorrador.length)cronogramaBorrador=crearCronogramaBase();
    const tabla=$('tablaCronogramaProyecto');tabla.replaceChildren();
    const actividades=cronogramaBorrador;
    actividades.forEach((actividad,indice)=>tabla.append(crearFilaCronograma(actividad,indice)));
    const codigo=$('proyectoCodigo').value||'Proyecto nuevo',nombre=$('proyectoNombre').value;
    $('cronogramaProyectoActual').textContent=nombre?`${codigo} · ${nombre}`:codigo;renderGanttCronograma();actualizarSeleccionCronograma();
  }
  function leerCronogramaProyecto() {
    cronogramaBorrador=[...$('tablaCronogramaProyecto').querySelectorAll('tr')].map((fila,indice)=>({...Object.fromEntries([...fila.querySelectorAll('[data-cronograma]')].map(campo=>[campo.dataset.cronograma,campo.value.trim()])),nivel:Number(fila.dataset.nivel||0),recursos:Array.isArray(cronogramaBorrador[indice]?.recursos)?cronogramaBorrador[indice].recursos:[]})).filter(actividad=>actividad.codigo||actividad.actividad);
  }
  function renderRecursosCronograma() {
    const actividad=cronogramaBorrador[indiceRecursoCronograma];if(!actividad)return;
    const recursos=actividad.recursos||[];
    $('tituloRecursosCronograma').textContent=actividad.actividad||actividad.codigo||'Nueva actividad';
    $('subtituloRecursosCronograma').textContent=`Recursos asignados a la actividad N° ${indiceRecursoCronograma+1}.`;
    $('listaRecursosCronograma').replaceChildren(...(recursos.length?recursos:[{vacio:true}]).map((recurso,indice)=>{
      const item=document.createElement('article');
      if(recurso.vacio){item.className='recurso-cronograma-vacio';item.textContent='Aún no se han asignado recursos a esta actividad.';return item;}
      item.innerHTML=`<span><b>${recurso.nombre}</b><small>${recurso.tipo} · ${recurso.cantidad} unidad(es) · ${recurso.horas} h/día</small></span><button type="button" data-eliminar-recurso-cronograma="${indice}" aria-label="Quitar recurso">×</button>`;return item;
    }));
  }
  const cronogramaColapsados=new Set(),cronogramaSeleccionadas=new Set();let cronogramaArrastre=-1;
  function descendientesCronograma(indice){const nivel=Number(cronogramaBorrador[indice]?.nivel||0),salida=[];for(let i=indice+1;i<cronogramaBorrador.length&&Number(cronogramaBorrador[i].nivel||0)>nivel;i++)salida.push(i);return salida;}
  function esResumenCronograma(indice){return Number(cronogramaBorrador[indice+1]?.nivel||0)>Number(cronogramaBorrador[indice]?.nivel||0);}
  function indicesVisiblesCronograma(){const ocultos=new Set();cronogramaColapsados.forEach(indice=>descendientesCronograma(indice).forEach(hijo=>ocultos.add(hijo)));return cronogramaBorrador.map((_,indice)=>indice).filter(indice=>!ocultos.has(indice));}
  function normalizarResumenesCronograma(){for(let i=cronogramaBorrador.length-1;i>=0;i--){if(!esResumenCronograma(i))continue;const hijos=descendientesCronograma(i).map(indice=>cronogramaBorrador[indice]).filter(item=>item.inicio&&item.fin);if(!hijos.length)continue;cronogramaBorrador[i].inicio=hijos.map(item=>item.inicio).sort()[0];cronogramaBorrador[i].fin=hijos.map(item=>item.fin).sort().at(-1);cronogramaBorrador[i].avance=Math.round(hijos.reduce((s,item)=>s+Number(item.avance||0),0)/hijos.length);}}
  function crearFilaCronograma(actividad={},indice=0){
    const fila=document.createElement('tr'),numero=indice+1,resumen=esResumenCronograma(indice),recursos=actividad.recursos||[],nivel=Math.min(3,Number(actividad.nivel||0));
    fila.dataset.indiceCronograma=indice;fila.dataset.nivel=nivel;fila.draggable=true;fila.className=`fila-cronograma-maqueta${resumen?' resumen-cronograma':''}${cronogramaSeleccionadas.has(indice)?' seleccionada-cronograma':''}`;
    const controlResumen=resumen?`<button class="alternar-cronograma" type="button" data-alternar-cronograma="${indice}" title="${cronogramaColapsados.has(indice)?'Expandir':'Contraer'}">${cronogramaColapsados.has(indice)?'▶':'▼'}</button><b class="subtareas-cronograma">${descendientesCronograma(indice).filter(hijo=>Number(cronogramaBorrador[hijo].nivel||0)===nivel+1).length} sub.</b>`:'<span class="alternar-cronograma marcador-vacio">⋮⋮</span>';
    fila.innerHTML=`<td><input data-seleccion-cronograma="${indice}" type="checkbox" ${cronogramaSeleccionadas.has(indice)?'checked':''} aria-label="Seleccionar actividad ${numero}"></td><td class="numero-cronograma"><b>${numero}</b></td><td class="actividad-cronograma"><span class="arrastre-cronograma" title="Arrastrar para ordenar">⠿</span><span class="sangria-cronograma" style="width:${nivel*18}px"></span>${controlResumen}<span class="nivel-cronograma">N${nivel+1}</span><input data-cronograma-campo="actividad" value="${actividad.actividad||''}" placeholder="Nueva actividad"></td><td><input data-cronograma-campo="inicio" type="date" value="${actividad.inicio||''}" ${resumen?'readonly':''}></td><td><input data-cronograma-campo="fin" type="date" value="${actividad.fin||''}" ${resumen?'readonly':''}></td><td><input class="dependencia-cronograma" data-cronograma-campo="predecesora" value="${actividad.predecesora||''}" placeholder="N° fila"></td><td><input class="dependencia-cronograma" data-cronograma-campo="sucesora" value="${actividad.sucesora||''}" placeholder="N° fila"></td><td class="avance-cronograma"><input data-cronograma-campo="avance" type="number" min="0" max="100" value="${actividad.avance??0}" ${resumen?'readonly':''}><span>%</span></td><td><button class="boton-recursos-cronograma" type="button" data-recurso-cronograma="${indice}" aria-label="Gestionar recursos"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="7" r="3"></circle><path d="M3.5 19c.6-4 2.4-6 5.5-6s4.9 2 5.5 6M18 12v8M14 16h8"></path></svg>${recursos.length?`<b>${recursos.length}</b>`:''}</button></td><td><button class="boton-eliminar-cronograma" type="button" data-accion="eliminar-actividad" aria-label="Eliminar actividad"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg></button></td>`;
    return fila;
  }
  function actualizarSeleccionCronograma(){const filas=[...$('tablaCronogramaProyecto').querySelectorAll('tr')],activas=filas.filter(fila=>fila.querySelector('[data-seleccion-cronograma]')?.checked);$('contadorSeleccionCronograma').textContent=`${activas.length} seleccionada${activas.length===1?'':'s'}`;$('seleccionarTodoCronograma').checked=!!filas.length&&activas.length===filas.length;}
  function ajustarNivelCronograma(delta){cronogramaSeleccionadas.forEach(indice=>cronogramaBorrador[indice].nivel=Math.max(0,Math.min(3,Number(cronogramaBorrador[indice].nivel||0)+delta)));normalizarResumenesCronograma();renderCronogramaProyecto();}
  function leerCronogramaProyecto(){return cronogramaBorrador;}
  function renderCronogramaProyecto(){
    if(!cronogramaBorrador.length)cronogramaBorrador=crearCronogramaBase();normalizarResumenesCronograma();
    const tabla=$('tablaCronogramaProyecto');tabla.replaceChildren(...indicesVisiblesCronograma().map(indice=>crearFilaCronograma(cronogramaBorrador[indice],indice)));
    const codigo=$('proyectoCodigo').value||'Proyecto nuevo',nombre=$('proyectoNombre').value;$('cronogramaProyectoActual').textContent=nombre?`${codigo} · ${nombre}`:codigo;
    tabla.querySelectorAll('input[data-cronograma-campo]').forEach(campo=>campo.addEventListener('change',evento=>{const indice=Number(evento.target.closest('tr').dataset.indiceCronograma),clave=evento.target.dataset.cronogramaCampo;cronogramaBorrador[indice][clave]=clave==='avance'?Math.max(0,Math.min(100,Number(evento.target.value||0))):evento.target.value;normalizarResumenesCronograma();renderCronogramaProyecto();}));
    tabla.querySelectorAll('[data-seleccion-cronograma]').forEach(casilla=>casilla.addEventListener('change',evento=>{const indice=Number(evento.target.dataset.seleccionCronograma);evento.target.checked?cronogramaSeleccionadas.add(indice):cronogramaSeleccionadas.delete(indice);actualizarSeleccionCronograma();}));
    tabla.querySelectorAll('[data-alternar-cronograma]').forEach(boton=>boton.addEventListener('click',()=>{const indice=Number(boton.dataset.alternarCronograma);cronogramaColapsados.has(indice)?cronogramaColapsados.delete(indice):cronogramaColapsados.add(indice);renderCronogramaProyecto();}));
    tabla.querySelectorAll('tr').forEach(fila=>{fila.addEventListener('click',evento=>{if(evento.target.closest('input,button'))return;const indice=Number(fila.dataset.indiceCronograma);cronogramaSeleccionadas.has(indice)?cronogramaSeleccionadas.delete(indice):cronogramaSeleccionadas.add(indice);renderCronogramaProyecto();});fila.addEventListener('dragstart',evento=>{cronogramaArrastre=Number(fila.dataset.indiceCronograma);evento.dataTransfer.effectAllowed='move';});fila.addEventListener('dragover',evento=>evento.preventDefault());fila.addEventListener('drop',evento=>{evento.preventDefault();const destino=Number(fila.dataset.indiceCronograma);if(cronogramaArrastre<0||cronogramaArrastre===destino)return;const [actividad]=cronogramaBorrador.splice(cronogramaArrastre,1);cronogramaBorrador.splice(destino,0,actividad);cronogramaArrastre=-1;renderCronogramaProyecto();});});
    renderGanttCronograma();actualizarDeslizadorGantt();actualizarSeleccionCronograma();
  }
  function actualizarDeslizadorGantt(){requestAnimationFrame(()=>{const pares=[[document.querySelector('.tabla-cronograma-proyecto'),$('deslizadorTablaCronograma')],[document.querySelector('.gantt-cronograma-proyecto'),$('deslizadorGanttCronograma')]];pares.forEach(([panel,deslizador])=>{if(!panel||!deslizador)return;const maximo=Math.max(0,panel.scrollWidth-panel.clientWidth);deslizador.max=maximo;deslizador.value=Math.min(maximo,panel.scrollLeft);deslizador.disabled=maximo<2;});});}
  function horasEfectivasCronograma(horario) {
    const minutos=valor=>{const [h,m]=valor.split(':').map(Number);return h*60+m;};
    return Math.max(0,((minutos(horario[3])-minutos(horario[0]))-(minutos(horario[2])-minutos(horario[1])))/60);
  }
  function renderCalendarioCronograma() {
    const nombres={1:'Lun',2:'Mar',3:'Mié',4:'Jue',5:'Vie',6:'Sáb',0:'Dom'},orden=[1,2,3,4,5,6,0];
    $('semanaCalendarioCronograma').replaceChildren(...orden.map(dia=>{const etiqueta=document.createElement('label'),casilla=document.createElement('input');casilla.type='checkbox';casilla.dataset.diaCalendario=dia;casilla.checked=calendarioCronograma.dias.has(dia);etiqueta.append(casilla,document.createTextNode(nombres[dia]));return etiqueta;}));
    const diasTexto=orden.filter(dia=>calendarioCronograma.dias.has(dia)).map(dia=>nombres[dia]).join(', ')||'ninguno';
    $('resumenCalendarioCronograma').textContent=`Laborables: ${diasTexto} · ${calendarioCronograma.feriados.length} día(s) no laborable(s) registrado(s).`;
    $('filasHorarioCronograma').replaceChildren(...orden.map(dia=>{const horario=calendarioCronograma.horarios[dia],fila=document.createElement('div');fila.className='fila-horario-cronograma';fila.innerHTML=`<strong>${nombres[dia]}</strong>${horario.map((valor,pos)=>`<input type="time" data-horario-dia="${dia}" data-horario-posicion="${pos}" value="${valor}" ${calendarioCronograma.dias.has(dia)?'':'disabled'}>`).join('')}<b>${horasEfectivasCronograma(horario).toFixed(1)} h</b>`;return fila;}));
    $('listaFeriadosCronograma').replaceChildren(...calendarioCronograma.feriados.map((feriado,indice)=>{const fila=document.createElement('li');fila.innerHTML=`<span><b>${feriado.fecha}</b> · ${feriado.nombre}</span><button type="button" data-eliminar-feriado="${indice}">Quitar</button>`;return fila;}));
  }
  function abrirModalEliminarProyecto(proyecto) {
    proyectoPendienteEliminar=proyecto;
    $('textoConfirmarEliminarProyecto').textContent=`Eliminar ${proyecto.codigo} · ${proyecto.nombre}`;
    $('detalleConfirmarEliminarProyecto').textContent='¿Desea eliminar este proyecto? La acción no se puede deshacer.';
    $('modalConfirmarEliminarProyecto').showModal();
  }
  function eliminarProyectoPendiente() {
    if(!proyectoPendienteEliminar)return;
    const indice=ciudades.findIndex(p=>p.codigo===proyectoPendienteEliminar.codigo);
    if(indice>=0)ciudades.splice(indice,1);
    proyectoPendienteEliminar=null;
    if(proyectoEdicionSeleccionado?.codigo===$('proyectoCodigo').value)limpiarFormularioProyecto();
    actualizarFiltros();
    actualizar();
    renderListaProyectosEdicion();
    $('modalConfirmarEliminarProyecto').close();
  }
  function poblarUbicacionesProyecto() {
    const departamento=$('proyectoDepartamento');
    const provincia=$('proyectoProvincia');
    const distrito=$('proyectoDistrito');
    const departamentoActual=departamento.value;
    const provinciaActual=provincia.value;
    departamento.replaceChildren(new Option('Seleccione departamento',''));
    [...new Set(ciudades.map(p=>p.departamento))].sort((a,b)=>a.localeCompare(b,'es')).forEach(v=>departamento.add(new Option(v,v)));
    if([...departamento.options].some(o=>o.value===departamentoActual))departamento.value=departamentoActual;
    const departamentosFiltrados=ciudades.filter(p=>!departamento.value||p.departamento===departamento.value);
    provincia.replaceChildren(new Option('Seleccione provincia',''));
    [...new Set(departamentosFiltrados.map(p=>p.provincia))].sort((a,b)=>a.localeCompare(b,'es')).forEach(v=>provincia.add(new Option(v,v)));
    if([...provincia.options].some(o=>o.value===provinciaActual))provincia.value=provinciaActual;
    const provinciasFiltradas=departamentosFiltrados.filter(p=>!provincia.value||p.provincia===provincia.value);
    distrito.replaceChildren(new Option('Seleccione distrito',''));
    [...new Set(provinciasFiltradas.map(p=>p.distrito))].sort((a,b)=>a.localeCompare(b,'es')).forEach(v=>distrito.add(new Option(v,v)));
  }
  function normalizarFilaExcelProyecto(fila) {
    const entrada=Object.entries(fila || {}).reduce((acum,[clave,valor])=>{
      acum[clave.toLowerCase().trim()] = valor;
      return acum;
    },{});
    return {
      nombre: normalizarTexto(entrada.nombre || entrada.nombres || entrada['nombre completo'] || entrada.apellidos || ''),
      documento: normalizarTexto(entrada.documento || entrada.dni || entrada.ruc || entrada['nro documento'] || entrada['n° documento'] || ''),
      codigo: normalizarTexto(entrada.codigo || entrada.código || entrada.cod || entrada.id || ''),
      estado: normalizarTexto(entrada.estado || entrada.situacion || entrada.situcion || 'Pendiente')
    };
  }
  async function cargarBeneficiariosDesdeExcelProyecto(file) {
    if(!file)return;
    const boton=$('excelProyecto');
    const tabla=$('tablaBeneficiariosProyecto');
    const barras=[...document.querySelectorAll('.barra-beneficiarios-proyecto small')];
    try {
      if(!window.XLSX) throw new Error('XLSX no disponible');
      const buffer=await file.arrayBuffer();
      const libro=XLSX.read(buffer,{type:'array'});
      const hoja=libro.Sheets[libro.SheetNames[0]];
      const registros=XLSX.utils.sheet_to_json(hoja,{defval:''}).map(normalizarFilaExcelProyecto).filter(f=>Object.values(f).some(Boolean));
      tabla.replaceChildren();
      if(!registros.length){
        limpiarBeneficiariosProyecto();
        return;
      }
      registros.forEach(registro=>agregarFilaBeneficiarioProyecto(registro));
      barras.forEach(nodo=>nodo.textContent=`${file.name} cargado correctamente.`);
    } catch (error) {
      limpiarBeneficiariosProyecto();
      const fila=document.createElement('tr');
      fila.className='fila-vacia-beneficiarios';
      fila.innerHTML='<td colspan="6">No fue posible leer el Excel. Verifique que el archivo tenga una primera hoja con columnas de nombre, documento, código y estado.</td>';
      tabla.replaceChildren(fila);
      barras.forEach(nodo=>nodo.textContent='No fue posible leer el archivo. Verifique el formato.');
    } finally {
      boton.value='';
      actualizarIndicesBeneficiariosProyecto();
    }
  }

  function puntosXml(doc, etiqueta) {
    return [...doc.querySelectorAll(etiqueta)].map(n=>{
      if(etiqueta==='trkpt'||etiqueta==='wpt') return [Number(n.getAttribute('lat')),Number(n.getAttribute('lon'))];
      const a=n.textContent.trim().split(',').map(Number); return [a[1],a[0]];
    }).filter(p=>p.every(Number.isFinite));
  }
  async function cargarArchivo(file) {
    if(!file)return;
    $('estadoCargaModal').textContent=`Procesando ${file.name}...`;
    $('estadoCarga').textContent=`Procesando ${file.name}…`;
    try {
      const nombre=$('nombreCapa').value.trim()||file.name;
      let capa;
      if(/\.zip$/i.test(file.name)){
        capa=L.featureGroup([
          L.polyline([[-12.05,-77.07],[-12.08,-77.01],[-12.12,-76.96]],{color:'#8a55c5',weight:5}).bindTooltip(nombre),
          L.circleMarker([-12.08,-77.01],{radius:7,color:'#fff',weight:2,fillColor:'#8a55c5',fillOpacity:1}).bindTooltip(`${nombre} · elemento GIS`)
        ]);
      } else {
        const texto=await file.text();
        if(/\.(json|geojson)$/i.test(file.name)) capa=L.geoJSON(JSON.parse(texto),{style:{color:'#8a55c5',weight:5},onEachFeature:(f,l)=>l.bindTooltip(f.properties?.name||f.properties?.nombre||nombre)});
        else {
          const xml=new DOMParser().parseFromString(texto,'application/xml');
          const puntos=/\.gpx$/i.test(file.name)?[...puntosXml(xml,'trkpt'),...puntosXml(xml,'wpt')]:puntosXml(xml,'coordinates');
          if(!puntos.length) throw new Error('Sin coordenadas válidas');
          capa=L.polyline(puntos,{color:'#8a55c5',weight:5}).bindTooltip(nombre);
        }
      }
      if(capaGis) mapa.removeLayer(capaGis); capaGis=capa.addTo(mapa); mapa.fitBounds(capa.getBounds(),{padding:[35,35]});
      $('mostrarCapaCargada').checked=true; $('estadoCarga').textContent=`${file.name} cargado e indexado correctamente`;
      $('estadoCargaModal').textContent=`${file.name} cargado e indexado correctamente`;
      return true;
    } catch(e) { $('estadoCarga').textContent='No fue posible leer el archivo. Verifica su formato GIS.'; $('estadoCargaModal').textContent='No fue posible leer el archivo. Verifica su formato GIS.'; return false; }
  }
  function iniciar() {
    // Canvas mantiene fluido el mapa aun cuando un distrito contiene miles de
    // polígonos INEI, sin perder la interacción de tuberías y beneficiarios.
    const botonCrearProyecto=$('abrirCrearProyecto');
    const cabeceraProyectos=document.querySelector('.barra-proyectos-cabecera');
    const botonAlternarProyectos=$('alternarBarraProyectos');
    if(modoContratista&&botonCrearProyecto){botonCrearProyecto.hidden=true;botonCrearProyecto.setAttribute('aria-hidden','true');}else if(botonCrearProyecto&&cabeceraProyectos)cabeceraProyectos.insertBefore(botonCrearProyecto,botonAlternarProyectos);
    mapa=L.map('mapaMasificacion',{zoomControl:false,preferCanvas:true}).setView([-10.6,-75.2],5);
    // Los estratos son el fondo; la infraestructura siempre queda visible encima.
    [
      ['estratosPane',410],
      ['coberturaPane',420],
      ['concesionariaPane',430],
      ['ramalesPane',440],
      ['troncalPane',450],
      ['beneficiariosPane',470],
      ['dibujoPane',480],
      ['seleccionPane',490]
    ].forEach(([nombre,zIndex])=>{
      mapa.createPane(nombre);
      mapa.getPane(nombre).style.zIndex=String(zIndex);
    });
    L.control.zoom({position:'bottomleft'}).addTo(mapa);
    bases.osm=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'});
    bases.topografico=L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{attribution:'© OpenTopoMap'});
    capaBase=bases.osm.addTo(mapa); capaInfluencia=L.layerGroup().addTo(mapa); capaManzanas=L.layerGroup().addTo(mapa); capaPredios=L.layerGroup().addTo(mapa); capaProyectos=L.layerGroup().addTo(mapa);
    capaDibujo=L.layerGroup().addTo(mapa);
    ajustarAlturaTableroMasificacion();
    window.addEventListener('resize',ajustarAlturaTableroMasificacion);
    if('ResizeObserver' in window){
      new ResizeObserver(()=>requestAnimationFrame(()=>mapa?.invalidateSize({pan:false}))).observe(document.querySelector('.tablero-masificacion'));
    }
    ['estrato','beneficiarios','cobertura','troncal','ramales','concesionaria'].forEach(nombre=>capasContexto[nombre]=L.layerGroup().addTo(mapa));
    actualizarFiltros(); actualizar();
    $('buscarBarraProyectos')?.addEventListener('input',renderBarraProyectos);
    $('alternarBarraProyectos')?.addEventListener('click',()=>{
      const barra=$('barraProyectosMapa');
      const tablero=document.querySelector('.tablero-masificacion');
      const boton=$('alternarBarraProyectos');
      const contraida=barra.classList.toggle('contraida');
      tablero?.classList.toggle('proyectos-ocultos',contraida);
      if(contraida)tablero?.append(boton);
      else barra?.querySelector('.barra-proyectos-cabecera')?.append(boton);
      document.querySelector('.mapa-panel')?.classList.toggle('proyectos-contraidos',contraida);
      $('alternarBarraProyectos').setAttribute('aria-expanded',String(!contraida));
      $('alternarBarraProyectos').setAttribute('aria-label',contraida?'Ampliar proyectos':'Contraer proyectos');
      actualizarTamanoMapaMasificacion();
    });
    $('listaProyectosMapa')?.addEventListener('click',evento=>{
      const accion=evento.target.closest('[data-accion-barra]');
      if(accion){
        if(modoContratista)return;
        const proyecto=ciudades.find(item=>item.codigo===accion.dataset.codigo);
        if(!proyecto)return;
        if(accion.dataset.accionBarra==='subproyecto'){
          poblarUbicacionesProyecto();
          limpiarFormularioProyecto();
          $('proyectoPadre').value=proyecto.codigo;
          proponerSubproyecto(proyecto.codigo);
          $('etiquetaCrearProyecto').textContent='NUEVO SUBPROYECTO';
          $('tituloCrearProyecto').textContent='Crear subproyecto';
          $('descripcionCrearProyecto').textContent=`Registre un subproyecto vinculado a ${proyecto.codigo} · ${proyecto.nombre}.`;
          $('modalCrearProyecto').showModal();
        }else if(accion.dataset.accionBarra==='editar'){
          poblarUbicacionesProyecto();
          cargarProyectoEnFormulario(proyecto);
          $('modalCrearProyecto').showModal();
        }else abrirModalEliminarProyecto(proyecto);
        return;
      }
      const alternar=evento.target.closest('[data-alternar-subproyectos]');
      if(alternar){
        const codigo=alternar.dataset.alternarSubproyectos;
        proyectosExpandidos.has(codigo)?proyectosExpandidos.delete(codigo):proyectosExpandidos.add(codigo);
        renderBarraProyectos();
        return;
      }
      const subproyecto=evento.target.closest('[data-subproyecto]');
      if(subproyecto){
        seleccionarProyectoDesdeBarra(subproyecto.dataset.proyecto,subproyecto.dataset.fase);
        return;
      }
      const principal=evento.target.closest('[data-seleccionar-proyecto]');
      if(principal)seleccionarProyectoDesdeBarra(principal.dataset.seleccionarProyecto);
    });
    [['botonMapas','panelMapas'],['botonCapas','panelCapas']].forEach(([b,p])=>$(b).addEventListener('click',()=>alternarPanel($(b),$(p))));
    document.querySelectorAll('input[name="mapaBase"]').forEach(r=>r.addEventListener('change',()=>{mapa.removeLayer(capaBase);capaBase=bases[r.value].addTo(mapa);capaBase.bringToBack();}));
    document.querySelectorAll('[data-estado]').forEach(c=>c.addEventListener('change',()=>{c.checked?estadosVisibles.add(c.dataset.estado):estadosVisibles.delete(c.dataset.estado);actualizar();}));
    $('mostrarCapaCargada').addEventListener('change',e=>{if(!capaGis)return;e.target.checked?capaGis.addTo(mapa):mapa.removeLayer(capaGis);});
    [['mostrarManzanas',()=>capaManzanas],['mostrarPredios',()=>capaPredios],['mostrarInfluencia',()=>capaInfluencia]].forEach(([id,capa])=>$(id).addEventListener('change',e=>e.target.checked?capa().addTo(mapa):mapa.removeLayer(capa())));
    document.querySelectorAll('[data-capa-proyecto]').forEach(control=>control.addEventListener('change',()=>{const capa=capasContexto[control.dataset.capaProyecto];control.checked?capa.addTo(mapa):mapa.removeLayer(capa);}));
    document.querySelectorAll('[data-filtro-estrato]').forEach(boton=>boton.addEventListener('click',()=>aplicarFiltroEstratos(boton.dataset.filtroEstrato)));
    $('abrirPotencial')?.addEventListener('click',abrirModalPotencial);
    inicializarTrazabilidad();
    $('abrirTrazabilidad')?.addEventListener('click',()=>$('modalTrazabilidad').showModal());
    $('abrirInformesSupervision').addEventListener('click',abrirInformesSupervision);
    document.querySelectorAll('[data-tipo-supervision]').forEach(b=>b.addEventListener('click',()=>configurarInformeSupervision(b.dataset.tipoSupervision)));
    $('supervisionFotos').addEventListener('change',cargarFotosManualesSupervision);
    $('sincronizarFotosSupervision').addEventListener('click',()=>{
      evidenciasMovilSupervision.forEach(f=>f.incluida=true);
      renderizarGaleriaSupervision();
      $('estadoInformeSupervision').textContent='6 fotografías sincronizadas desde SUP-CUSCO-04.';
    });
    $('exportarSupervisionCsv').addEventListener('click',exportarSupervisionCsv);
    $('exportarSupervisionPdf').addEventListener('click',exportarSupervisionPdf);
    $('abrirExportacionMasificacion').addEventListener('click',abrirModalExportacion);
    $('exportarPotencial').addEventListener('click',abrirModalExportacion);
    $('confirmarExportacionMasificacion').addEventListener('click',confirmarExportacionMasificacion);
    const modalCrearProyecto=$('modalCrearProyecto');
    const abrirCrearProyecto=()=>{
      poblarUbicacionesProyecto();
      actualizarResumenEquipoProyecto();
      renderListaProyectosEdicion();
      limpiarFormularioProyecto();
      modalCrearProyecto.showModal();
    };
    $('abrirCrearProyecto').addEventListener('click',abrirCrearProyecto);
    $('cerrarCrearProyecto').addEventListener('click',()=>modalCrearProyecto.close());
    $('cancelarCrearProyecto').addEventListener('click',()=>modalCrearProyecto.close());
    $('abrirPlanificacionProyecto').addEventListener('click',()=>abrirPlanificacionTecnica(proyectoEdicionSeleccionado));
    $('abrirPlanificacionDetalle').addEventListener('click',()=>abrirPlanificacionTecnica(proyectoSeleccionado));
    const cerrarPlanificacion=()=>$('modalPlanificacionTecnica').close();
    $('cerrarPlanificacionTecnica').addEventListener('click',cerrarPlanificacion);
    $('cancelarPlanificacionTecnica').addEventListener('click',cerrarPlanificacion);
    document.querySelectorAll('[data-pestana-planificacion]').forEach(boton=>boton.addEventListener('click',()=>{leerPlanificacionFormulario();document.querySelectorAll('[data-pestana-planificacion]').forEach(item=>item.classList.toggle('activo',item===boton));document.querySelectorAll('[data-panel-planificacion]').forEach(panel=>panel.hidden=panel.dataset.panelPlanificacion!==boton.dataset.pestanaPlanificacion);renderObservacionesPlanificacion();actualizarResumenPlanificacion();}));
    $('tablaRequisitosPlanificacion').addEventListener('change',evento=>{if(evento.target.matches('[data-requisito-estado]'))evento.target.dataset.estado=evento.target.value;leerPlanificacionFormulario();renderObservacionesPlanificacion();actualizarResumenPlanificacion();});
    $('tablaRequisitosPlanificacion').addEventListener('input',()=>{leerPlanificacionFormulario();renderObservacionesPlanificacion();actualizarResumenPlanificacion();});
    $('agregarRequisitoPlanificacion').addEventListener('click',()=>{leerPlanificacionFormulario();const nombre=prompt('Nombre del nuevo requisito técnico:');if(!nombre)return;const parametro=prompt('Parámetro o criterio de cumplimiento:')||'Definido por FISE';planificacionBorrador.requisitos.push({nombre:nombre.trim(),parametro:parametro.trim(),estado:'pendiente',comentario:'',responsable:'',fechaLimite:'',subsanado:false});renderPlanificacionTecnica();});
    $('archivosPlanificacion').addEventListener('change',evento=>{if(!planificacionBorrador)planificacionBorrador=crearPlanificacionProyecto();[...evento.target.files].forEach(archivo=>planificacionBorrador.evidencias.push({nombre:archivo.name,tipo:archivo.type||'Archivo',tamano:Math.max(1,Math.round(archivo.size/1024))}));evento.target.value='';renderPlanificacionTecnica();});
    $('listaObservacionesPlanificacion').addEventListener('input',evento=>{const indice=Number(evento.target.dataset.observacionResponsable??evento.target.dataset.observacionFecha);if(!Number.isInteger(indice)||!planificacionBorrador.requisitos[indice])return;if(evento.target.dataset.observacionResponsable!==undefined)planificacionBorrador.requisitos[indice].responsable=evento.target.value;if(evento.target.dataset.observacionFecha!==undefined)planificacionBorrador.requisitos[indice].fechaLimite=evento.target.value;});
    $('listaObservacionesPlanificacion').addEventListener('change',evento=>{if(evento.target.dataset.observacionSubsanada===undefined)return;const indice=Number(evento.target.dataset.observacionSubsanada);if(planificacionBorrador.requisitos[indice])planificacionBorrador.requisitos[indice].subsanado=evento.target.checked;actualizarResumenPlanificacion();});
    $('confirmarCierrePlanificacion').addEventListener('change',actualizarResumenPlanificacion);
    $('cerrarEtapaPlanificacion').addEventListener('click',()=>{leerPlanificacionFormulario();planificacionBorrador.cerrada=true;planificacionBorrador.fechaCierre=new Date().toISOString().slice(0,10);$('confirmarCierrePlanificacion').checked=true;$('estadoGuardadoPlanificacion').textContent='Planificación cerrada. El proyecto puede iniciar ejecución.';actualizarResumenPlanificacion();});
    $('guardarPlanificacionTecnica').addEventListener('click',()=>{leerPlanificacionFormulario();const destino=proyectoEdicionSeleccionado||proyectoSeleccionado;if(destino)destino.planificacionTecnica=structuredClone(planificacionBorrador);$('estadoGuardadoPlanificacion').textContent='Planificación guardada correctamente.';setTimeout(cerrarPlanificacion,350);});
    $('nuevoProyectoEdicion')?.addEventListener('click',()=>limpiarFormularioProyecto());
    $('proyectoPadre').addEventListener('change',evento=>proponerSubproyecto(evento.target.value));
    const volverAccionesGeometria=()=>{
      $('modalDibujoArea').close();
      if(geometriaProyectoBorrador&&!$('modalAccionesGeometria').open)$('modalAccionesGeometria').showModal();
    };
    $('cerrarDibujoArea').addEventListener('click',volverAccionesGeometria);
    $('cancelarDibujoArea').addEventListener('click',volverAccionesGeometria);
    $('cerrarAccionesGeometria').addEventListener('click',eliminarGeometriaProyectoBorrador);
    $('guardarGeometriaMapa').addEventListener('click',()=>{
      if(!geometriaProyectoBorrador)return;
      const selector=$('proyectoZonaObjetivo'),valor=proyectoSeleccionado?.codigo||selector.value;
      selector.replaceChildren(...ciudades.map(proyecto=>new Option(`${proyecto.codigo} · ${proyecto.nombre}`,proyecto.codigo)));
      if([...selector.options].some(opcion=>opcion.value===valor))selector.value=valor;
      $('nombreZonaProyecto').value='';$('estadoZonaProyecto').textContent='Indique el nombre, tipo de objeto y proyecto que recibirá el área.';$('estadoZonaProyecto').classList.remove('exito');
      $('modalAccionesGeometria').close();
      $('modalDibujoArea').showModal();
    });
    $('editarGeometriaMapa').addEventListener('click',activarEdicionGeometriaProyecto);
    $('finalizarEdicionGeometria').addEventListener('click',finalizarEdicionGeometriaProyecto);
    $('eliminarGeometriaMapa').addEventListener('click',eliminarGeometriaProyectoBorrador);
    $('guardarZonaProyecto').addEventListener('click',()=>{
      const nombre=$('nombreZonaProyecto').value.trim(),tipo=$('tipoZonaProyecto').value,codigoProyecto=$('proyectoZonaObjetivo').value;
      const estado=$('estadoZonaProyecto');
      if(!codigoProyecto){estado.textContent='Seleccione el proyecto o subproyecto que recibirá la geometría.';estado.classList.remove('exito');return;}
      if(!nombre){estado.textContent='Escriba un nombre para la geometría antes de dibujar.';estado.classList.remove('exito');$('nombreZonaProyecto').focus();return;}
      dibujoProyectoPendiente={nombre,tipo,codigoProyecto};
      completarDibujoProyecto();
    });
    $('abrirCronogramaProyecto').addEventListener('click',()=>{
      renderCronogramaProyecto();
      $('modalCronogramaProyecto').showModal();
    });
    $('cerrarCronogramaProyecto').addEventListener('click',()=>$('modalCronogramaProyecto').close());
    $('cancelarCronogramaProyecto').addEventListener('click',()=>$('modalCronogramaProyecto').close());
    $('agregarActividadCronograma').addEventListener('click',()=>{
      leerCronogramaProyecto();
      cronogramaBorrador.push({fase:$('proyectoFase').value||'Anteproyecto'});
      renderCronogramaProyecto();
    });
    $('tablaCronogramaProyecto').addEventListener('click',evento=>{
      const boton=evento.target.closest('[data-accion="eliminar-actividad"]');
      if(!boton)return;
      const indice=Number(boton.closest('tr')?.dataset.indiceCronograma);
      if(Number.isInteger(indice)){
        cronogramaBorrador.splice(indice,1);
        cronogramaSeleccionadas.clear();
        cronogramaColapsados.clear();
        renderCronogramaProyecto();
      }
    });
    $('tablaCronogramaProyecto').addEventListener('click',evento=>{
      const boton=evento.target.closest('[data-recurso-cronograma]');
      if(!boton)return;
      leerCronogramaProyecto();
      indiceRecursoCronograma=Number(boton.dataset.recursoCronograma);
      renderRecursosCronograma();
      $('modalRecursosCronograma').showModal();
    });
    $('tablaCronogramaProyecto').addEventListener('input',()=>{leerCronogramaProyecto();renderGanttCronograma();});
    $('tablaCronogramaProyecto').addEventListener('change',evento=>{if(evento.target.matches('[data-seleccion-cronograma]'))actualizarSeleccionCronograma();});
    $('seleccionarTodoCronograma').addEventListener('change',evento=>{$('tablaCronogramaProyecto').querySelectorAll('[data-seleccion-cronograma]').forEach(casilla=>{casilla.checked=evento.target.checked;const indice=Number(casilla.dataset.seleccionCronograma);evento.target.checked?cronogramaSeleccionadas.add(indice):cronogramaSeleccionadas.delete(indice);});actualizarSeleccionCronograma();});
    $('bajarNivelCronograma').addEventListener('click',()=>ajustarNivelCronograma(1));
    $('subirNivelCronograma').addEventListener('click',()=>ajustarNivelCronograma(-1));
    $('calendarioCronogramaProyecto').addEventListener('click',()=>{renderCalendarioCronograma();$('modalCalendarioCronograma').showModal();});
    $('cerrarCalendarioCronograma').addEventListener('click',()=>$('modalCalendarioCronograma').close());
    $('cancelarCalendarioCronograma').addEventListener('click',()=>$('modalCalendarioCronograma').close());
    $('semanaCalendarioCronograma').addEventListener('change',evento=>{const dia=Number(evento.target.dataset.diaCalendario);evento.target.checked?calendarioCronograma.dias.add(dia):calendarioCronograma.dias.delete(dia);renderCalendarioCronograma();});
    $('filasHorarioCronograma').addEventListener('change',evento=>{const input=evento.target;if(!input.matches('[data-horario-dia]'))return;calendarioCronograma.horarios[Number(input.dataset.horarioDia)][Number(input.dataset.horarioPosicion)]=input.value;renderCalendarioCronograma();});
    $('aplicarHorarioCronograma').addEventListener('click',()=>{const horario=[$('horaEntradaCronograma').value,$('horaInicioRefrigerioCronograma').value,$('horaFinRefrigerioCronograma').value,$('horaSalidaCronograma').value];calendarioCronograma.dias.forEach(dia=>calendarioCronograma.horarios[dia]=[...horario]);renderCalendarioCronograma();});
    $('agregarFeriadoCronograma').addEventListener('click',()=>{const fecha=$('fechaFeriadoCronograma').value,nombre=$('nombreFeriadoCronograma').value.trim()||'Día no laborable';if(!fecha)return;calendarioCronograma.feriados.push({fecha,nombre});$('fechaFeriadoCronograma').value='';$('nombreFeriadoCronograma').value='';renderCalendarioCronograma();});
    $('listaFeriadosCronograma').addEventListener('click',evento=>{const boton=evento.target.closest('[data-eliminar-feriado]');if(!boton)return;calendarioCronograma.feriados.splice(Number(boton.dataset.eliminarFeriado),1);renderCalendarioCronograma();});
    $('guardarCalendarioCronograma').addEventListener('click',()=>{$('estadoImportacionCronograma').textContent=`Calendario aplicado: ${calendarioCronograma.dias.size} día(s) laborables por semana y ${calendarioCronograma.feriados.length} feriado(s).`;$('modalCalendarioCronograma').close();});
    $('cerrarRecursosCronograma').addEventListener('click',()=>{$('modalRecursosCronograma').close();renderCronogramaProyecto();});
    $('guardarRecursosCronograma').addEventListener('click',()=>{$('modalRecursosCronograma').close();renderCronogramaProyecto();});
    $('agregarRecursoCronograma').addEventListener('click',()=>{
      const actividad=cronogramaBorrador[indiceRecursoCronograma],nombre=$('nombreRecursoCronograma').value.trim();
      if(!actividad||!nombre)return;
      (actividad.recursos??=[]).push({nombre,tipo:$('tipoRecursoCronograma').value,cantidad:$('cantidadRecursoCronograma').value||'1',horas:$('horasRecursoCronograma').value||'8'});
      $('nombreRecursoCronograma').value='';renderRecursosCronograma();
    });
    $('listaRecursosCronograma').addEventListener('click',evento=>{
      const boton=evento.target.closest('[data-eliminar-recurso-cronograma]');if(!boton)return;
      cronogramaBorrador[indiceRecursoCronograma]?.recursos?.splice(Number(boton.dataset.eliminarRecursoCronograma),1);renderRecursosCronograma();
    });
    $('deslizadorTablaCronograma').addEventListener('input',evento=>{const panel=document.querySelector('.tabla-cronograma-proyecto');if(panel)panel.scrollLeft=Number(evento.target.value);});
    $('deslizadorGanttCronograma').addEventListener('input',evento=>{const panel=document.querySelector('.gantt-cronograma-proyecto');if(panel)panel.scrollLeft=Number(evento.target.value);});
    document.querySelector('.tabla-cronograma-proyecto')?.addEventListener('scroll',evento=>{const deslizador=$('deslizadorTablaCronograma');if(document.activeElement!==deslizador)deslizador.value=evento.currentTarget.scrollLeft;});
    document.querySelector('.gantt-cronograma-proyecto')?.addEventListener('scroll',evento=>{const deslizador=$('deslizadorGanttCronograma');if(document.activeElement!==deslizador)deslizador.value=evento.currentTarget.scrollLeft;});
    $('importarCronogramaProyecto').addEventListener('change',async evento=>{
      const archivo=evento.target.files?.[0];if(!archivo)return;
      try{
        const buffer=await archivo.arrayBuffer();let filas=[];
        if(/\.xlsx$/i.test(archivo.name)&&window.XLSX){const libro=XLSX.read(buffer,{type:'array'});filas=XLSX.utils.sheet_to_json(libro.Sheets[libro.SheetNames[0]],{header:1});}
        else if(/\.xml$/i.test(archivo.name)){
          const xml=new DOMParser().parseFromString(new TextDecoder().decode(buffer),'application/xml');
          filas=[['Código','Actividad','Fase','Inicio','Fin','Predecesora','Sucesora','Avance'],...[...xml.querySelectorAll('Task')].filter(t=>t.querySelector('Name')?.textContent).map((t,i)=>[t.querySelector('UID')?.textContent||`ACT-${String(i+1).padStart(2,'0')}`,t.querySelector('Name')?.textContent||'', $('proyectoFase').value||'Anteproyecto',(t.querySelector('Start')?.textContent||'').slice(0,10),(t.querySelector('Finish')?.textContent||'').slice(0,10),'','',t.querySelector('PercentComplete')?.textContent||0])];
        } else filas=new TextDecoder().decode(buffer).split(/\r?\n/).map(linea=>linea.split(/[;,]/));
        const datos=filas.slice(1).map((fila,i)=>({codigo:String(fila[0]||`ACT-${String(i+1).padStart(2,'0')}`).trim(),actividad:String(fila[1]||'').trim(),fase:String(fila[2]||$('proyectoFase').value||'Anteproyecto').trim(),inicio:String(fila[3]||'').trim(),fin:String(fila[4]||'').trim(),predecesora:String(fila[5]||'').trim(),sucesora:String(fila[6]||'').trim(),avance:Number(fila[7]||0)})).filter(item=>item.actividad||item.inicio);
        if(!datos.length)throw new Error('sin filas válidas');
        cronogramaBorrador=datos;renderCronogramaProyecto();$('estadoImportacionCronograma').textContent=`${datos.length} actividad(es) importadas desde ${archivo.name}.`;
      }catch(error){$('estadoImportacionCronograma').textContent='No se pudo importar el archivo. Use columnas: código, actividad, fase, inicio, fin, predecesora, sucesora, avance.';}
      evento.target.value='';
    });
    $('exportarCronogramaProyecto').addEventListener('click',()=>{
      leerCronogramaProyecto();
      const Pdf=window.jspdf?.jsPDF;
      if(!Pdf){$('estadoImportacionCronograma').textContent='La exportación PDF no está disponible.';return;}
      const pdf=new Pdf({orientation:'landscape'});pdf.setFontSize(16);pdf.text('Cronograma del proyecto',14,16);pdf.setFontSize(9);
      const filas=cronogramaBorrador.map((item,indice)=>[indice+1,item.actividad,item.inicio,item.fin,item.predecesora||'',item.sucesora||'',`${item.avance||0}%`,(item.recursos||[]).map(recurso=>recurso.nombre).join(', ')]);
      if(typeof pdf.autoTable==='function')pdf.autoTable({head:[['N°','Actividad','Inicio','Fin','Pred.','Suc.','Avance','Recursos']],body:filas,startY:22,styles:{fontSize:7},headStyles:{fillColor:[33,96,128]}});
      else filas.forEach((fila,i)=>pdf.text(fila.join(' | '),14,28+i*7));
      const conFechas=cronogramaBorrador.filter(item=>item.inicio&&item.fin);
      let y=(pdf.lastAutoTable?.finalY||28+filas.length*7)+12;
      if(y+conFechas.length*10>195){pdf.addPage();y=18;}
      pdf.setFontSize(11);pdf.setTextColor(26,42,68);pdf.text('Diagrama Gantt / avance',14,y);y+=7;
      if(conFechas.length){const dia=86400000,fechas=conFechas.flatMap(item=>[new Date(`${item.inicio}T00:00:00`),new Date(`${item.fin}T00:00:00`)]),inicio=new Date(Math.min(...fechas)),fin=new Date(Math.max(...fechas)),span=Math.max(1,Math.round((fin-inicio)/dia)+1),x=62,ancho=210,colores=[[77,174,186],[240,146,88],[216,94,176],[99,127,224]];pdf.setFontSize(6);conFechas.forEach((item,indice)=>{const desde=new Date(`${item.inicio}T00:00:00`),hasta=new Date(`${item.fin}T00:00:00`),izquierda=x+Math.max(0,Math.round((desde-inicio)/dia))/span*ancho,barra=Math.max(6,(Math.round((hasta-desde)/dia)+1)/span*ancho),color=colores[indice%colores.length];pdf.setTextColor(34,48,76);pdf.text(`${indice+1}. ${(item.actividad||item.codigo).slice(0,26)}`,14,y+5);pdf.setFillColor(...color);pdf.roundedRect(izquierda,y,barra,4,1,1,'F');pdf.setFillColor(82,199,122);pdf.roundedRect(izquierda,y+4.8,barra*Math.max(0,Math.min(100,Number(item.avance||0)))/100,1.5,.5,.5,'F');y+=10;});}
      pdf.save(`cronograma-${$('proyectoCodigo').value||'proyecto'}.pdf`);
    });
    $('guardarCronogramaProyecto').addEventListener('click',()=>{
      leerCronogramaProyecto();
      $('modalCronogramaProyecto').close();
    });
    $('buscarProyectoEdicion')?.addEventListener('input',renderListaProyectosEdicion);
    $('listaProyectosEdicion')?.addEventListener('click',e=>{
      const accion=e.target.closest('[data-accion]');
      if(!accion)return;
      const proyecto=ciudades.find(p=>p.codigo===accion.dataset.codigo);
      if(!proyecto)return;
      if(accion.dataset.accion==='editar-proyecto')cargarProyectoEnFormulario(proyecto);
      if(accion.dataset.accion==='crear-subproyecto'){
        limpiarFormularioProyecto();
        $('proyectoPadre').value=proyecto.codigo;
        proponerSubproyecto(proyecto.codigo);
      }
      if(accion.dataset.accion==='eliminar-proyecto')abrirModalEliminarProyecto(proyecto);
    });
    $('cerrarConfirmarEliminarProyecto').addEventListener('click',()=>$('modalConfirmarEliminarProyecto').close());
    $('cancelarEliminarProyecto').addEventListener('click',()=>$('modalConfirmarEliminarProyecto').close());
    $('confirmarEliminarProyecto').addEventListener('click',eliminarProyectoPendiente);
    $('proyectoDepartamento').addEventListener('change',poblarUbicacionesProyecto);
    $('proyectoProvincia').addEventListener('change',poblarUbicacionesProyecto);
    $('proyectoEquipo').addEventListener('change',actualizarResumenEquipoProyecto);
    $('agregarBeneficiarioProyecto').addEventListener('click',()=>{
      if($('tablaBeneficiariosProyecto').querySelector('.fila-vacia-beneficiarios'))$('tablaBeneficiariosProyecto').replaceChildren();
      agregarFilaBeneficiarioProyecto();
    });
    $('tablaBeneficiariosProyecto').addEventListener('click',e=>{
      const boton=e.target.closest('[data-accion="eliminar-beneficiario"]');
      if(!boton)return;
      boton.closest('tr')?.remove();
      if(!$('tablaBeneficiariosProyecto').children.length)limpiarBeneficiariosProyecto();
      else actualizarIndicesBeneficiariosProyecto();
    });
    $('tablaBeneficiariosProyecto').addEventListener('input',actualizarIndicesBeneficiariosProyecto);
    $('excelProyecto').addEventListener('change',e=>cargarBeneficiariosDesdeExcelProyecto(e.target.files[0]));
    $('guardarCrearProyecto').addEventListener('click',()=>{
      const datos=obtenerDatosFormularioProyecto();
      if(!datos.codigo||!datos.nombre)return;
      const codigoAnterior=proyectoEdicionSeleccionado?.codigo||'';
      sincronizarBeneficiariosProyecto(codigoAnterior||datos.codigo);
      if(proyectoEdicionSeleccionado){
        Object.assign(proyectoEdicionSeleccionado,datos);
        prepararVersionesProyecto(proyectoEdicionSeleccionado);
        Object.assign(proyectoEdicionSeleccionado.versiones[versionCartograficaActiva],{estado:datos.estado,avance:datos.avance,longitud:datos.longitud,elementos:datos.elementos});
        if(codigoAnterior&&codigoAnterior!==datos.codigo){
          const beneficiariosPrevios=beneficiariosEdicionPorProyecto.get(codigoAnterior);
          beneficiariosEdicionPorProyecto.delete(codigoAnterior);
          if(beneficiariosPrevios)beneficiariosEdicionPorProyecto.set(datos.codigo,beneficiariosPrevios);
        }
      } else {
        prepararVersionesProyecto(datos);
        Object.assign(datos.versiones[versionCartograficaActiva],{estado:datos.estado,avance:datos.avance,longitud:datos.longitud,elementos:datos.elementos});
        aplicarVersionCartografica(datos,versionCartograficaActiva);
        ciudades.unshift(datos);
        proyectoEdicionSeleccionado=datos;
      }
      actualizarFiltros();
      actualizar();
      renderListaProyectosEdicion();
      cargarBeneficiariosDelProyecto(datos.codigo);
      $('contadorMapa').textContent=`Proyecto guardado: ${datos.codigo} · ${$('tablaBeneficiariosProyecto').querySelectorAll('tr:not(.fila-vacia-beneficiarios)').length} beneficiario(s)`;
    });
    const modalSubirCapa=$('modalSubirCapa'), archivoGis=$('archivoGisModal');
    const cerrarModalCapa=()=>{$('botonSubir').setAttribute('aria-expanded','false');modalSubirCapa.close();};
    $('botonSubir').addEventListener('click',()=>{document.querySelectorAll('.panel-flotante').forEach(p=>p.hidden=true);$('botonSubir').setAttribute('aria-expanded','true');modalSubirCapa.showModal();});
    $('cerrarSubirCapa').addEventListener('click',cerrarModalCapa);
    $('cancelarSubirCapa').addEventListener('click',cerrarModalCapa);
    $('seleccionarArchivoCapa').addEventListener('click',()=>archivoGis.click());
    archivoGis.addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;const extension=file.name.split('.').pop().toLowerCase();const tipos={gpx:'GPX · Ruta o puntos',geojson:'GeoJSON · Datos geográficos',json:'JSON · Datos geográficos',kml:'KML · Capa geográfica',zip:'ZIP · Paquete GIS'};$('estadoCargaModal').textContent=file.name;$('tipoCapaDetectado').textContent=tipos[extension]||extension.toUpperCase();$('mensajeSubirCapa').textContent='Archivo listo para cargar en el mapa.';if(!$('nombreCapa').value)$('nombreCapa').value=file.name.replace(/\.[^.]+$/,'');});
    $('cargarCapa').addEventListener('click',async()=>{const file=archivoGis.files[0];if(!file){$('mensajeSubirCapa').textContent='Selecciona un archivo antes de cargar la capa.';return;}const boton=$('cargarCapa');boton.disabled=true;boton.textContent='Cargando...';const ok=await cargarArchivo(file);boton.disabled=false;boton.textContent='Cargar capa';if(ok){$('mensajeSubirCapa').textContent='Capa cargada correctamente en el mapa.';setTimeout(cerrarModalCapa,350);}});
    modalSubirCapa.addEventListener('click',e=>{if(e.target===modalSubirCapa)cerrarModalCapa();});
    $('buscarProyecto').addEventListener('input',actualizar);
    ['filtroProyecto','filtroDepartamento','filtroProvincia','filtroDistrito','filtroEstado'].forEach(id=>$(id).addEventListener('change',()=>{
      if(id==='filtroDepartamento'||id==='filtroProvincia')actualizarFiltros();
      actualizar();
      if(id==='filtroProyecto'&&$('filtroProyecto').value){
        const proyecto=ciudades.find(p=>`${p.codigo} · ${p.nombre}`===$('filtroProyecto').value);
        if(proyecto)mostrarDetalle(proyecto);
      }
    }));
    $('filtrosMasificacion').addEventListener('reset',()=>setTimeout(()=>{actualizarFiltros();actualizar();restablecerTodo();},0));
    $('cerrarDetalle').addEventListener('click',cerrarProyecto);
    const volverAlProyecto=()=>{if(proyectoSeleccionado)mostrarDetalle(proyectoSeleccionado);};
    $('cerrarBeneficiario').addEventListener('click',volverAlProyecto);
    $('volverProyecto').addEventListener('click',volverAlProyecto);
    botonResumenMasificacion.addEventListener('click', alternarResumenMasificacion);
    $('abrirHerramientas').addEventListener('click',()=>{const abrir=$('grupoHerramientas').hidden;$('grupoHerramientas').hidden=!abrir;$('abrirHerramientas').setAttribute('aria-expanded',String(abrir));});
    document.querySelectorAll('[data-herramienta]').forEach(b=>b.addEventListener('click',()=>activarHerramienta(b.dataset.herramienta,b)));
    $('limpiarSeleccion').addEventListener('click',limpiarSeleccion);
    mapa.on('click',clickDibujo);mapa.on('mousemove',moverDibujo);mapa.on('dblclick',cerrarDibujo);
    document.addEventListener('keydown',evento=>{
      if(evento.key!=='Escape')return;
      evento.preventDefault();document.querySelectorAll('dialog[open]').forEach(modal=>modal.close());
      $('accionesGeometriaMapa').hidden=true;geometriaProyectoBorrador=null;desactivarHerramientasMapa(true);restablecerTodo();
    });
    let arrastreHerramientas=null;
    $('grupoHerramientas').addEventListener('pointerdown',e=>{
      if(!e.target.closest('[data-herramienta="mover"]'))return;
      const barra=$('grupoHerramientas'),rect=barra.getBoundingClientRect();
      arrastreHerramientas={dx:e.clientX-rect.left,dy:e.clientY-rect.top};
      barra.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    $('grupoHerramientas').addEventListener('pointermove',e=>{
      if(!arrastreHerramientas)return;
      const barra=$('grupoHerramientas');
      barra.style.position='fixed';
      barra.style.left=Math.max(8,Math.min(innerWidth-barra.offsetWidth-8,e.clientX-arrastreHerramientas.dx))+'px';
      barra.style.top=Math.max(8,Math.min(innerHeight-barra.offsetHeight-8,e.clientY-arrastreHerramientas.dy))+'px';
      barra.style.right='auto';
      barra.style.bottom='auto';
      barra.style.zIndex='1600';
    });
    $('grupoHerramientas').addEventListener('pointerup',()=>arrastreHerramientas=null);
    $('grupoHerramientas').addEventListener('pointercancel',()=>arrastreHerramientas=null);
    $('cambiarZonaExpediente').addEventListener('click',cambiarZonaExpediente);
    document.querySelectorAll('[data-cerrar-modal]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.cerrarModal).close()));
    document.querySelectorAll('.modal-masificacion').forEach(modal=>modal.addEventListener('click',e=>{if(e.target===modal)modal.close();}));
    const tabInformeTecnico=$('tabInformeTecnico'),tabResolucion=$('tabResolucion');
    const cambiarDocumentoInforme=tipo=>{
      const esInforme=tipo==='informe';
      $('vistaInformeTecnico').hidden=!esInforme;
      $('vistaResolucion').hidden=esInforme;
      tabInformeTecnico.classList.toggle('activo',esInforme);
      tabResolucion.classList.toggle('activo',!esInforme);
      tabInformeTecnico.setAttribute('aria-selected',String(esInforme));
      tabResolucion.setAttribute('aria-selected',String(!esInforme));
    };
    tabInformeTecnico?.addEventListener('click',()=>cambiarDocumentoInforme('informe'));
    tabResolucion?.addEventListener('click',()=>cambiarDocumentoInforme('resolucion'));
    $('excelLiquidacion').addEventListener('change',e=>{
      $('estadoLiquidacion').textContent=e.target.files[0]?`${e.target.files[0].name} cargado · 4 partidas reconocidas · 4 objetos GIS vinculados`:'Modelo listo para carga masiva y vinculación espacial.';
    });
    $('liquidacionTotal').addEventListener('change',actualizarLiquidacion);
    $('porcentajeLiquidacion').addEventListener('input',actualizarLiquidacion);
    $('partidasLiquidacion').addEventListener('click',e=>{if(e.target.classList.contains('eliminar-partida'))e.target.closest('tr').remove();});
    $('agregarPartida').addEventListener('click',()=>{
      const fila=document.createElement('tr');
      fila.innerHTML='<td>NUEVO-VNR</td><td>Nueva partida de liquidación</td><td>m</td><td>0</td><td>US$ 0.00</td><td>GIS pendiente</td><td>Por vincular</td><td class="monto-liquidacion" data-total="0">US$ 0.00</td><td><button class="eliminar-partida">Eliminar</button></td>';
      $('partidasLiquidacion').append(fila);
    });
    actualizarLiquidacion();
  }
  async function prepararDatosGeo(){
    const respuesta=await fetch('datos_masificacion.geojson');
    if(!respuesta.ok) throw new Error('GeoJSON no disponible');
    datosGeo=(await respuesta.json()).features;
    ciudades=construirCatalogoProyectosDesdeGeojson(datosGeo);
    ciudades.forEach(proyecto=>aplicarVersionCartografica(proyecto,versionCartograficaActiva));
    const respuestaManzanas=await fetch('manzanas_urbanas_masificacion.geojson');
    if(respuestaManzanas.ok){
      manzanasUrbanas=(await respuestaManzanas.json()).features || [];
    }
    const respuestaEstratos=await fetch('compartido/masificacion_estratos_inei.geojson');
    if(!respuestaEstratos.ok)throw new Error('Estratos INEI no disponibles');
    estratosInei=(await respuestaEstratos.json()).features || [];
  }
  if(typeof L==='undefined'){ $('contadorMapa').textContent='No se pudo cargar el mapa'; return; }
  function iniciarControlesSatMasificacion(){
    const modal=$('modalControlProyecto');
    const contenido=$('contenidoControlProyecto');
    const titulo=$('tituloControlProyecto');
    const subtitulo=$('subtituloControlProyecto');
    const proyectoActual=()=>proyectoSeleccionado||ciudades[0]||{codigo:'MAS-001',nombre:'Proyecto de Masificación'};
    document.querySelectorAll('[data-version-proyecto]').forEach(boton=>boton.addEventListener('click',()=>{
      cambiarVersionCartografica(boton.dataset.versionProyecto);
    }));
    $('botonVersionesMapa')?.addEventListener('click',()=>{
      const selector=$('proyectoVersionMapa');
      selector.replaceChildren(...ciudades.map(p=>new Option(`${p.codigo} · ${p.nombre}`,p.codigo)));
      selector.value=proyectoSeleccionado?.codigo||ciudades[0]?.codigo||'';
      document.querySelectorAll('[data-version-modal]').forEach(boton=>boton.classList.toggle('activo',boton.dataset.versionModal===versionCartograficaActiva));
      $('modalVersionesMapa').showModal();
      renderizarMapasVersiones(selector.value);
    });
    $('proyectoVersionMapa')?.addEventListener('change',event=>renderizarMapasVersiones(event.target.value));
    document.querySelectorAll('[data-version-modal]').forEach(boton=>boton.addEventListener('click',()=>{
      cambiarVersionCartografica(boton.dataset.versionModal);
      $('modalVersionesMapa').close();
    }));
    const plantillas={
      checklist:p=>({titulo:'Checklist de aptitud técnica',subtitulo:`${p.codigo} · evaluación del terreno con evidencia georreferenciada`,html:`
        <div class="mc-kpis"><article><small>Ítems evaluados</small><strong>12</strong></article><article><small>Conformes</small><strong>9</strong></article><article><small>Observados</small><strong>2</strong></article><article><small>No aplica</small><strong>1</strong></article></div>
        <table><thead><tr><th>Verificación</th><th>Resultado</th><th>Coordenadas</th><th>Evidencia</th></tr></thead><tbody><tr><td>Acceso para maquinaria</td><td>Conforme</td><td>${p.lat?.toFixed?.(5)||'-12.04'}, ${p.lng?.toFixed?.(5)||'-77.03'}</td><td>Foto 01</td></tr><tr><td>Estabilidad del terreno</td><td>Conforme</td><td>Georreferenciada</td><td>Foto 02</td></tr><tr><td>Interferencias existentes</td><td>Observado</td><td>Georreferenciada</td><td>Foto 03</td></tr><tr><td>Disponibilidad del derecho de vía</td><td>Conforme</td><td>Georreferenciada</td><td>Foto 04</td></tr></tbody></table><div class="mc-acciones"><button>Agregar evidencia</button><button class="principal">Guardar checklist</button></div>`}),
      informe:p=>({titulo:'Informe diario de supervisión',subtitulo:`${p.codigo} · revisión previa del registro fotográfico`,html:`<div class="mc-kpis"><article><small>Fotos recibidas</small><strong>8</strong></article><article><small>Seleccionadas</small><strong>6</strong></article><article><small>Descartadas</small><strong>2</strong></article><article><small>Avance diario</small><strong>3.8%</strong></article></div><div class="mc-fotos"><article class="mc-foto"><b>Frente de excavación</b><small>08:20 · GPS validado</small><button>Eliminar del informe</button></article><article class="mc-foto"><b>Tendido de tubería</b><small>11:45 · GPS validado</small><button>Eliminar del informe</button></article><article class="mc-foto"><b>Reposición de pavimento</b><small>16:10 · GPS validado</small><button>Eliminar del informe</button></article></div><div class="mc-acciones"><button>Vista previa</button><button class="principal">Descargar reporte final</button></div>`}),
      documentos:p=>({titulo:'Documentos clave del proyecto',subtitulo:`Acceso directo desde la cabecera de ${p.codigo}`,html:`<table><thead><tr><th>Documento</th><th>Versión</th><th>Fecha</th><th>Acceso</th></tr></thead><tbody><tr><td>Cronograma de ejecución</td><td>V.04</td><td>20/07/2026</td><td><button class="mc-enlace">Abrir PDF</button></td></tr><tr><td>Ingeniería básica</td><td>V.02</td><td>15/07/2026</td><td><button class="mc-enlace">Ver plano</button></td></tr><tr><td>Ingeniería de detalle</td><td>V.01</td><td>22/07/2026</td><td><button class="mc-enlace">Ver plano</button></td></tr><tr><td>Memoria descriptiva</td><td>Final</td><td>25/07/2026</td><td><button class="mc-enlace">Abrir PDF</button></td></tr></tbody></table>`}),
      avance:p=>({titulo:'Seguimiento porcentual periódico',subtitulo:`${p.codigo} · comparación de alcance proyectado frente a avance real`,html:`<div class="mc-kpis"><article><small>Alcance proyectado</small><strong>100%</strong></article><article><small>Avance real</small><strong>${p.avance||62}%</strong></article><article><small>Desviación</small><strong>-${Math.max(0,100-(p.avance||62))}%</strong></article><article><small>Periodo</small><strong>P5</strong></article></div><table><thead><tr><th>Periodo</th><th>Planificado</th><th>Real</th><th>Variación</th></tr></thead><tbody><tr><td>P1</td><td>20%</td><td>18%</td><td>-2%</td></tr><tr><td>P2</td><td>40%</td><td>37%</td><td>-3%</td></tr><tr><td>P3</td><td>60%</td><td>55%</td><td>-5%</td></tr><tr><td>P4</td><td>80%</td><td>${Math.min(79,p.avance||68)}%</td><td>-${Math.max(1,80-Math.min(79,p.avance||68))}%</td></tr><tr><td>P5</td><td>100%</td><td>${p.avance||62}%</td><td>-${Math.max(0,100-(p.avance||62))}%</td></tr></tbody></table><div class="mc-acciones"><button>Exportar tabla</button><button class="principal">Generar dashboard</button></div>`})
    };
    document.querySelectorAll('[data-control-proyecto]').forEach(boton=>boton.addEventListener('click',()=>{
      const vista=plantillas[boton.dataset.controlProyecto](proyectoActual());
      titulo.textContent=vista.titulo;subtitulo.textContent=vista.subtitulo;contenido.innerHTML=vista.html;modal.showModal();
    }));
    contenido.addEventListener('click',e=>{
      const botonEliminar=e.target.closest('.mc-foto button');
      if(!botonEliminar)return;
      botonEliminar.closest('.mc-foto')?.remove();
      const restantes=contenido.querySelectorAll('.mc-foto').length;
      const seleccionadas=contenido.querySelector('.mc-kpis article:nth-child(2) strong');
      const descartadas=contenido.querySelector('.mc-kpis article:nth-child(3) strong');
      if(seleccionadas)seleccionadas.textContent=String(restantes);
      if(descartadas)descartadas.textContent=String(Math.max(0,8-restantes));
    });
    $('cerrarControlProyecto').addEventListener('click',()=>modal.close());
    modal.addEventListener('click',e=>{if(e.target===modal)modal.close();});
  }
  iniciarControlesSatMasificacion();
  prepararDatosGeo().then(iniciar).catch(()=>{$('contadorMapa').textContent='No se pudo cargar datos_masificacion.geojson';});
})();
