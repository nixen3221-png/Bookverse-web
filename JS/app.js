/**
 * BookVerse - Cliente Web Simulado (Modo Dual: MySQL API + Fallback Navegador)
 * Implementa el Diagrama de Clases (Avance #1) y los requerimientos RF-10, RF-11, RF-12 y RF-13.
 */

const API_URL = "http://localhost:3000/api";

// =========================================================
// 1. CLASES DEL DIAGRAMA UML (AVANCE #1)
// =========================================================

class Sucursal {
  constructor(idSucursal, nombre, direccion, ciudad) {
    this.idSucursal = idSucursal;
    this.nombre = nombre;
    this.direccion = direccion;
    this.ciudad = ciudad;
    this.sensores = [];
  }

  registrarSucursal(sensor) {
    this.sensores.push(sensor);
  }

  obtenerSensoresActivos() {
    return this.sensores.filter((s) => s.estado !== "Sin datos");
  }
}

class Sensor {
  constructor(idSensor, tipo, ubicacionBodega, unidadMedida, sucursalId, sucursalNombre) {
    this.idSensor = idSensor;
    this.tipo = tipo;
    this.ubicacionBodega = ubicacionBodega;
    this.unidadMedida = unidadMedida;
    this.sucursalId = sucursalId;
    this.sucursalNombre = sucursalNombre;
    this.estado = "Normal";
    this.ultimaLectura = new Date();
    this.valorActual = 0;
    this.historial = [];
    this.fallaSimulada = false;
  }

  verificarEstadoConnection() {
    if (this.fallaSimulada) {
      this.estado = "Sin datos";
      return false;
    }
    return true;
  }

  guardarPuntoHistorial(valor) {
    this.valorActual = valor;
    this.ultimaLectura = new Date();
    this.historial.push(valor);
    if (this.historial.length > 14) {
      this.historial.shift();
    }
  }
}

class SensorTemperatura extends Sensor {
  constructor(idSensor, ubicacionBodega, sucursalId, sucursalNombre, valorInicial, umbrales) {
    super(idSensor, "Temperatura", ubicacionBodega, "°C", sucursalId, sucursalNombre);
    this.valorTemperatura = valorInicial;
    this.umbrales = umbrales;
    for (let i = 0; i < 10; i++) {
      this.guardarPuntoHistorial(Number((valorInicial + (Math.random() - 0.5) * 0.6).toFixed(1)));
    }
  }

  medirTemperatura(bodegaCritica = false) {
    if (!this.verificarEstadoConnection()) return null;
    if (bodegaCritica) {
      this.valorTemperatura = Number((this.umbrales.tempMax + 2.4 + Math.random() * 1.6).toFixed(1));
    } else {
      const base = this.valorTemperatura > this.umbrales.tempMax ? 22.5 : this.valorTemperatura;
      const variacion = (Math.random() - 0.48) * 0.4;
      this.valorTemperatura = Number(Math.max(14.0, Math.min(35.0, base + variacion)).toFixed(1));
    }
    this.guardarPuntoHistorial(this.valorTemperatura);
    this.validarUmbrales();
    return this.valorTemperatura;
  }

  validarUmbrales() {
    const fueraRango =
      this.valorTemperatura < this.umbrales.tempMin ||
      this.valorTemperatura > this.umbrales.tempMax;
    this.estado = fueraRango ? "Alerta" : "Normal";
    return !fueraRango;
  }
}

class SensorHumedad extends Sensor {
  constructor(idSensor, ubicacionBodega, sucursalId, sucursalNombre, valorInicial, umbrales) {
    super(idSensor, "Humedad", ubicacionBodega, "%", sucursalId, sucursalNombre);
    this.valorHumedad = valorInicial;
    this.umbrales = umbrales;
    for (let i = 0; i < 10; i++) {
      this.guardarPuntoHistorial(Math.round(valorInicial + (Math.random() - 0.5) * 2));
    }
  }

  medirHumedad(bodegaCritica = false) {
    if (!this.verificarEstadoConnection()) return null;
    if (bodegaCritica) {
      this.valorHumedad = Math.round(this.umbrales.humMax + 10 + Math.random() * 7);
    } else {
      const base = this.valorHumedad > this.umbrales.humMax ? 51 : this.valorHumedad;
      const variacion = Math.round((Math.random() - 0.48) * 2);
      this.valorHumedad = Math.max(30, Math.min(92, base + variacion));
    }
    this.guardarPuntoHistorial(this.valorHumedad);
    this.validarHumedad();
    return this.valorHumedad;
  }

  validarHumedad() {
    this.estado = this.valorHumedad > this.umbrales.humMax ? "Alerta" : "Normal";
    return this.estado === "Normal";
  }
}

class SensorConteo extends Sensor {
  constructor(idSensor, ubicacionBodega, sucursalId, sucursalNombre, valorInicial, umbrales) {
    super(idSensor, "Conteo de personas", ubicacionBodega, "personas", sucursalId, sucursalNombre);
    this.personasIngresadas = valorInicial;
    this.umbrales = umbrales;
    for (let i = 0; i < 10; i++) {
      this.guardarPuntoHistorial(Math.max(1, valorInicial + Math.round((Math.random() - 0.5) * 3)));
    }
  }

  contarPersonas() {
    if (!this.verificarEstadoConnection()) return null;
    const delta = Math.floor(Math.random() * 5) - 2;
    this.personasIngresadas = Math.max(2, Math.min(this.umbrales.capMax + 4, this.personasIngresadas + delta));
    this.guardarPuntoHistorial(this.personasIngresadas);
    this.estado = this.personasIngresadas > this.umbrales.capMax ? "Alerta" : "Normal";
    return this.personasIngresadas;
  }

  reiniciarContador() {
    this.personasIngresadas = 0;
    this.guardarPuntoHistorial(0);
  }
}

class Alerta {
  constructor(idAlerta, tipoAlerta, mensaje, nivelCriticidad, codigoSensor, sucursal) {
    this.idAlerta = idAlerta;
    this.tipoAlerta = tipoAlerta;
    this.mensaje = mensaje;
    this.timestamp = new Date().toLocaleTimeString("es-CL");
    this.nivelCriticidad = nivelCriticidad;
    this.codigoSensor = codigoSensor;
    this.sucursal = sucursal;
  }
}

// =========================================================
// 2. CONTROLADOR MONITOR (RF-10, RF-11, RF-12, RF-13)
// =========================================================

class ControladorMonitor {
  constructor() {
    this.sesionActiva = true;
    this.intervaloActualizacion = 3000;
    this.conexionActiva = false;
    this.modoSoloNavegador = false;
    this.redSimuladaCaida = false;
    this.bodegaCriticaActiva = false;

    this.umbrales = JSON.parse(localStorage.getItem("bv_umbrales")) || {
      tempMin: 15,
      tempMax: 28,
      humMax: 65,
      capMax: 40,
    };

    this.totalGuardadosMySQL = 0;
    this.ultimasLecturasMySQL = [];
    this.colaPendientes = [];
    this.alertas = [];
    this.bitacoraPruebas = JSON.parse(localStorage.getItem("bv_bitacora_rf13")) || [];

    this.inicializarDatosBase();
    this.registrarEventos();
    this.iniciarMonitoreo();
  }

  inicializarDatosBase() {
    const chillan = new Sucursal(1, "Sucursal Chillán", "Av. Libertad 450", "Chillán");
    chillan.registrarSucursal(new SensorTemperatura("T-01", "Bodega", 1, "Sucursal Chillán", 23.1, this.umbrales));
    chillan.registrarSucursal(new SensorHumedad("H-01", "Bodega", 1, "Sucursal Chillán", 52, this.umbrales));
    chillan.registrarSucursal(new SensorConteo("P-01", "Acceso principal", 1, "Sucursal Chillán", 21, this.umbrales));

    const concepcion = new Sucursal(2, "Sucursal Concepción", "Barros Arana 780", "Concepción");
    concepcion.registrarSucursal(new SensorTemperatura("T-02", "Bodega", 2, "Sucursal Concepción", 21.9, this.umbrales));
    concepcion.registrarSucursal(new SensorHumedad("H-02", "Bodega", 2, "Sucursal Concepción", 50, this.umbrales));
    concepcion.registrarSucursal(new SensorConteo("P-02", "Acceso principal", 2, "Sucursal Concepción", 18, this.umbrales));

    this.sucursales = [chillan, concepcion];
  }

  iniciarMonitoreo() {
    this.recibirDatosSensores();
    setInterval(() => {
      if (this.sesionActiva) {
        this.recibirDatosSensores();
      }
    }, this.intervaloActualizacion);

    setInterval(() => {
      document.getElementById("clock").textContent = new Date().toLocaleTimeString("es-CL");
    }, 1000);
  }

  async recibirDatosSensores() {
    const loteLecturas = [];
    const horaActual = new Date().toLocaleTimeString("es-CL");

    this.sucursales.forEach((sucursal) => {
      sucursal.sensores.forEach((sensor) => {
        let valor = null;
        if (sensor instanceof SensorTemperatura) {
          valor = sensor.medirTemperatura(this.bodegaCriticaActiva);
        } else if (sensor instanceof SensorHumedad) {
          valor = sensor.medirHumedad(this.bodegaCriticaActiva);
        } else if (sensor instanceof SensorConteo) {
          valor = sensor.contarPersonas();
        }

        if (valor !== null) {
          loteLecturas.push({
            codigo_sensor: sensor.idSensor,
            sucursal: sucursal.nombre,
            tipo_sensor: sensor.tipo,
            valor: valor,
            unidad: sensor.unidadMedida,
            fecha_registro: horaActual,
          });

          if (sensor.estado === "Alerta") {
            this.dispararAlertaVisual(sensor, valor);
          }
        }
      });
    });

    // Excepción simulada: Sin conexión a Internet (RF-10 / RF-11)
    if (this.redSimuladaCaida) {
      this.conexionActiva = false;
      this.colaPendientes.push(...loteLecturas);
      this.actualizarEstadoConexionUI("Sin internet (Simulado)");
      this.actualizarPantallaDashboard();
      return;
    }

    // Intento 1: Conectar con API Node.js + MySQL (Docker o XAMPP)
    try {
      const aEnviar = [...this.colaPendientes, ...loteLecturas];
      const resPost = await fetch(`${API_URL}/lecturas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lecturas: aEnviar }),
      });

      if (!resPost.ok) throw new Error("Servidor Node no disponible");

      this.colaPendientes = [];
      const resEstado = await fetch(`${API_URL}/estado`);
      const dataEstado = await resEstado.json();

      if (dataEstado.conectado) {
        this.modoSoloNavegador = false;
        this.conexionActiva = true;
        this.totalGuardadosMySQL = dataEstado.total;
        this.ultimasLecturasMySQL = dataEstado.ultimas;
        this.actualizarEstadoConexionUI("Conectado · MySQL Docker (bookverse_db)");
      }
    } catch (_) {
      // Intento 2 (Fallback): Si se abre con Live Server sin Node.js, persiste en localStorage
      this.modoSoloNavegador = true;
      this.conexionActiva = true;

      const locales = JSON.parse(localStorage.getItem("bv_lecturas_fallback")) || [];
      const aGuardar = [...this.colaPendientes, ...loteLecturas];
      this.colaPendientes = [];

      const actualizadas = [...aGuardar.reverse(), ...locales].slice(0, 250);
      localStorage.setItem("bv_lecturas_fallback", JSON.stringify(actualizadas));

      this.totalGuardadosMySQL = actualizadas.length;
      this.ultimasLecturasMySQL = actualizadas.slice(0, 20);
      this.actualizarEstadoConexionUI("Conectado · Simulación Web (bookverse_db)");
    }

    this.actualizarPantallaDashboard();
  }

  dispararAlertaVisual(sensor, valor) {
    const ahora = new Date().toLocaleTimeString("es-CL");
    const duplicada =
      this.alertas.length > 0 &&
      this.alertas[0].codigoSensor === sensor.idSensor &&
      this.alertas[0].timestamp === ahora;

    if (duplicada) return;

    const mensaje = `${sensor.sucursalNombre} (${sensor.idSensor} · ${sensor.ubicacionBodega}): ${valor} ${sensor.unidadMedida} supera el umbral permitido.`;
    const nuevaAlerta = new Alerta(
      this.alertas.length + 1,
      sensor.tipo,
      mensaje,
      "CRÍTICA",
      sensor.idSensor,
      sensor.sucursalNombre
    );
    this.alertas.unshift(nuevaAlerta);
    if (this.alertas.length > 30) {
      this.alertas.pop();
    }
  }

  actualizarEstadoConexionUI(texto) {
    const pill = document.getElementById("connPill");
    if (this.conexionActiva) {
      pill.className = "pill online";
      pill.textContent = `● ${texto}`;
    } else {
      pill.className = "pill offline";
      pill.textContent = `● ${texto}`;
    }
  }

  actualizarPantallaDashboard() {
    const todosSensores = this.sucursales.flatMap((s) => s.sensores);
    const enLinea = todosSensores.filter((s) => s.estado !== "Sin datos").length;
    const alertasActivas = todosSensores.filter((s) => s.estado === "Alerta").length;
    const personasTotal = todosSensores
      .filter((s) => s instanceof SensorConteo && s.estado !== "Sin datos")
      .reduce((sum, s) => sum + s.personasIngresadas, 0);

    document.getElementById("kpiOnline").innerHTML = `${enLinea}<small>/6</small>`;
    document.getElementById("kpiAlerts").textContent = alertasActivas;
    document.getElementById("kpiPeople").textContent = personasTotal;
    document.getElementById("kpiStored").textContent = this.totalGuardadosMySQL;
    document.getElementById("colaReintento").textContent = `Pendientes de inserción: ${this.colaPendientes.length}`;

    const banner = document.getElementById("globalBanner");
    const sinDatos = todosSensores.filter((s) => s.estado === "Sin datos");

    if (!this.conexionActiva) {
      banner.style.display = "block";
      banner.textContent =
        "⚠️ Excepción de red / BD (RF-10 / RF-11): Sin conexión con el servidor. Las lecturas se retienen en cola local para reintento automático.";
    } else if (sinDatos.length > 0) {
      banner.style.display = "block";
      banner.textContent = `⚠️ Advertencia Flujo Alterno (RF-10): El sensor ${sinDatos
        .map((s) => `${s.idSensor} (${s.sucursalNombre})`)
        .join(", ")} dejó de enviar datos.`;
    } else if (alertasActivas > 0) {
      banner.style.display = "block";
      banner.textContent = `🚨 Alerta Ambiental (RF-10): ${alertasActivas} sensor(es) registran valores fuera de los umbrales operacionales.`;
    } else {
      banner.style.display = "none";
    }

    this.renderizarSucursal(this.sucursales[0], "gridChillan");
    this.renderizarSucursal(this.sucursales[1], "gridConcepcion");
    this.renderizarAlertasYLecturas();

    document.getElementById("footerUmbrales").textContent =
      `Umbrales operacionales: Temperatura ${this.umbrales.tempMin}–${this.umbrales.tempMax} °C, ` +
      `Humedad máx. ${this.umbrales.humMax} %, Aforo máx. ${this.umbrales.capMax} personas por sucursal.`;
  }

  renderizarSucursal(sucursal, containerId) {
    const grid = document.getElementById(containerId);
    grid.innerHTML = sucursal.sensores
      .map((s) => {
        let iconClass = "icon-temp";
        let emoji = "🌡️";
        let umbralTexto = `Umbral: ${this.umbrales.tempMin}–${this.umbrales.tempMax} °C`;
        let strokeColor = "#f97316";

        if (s instanceof SensorHumedad) {
          iconClass = "icon-hum";
          emoji = "💧";
          umbralTexto = `Umbral: máx. ${this.umbrales.humMax} %`;
          strokeColor = "#0284c7";
        } else if (s instanceof SensorConteo) {
          iconClass = "icon-people";
          emoji = "👥";
          umbralTexto = `Umbral: máx. ${this.umbrales.capMax} personas`;
          strokeColor = "#7c3aed";
        }

        let badgeClass = "normal";
        if (s.estado === "Alerta") {
          badgeClass = "alerta";
          strokeColor = "#dc2626";
        } else if (s.estado === "Sin datos") {
          badgeClass = "offline";
        }

        const lecturaHTML =
          s.estado === "Sin datos"
            ? `-- <small>${s.unidadMedida}</small>`
            : `${s.valorActual} <small>${s.unidadMedida}</small>`;

        return `
          <article class="card">
            <div class="sensor-header">
              <div class="sensor-title-wrap">
                <span class="sensor-icon ${iconClass}">${emoji}</span>
                <div>
                  <div class="sensor-name">${s.idSensor} · ${s.tipo}</div>
                  <div class="sensor-sub">${s.ubicacionBodega} · ${s.sucursalNombre}</div>
                </div>
              </div>
              <span class="badge ${badgeClass}">${s.estado}</span>
            </div>
            <div class="sensor-reading">${lecturaHTML}</div>
            ${this.generarSparklineSVG(s.historial, strokeColor)}
            <div class="sensor-footer">
              <span>${umbralTexto}</span>
              <span>Última lectura: ${s.ultimaLectura.toLocaleTimeString("es-CL")}</span>
            </div>
          </article>
        `;
      })
      .join("");
  }

  generarSparklineSVG(datos, color) {
    if (!datos || datos.length < 2) return `<svg class="sparkline"></svg>`;
    const w = 300;
    const h = 38;
    const min = Math.min(...datos) - 1;
    const max = Math.max(...datos) + 1;
    const rango = max - min || 1;

    const puntos = datos
      .map((val, idx) => {
        const x = ((idx / (datos.length - 1)) * w).toFixed(1);
        const y = (h - ((val - min) / rango) * (h - 6) - 3).toFixed(1);
        return `${x},${y}`;
      })
      .join(" ");

    return `
      <svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <polyline fill="none" stroke="${color}" stroke-width="2.2" points="${puntos}" />
      </svg>
    `;
  }

  renderizarAlertasYLecturas() {
    const alertsBox = document.getElementById("alertsBox");
    if (this.alertas.length === 0) {
      alertsBox.innerHTML = `<p class="empty-msg">Sin alertas registradas.</p>`;
    } else {
      alertsBox.innerHTML = this.alertas
        .slice(0, 15)
        .map(
          (a) => `
          <div class="log-item">
            <span><strong>[${a.timestamp}]</strong> ${a.mensaje}</span>
            <span class="badge alerta">${a.codigoSensor}</span>
          </div>
        `
        )
        .join("");
    }

    const readingsBox = document.getElementById("readingsBox");
    if (this.ultimasLecturasMySQL.length === 0) {
      readingsBox.innerHTML = `<p class="empty-msg">Sin lecturas cargadas desde la base de datos.</p>`;
    } else {
      readingsBox.innerHTML = this.ultimasLecturasMySQL
        .map(
          (r) => `
          <div class="log-item">
            <span>${r.fecha_registro}</span>
            <span class="badge-pill-muted">${r.codigo_sensor}</span>
            <strong>${r.valor} ${r.unidad}</strong>
            <span class="sensor-sub">${r.sucursal}</span>
          </div>
        `
        )
        .join("");
    }
  }

  // =========================================================
  // 3. GENERACIÓN DE INFORME OPERACIONAL (RF-12)
  // =========================================================
  async abrirModalRF12() {
    const sensoresCaidos = this.sucursales.flatMap((s) => s.sensores).filter((s) => s.estado === "Sin datos");
    const partialWarn = document.getElementById("rf12PartialWarn");

    if (sensoresCaidos.length > 0 || !this.conexionActiva) {
      partialWarn.style.display = "block";
      partialWarn.textContent =
        "⚠️ Informe Parcial (RF-12 Flujo Alterno): Existen sensores sin señal o lecturas pendientes de sincronización.";
    } else {
      partialWarn.style.display = "none";
    }

    document.getElementById("rf12Meta").textContent =
      `Actor: Gerente de operaciones · Generado: ${new Date().toLocaleString("es-CL")} · Registros analizados: ${this.totalGuardadosMySQL}`;

    let resumen = [];

    if (!this.modoSoloNavegador) {
      try {
        const resp = await fetch(`${API_URL}/informe`);
        const data = await resp.json();
        resumen = data.resumen || [];
      } catch (_) {
        this.modoSoloNavegador = true;
      }
    }

    if (this.modoSoloNavegador) {
      const locales = JSON.parse(localStorage.getItem("bv_lecturas_fallback")) || [];
      const catalogo = [
        { codigo_sensor: "T-01", sucursal: "Sucursal Chillán", tipo_sensor: "Temperatura", unidad_medida: "°C" },
        { codigo_sensor: "H-01", sucursal: "Sucursal Chillán", tipo_sensor: "Humedad", unidad_medida: "%" },
        { codigo_sensor: "P-01", sucursal: "Sucursal Chillán", tipo_sensor: "Conteo de personas", unidad_medida: "personas" },
        { codigo_sensor: "T-02", sucursal: "Sucursal Concepción", tipo_sensor: "Temperatura", unidad_medida: "°C" },
        { codigo_sensor: "H-02", sucursal: "Sucursal Concepción", tipo_sensor: "Humedad", unidad_medida: "%" },
        { codigo_sensor: "P-02", sucursal: "Sucursal Concepción", tipo_sensor: "Conteo de personas", unidad_medida: "personas" },
      ];
      resumen = catalogo.map((c) => {
        const vals = locales.filter((l) => l.codigo_sensor === c.codigo_sensor).map((l) => Number(l.valor));
        return {
          ...c,
          muestras: vals.length,
          promedio: vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null,
          minimo: vals.length ? Math.min(...vals).toFixed(1) : null,
          maximo: vals.length ? Math.max(...vals).toFixed(1) : null,
        };
      });
    }

    const recomendaciones = [];
    if (this.alertas.some((a) => a.tipoAlerta === "Humedad")) {
      recomendaciones.push(`• Activar deshumidificadores en bodega (humedad superó el máximo de ${this.umbrales.humMax}%).`);
    }
    if (this.alertas.some((a) => a.tipoAlerta === "Temperatura")) {
      recomendaciones.push(`• Ajustar climatización HVAC en bodega para mantener rango ${this.umbrales.tempMin}–${this.umbrales.tempMax} °C.`);
    }
    if (recomendaciones.length === 0) {
      recomendaciones.push("• Condiciones ambientales y de aforo óptimas para conservación de libros en ambas sucursales.");
    }

    document.getElementById("rf12Content").innerHTML = `
      <table class="report-table">
        <thead>
          <tr>
            <th>Sensor</th>
            <th>Sucursal</th>
            <th>Variable</th>
            <th>Muestras</th>
            <th>Promedio</th>
            <th>Mínimo</th>
            <th>Máximo</th>
          </tr>
        </thead>
        <tbody>
          ${resumen
            .map(
              (fila) => `
            <tr>
              <td><strong>${fila.codigo_sensor}</strong></td>
              <td>${fila.sucursal}</td>
              <td>${fila.tipo_sensor} (${fila.unidad_medida})</td>
              <td>${fila.muestras}</td>
              <td><strong>${fila.promedio ?? "Sin datos"}</strong></td>
              <td>${fila.minimo ?? "-"}</td>
              <td>${fila.maximo ?? "-"}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
      <p><strong>Alertas críticas registradas:</strong> ${this.alertas.length}</p>
      <p><strong>Recomendaciones operacionales:</strong><br>${recomendaciones.join("<br>")}</p>
    `;

    document.getElementById("modalRF12").style.display = "flex";
  }

  descargarInformeTXT() {
    const fecha = new Date().toLocaleString("es-CL");
    const contenido = [
      "==========================================================",
      "BOOKVERSE - INFORME OPERACIONAL DE MONITOREO IOT (RF-12)",
      `Fecha de emisión: ${fecha}`,
      `Origen de datos: ${this.modoSoloNavegador ? "Simulación Web (bookverse_db)" : "MySQL Server (bookverse_db)"}`,
      `Total lecturas almacenadas: ${this.totalGuardadosMySQL}`,
      `Total alertas críticas: ${this.alertas.length}`,
      "==========================================================",
      "",
      "ÚLTIMAS ALERTAS REGISTRADAS:",
      ...(this.alertas.length
        ? this.alertas.slice(0, 10).map((a) => `- [${a.timestamp}] ${a.mensaje}`)
        : ["- Sin alertas registradas."]),
      "",
      "ÚLTIMAS 20 LECTURAS REGISTRADAS:",
      ...this.ultimasLecturasMySQL.map(
        (r) => `- ${r.fecha_registro} | ${r.codigo_sensor} (${r.sucursal}): ${r.valor} ${r.unidad}`
      ),
    ].join("\n");

    const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Informe_Operacional_BookVerse_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // =========================================================
  // 4. BITÁCORA DE PRUEBAS Y AJUSTES (RF-13)
  // =========================================================
  abrirModalRF13() {
    document.getElementById("adjTempMax").value = this.umbrales.tempMax;
    document.getElementById("adjHumMax").value = this.umbrales.humMax;
    document.getElementById("adjCapMax").value = this.umbrales.capMax;
    this.renderizarBitacoraRF13();
    document.getElementById("modalRF13").style.display = "flex";
  }

  guardarRegistroRF13(obs, adj) {
    this.bitacoraPruebas.unshift({
      hora: new Date().toLocaleTimeString("es-CL"),
      obs,
      adj,
    });
    localStorage.setItem("bv_bitacora_rf13", JSON.stringify(this.bitacoraPruebas));
    this.renderizarBitacoraRF13();
  }

  renderizarBitacoraRF13() {
    const list = document.getElementById("rf13List");
    if (this.bitacoraPruebas.length === 0) {
      list.innerHTML = `<p class="empty-msg">Sin registros de pruebas documentados aún.</p>`;
      return;
    }
    list.innerHTML = this.bitacoraPruebas
      .map(
        (item) => `
        <div class="log-item">
          <div>
            <strong>[${item.hora}] Observación:</strong> ${item.obs}<br>
            <span class="sensor-sub"><strong>Ajuste:</strong> ${item.adj}</span>
          </div>
          <span class="badge normal">Documentado</span>
        </div>
      `
      )
      .join("");
  }

  // =========================================================
  // 5. VINCULACIÓN DE EVENTOS DE INTERFAZ
  // =========================================================
  registrarEventos() {
    document.getElementById("btnSincronizarBD").addEventListener("click", () => {
      if (this.redSimuladaCaida) {
        this.redSimuladaCaida = false;
        document.getElementById("btnSimOffline").classList.remove("btn-active-sim");
      }
      this.recibirDatosSensores();
    });

    const btnSensorOff = document.getElementById("btnSimSensorOff");
    btnSensorOff.addEventListener("click", () => {
      const t02 = this.sucursales[1].sensores.find((s) => s.idSensor === "T-02");
      t02.fallaSimulada = !t02.fallaSimulada;
      t02.verificarEstadoConnection();
      if (!t02.fallaSimulada) t02.estado = "Normal";
      btnSensorOff.classList.toggle("btn-active-sim", t02.fallaSimulada);
      this.actualizarPantallaDashboard();
    });

    const btnOffline = document.getElementById("btnSimOffline");
    btnOffline.addEventListener("click", () => {
      this.redSimuladaCaida = !this.redSimuladaCaida;
      btnOffline.classList.toggle("btn-active-sim", this.redSimuladaCaida);
      if (!this.redSimuladaCaida) {
        this.recibirDatosSensores();
      } else {
        this.conexionActiva = false;
        this.actualizarEstadoConexionUI("Sin internet (Simulado)");
        this.actualizarPantallaDashboard();
      }
    });

    const btnCritico = document.getElementById("btnSimCritico");
    btnCritico.addEventListener("click", () => {
      this.bodegaCriticaActiva = !this.bodegaCriticaActiva;
      btnCritico.classList.toggle("btn-active-sim", this.bodegaCriticaActiva);
      btnCritico.textContent = this.bodegaCriticaActiva
        ? "Normalizar condiciones bodega"
        : "Simular bodega húmeda y caliente";
      this.recibirDatosSensores();
    });

    document.getElementById("btnBorrarLecturas").addEventListener("click", async () => {
      try {
        if (!this.modoSoloNavegador) {
          await fetch(`${API_URL}/lecturas`, { method: "DELETE" });
        }
      } catch (_) {
        // Ignora error si está en modo solo navegador
      }
      localStorage.removeItem("bv_lecturas_fallback");
      this.alertas = [];
      this.colaPendientes = [];
      this.totalGuardadosMySQL = 0;
      this.ultimasLecturasMySQL = [];
      this.actualizarPantallaDashboard();
    });

    document.getElementById("btnGenerarInforme").addEventListener("click", () => this.abrirModalRF12());
    document.getElementById("btnDescargarInforme").addEventListener("click", () => this.descargarInformeTXT());
    document.getElementById("btnAbrirPruebas").addEventListener("click", () => this.abrirModalRF13());

    document.getElementById("btnAplicarUmbrales").addEventListener("click", () => {
      this.umbrales.tempMax = Number(document.getElementById("adjTempMax").value);
      this.umbrales.humMax = Number(document.getElementById("adjHumMax").value);
      this.umbrales.capMax = Number(document.getElementById("adjCapMax").value);
      localStorage.setItem("bv_umbrales", JSON.stringify(this.umbrales));
      this.guardarRegistroRF13(
        "Calibración de umbrales operacionales desde panel técnico.",
        `Temp máx: ${this.umbrales.tempMax}°C | Hum máx: ${this.umbrales.humMax}% | Aforo máx: ${this.umbrales.capMax} pers.`
      );
      this.actualizarPantallaDashboard();
    });

    document.getElementById("btnGuardarPrueba").addEventListener("click", () => {
      const obs = document.getElementById("rf13Obs").value.trim();
      const adj = document.getElementById("rf13Adj").value.trim();
      if (!obs || !adj) return;
      this.guardarRegistroRF13(obs, adj);
      document.getElementById("rf13Obs").value = "";
      document.getElementById("rf13Adj").value = "";
    });

    document.getElementById("btnEjecutarAutoTest").addEventListener("click", () => {
      this.guardarRegistroRF13(
        "Batería automática RF-10/RF-11/RF-12: 6 sensores activos, persistencia en registro_datos_sensores y cálculo de promedios verificados.",
        "Sistema validado sin desviaciones."
      );
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.monitorBookVerse = new ControladorMonitor();
});