/**
 * Pozuelo Talent Assessment
 * Archivo: app.js (Versión Consolidada Completa - Fase 1, 2 y 3)
 */

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // 0. CONFIGURACIÓN DE CONEXIÓN (POWER AUTOMATE)
  // =========================================================================
  const CONFIG_API = {
    MODO_CONEXION: 'POWER_AUTOMATE',
    CODIGO_APLICACION: 'TALENT_ASSESSMENT',
    URL_FLUJO_AUTH: 'https://07ab455229acef3aa55c6fad98a14b.e7.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/16/workflows/16fd370514014149910bdadf9e1afb7e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=1NEq9e_PDMDw6UbXddzzSQbyD9VNU8301qudLuj1dpY',
    URL_FLUJO_REQUISICIONES: 'https://07ab455229acef3aa55c6fad98a14b.e7.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/28/workflows/7d77dc4450484599a8351cb46e39e463/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=h4gTZZkOF_fuIkE3cb9HEAzPWZXHlsFsmbWUjKTelKg',
    URL_FLUJO_GUARDAR_SELECCION: 'https://default820fb4b74c9942348e775038c7b081.60.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/11/workflows/87e29c58e0eb4d07ace1ef7b16aa4bc9/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=1UKtO97_kwusfT1L9y9z1Nzm4ghXMWgWY7oVwCuP_pg',
    URL_FLUJO_GUARDAR_SALIDA: 'https://07ab455229acef3aa55c6fad98a14b.e7.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/29/workflows/c52b452d7510442abf57a6c2fe604c99/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=ci19WoCURRC1FUfvIlFaf9SO0O6qXtzk2Gcm7tvOJj0',
    URL_FLUJO_LISTAR_SELECCION: 'https://07ab455229acef3aa55c6fad98a14b.e7.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/18/workflows/0a43ca462696413eb1daf209a74b68ff/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=2BNOeSOKUkR62NaqSD9nb6hlbIop_TC5TnGoB6Cw5a8'
  };

  // =========================================================================
  // 1. ESTADO GLOBAL DE LA SESIÓN
  // =========================================================================
  const estado = {
    moduloActual: 'hub',
    evaluador: null,
    listaRequisicionesSP: [],
    // Selección
    listaResultadosSeleccionSP: [],
    idFilaSharePoint: null,
    cedulaCandidato: '',
    candidato: '',
    requisicion: '',
    puestoSeleccionado: '',
    areaGestion: 'Operaciones',
    tipoIngreso: 'Nuevo ingreso',
    nivelPuesto: 'operativo',
    evaluaciones: {},
    preguntaAdicional: { activa: false, texto: '', calificacion: 1.0, notas: '' },
    // Salida
    salida: {
      compania: '',
      cedula: '',
      colaborador: '',
      cargo: '',
      jefatura: '',
      antiguedadEmpresa: '',
      antiguedadPuesto: '',
      motivo: '',
      fortalezas: [],
      expPositiva: '',
      expNegativa: '',
      calificacionesMatriz: {},
      feedbackLider: '',
      cumplioExpectativas: '',
      enps: '',
      sugerenciaMejora: '',
      notasEntrevistador: ''
    }
  };

  let paqueteSeleccionPendiente = null;

  // Referencias principales del DOM
  const seccionHub = document.getElementById('seccionHub');
  const seccionRequisiciones = document.getElementById('seccionRequisiciones');
  const seccionEncuadre = document.getElementById('seccionEncuadre');
  const seccionEvaluacion = document.getElementById('seccionEvaluacion');
  const seccionResultado = document.getElementById('seccionResultado');
  const seccionSalida = document.getElementById('seccionSalida');
  const seccionTerna = document.getElementById('seccionTerna');
  const contenedorEtapasSeleccion = document.getElementById('contenedorEtapasSeleccion');
  const contenedorKpiSalida = document.getElementById('contenedorKpiSalida');

  function extraerTextoSP(campo) {
    if (campo === null || campo === undefined) return '';
    if (typeof campo === 'object') return String(campo.Value || campo.Title || campo.Email || '').trim();
    return String(campo).trim();
  }

  // =========================================================================
  // 2. GESTIÓN DE ACCESO CENTRALIZADO Y CONTROL POR ROLES (RBAC)
  // =========================================================================
  const modalLogin = document.getElementById('modalLoginEvaluador');
  const inputUsuario = document.getElementById('inputUsuarioAcceso');
  const inputClave = document.getElementById('inputClaveAcceso');
  const errorLogin = document.getElementById('errorLoginEvaluador');
  const btnConfirmar = document.getElementById('btnConfirmarCodigo');
  const btnCambiar = document.getElementById('btnCambiarEvaluador');

  function generarIniciales(nombreCompleto) {
    if (!nombreCompleto) return 'GH';
    const partes = nombreCompleto.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }

  function verificarSesionEvaluador() {
    const sesion = sessionStorage.getItem('pozuelo_talent_sesion');
    if (sesion) {
      try {
        const datos = JSON.parse(sesion);
        aplicarPerfilEvaluador(datos);
      } catch (e) {
        solicitarIdentificacion();
      }
    } else {
      solicitarIdentificacion();
    }
  }

  function solicitarIdentificacion() {
    if (modalLogin) {
      modalLogin.classList.remove('hidden');
      if (errorLogin) errorLogin.classList.add('hidden');
      if (inputUsuario) {
        inputUsuario.value = '';
        setTimeout(() => inputUsuario.focus(), 150);
      }
      if (inputClave) inputClave.value = '';
    }
  }

  function resolverRolTalentAssessment(rolCrudo) {
    const texto = String(rolCrudo || '').trim();
    if (!texto) return { codigo: 'completo', etiqueta: 'Gestión Humana' };

    const partes = texto.split(',').map(p => p.trim());
    const rolEspecificoTA = partes.find(p => p.toUpperCase().startsWith('TA:'));
    const rolEfectivo = rolEspecificoTA ? rolEspecificoTA.substring(3).trim() : partes[0];

    const rolMin = rolEfectivo.toLowerCase();
    if (rolMin === 'gestor_rq' || rolMin === 'gestor rq' || rolMin === 'requisiciones') {
      return { codigo: 'gestor_rq', etiqueta: 'Gestor de Requisiciones' };
    }

    return { codigo: 'completo', etiqueta: rolEfectivo };
  }

    function aplicarPermisosPorRol(rolTexto) {
    const rolResuelto = resolverRolTalentAssessment(rolTexto);
    const cardSeleccion = document.getElementById('btnModuloSeleccion');
    const cardSalida = document.getElementById('btnModuloSalida');
    const cardTerna = document.getElementById('btnModuloTerna');
    const gridHub = document.getElementById('gridTarjetasHub');

    if (rolResuelto.codigo === 'gestor_rq') {
      cardSeleccion?.classList.add('hidden');
      cardSalida?.classList.add('hidden');
      cardTerna?.classList.add('hidden');
      if (gridHub) {
        gridHub.classList.remove('md:grid-cols-2', 'xl:grid-cols-4');
        gridHub.classList.add('md:grid-cols-1', 'max-w-md');
      }
    } else {
      cardSeleccion?.classList.remove('hidden');
      cardSalida?.classList.remove('hidden');
      cardTerna?.classList.remove('hidden');
      if (gridHub) {
        gridHub.classList.remove('md:grid-cols-1', 'max-w-md');
        gridHub.classList.add('md:grid-cols-2', 'xl:grid-cols-4');
      }
    }

    return rolResuelto.etiqueta;
  }

  function aplicarPerfilEvaluador(perfil) {
    estado.evaluador = perfil;

    const avatar = document.getElementById('avatarEvaluador');
    const nombre = document.getElementById('nombreEvaluador');
    const rol = document.getElementById('rolEvaluador');

    const etiquetaRolLimpia = aplicarPermisosPorRol(perfil.rol);

    if (avatar) avatar.textContent = generarIniciales(perfil.nombre);
    if (nombre) nombre.textContent = perfil.nombre || perfil.usuario;
    if (rol) rol.textContent = perfil.puesto || etiquetaRolLimpia || 'Gestión Humana';

    sessionStorage.setItem('pozuelo_talent_sesion', JSON.stringify(perfil));

    if (modalLogin) modalLogin.classList.add('hidden');
    if (window.lucide) lucide.createIcons();
  }

  async function intentarDesbloqueoCentralizado() {
    if (!inputUsuario || !inputClave) return;

    const usuario = inputUsuario.value.trim().toLowerCase();
    const clave = inputClave.value.trim();

    if (!usuario || !clave) {
      if (errorLogin) {
        errorLogin.textContent = '⚠️ Digite su correo corporativo y contraseña.';
        errorLogin.classList.remove('hidden');
      }
      return;
    }

    btnConfirmar.disabled = true;
    btnConfirmar.textContent = '⏳ Verificando credenciales...';
    if (errorLogin) errorLogin.classList.add('hidden');

    try {
      const response = await fetch(CONFIG_API.URL_FLUJO_AUTH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: usuario,
          clave: clave,
          app: CONFIG_API.CODIGO_APLICACION
        })
      });

      if (response.status === 401 || !response.ok) {
        throw new Error('Credenciales inválidas o sin permiso para Talent Assessment.');
      }

      const data = await response.json();

      if (data.autorizado) {
        const perfil = {
          usuario: usuario,
          nombre: data.nombre || usuario,
          rol: data.rol || 'Evaluador GH',
          puesto: data.puesto || ''
        };
        aplicarPerfilEvaluador(perfil);
      } else {
        throw new Error('Acceso denegado por el administrador.');
      }
    } catch (error) {
      console.warn('Fallo de autenticación:', error.message);
      if (errorLogin) {
        errorLogin.textContent = `❌ ${error.message}`;
        errorLogin.classList.remove('hidden');
      }
      inputClave.value = '';
      inputClave.focus();
    } finally {
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = 'Iniciar Sesión';
    }
  }

  btnConfirmar?.addEventListener('click', intentarDesbloqueoCentralizado);
  inputClave?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      intentarDesbloqueoCentralizado();
    }
  });

  btnCambiar?.addEventListener('click', () => {
    if (confirm('¿Desea cerrar la sesión actual y cambiar de usuario?')) {
      sessionStorage.removeItem('pozuelo_talent_sesion');
      solicitarIdentificacion();
    }
  });

  verificarSesionEvaluador();

  // =========================================================================
  // 3. COPILOT FLOTANTE
  // =========================================================================
  const copilotDrawer = document.getElementById('copilotDrawer');
  const btnToggleCopilot = document.getElementById('btnToggleCopilot');
  const btnCerrarCopilot = document.getElementById('btnCerrarCopilot');

  function abrirCopilot() { copilotDrawer?.classList.remove('translate-x-full'); }
  function cerrarCopilot() { copilotDrawer?.classList.add('translate-x-full'); }

  btnToggleCopilot?.addEventListener('click', (e) => {
    e.stopPropagation();
    copilotDrawer?.classList.contains('translate-x-full') ? abrirCopilot() : cerrarCopilot();
  });
  btnCerrarCopilot?.addEventListener('click', cerrarCopilot);

  // =========================================================================
  // 4. NAVEGACIÓN DESDE EL HUB
  // =========================================================================
function ocultarTodasLasVistas() {
    seccionHub?.classList.add('hidden');
    seccionRequisiciones?.classList.add('hidden');
    seccionEncuadre?.classList.add('hidden');
    seccionEvaluacion?.classList.add('hidden');
    seccionResultado?.classList.add('hidden');
    seccionSalida?.classList.add('hidden');
    seccionTerna?.classList.add('hidden');
    contenedorEtapasSeleccion?.classList.add('hidden');
    contenedorKpiSalida?.classList.add('hidden');
  }

  document.getElementById('cardModuloRequisiciones')?.addEventListener('click', () => {
    estado.moduloActual = 'requisiciones';
    ocultarTodasLasVistas();
    seccionRequisiciones?.classList.remove('hidden');

    document.getElementById('resumenModulo').textContent = 'Gestión de Requisiciones';
    document.getElementById('resumenRQ').textContent = 'Alta / Consulta';
    document.getElementById('resumenCandidato').textContent = 'Múltiples';
    document.getElementById('resumenNivel').textContent = 'SharePoint';

    inicializarModuloRequisiciones();
    if (window.lucide) lucide.createIcons();
  });

  document.getElementById('btnModuloSeleccion')?.addEventListener('click', () => {
    estado.moduloActual = 'seleccion';
    ocultarTodasLasVistas();
    seccionEncuadre?.classList.remove('hidden');
    contenedorEtapasSeleccion?.classList.remove('hidden');

    document.getElementById('resumenModulo').textContent = 'Entrevista Selección';
    document.getElementById('resumenRQ').textContent = 'Sincronizando...';
    actualizarBarraEtapas(1);
    cargarRequisicionesParaEntrevista();
    if (window.lucide) lucide.createIcons();
  });

  document.getElementById('btnModuloSalida')?.addEventListener('click', () => {
    estado.moduloActual = 'salida';
    ocultarTodasLasVistas();
    seccionSalida?.classList.remove('hidden');
    contenedorKpiSalida?.classList.remove('hidden');

    document.getElementById('resumenModulo').textContent = 'Entrevista de Salida';
    document.getElementById('resumenRQ').textContent = 'N/A - Salida';
    document.getElementById('resumenCandidato').textContent = 'Colaborador por definir';
    document.getElementById('resumenNivel').textContent = 'Registro de Egreso';

    inicializarModuloSalida();
    if (window.lucide) lucide.createIcons();
  });

  document.getElementById('btnVolverHubGlobal')?.addEventListener('click', () => {
    ocultarTodasLasVistas();
    seccionHub?.classList.remove('hidden');

    estado.moduloActual = 'hub';
    document.getElementById('resumenModulo').textContent = 'Hub Principal';
    document.getElementById('resumenRQ').textContent = 'Sin seleccionar';
    document.getElementById('resumenCandidato').textContent = 'Por definir';
    document.getElementById('resumenNivel').textContent = 'N/A';
    cerrarCopilot();
  });

  // =========================================================================
  // 5. MÓDULO DE GESTIÓN DE REQUISICIONES (CARGA Y LECTURA SHAREPOINT)
  // =========================================================================
  const contenedorFilas = document.getElementById('contenedorFilasCandidatos');

  function crearFilaParticipanteHTML() {
    const div = document.createElement('div');
    div.className = 'fila-participante grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center bg-slate-50 p-3 rounded-2xl border border-slate-200';
    div.innerHTML = `
      <div class="md:col-span-3">
        <input type="text" placeholder="Cédula (Ej: 1-1580-0421)" class="rq-cand-cedula w-full text-xs font-semibold uppercase border border-slate-300 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-amber-500">
      </div>
      <div class="md:col-span-5">
        <input type="text" placeholder="Nombre y dos Apellidos" class="rq-cand-nombre w-full text-xs font-semibold uppercase border border-slate-300 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-amber-500">
      </div>
      <div class="md:col-span-3">
        <select class="rq-cand-tipo w-full text-xs font-semibold border border-slate-300 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-amber-500">
          <option value="Nuevo ingreso">Nuevo ingreso</option>
          <option value="Colaborador regular">Colaborador regular</option>
        </select>
      </div>
      <div class="md:col-span-1 flex justify-end">
        <button type="button" class="btn-eliminar-fila p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer" title="Quitar participante">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `;

    const inputNombre = div.querySelector('.rq-cand-nombre');
    inputNombre?.addEventListener('input', (e) => {
      const pos = e.target.selectionStart;
      e.target.value = e.target.value.toUpperCase();
      e.target.setSelectionRange(pos, pos);
    });

    div.querySelector('.btn-eliminar-fila')?.addEventListener('click', () => {
      if (contenedorFilas.children.length > 1) {
        div.remove();
      } else {
        alert('Debe mantener al menos un participante en la requisición.');
      }
    });

    return div;
  }

  function inicializarModuloRequisiciones() {
    if (contenedorFilas && contenedorFilas.children.length === 0) {
      contenedorFilas.appendChild(crearFilaParticipanteHTML());
    }
    sincronizarTablaRequisicionesSP();
  }

  document.getElementById('btnAgregarFilaCandidato')?.addEventListener('click', () => {
    if (contenedorFilas) {
      contenedorFilas.appendChild(crearFilaParticipanteHTML());
      if (window.lucide) lucide.createIcons();
    }
  });

  document.getElementById('btnRefrescarTablaRQ')?.addEventListener('click', sincronizarTablaRequisicionesSP);

  async function consultarListaRequisicionesSP() {
    const response = await fetch(CONFIG_API.URL_FLUJO_REQUISICIONES, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'listar_rq' })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const registrosCrudos = Array.isArray(data) ? data : (data.value || []);

    estado.listaRequisicionesSP = registrosCrudos.map(raw => ({
      idFila: raw.ID,
      rqNumero: extraerTextoSP(raw.Title || raw.RQ_NUMERO),
      puesto: extraerTextoSP(raw.PUESTO),
      areaGestion: extraerTextoSP(raw.AREA_GESTION) || 'Operaciones',
      nivelOrganizacional: extraerTextoSP(raw.NIVEL_ORGANIZACIONAL) || 'operativo',
      cedula: extraerTextoSP(raw.CEDULA_CANDIDATO),
      nombre: extraerTextoSP(raw.NOMBRE_CANDIDATO),
      tipoIngreso: extraerTextoSP(raw.TIPO_INGRESO) || 'Nuevo ingreso',
      estadoProceso: extraerTextoSP(raw.ESTADO_PROCESO) || 'Pendiente'
    }));

    return estado.listaRequisicionesSP;
  }

  async function sincronizarTablaRequisicionesSP() {
    const tbody = document.getElementById('tbodyRequisicionesActivas');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400">⏳ Consultando SharePoint...</td></tr>';

    try {
      const lista = await consultarListaRequisicionesSP();

      if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400">No hay requisiciones registradas aún.</td></tr>';
        return;
      }

      const ordenados = [...lista].reverse();
      tbody.innerHTML = ordenados.map(item => {
        const esEvaluado = item.estadoProceso.toLowerCase() === 'evaluado';
        const badgeEstado = esEvaluado
          ? '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">✅ Evaluado</span>'
          : '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">⏳ Pendiente</span>';

        return `
          <tr class="hover:bg-slate-50/80">
            <td class="p-3 font-extrabold text-slate-800">${item.rqNumero}</td>
            <td class="p-3 font-semibold text-slate-700">${item.puesto}</td>
            <td class="p-3 text-slate-500">${item.areaGestion} • ${item.nivelOrganizacional}</td>
            <td class="p-3 font-bold text-slate-800">${item.nombre}</td>
            <td class="p-3 text-slate-500 font-mono">${item.cedula}</td>
            <td class="p-3">${badgeEstado}</td>
          </tr>
        `;
      }).join('');
    } catch (error) {
      console.error('Error al cargar tabla de RQ:', error);
      tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-rose-600 font-bold">❌ Error al conectar con SharePoint.</td></tr>';
    }
  }

  document.getElementById('btnGuardarRequisicion')?.addEventListener('click', async () => {
    const rqNum = document.getElementById('rqInputNumero').value.trim().toUpperCase();
    const puesto = document.getElementById('rqInputPuesto').value.trim().toUpperCase();
    const area = document.getElementById('rqSelectArea').value;
    const nivel = document.getElementById('rqSelectNivel').value;

    if (!rqNum || !puesto) {
      alert('Por favor complete el Número de Requisición y el Nombre del Puesto.');
      return;
    }

    const filas = document.querySelectorAll('.fila-participante');
    const candidatosValidos = [];

    filas.forEach(fila => {
      const ced = fila.querySelector('.rq-cand-cedula').value.trim().toUpperCase();
      const nom = fila.querySelector('.rq-cand-nombre').value.trim().toUpperCase();
      const tipo = fila.querySelector('.rq-cand-tipo').value;
      if (ced && nom) {
        candidatosValidos.push({ cedula: ced, nombre: nom, tipo_ingreso: tipo });
      }
    });

    if (candidatosValidos.length === 0) {
      alert('Debe ingresar al menos un participante con su Cédula y Nombre y dos Apellidos.');
      return;
    }

    const btnGuardar = document.getElementById('btnGuardarRequisicion');
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<span>⏳ Guardando en SharePoint...</span>';

    try {
      const payload = {
        accion: 'crear_rq',
        rq_numero: rqNum,
        puesto: puesto,
        area_gestion: area,
        nivel_organizacional: nivel,
        registrado_por: estado.evaluador?.usuario || 'sistema@pozuelo.cr',
        candidatos: candidatosValidos
      };

      const response = await fetch(CONFIG_API.URL_FLUJO_REQUISICIONES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      alert(`✅ Requisición ${rqNum} (${puesto}) registrada con ${candidatosValidos.length} participante(s).`);

      document.getElementById('rqInputNumero').value = '';
      document.getElementById('rqInputPuesto').value = '';
      contenedorFilas.innerHTML = '';
      contenedorFilas.appendChild(crearFilaParticipanteHTML());
      if (window.lucide) lucide.createIcons();

      await sincronizarTablaRequisicionesSP();
    } catch (error) {
      console.error('Error al guardar RQ:', error);
      alert('❌ No se pudo guardar la requisición en SharePoint. Verifique su conexión.');
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.innerHTML = '<i data-lucide="cloud-upload" class="w-4 h-4"></i><span>Guardar Requisición y Participantes</span>';
      if (window.lucide) lucide.createIcons();
    }
  });

  // =========================================================================
  // 6. PARÁMETROS SELECCIÓN (AUTOCOMPLETADO DESDE SHAREPOINT + 5 PASOS)
  // =========================================================================
  const contenedorPasos = document.getElementById('contenedorPasosEncuadre');
  if (contenedorPasos && typeof BANCO_DATOS !== 'undefined' && BANCO_DATOS.pasosEncuadre) {
    contenedorPasos.innerHTML = BANCO_DATOS.pasosEncuadre.map(p => `
      <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-start gap-2.5">
        <div>
          <span class="text-[10px] font-black uppercase text-red-600 tracking-wider">Paso ${p.paso}</span>
          <h4 class="text-xs font-bold text-slate-800 mt-1 leading-snug">${p.titulo}</h4>
        </div>
        <p class="text-[11px] text-slate-500 leading-relaxed">${p.descripcion}</p>
      </div>
    `).join('');
  }

  const selectRequisicion = document.getElementById('selectRequisicion');
  const selectCandidatoRQ = document.getElementById('selectCandidatoRQ');
  const inputCandidato = document.getElementById('inputCandidato');
  const badgeCedula = document.getElementById('badgeCedulaCandidato');
  const selectAreaGestion = document.getElementById('selectAreaGestion');
  const selectNivelPuesto = document.getElementById('selectNivelPuesto');

  async function cargarRequisicionesParaEntrevista() {
    const badgeCarga = document.getElementById('badgeEstadoCargaRQ');
    if (badgeCarga) badgeCarga.textContent = '⏳ Cargando vacantes...';

    try {
      const registros = await consultarListaRequisicionesSP();

      const mapaRQs = new Map();
      registros.forEach(r => {
        if (r.rqNumero && !mapaRQs.has(r.rqNumero)) {
          mapaRQs.set(r.rqNumero, { rqNumero: r.rqNumero, puesto: r.puesto });
        }
      });

      if (selectRequisicion) {
        selectRequisicion.innerHTML = '<option value="">Seleccione una requisición activa...</option>';
        mapaRQs.forEach(rq => {
          const opt = document.createElement('option');
          opt.value = rq.rqNumero;
          opt.textContent = `${rq.rqNumero} - ${rq.puesto}`;
          selectRequisicion.appendChild(opt);
        });
      }

      if (selectCandidatoRQ) {
        selectCandidatoRQ.innerHTML = '<option value="">Primero seleccione una RQ...</option>';
        selectCandidatoRQ.disabled = true;
      }

      if (badgeCarga) badgeCarga.textContent = `✅ ${mapaRQs.size} vacantes sincronizadas`;
      document.getElementById('resumenRQ').textContent = 'Seleccione RQ';
    } catch (error) {
      console.error('Error cargando RQ en selección:', error);
      if (badgeCarga) badgeCarga.textContent = '❌ Error de sincronización';
    }
  }

  selectRequisicion?.addEventListener('change', (e) => {
    const rqElegida = e.target.value;
    estado.requisicion = rqElegida;
    estado.idFilaSharePoint = null;
    estado.candidato = '';
    estado.cedulaCandidato = '';

    if (badgeCedula) badgeCedula.classList.add('hidden');
    document.getElementById('resumenRQ').textContent = rqElegida || 'Sin seleccionar';
    document.getElementById('resumenCandidato').textContent = 'Por definir';

    if (!rqElegida) {
      selectCandidatoRQ.innerHTML = '<option value="">Primero seleccione una RQ...</option>';
      selectCandidatoRQ.disabled = true;
      return;
    }

    const candidatosDeEstaRQ = estado.listaRequisicionesSP.filter(item => item.rqNumero === rqElegida);

    selectCandidatoRQ.innerHTML = '<option value="">Seleccione el candidato(a) a evaluar...</option>';
    candidatosDeEstaRQ.forEach(cand => {
      const opt = document.createElement('option');
      opt.value = cand.idFila;
      const marcaEstado = cand.estadoProceso.toLowerCase() === 'evaluado' ? '✅ Evaluado' : '⏳ Pendiente';
      opt.textContent = `${cand.nombre} (${marcaEstado})`;
      selectCandidatoRQ.appendChild(opt);
    });

    selectCandidatoRQ.disabled = false;
  });

  selectCandidatoRQ?.addEventListener('change', (e) => {
    const idFila = parseInt(e.target.value, 10);
    const registro = estado.listaRequisicionesSP.find(item => item.idFila === idFila);

    if (!registro) return;

    estado.idFilaSharePoint = registro.idFila;
    estado.candidato = registro.nombre;
    estado.cedulaCandidato = registro.cedula;
    estado.puestoSeleccionado = registro.puesto;
    estado.areaGestion = registro.areaGestion;
    estado.nivelPuesto = registro.nivelOrganizacional;
    estado.tipoIngreso = registro.tipoIngreso;

    if (inputCandidato) inputCandidato.value = registro.nombre;
    if (badgeCedula) {
      badgeCedula.textContent = `Cédula: ${registro.cedula}`;
      badgeCedula.classList.remove('hidden');
    }

    if (selectAreaGestion) selectAreaGestion.value = registro.areaGestion;
    if (selectNivelPuesto) selectNivelPuesto.value = registro.nivelOrganizacional;

    document.querySelectorAll('.btn-tipo-ingreso').forEach(btn => {
      const valBtn = btn.getAttribute('data-tipo-ingreso');
      if (valBtn === registro.tipoIngreso) {
        btn.classList.add('bg-red-600', 'text-white', 'border-red-600', 'active-selector');
        btn.classList.remove('bg-white', 'text-slate-700', 'border-slate-300');
      } else {
        btn.classList.remove('bg-red-600', 'text-white', 'border-red-600', 'active-selector');
        btn.classList.add('bg-white', 'text-slate-700', 'border-slate-300');
      }
    });

    document.getElementById('resumenCandidato').textContent = `${registro.nombre} (${registro.cedula})`;
    actualizarFichaNivel();
  });

  selectAreaGestion?.addEventListener('change', (e) => {
    estado.areaGestion = e.target.value;
    actualizarFichaNivel();
  });

  selectNivelPuesto?.addEventListener('change', (e) => {
    estado.nivelPuesto = e.target.value;
    actualizarFichaNivel();
  });

  function actualizarFichaNivel() {
    const nombresNivel = {
      operativo: 'Nivel 1: Operativo',
      tactico: 'Nivel 2: Táctico',
      tactico_cargo: 'Nivel 3: Táctico c/c',
      estrategico: 'Nivel 4: Estratégico'
    };
    const etiqueta = nombresNivel[estado.nivelPuesto] || 'Nivel 1';
    document.getElementById('resumenNivel').textContent = `${estado.areaGestion} • ${etiqueta}`;
  }

  document.querySelectorAll('.btn-tipo-ingreso').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-tipo-ingreso').forEach(b => {
        b.classList.remove('bg-red-600', 'text-white', 'border-red-600', 'active-selector');
        b.classList.add('bg-white', 'text-slate-700', 'border-slate-300');
      });
      btn.classList.add('bg-red-600', 'text-white', 'border-red-600', 'active-selector');
      btn.classList.remove('bg-white', 'text-slate-700', 'border-slate-300');
      estado.tipoIngreso = btn.getAttribute('data-tipo-ingreso') || 'Nuevo ingreso';
    });
  });

  document.getElementById('btnIniciarEvaluacion')?.addEventListener('click', () => {
    if (!estado.requisicion || !estado.candidato) {
      alert('Por favor seleccione una Requisición y un Candidato(a) de la lista.');
      return;
    }

    document.getElementById('badgeCandidatoActivo').textContent = `${estado.candidato} (${estado.cedulaCandidato})`;
    document.getElementById('badgeNivelActivo').textContent = `${estado.areaGestion} • ${selectNivelPuesto.options[selectNivelPuesto.selectedIndex].text}`;

    generarTarjetasEvaluacion();

    seccionEncuadre?.classList.add('hidden');
    seccionEvaluacion?.classList.remove('hidden');
    actualizarBarraEtapas(2);
    if (window.lucide) lucide.createIcons();
  });

  // =========================================================================
  // 7. MOTOR DE TARJETAS STAR Y ARTÍCULO 404
  // =========================================================================
  function generarTarjetasEvaluacion() {
    const contenedor = document.getElementById('contenedorPreguntasActivas');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    estado.evaluaciones = {};

    let contador = 1;
    const nivelData = BANCO_DATOS.potencialLiderazgo[estado.nivelPuesto];

    if (nivelData && nivelData.competencias) {
      nivelData.competencias.forEach(comp => {
        const idUnico = `F_${comp.id}`;
        contenedor.appendChild(crearTarjetaFija(comp, contador++, 'Potencial de Liderazgo', idUnico));
      });
    }

    for (let i = 1; i <= 3; i++) {
      const idUnico = `D_SOCIO_${i}`;
      contenedor.appendChild(crearTarjetaDinamica(BANCO_DATOS.habilidadesSocioemocionales, contador++, 'Habilidad Socioemocional', idUnico, 'socioemocional'));
    }

    if (estado.nivelPuesto === 'tactico_cargo' || estado.nivelPuesto === 'estrategico') {
      for (let i = 1; i <= 3; i++) {
        const idUnico = `D_LIDER_${i}`;
        contenedor.appendChild(crearTarjetaDinamica(BANCO_DATOS.estilosLiderazgo, contador++, 'Estilo de Liderazgo', idUnico, 'estiloliderazgo'));
      }
    }

    document.getElementById('indicadorProgreso').textContent = `${contador - 1} tarjetas activas`;
  }

  function crearTarjetaFija(item, numero, categoria, idUnico) {
    const div = document.createElement('div');
    div.className = 'bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4';
    estado.evaluaciones[idUnico] = {
      competencia: item.competencia,
      preguntaTexto: '',
      calificacion: 1.0,
      notas: '',
      valida: false
    };

    div.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <span class="text-[10px] font-black uppercase text-red-600 tracking-wider">${categoria} • Pregunta ${numero}</span>
          <h3 class="text-sm font-bold text-slate-800">${item.competencia}</h3>
        </div>
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-600 mb-1">Seleccione la pregunta formulada (1 de 2): *</label>
        <select class="w-full text-xs font-medium border border-slate-300 rounded-xl p-2.5 bg-white select-pregunta focus:ring-2 focus:ring-red-500" data-id="${idUnico}">
          <option value="" disabled selected>Seleccione la pregunta a evaluar...</option>
          ${item.preguntas.map((p, idx) => `<option value="${idx}">${idx + 1}. ${p}</option>`).join('')}
        </select>
      </div>
      ${generarBloqueRespuesta(idUnico)}
    `;
    asignarEventosTarjeta(div, idUnico);
    return div;
  }

  function crearTarjetaDinamica(bancoOpciones, numero, categoria, idUnico, grupoFiltro) {
    const div = document.createElement('div');
    div.className = 'bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4 tarjeta-dinamica';
    div.dataset.grupo = grupoFiltro;

    estado.evaluaciones[idUnico] = {
      competencia: '',
      preguntaTexto: '',
      calificacion: 1.0,
      notas: '',
      valida: false,
      idCompetenciaSeleccionada: null
    };

    div.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div class="w-full">
          <span class="text-[10px] font-black uppercase text-slate-500 tracking-wider">${categoria} • Competencia ${numero}</span>
          <select class="block w-full mt-1.5 text-xs font-bold text-slate-800 border border-slate-300 bg-slate-50 rounded-xl p-2.5 focus:ring-2 focus:ring-red-500 selector-competencia" data-id="${idUnico}">
            <option value="" disabled selected>Seleccione la competencia a evaluar en este bloque...</option>
            ${bancoOpciones.map(opt => `<option value="${opt.id}">${opt.competencia}</option>`).join('')}
          </select>
        </div>
      </div>
      
      <div class="contenido-oculto hidden space-y-4 pt-2">
        <div>
          <label class="block text-xs font-bold text-slate-600 mb-1">Seleccione la pregunta formulada (1 de 2): *</label>
          <select class="w-full text-xs font-medium border border-slate-300 rounded-xl p-2.5 bg-white select-pregunta focus:ring-2 focus:ring-red-500" data-id="${idUnico}">
          </select>
        </div>
        ${generarBloqueRespuesta(idUnico)}
      </div>
    `;

    const selectCompetencia = div.querySelector('.selector-competencia');
    selectCompetencia?.addEventListener('change', (e) => {
      const idComp = e.target.value;
      const compData = bancoOpciones.find(c => c.id === idComp);
      estado.evaluaciones[idUnico].idCompetenciaSeleccionada = idComp;
      estado.evaluaciones[idUnico].competencia = compData ? compData.competencia : 'Competencia Dinámica';
      estado.evaluaciones[idUnico].valida = false;

      div.querySelector('.contenido-oculto')?.classList.remove('hidden');

      const selectPreg = div.querySelector('.select-pregunta');
      if (selectPreg && compData) {
        selectPreg.innerHTML = `
          <option value="" disabled selected>Seleccione la pregunta a evaluar...</option>
          ${compData.preguntas.map((p, idx) => `<option value="${idx}">${idx + 1}. ${p}</option>`).join('')}
        `;
      }

      actualizarFiltrosDinamicos(grupoFiltro);
    });

    asignarEventosTarjeta(div, idUnico);
    return div;
  }

  function generarBloqueRespuesta(idUnico) {
    return `
      <div>
        <label class="block text-xs font-bold text-slate-600 mb-1">Notas de respuesta y evidencias observadas (Metodología STAR):</label>
        <textarea rows="2" placeholder="Describa situación, tarea, acciones directas del candidato y resultados obtenidos..." 
          class="w-full text-xs border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-red-500 textarea-notas" data-id="${idUnico}"></textarea>
      </div>
      <div class="flex items-center justify-between pt-2">
        <span class="text-xs font-bold text-slate-700">Calificación de cumplimiento:</span>
        <div class="flex gap-2">
          ${[
            { val: 1.25, label: 'Supera (1.25)' },
            { val: 1.00, label: 'Cumple (1.00)' },
            { val: 0.50, label: 'Parcial (0.50)' },
            { val: 0.00, label: 'No cumple' }
          ].map(opt => `
            <button type="button" class="btn-calif px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${opt.val === 1.0 ? 'bg-red-600 text-white border-red-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}"
              data-id="${idUnico}" data-val="${opt.val}">${opt.label}</button>
          `).join('')}
        </div>
      </div>
    `;
  }

  function asignarEventosTarjeta(tarjetaDOM, idUnico) {
    tarjetaDOM.querySelector('.select-pregunta')?.addEventListener('change', (e) => {
      estado.evaluaciones[idUnico].valida = true;
      estado.evaluaciones[idUnico].preguntaTexto = e.target.options[e.target.selectedIndex]?.text || '';
    });

    const textarea = tarjetaDOM.querySelector('.textarea-notas');
    textarea?.addEventListener('input', (e) => {
      estado.evaluaciones[idUnico].notas = e.target.value;
      escanearTextoArticulo404(e.target.value);
    });

    tarjetaDOM.querySelectorAll('.btn-calif').forEach(btn => {
      btn.addEventListener('click', () => {
        tarjetaDOM.querySelectorAll('.btn-calif').forEach(b => {
          b.className = 'btn-calif px-3 py-1.5 text-[11px] font-bold rounded-lg border bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 cursor-pointer';
        });
        btn.className = 'btn-calif px-3 py-1.5 text-[11px] font-bold rounded-lg border bg-red-600 text-white border-red-600 cursor-pointer';
        estado.evaluaciones[idUnico].calificacion = parseFloat(btn.getAttribute('data-val') || '1.0');
      });
    });
  }

  function actualizarFiltrosDinamicos(grupoFiltro) {
    const tarjetas = document.querySelectorAll(`.tarjeta-dinamica[data-grupo="${grupoFiltro}"]`);
    const seleccionadas = [];

    tarjetas.forEach(t => {
      const sel = t.querySelector('.selector-competencia');
      if (sel && sel.value) seleccionadas.push(sel.value);
    });

    tarjetas.forEach(t => {
      const sel = t.querySelector('.selector-competencia');
      if (!sel) return;
      Array.from(sel.options).forEach(opt => {
        if (!opt.value) return;
        if (seleccionadas.includes(opt.value) && sel.value !== opt.value) {
          opt.disabled = true;
          opt.text = opt.text.replace(' (Ya seleccionada)', '') + ' (Ya seleccionada)';
        } else {
          opt.disabled = false;
          opt.text = opt.text.replace(' (Ya seleccionada)', '');
        }
      });
    });
  }

  const btnPreguntaSi = document.getElementById('btnPreguntaAdicionalSi');
  const btnPreguntaNo = document.getElementById('btnPreguntaAdicionalNo');
  const camposAdicionales = document.getElementById('camposPreguntaAdicional');

  btnPreguntaSi?.addEventListener('click', () => {
    estado.preguntaAdicional.activa = true;
    camposAdicionales?.classList.remove('hidden');
    btnPreguntaSi.className = 'px-4 py-2 text-xs font-bold rounded-xl border border-red-600 bg-red-600 text-white transition-all cursor-pointer';
    btnPreguntaNo.className = 'px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-700 hover:border-slate-400 transition-all cursor-pointer';
  });

  btnPreguntaNo?.addEventListener('click', () => {
    estado.preguntaAdicional.activa = false;
    camposAdicionales?.classList.add('hidden');
    btnPreguntaNo.className = 'px-4 py-2 text-xs font-bold rounded-xl border border-red-600 bg-red-600 text-white transition-all cursor-pointer';
    btnPreguntaSi.className = 'px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-700 hover:border-slate-400 transition-all cursor-pointer';
  });

  document.getElementById('selectCumplimientoAdicional')?.addEventListener('change', (e) => {
    estado.preguntaAdicional.calificacion = parseFloat(e.target.value);
  });

  function escanearTextoArticulo404(texto) {
    if (!BANCO_DATOS || !BANCO_DATOS.alertasArticulo404) return;
    const textoMin = texto.toLowerCase();
    const alertaBox = document.getElementById('alertaArticulo404Contenedor');
    const alertaTxt = document.getElementById('alertaArticulo404Texto');

    for (const regla of BANCO_DATOS.alertasArticulo404) {
      for (const palabra of regla.palabrasClave) {
        if (textoMin.includes(palabra)) {
          if (alertaBox) alertaBox.className = 'bg-red-100 rounded-2xl border border-red-300 p-4 space-y-2 animate-pulse transition-all';
          if (alertaTxt) alertaTxt.innerHTML = `<strong>⚠️ ALERTA ÉTICO-LEGAL:</strong> Se detectó el término <em>"${palabra}"</em> vinculado a <strong>${regla.tema}</strong>. Prohibido por Art. 404 del Código de Trabajo.`;
          abrirCopilot();
          return;
        }
      }
    }

    if (alertaBox) alertaBox.className = 'bg-amber-50 rounded-2xl border border-amber-200/90 p-4 space-y-2 transition-all';
    if (alertaTxt) alertaTxt.textContent = 'Monitoreo activo: Evite formular o registrar preguntas sobre estado civil, familia, salud, deudas, edad o sindicatos.';
  }

  // =========================================================================
  // 8. CÁLCULO FINAL DE SELECCIÓN Y GUARDADO EN SHAREPOINT
  // =========================================================================
  function obtenerTextoClasificacion(nota) {
    if (nota >= 87) return 'SOBRESALIENTE';
    if (nota >= 78) return 'ÓPTIMO';
    if (nota >= 71) return 'ADECUADO';
    if (nota >= 61) return 'CON RESERVAS';
    return 'BAJA ADECUACIÓN';
  }

  document.getElementById('btnCalcularResultado')?.addEventListener('click', () => {
    let sumaPuntos = 0;
    let totalContestadas = 0;
    const lineasDetalle = [];

    Object.values(estado.evaluaciones).forEach((item) => {
      if (item.valida) {
        sumaPuntos += item.calificacion;
        totalContestadas++;
        const notaTxt = item.calificacion.toFixed(2);
        const evidenciaTxt = item.notas?.trim() ? item.notas.trim() : 'Sin notas adicionales';
        lineasDetalle.push(
          `${totalContestadas}. [${item.competencia || 'Competencia'}] Pregunta: "${item.preguntaTexto}" | Nota: ${notaTxt} | Evidencia STAR: ${evidenciaTxt}`
        );
      }
    });

    let textoPreguntaAdicional = 'No aplica';
    if (estado.preguntaAdicional.activa) {
      const pregExtra = document.getElementById('inputTextoPreguntaAdicional')?.value.trim() || 'Pregunta complementaria';
      const notaExtra = document.getElementById('inputComentarioAdicional')?.value.trim() || 'Sin observaciones';
      const califExtra = estado.preguntaAdicional.calificacion;

      sumaPuntos += califExtra;
      totalContestadas++;
      textoPreguntaAdicional = `Pregunta: "${pregExtra}" | Nota: ${califExtra.toFixed(2)} | Notas: ${notaExtra}`;
    }

    if (totalContestadas === 0) {
      alert('Debe seleccionar y evaluar al menos una pregunta para generar el diagnóstico.');
      return;
    }

    const notaFinal = Math.round((sumaPuntos / (totalContestadas * 1.25)) * 100);
    const clasificacionTexto = obtenerTextoClasificacion(notaFinal);

    paqueteSeleccionPendiente = {
      rq_numero: estado.requisicion,
      puesto: estado.puestoSeleccionado || 'PUESTO NO ESPECIFICADO',
      cedula_candidato: estado.cedulaCandidato,
      nombre_candidato: estado.candidato,
      area_gestion: estado.areaGestion,
      tipo_ingreso: estado.tipoIngreso,
      nivel_organizacional: estado.nivelPuesto,
      nota_final: notaFinal,
      clasificacion: clasificacionTexto,
      preguntas_evaluadas: totalContestadas,
      detalle_competencias: lineasDetalle.join('\n\n'),
      pregunta_adicional: textoPreguntaAdicional,
      evaluador_nombre: estado.evaluador?.nombre || 'Evaluador GH',
      evaluador_correo: estado.evaluador?.usuario || 'gh@pozuelo.cr'
    };

    document.getElementById('valorNotaFinal').textContent = notaFinal;
    asignarDiagnostico(notaFinal);

    const btnGuardarBD = document.getElementById('btnGuardarResultado') || document.querySelector('#seccionResultado button.bg-red-600');
    if (btnGuardarBD) {
      btnGuardarBD.disabled = false;
      btnGuardarBD.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
      btnGuardarBD.classList.add('bg-red-600', 'hover:bg-red-700');
      btnGuardarBD.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i><span>Guardar en Base de Datos</span>';
      if (window.lucide) lucide.createIcons();
    }

    seccionEvaluacion?.classList.add('hidden');
    seccionResultado?.classList.remove('hidden');
    actualizarBarraEtapas(3);
    cerrarCopilot();
  });

  const btnGuardarSeleccionBD = document.getElementById('btnGuardarResultado') || document.querySelector('#seccionResultado button.bg-red-600');
  btnGuardarSeleccionBD?.addEventListener('click', async () => {
    if (!paqueteSeleccionPendiente) {
      alert('No hay una evaluación calculada lista para guardar.');
      return;
    }

    btnGuardarSeleccionBD.disabled = true;
    btnGuardarSeleccionBD.innerHTML = '<span>⏳ Guardando en SharePoint...</span>';

    try {
      if (CONFIG_API.URL_FLUJO_GUARDAR_SELECCION) {
        const respGuardar = await fetch(CONFIG_API.URL_FLUJO_GUARDAR_SELECCION, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paqueteSeleccionPendiente)
        });

        if (!respGuardar.ok) {
          throw new Error(`Error al guardar en SharePoint (HTTP ${respGuardar.status})`);
        }
      }

      if (estado.idFilaSharePoint && CONFIG_API.URL_FLUJO_REQUISICIONES) {
        await fetch(CONFIG_API.URL_FLUJO_REQUISICIONES, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accion: 'marcar_evaluado',
            id_fila: estado.idFilaSharePoint,
            rq_numero: estado.requisicion
          })
        });
      }

      btnGuardarSeleccionBD.classList.remove('bg-red-600', 'hover:bg-red-700');
      btnGuardarSeleccionBD.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
      btnGuardarSeleccionBD.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i><span>Guardado en Base de Datos</span>';
      if (window.lucide) lucide.createIcons();

      alert(`✅ Entrevista de ${paqueteSeleccionPendiente.nombre_candidato} guardada correctamente en SharePoint.`);
    } catch (error) {
      console.error('Error al guardar resultado de selección:', error);
      alert(`❌ No se pudo guardar la evaluación en SharePoint: ${error.message}`);
      btnGuardarSeleccionBD.disabled = false;
      btnGuardarSeleccionBD.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i><span>Guardar en Base de Datos</span>';
      if (window.lucide) lucide.createIcons();
    }
  });

  function asignarDiagnostico(nota) {
    const badge = document.getElementById('badgeClasificacion');
    const recomendacion = document.getElementById('textoRecomendacionFinal');
    if (!badge || !recomendacion) return;

    if (nota >= 87) {
      badge.textContent = 'SOBRESALIENTE';
      badge.className = 'inline-block px-6 py-2 rounded-xl text-xs font-black tracking-widest uppercase bg-emerald-100 text-emerald-800 border border-emerald-300';
      recomendacion.textContent = 'Altamente recomendable. Candidato con evidencias sólidas y consistentes. Prioridad para la terna del líder.';
    } else if (nota >= 78) {
      badge.textContent = 'ÓPTIMO';
      badge.className = 'inline-block px-6 py-2 rounded-xl text-xs font-black tracking-widest uppercase bg-blue-100 text-blue-800 border border-blue-300';
      recomendacion.textContent = 'Recomendable. Cumple sólidamente con lo esperado para el cargo y presenta fortalezas adicionales.';
    } else if (nota >= 71) {
      badge.textContent = 'ADECUADO';
      badge.className = 'inline-block px-6 py-2 rounded-xl text-xs font-black tracking-widest uppercase bg-amber-100 text-amber-800 border border-amber-300';
      recomendacion.textContent = 'Recomendable con observaciones. Cumple con el nivel esperado, pero se aconseja validar brechas puntuales con el líder.';
    } else if (nota >= 61) {
      badge.textContent = 'CON RESERVAS';
      badge.className = 'inline-block px-6 py-2 rounded-xl text-xs font-black tracking-widest uppercase bg-orange-100 text-orange-800 border border-orange-300';
      recomendacion.textContent = 'Continuidad condicionada. Presenta brechas que podrían afectar su adaptación. Validar con Gestión Humana.';
    } else {
      badge.textContent = 'BAJA ADECUACIÓN';
      badge.className = 'inline-block px-6 py-2 rounded-xl text-xs font-black tracking-widest uppercase bg-rose-100 text-rose-800 border border-rose-300';
      recomendacion.textContent = 'No recomendable para la posición actual. Considerar para otros perfiles que se ajusten mejor a sus fortalezas.';
    }
  }

  function actualizarBarraEtapas(paso) {
    ['stepNav1', 'stepNav2', 'stepNav3'].forEach((id, idx) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (idx + 1 === paso) {
        el.className = 'flex items-center gap-3 p-2.5 rounded-xl bg-red-50 text-red-700 font-bold text-xs border border-red-200';
        const num = el.querySelector('div');
        if (num) num.className = 'w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center text-[10px]';
      } else {
        el.className = 'flex items-center gap-3 p-2.5 rounded-xl text-slate-500 font-semibold text-xs hover:bg-slate-50 transition-all';
        const num = el.querySelector('div');
        if (num) num.className = 'w-6 h-6 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]';
      }
    });
  }

  document.getElementById('btnVolverEncuadre')?.addEventListener('click', () => {
    seccionEvaluacion?.classList.add('hidden');
    seccionEncuadre?.classList.remove('hidden');
    actualizarBarraEtapas(1);
  });

  document.getElementById('btnReiniciarEntrevista')?.addEventListener('click', () => {
    window.location.reload();
  });

  // =========================================================================
  // 9. LÓGICA DE ENTREVISTAS DE SALIDA
  // =========================================================================
  function inicializarModuloSalida() {
    const cfg = BANCO_DATOS?.entrevistaSalida;
    if (!cfg) return;

    const selCompania = document.getElementById('salidaCompania');
    if (selCompania && selCompania.options.length <= 1) {
      selCompania.innerHTML = `<option value="" disabled selected>Seleccione la compañía o filial...</option>` +
        cfg.companias.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    const selAntiguedad = document.getElementById('salidaAntiguedadEmpresa');
    if (selAntiguedad && selAntiguedad.options.length <= 1) {
      selAntiguedad.innerHTML = `<option value="" disabled selected>Antigüedad en empresa...</option>` +
        cfg.antiguedadEmpresa.map(a => `<option value="${a}">${a}</option>`).join('');
    }

    const selPuesto = document.getElementById('salidaAntiguedadPuesto');
    if (selPuesto && selPuesto.options.length <= 1) {
      selPuesto.innerHTML = `<option value="" disabled selected>Antigüedad en puesto...</option>` +
        cfg.antiguedadPuesto.map(a => `<option value="${a}">${a}</option>`).join('');
    }

    const selMotivo = document.getElementById('salidaMotivo');
    if (selMotivo && selMotivo.options.length <= 1) {
      selMotivo.innerHTML = `<option value="" disabled selected>Causa principal de egreso...</option>` +
        cfg.motivosSalida.map(m => `<option value="${m}">${m}</option>`).join('');
    }

    document.getElementById('salidaNombreColaborador')?.addEventListener('input', (e) => {
      estado.salida.colaborador = e.target.value.trim();
      document.getElementById('resumenCandidato').textContent = estado.salida.colaborador || 'Colaborador por definir';
    });

    const contenedorChips = document.getElementById('contenedorChipsFortalezas');
    if (contenedorChips && contenedorChips.children.length === 0) {
      contenedorChips.innerHTML = cfg.fortalezasDisponibles.map(f => `
        <button type="button" class="chip-fortaleza px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold hover:border-slate-300 transition-all cursor-pointer" data-val="${f}">
          ${f}
        </button>
      `).join('');

      contenedorChips.querySelectorAll('.chip-fortaleza').forEach(chip => {
        chip.addEventListener('click', () => {
          const val = chip.getAttribute('data-val');
          const idx = estado.salida.fortalezas.indexOf(val);

          if (idx > -1) {
            estado.salida.fortalezas.splice(idx, 1);
            chip.className = 'chip-fortaleza px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold hover:border-slate-300 transition-all cursor-pointer';
          } else {
            if (estado.salida.fortalezas.length >= 3) {
              alert('Solo puede seleccionar un máximo de 3 fortalezas clave.');
              return;
            }
            estado.salida.fortalezas.push(val);
            chip.className = 'chip-fortaleza px-3.5 py-2 rounded-xl border border-emerald-500 bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm cursor-pointer';
          }

          document.getElementById('contadorFortalezas').textContent = `${estado.salida.fortalezas.length} / 3 seleccionadas`;
        });
      });
    }

    const listaFactores = cfg.factoresEvaluacion1a5 || cfg.factoresEvaluacion || [];
    const contenedorMatriz = document.getElementById('contenedorMatrizSalida');
    if (contenedorMatriz && contenedorMatriz.children.length === 0 && listaFactores.length > 0) {
      contenedorMatriz.innerHTML = listaFactores.map((item, idx) => `
        <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3 fila-matriz-salida" data-id="${item.id}">
          <div class="max-w-md">
            <h4 class="text-xs font-extrabold text-slate-800">${idx + 1}. ${item.titulo}</h4>
            <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">${item.descripcion}</p>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <span class="text-[10px] text-slate-400 font-bold mr-2 hidden md:inline">1 (Bajo) → 5 (Alto)</span>
            ${[1, 2, 3, 4, 5].map(n => `
              <button type="button" class="btn-calif-matriz w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-700 font-extrabold text-xs hover:border-slate-400 transition-all cursor-pointer" data-factor="${item.id}" data-val="${n}">
                ${n}
              </button>
            `).join('')}
          </div>
        </div>
      `).join('');

      contenedorMatriz.querySelectorAll('.btn-calif-matriz').forEach(btn => {
        btn.addEventListener('click', () => {
          const factor = btn.getAttribute('data-factor');
          const val = parseInt(btn.getAttribute('data-val'), 10);
          const fila = btn.closest('.fila-matriz-salida');

          fila.querySelectorAll('.btn-calif-matriz').forEach(b => {
            b.className = 'btn-calif-matriz w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-700 font-extrabold text-xs hover:border-slate-400 transition-all cursor-pointer';
          });

          btn.className = 'btn-calif-matriz w-9 h-9 rounded-xl border border-red-600 bg-red-600 text-white font-extrabold text-xs transition-all shadow-sm cursor-pointer';
          estado.salida.calificacionesMatriz[factor] = val;
          calcularPromedioMatrizSalida();
        });
      });
    }

    document.querySelectorAll('.btn-salida-expectativa').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-salida-expectativa').forEach(b => {
          b.className = 'btn-salida-expectativa py-2.5 px-3 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-700 hover:border-slate-400 transition-all text-center';
        });
        btn.className = 'btn-salida-expectativa py-2.5 px-3 text-xs font-bold rounded-xl border border-red-600 bg-red-600 text-white transition-all text-center';
        estado.salida.cumplioExpectativas = btn.getAttribute('data-val');
      });
    });

    document.querySelectorAll('.btn-salida-enps').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-salida-enps').forEach(b => {
          b.className = 'btn-salida-enps py-2.5 px-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-700 hover:border-slate-400 transition-all text-center';
        });
        btn.className = 'btn-salida-enps py-2.5 px-2 text-xs font-bold rounded-xl border border-red-600 bg-red-600 text-white transition-all text-center';
        estado.salida.enps = btn.getAttribute('data-val');
      });
    });
  }

  function calcularPromedioMatrizSalida() {
    const notas = Object.values(estado.salida.calificacionesMatriz);
    if (notas.length === 0) return;

    const suma = notas.reduce((acc, curr) => acc + curr, 0);
    const promedio = (suma / notas.length).toFixed(1);

    document.getElementById('promedioMatrizSalida').textContent = `${promedio} / 5.0`;
    document.getElementById('kpiSatisfaccionValor').textContent = `${promedio} / 5.0`;

    let label = 'Nivel Regular';
    if (promedio >= 4.5) label = 'Excelente Clima';
    else if (promedio >= 3.8) label = 'Favorable / Sólido';
    else if (promedio <= 2.5) label = 'Alerta de Retención';

    document.getElementById('kpiSatisfaccionEtiqueta').textContent = `${notas.length} de 11 factores evaluados • ${label}`;
  }

  // Buscador inteligente de campos en Entrevista de Salida (por ID o etiqueta)
  function buscarCampoSalida(tipoTag, idsPosibles, palabrasClave) {
    for (const id of idsPosibles) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    const seccion = document.getElementById('seccionSalida');
    if (!seccion) return null;
    const elementos = seccion.querySelectorAll(tipoTag);
    for (const el of elementos) {
      const textoLabel = (el.closest('div')?.querySelector('label')?.textContent || '').toLowerCase();
      const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
      if (palabrasClave.some(p => textoLabel.includes(p) || placeholder.includes(p))) {
        return el;
      }
    }
    return null;
  }

  const campoSalidaNombre = document.getElementById('salidaNombreColaborador');
  const campoSalidaCargo = buscarCampoSalida('input', ['salidaCargo', 'salidaPuesto', 'salidaCargoColaborador', 'salidaPuestoColaborador'], ['cargo', 'puesto']);
  const campoSalidaJefatura = buscarCampoSalida('input', ['salidaJefatura', 'salidaJefe', 'salidaJefeDirecto', 'salidaLider'], ['jefatura', 'jefe', 'líder', 'lider', 'supervisor']);

  [campoSalidaNombre, campoSalidaCargo, campoSalidaJefatura].forEach(campo => {
    campo?.addEventListener('input', (e) => {
      const pos = e.target.selectionStart;
      e.target.value = e.target.value.toUpperCase();
      e.target.setSelectionRange(pos, pos);
    });
  });

  document.getElementById('btnGuardarSalida')?.addEventListener('click', async () => {
    const comp = document.getElementById('salidaCompania')?.value || '';
    const ced = (document.getElementById('salidaCedula')?.value || '').trim().toUpperCase();
    const nom = (campoSalidaNombre?.value || '').trim().toUpperCase();
    const cargo = (campoSalidaCargo?.value || '').trim().toUpperCase();
    const jefatura = (campoSalidaJefatura?.value || '').trim().toUpperCase();
    const antEmpresa = document.getElementById('salidaAntiguedadEmpresa')?.value || '';
    const antPuesto = document.getElementById('salidaAntiguedadPuesto')?.value || '';
    const motivo = document.getElementById('salidaMotivo')?.value || '';

    if (!comp || !ced || !nom) {
      alert('Por favor complete al menos la Compañía, Cédula y Nombre del colaborador.');
      return;
    }

    if (estado.salida.fortalezas.length === 0) {
      alert('Por favor seleccione al menos una fortaleza organizacional.');
      return;
    }

    const notasMatriz = Object.values(estado.salida.calificacionesMatriz);
    const promedioNum = notasMatriz.length > 0
      ? parseFloat((notasMatriz.reduce((acc, curr) => acc + curr, 0) / notasMatriz.length).toFixed(2))
      : 0;

    const listaFactores = BANCO_DATOS?.entrevistaSalida?.factoresEvaluacion1a5 || BANCO_DATOS?.entrevistaSalida?.factoresEvaluacion || [];
    const detalleFactoresTxt = listaFactores.map((f, idx) => {
      const calif = estado.salida.calificacionesMatriz[f.id];
      return `${idx + 1}. ${f.titulo}: ${calif ? calif + '/5' : 'Sin evaluar'}`;
    }).join('\n');

    const expPositiva = (document.getElementById('salidaExpPositiva')?.value || document.getElementById('salidaExperienciaPositiva')?.value || '').trim();
    const expNegativa = (document.getElementById('salidaExpNegativa')?.value || document.getElementById('salidaExperienciaNegativa')?.value || '').trim();
    const campoFeedbackLider = buscarCampoSalida('textarea', ['salidaFeedbackLider', 'salidaComentariosLider', 'salidaRetroalimentacionLider', 'salidaFeedbackJefe'], ['líder', 'lider', 'jefatura', 'jefe']);
    const campoSugerencia = buscarCampoSalida('textarea', ['salidaSugerenciaMejora', 'salidaSugerencias', 'salidaRecomendaciones', 'salidaMejora'], ['sugerencia', 'mejora', 'recomendación', 'recomendacion']);
    const campoNotasEntrev = buscarCampoSalida('textarea', ['salidaNotasEntrevistador', 'salidaNotas', 'salidaObservaciones', 'salidaComentariosGH'], ['entrevistador', 'notas', 'observaciones', 'confidencial']);

    const feedbackLider = (campoFeedbackLider?.value || '').trim();
    const sugerenciaMejora = (campoSugerencia?.value || '').trim();
    const notasEntrevistador = (campoNotasEntrev?.value || '').trim();

    const btnGuardar = document.getElementById('btnGuardarSalida');
    if (btnGuardar) {
      btnGuardar.disabled = true;
      btnGuardar.innerHTML = '<span>⏳ Guardando entrevista en SharePoint...</span>';
    }

    try {
      if (CONFIG_API.URL_FLUJO_GUARDAR_SALIDA) {
        const payloadSalida = {
          cedula_colaborador: ced,
          nombre_colaborador: nom,
          compania: comp,
          cargo: cargo || 'NO ESPECIFICADO',
          jefatura: jefatura || 'NO ESPECIFICADA',
          antiguedad_empresa: antEmpresa || 'No especificado',
          antiguedad_puesto: antPuesto || 'No especificado',
          motivo_salida: motivo || 'No especificado',
          fortalezas_clave: estado.salida.fortalezas.join(', '),
          exp_positiva: expPositiva || 'Sin comentarios',
          exp_negativa: expNegativa || 'Sin comentarios',
          promedio_satisfaccion: promedioNum,
          detalle_factores: detalleFactoresTxt || 'Sin factores evaluados',
          feedback_lider: feedbackLider || 'Sin comentarios',
          cumplio_expectativas: estado.salida.cumplioExpectativas || 'No especificado',
          enps: estado.salida.enps || 'No especificado',
          sugerencia_mejora: sugerenciaMejora || 'Sin sugerencias',
          notas_entrevistador: notasEntrevistador || 'Sin notas adicionales',
          evaluador_nombre: estado.evaluador?.nombre || 'Evaluador GH',
          evaluador_correo: estado.evaluador?.usuario || 'gh@pozuelo.cr'
        };

        const resp = await fetch(CONFIG_API.URL_FLUJO_GUARDAR_SALIDA, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadSalida)
        });

        if (!resp.ok) {
          throw new Error(`Error al guardar en SharePoint (HTTP ${resp.status})`);
        }
      }

      alert(`✅ Entrevista de salida registrada en SharePoint.\nColaborador: ${nom}\nÍndice Promedio: ${promedioNum} / 5.0`);
      window.location.reload();
    } catch (error) {
      console.error('Error al guardar entrevista de salida:', error);
      alert(`❌ No se pudo guardar la entrevista de salida: ${error.message}`);
    } finally {
      if (btnGuardar) {
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i><span>Finalizar y Guardar Entrevista</span>';
        if (window.lucide) lucide.createIcons();
      }
    }
  });

  document.getElementById('btnCancelarSalida')?.addEventListener('click', () => {
    if (confirm('¿Desea cancelar el registro y volver al inicio? Los datos no guardados se perderán.')) {
      document.getElementById('btnVolverHubGlobal')?.click();
    }
  });

  // =========================================================================
  // 10. MÓDULO DE COMPARATIVO DE TERNA POR REQUISICIÓN
  // =========================================================================
  document.getElementById('btnModuloTerna')?.addEventListener('click', () => {
    estado.moduloActual = 'terna';
    ocultarTodasLasVistas();
    seccionTerna?.classList.remove('hidden');

    document.getElementById('resumenModulo').textContent = 'Comparativo de Terna';
    document.getElementById('resumenRQ').textContent = 'Seleccione RQ';
    document.getElementById('resumenCandidato').textContent = 'Vista Comparativa';
    document.getElementById('resumenNivel').textContent = 'Calibración GH';

    cargarDatosComparativoTerna();
    if (window.lucide) lucide.createIcons();
  });

  document.getElementById('btnRefrescarTerna')?.addEventListener('click', () => {
    const rqActual = document.getElementById('selectRequisicionTerna')?.value || '';
    cargarDatosComparativoTerna(rqActual);
  });

  document.getElementById('btnImprimirTerna')?.addEventListener('click', () => {
    window.print();
  });

  async function consultarResultadosSeleccionSP() {
    const response = await fetch(CONFIG_API.URL_FLUJO_LISTAR_SELECCION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'listar_seleccion' })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const registrosCrudos = Array.isArray(data) ? data : (data.value || []);

    estado.listaResultadosSeleccionSP = registrosCrudos.map(raw => ({
      idFila: raw.ID,
      rqNumero: extraerTextoSP(raw.RQ_NUMERO || raw.Title),
      puesto: extraerTextoSP(raw.PUESTO),
      cedula: extraerTextoSP(raw.CEDULA_CANDIDATO),
      nombre: extraerTextoSP(raw.NOMBRE_CANDIDATO),
      areaGestion: extraerTextoSP(raw.AREA_GESTION),
      tipoIngreso: extraerTextoSP(raw.TIPO_INGRESO),
      nivelOrganizacional: extraerTextoSP(raw.NIVEL_ORGANIZACIONAL),
      notaFinal: Number(raw.NOTA_FINAL) || 0,
      clasificacion: extraerTextoSP(raw.CLASIFICACION) || 'SIN CLASIFICAR',
      preguntasEvaluadas: Number(raw.PREGUNTAS_EVALUADAS) || 0,
      detalleCompetencias: extraerTextoSP(raw.DETALLE_COMPETENCIAS),
      preguntaAdicional: extraerTextoSP(raw.PREGUNTA_ADICIONAL),
      evaluadorNombre: extraerTextoSP(raw.EVALUADOR_NOMBRE) || 'Gestión Humana'
    }));

    return estado.listaResultadosSeleccionSP;
  }

  async function cargarDatosComparativoTerna(rqPreseleccionada = '') {
    const selectTerna = document.getElementById('selectRequisicionTerna');
    const contenedor = document.getElementById('contenedorTarjetasTerna');
    if (!selectTerna) return;

    selectTerna.innerHTML = '<option value="">⏳ Sincronizando vacantes y evaluaciones...</option>';

    try {
      const [listaRQs, listaResultados] = await Promise.all([
        consultarListaRequisicionesSP(),
        consultarResultadosSeleccionSP()
      ]);

      const mapaVacantes = new Map();
      listaRQs.forEach(r => {
        if (r.rqNumero && !mapaVacantes.has(r.rqNumero)) {
          mapaVacantes.set(r.rqNumero, r.puesto);
        }
      });
      listaResultados.forEach(res => {
        if (res.rqNumero && !mapaVacantes.has(res.rqNumero)) {
          mapaVacantes.set(res.rqNumero, res.puesto);
        }
      });

      selectTerna.innerHTML = '<option value="">Seleccione una requisición para comparar su terna...</option>';
      mapaVacantes.forEach((puesto, rqNum) => {
        const opt = document.createElement('option');
        opt.value = rqNum;
        opt.textContent = `${rqNum} - ${puesto}`;
        selectTerna.appendChild(opt);
      });

      if (rqPreseleccionada && mapaVacantes.has(rqPreseleccionada)) {
        selectTerna.value = rqPreseleccionada;
        renderizarComparativoRQ(rqPreseleccionada);
      } else if (contenedor) {
        document.getElementById('resumenCabeceraTerna')?.classList.add('hidden');
        contenedor.innerHTML = `
          <div class="col-span-full bg-white rounded-3xl border border-slate-200 p-10 text-center text-xs text-slate-400">
            Seleccione una requisición en el desplegable superior para visualizar la comparativa de candidatos.
          </div>`;
      }
    } catch (error) {
      console.error('Error cargando comparativo de terna:', error);
      selectTerna.innerHTML = '<option value="">❌ Error al sincronizar con SharePoint</option>';
    }
  }

  document.getElementById('selectRequisicionTerna')?.addEventListener('change', (e) => {
    const rqElegida = e.target.value;
    document.getElementById('resumenRQ').textContent = rqElegida || 'Seleccione RQ';
    renderizarComparativoRQ(rqElegida);
  });

  function obtenerEstiloBadgeTerna(clasificacion) {
    const c = clasificacion.toUpperCase();
    if (c.includes('SOBRESALIENTE')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (c.includes('ÓPTIMO') || c.includes('OPTIMO')) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (c.includes('ADECUADO')) return 'bg-amber-100 text-amber-800 border-amber-300';
    if (c.includes('RESERVAS')) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-rose-100 text-rose-800 border-rose-300';
  }

  function renderizarComparativoRQ(rqNumero) {
    const contenedor = document.getElementById('contenedorTarjetasTerna');
    const barraResumen = document.getElementById('resumenCabeceraTerna');
    if (!contenedor) return;

    if (!rqNumero) {
      barraResumen?.classList.add('hidden');
      contenedor.innerHTML = `
        <div class="col-span-full bg-white rounded-3xl border border-slate-200 p-10 text-center text-xs text-slate-400">
          Seleccione una requisición en el desplegable superior para visualizar la comparativa de candidatos.
        </div>`;
      return;
    }

    const convocados = estado.listaRequisicionesSP.filter(r => r.rqNumero === rqNumero);
    const evaluaciones = estado.listaResultadosSeleccionSP.filter(r => r.rqNumero === rqNumero);

    // Cruzar convocados con sus evaluaciones
    const consolidado = convocados.map(cand => {
      const evalMatch = evaluaciones.find(ev =>
        (ev.cedula && cand.cedula && ev.cedula === cand.cedula) ||
        (ev.nombre && cand.nombre && ev.nombre === cand.nombre)
      );

      return {
        nombre: cand.nombre,
        cedula: cand.cedula,
        puesto: cand.puesto,
        areaGestion: cand.areaGestion,
        nivelOrganizacional: cand.nivelOrganizacional,
        tipoIngreso: cand.tipoIngreso,
        evaluado: Boolean(evalMatch),
        notaFinal: evalMatch ? evalMatch.notaFinal : -1,
        clasificacion: evalMatch ? evalMatch.clasificacion : 'PENDIENTE',
        preguntasEvaluadas: evalMatch ? evalMatch.preguntasEvaluadas : 0,
        detalleCompetencias: evalMatch ? evalMatch.detalleCompetencias : '',
        preguntaAdicional: evalMatch ? evalMatch.preguntaAdicional : 'No aplica',
        evaluadorNombre: evalMatch ? evalMatch.evaluadorNombre : ''
      };
    });

    // Incluir evaluaciones si existiera alguna sin fila activa en convocados
    evaluaciones.forEach(ev => {
      const yaIncluido = consolidado.some(c =>
        (c.cedula && ev.cedula && c.cedula === ev.cedula) ||
        (c.nombre && ev.nombre && c.nombre === ev.nombre)
      );
      if (!yaIncluido) {
        consolidado.push({
          nombre: ev.nombre,
          cedula: ev.cedula,
          puesto: ev.puesto,
          areaGestion: ev.areaGestion,
          nivelOrganizacional: ev.nivelOrganizacional,
          tipoIngreso: ev.tipoIngreso,
          evaluado: true,
          notaFinal: ev.notaFinal,
          clasificacion: ev.clasificacion,
          preguntasEvaluadas: ev.preguntasEvaluadas,
          detalleCompetencias: ev.detalleCompetencias,
          preguntaAdicional: ev.preguntaAdicional,
          evaluadorNombre: ev.evaluadorNombre
        });
      }
    });

    // Ordenar de mayor a menor puntaje (pendientes al final)
    consolidado.sort((a, b) => b.notaFinal - a.notaFinal);

    const totalCandidatos = consolidado.length;
    const totalEvaluados = consolidado.filter(c => c.evaluado).length;
    const maxNota = consolidado.reduce((max, c) => (c.evaluado && c.notaFinal > max ? c.notaFinal : max), -1);

    // Actualizar resumen superior
    if (barraResumen) {
      barraResumen.classList.remove('hidden');
      const infoBase = consolidado[0] || {};
      document.getElementById('ternaInfoPuesto').textContent = `${infoBase.puesto || rqNumero} (${infoBase.areaGestion || 'N/A'})`;
      document.getElementById('ternaInfoAvance').textContent = `${totalEvaluados} de ${totalCandidatos} evaluados`;
      document.getElementById('ternaInfoMejorNota').textContent = maxNota >= 0 ? `${maxNota} / 100 pts` : 'Sin evaluar aún';
    }

    if (consolidado.length === 0) {
      contenedor.innerHTML = `
        <div class="col-span-full bg-white rounded-3xl border border-slate-200 p-10 text-center text-xs text-slate-400">
          No se encontraron candidatos asociados a la requisición ${rqNumero}.
        </div>`;
      return;
    }

    contenedor.innerHTML = consolidado.map((cand, index) => {
      const esLider = cand.evaluado && maxNota > 0 && cand.notaFinal === maxNota;
      const bordeTarjeta = esLider
        ? 'border-2 border-emerald-500 ring-4 ring-emerald-50'
        : 'border border-slate-200';

      if (!cand.evaluado) {
        return `
          <div class="tarjeta-candidato-terna bg-white rounded-3xl ${bordeTarjeta} p-6 shadow-sm flex flex-col justify-start space-y-4 opacity-85">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-500">Candidato #${index + 1}</span>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">⏳ Pendiente de Entrevista</span>
              </div>
              <div>
                <h3 class="text-sm font-extrabold text-slate-800 leading-snug">${cand.nombre}</h3>
                <p class="text-[11px] font-mono text-slate-400 mt-0.5">Cédula: ${cand.cedula} • ${cand.tipoIngreso}</p>
              </div>
            </div>
            <div class="p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
              <span class="block text-xl font-black text-slate-300">--</span>
              <span class="block text-[11px] text-slate-400 mt-1">Aún no se registra evaluación en SharePoint</span>
            </div>
          </div>
        `;
      }

      const estiloBadge = obtenerEstiloBadgeTerna(cand.clasificacion);
      const bloquesDetalle = (cand.detalleCompetencias || 'Sin detalle registrado')
        .split('\n\n')
        .map(linea => `<div class="bloque-evidencia-print p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 leading-relaxed">${linea}</div>`)
        .join('');

      return `
        <div class="tarjeta-candidato-terna bg-white rounded-3xl ${bordeTarjeta} p-6 shadow-sm flex flex-col justify-start space-y-4">
          <div class="space-y-4">
            <!-- Posición y Corona si es líder -->
            <div class="flex items-center justify-between gap-2">
              <span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-600">Posición #${index + 1}</span>
              ${esLider
                ? '<span class="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white shadow-sm">🏆 Mejor Puntaje</span>'
                : '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">✅ Evaluado</span>'}
            </div>

            <!-- Datos del Candidato -->
            <div>
              <h3 class="text-sm font-extrabold text-slate-900 leading-snug">${cand.nombre}</h3>
              <p class="text-[11px] font-mono text-slate-500 mt-0.5">Cédula: ${cand.cedula} • ${cand.tipoIngreso}</p>
            </div>

            <!-- Marcador Principal -->
            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span class="block text-[10px] font-bold uppercase text-slate-400">Puntaje Global</span>
                <div class="flex items-baseline gap-1 mt-0.5">
                  <span class="text-3xl font-black text-slate-900">${cand.notaFinal}</span>
                  <span class="text-xs font-bold text-slate-400">/ 100</span>
                </div>
              </div>
              <span class="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${estiloBadge}">
                ${cand.clasificacion}
              </span>
            </div>

            <!-- Metadatos de evaluación -->
            <div class="grid grid-cols-2 gap-2 text-[11px]">
              <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span class="block text-[10px] text-slate-400 font-bold">Competencias</span>
                <span class="font-extrabold text-slate-700">${cand.preguntasEvaluadas} evaluadas</span>
              </div>
              <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span class="block text-[10px] text-slate-400 font-bold">Evaluador(a)</span>
                <span class="font-extrabold text-slate-700 truncate block">${cand.evaluadorNombre}</span>
              </div>
            </div>

            <!-- Desglose de Competencias STAR -->
            <div class="space-y-2 pt-1">
              <span class="block text-[10px] font-black uppercase tracking-wider text-slate-400">Evidencias por Competencia (STAR)</span>
              <div class="lista-evidencias-print space-y-2 max-h-60 overflow-y-auto pr-1">
                ${bloquesDetalle}
              </div>
            </div>

            ${cand.preguntaAdicional && cand.preguntaAdicional !== 'No aplica' ? `
              <div class="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-900">
                <strong class="block text-[10px] uppercase text-indigo-600 mb-0.5">Pregunta Complementaria:</strong>
                ${cand.preguntaAdicional}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // Modal de Feedback
  const modalFeedback = document.getElementById('modalFeedback');
  document.getElementById('btnFeedbackModal')?.addEventListener('click', () => modalFeedback?.classList.remove('hidden'));
  document.getElementById('btnCerrarModalFeedback')?.addEventListener('click', () => modalFeedback?.classList.add('hidden'));
  document.getElementById('btnEnviarFeedback')?.addEventListener('click', () => {
    alert('Comentario enviado satisfactoriamente al equipo de desarrollo.');
    modalFeedback?.classList.add('hidden');
    const txt = document.getElementById('textoFeedback');
    if (txt) txt.value = '';
  });

});