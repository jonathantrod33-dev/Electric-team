// ===== CONFIGURACIÓN =====
const SHEET_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSOC6Ah4e98ePwGf_Fz5H-Y0WvqqD1XH4smrYOaIW0xqyJE60m4Cy8Bs7iBt1HF97UFKez_WnGi6K5B/pub?output=csv";
const LOG_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby6b_1WLrlPd7JO6JTlmtCtZsr5_HwXyfyh-Ub6ZthFXtz93KpKqJF2T_X0bS6M3jw/exec";

// ===== VARIABLES GLOBALES =====
let dbPrecios = {};
let cart = [];
let currentRubro = null;
let currentSub = null;

// ===== CARGAR PRECIOS DESDE GOOGLE SHEETS =====
async function loadPrices() {
  try {
    const res = await fetch(SHEET_CSV);
    const text = await res.text();
    const lines = text.split("\n").filter((line) => line.trim().length > 5);
    dbPrecios = {};

    lines.slice(1).forEach((line) => {
      const rawParts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (rawParts && rawParts.length >= 3) {
        const p = rawParts.map((x) => x.replace(/^"|"$/g, "").trim());
        let rubro = p[0].replace(/_/g, " ").trim().toUpperCase();
        let sub = p[1].replace(/_/g, " ").trim().toUpperCase();
        let tarea = p[2].replace(/_/g, " ").trim();
        const val = parseInt(p[3].replace(/[^0-9]/g, ""));
        const nota = p[4] ? p[4].replace(/_/g, " ") : "";

        if (rubro && !isNaN(val)) {
          if (!dbPrecios[rubro]) dbPrecios[rubro] = {};
          if (!dbPrecios[rubro][sub]) dbPrecios[rubro][sub] = [];
          dbPrecios[rubro][sub].push({ n: tarea, p: val, nota: nota });
        }
      }
    });
    renderGremios();
  } catch (e) {
    console.error("Error cargando precios:", e);
  }
}

// ===== REGISTRAR LOG =====
async function registrarLog(datos) {
  const payload = {
    fecha: new Date().toLocaleString("es-AR"),
    nombre: datos.name,
    telefono: datos.phone,
    email: datos.email,
    plazo: datos.time,
    total: document.getElementById("totalDisplay").innerText,
    servicios: cart.map((i) => `${i.c}x ${i.n}`).join(" | "),
  };
  try {
    await fetch(LOG_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Error en log:", error);
  }
}

// ===== RENDERIZAR GREMIOS =====
function renderGremios() {
  const container = document.getElementById("trade-container");
  container.innerHTML = "";
  Object.keys(dbPrecios)
    .sort()
    .forEach((rubro) => {
      const btn = document.createElement("button");
      btn.className =
        "step-btn p-4 rounded-2xl text-[11px] font-black uppercase tracking-tighter bg-white shadow-sm border border-slate-100 hover:border-azul-claro hover:text-negro-principal transition-all";
      btn.textContent = rubro;
      btn.onclick = () => selectRubro(rubro, btn);
      container.appendChild(btn);
    });
}

// ===== SELECCIONAR RUBRO =====
function selectRubro(rubro, btnElement) {
  currentRubro = rubro;
  document.querySelectorAll("#trade-container button").forEach((b) => {
    b.classList.remove("active");
  });
  btnElement.classList.add("active");
  renderCategorias();
}

// ===== RENDERIZAR CATEGORÍAS =====
function renderCategorias() {
  const container = document.getElementById("category-container");
  container.innerHTML = "";
  document.getElementById("category-step").classList.remove("hidden");
  document.getElementById("task-step").classList.add("hidden");

  const subs = Object.keys(dbPrecios[currentRubro]).sort();
  subs.forEach((sub) => {
    const btn = document.createElement("button");
    btn.className =
      "step-btn py-2 px-4 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white border border-slate-200 shadow-sm hover:bg-negro-principal hover:text-naranja-principal transition-all";
    btn.textContent = sub;
    btn.onclick = () => selectCategoria(sub, btn);
    container.appendChild(btn);
  });
}

// ===== SELECCIONAR CATEGORÍA =====
function selectCategoria(sub, btnElement) {
  currentSub = sub;
  document.querySelectorAll("#category-container button").forEach((b) => {
    b.classList.remove("bg-negro-principal", "text-naranja-principal");
  });
  btnElement.classList.add("bg-negro-principal", "text-naranja-principal");
  renderTareas();
}

// ===== RENDERIZAR TAREAS =====
function renderTareas() {
  const container = document.getElementById("task-container");
  container.innerHTML = "";
  document.getElementById("task-step").classList.remove("hidden");

  const tareas = dbPrecios[currentRubro][currentSub];
  tareas.forEach((item, index) => {
    const row = document.createElement("div");
    const inputId = `qty-${index}`;
    row.className =
      "task-row p-4 border-b border-slate-100 flex justify-between items-center bg-white hover:bg-slate-50 transition-all";
    row.innerHTML = `
            <div class="pr-4 cursor-pointer flex-1">
                <p class="text-[11px] font-bold uppercase text-slate-800 leading-tight">${item.n}</p>
                <p class="text-[9px] text-slate-400 italic mt-1">${item.nota || "Certificado."}</p>
            </div>
            <div class="text-right flex items-center gap-3">
                <span class="text-xs font-black text-azul-claro mr-2">$${item.p.toLocaleString("es-AR")}</span>
                <input type="number" id="${inputId}" value="1" min="1" class="w-12 p-1 text-center text-xs font-bold border border-slate-200 rounded-lg outline-none focus:border-azul-claro">
                <button onclick="addToCart('${item.n}', ${item.p}, '${inputId}')" class="w-8 h-8 rounded-full bg-negro-principal text-naranja-principal flex items-center justify-center text-sm shadow-lg hover:scale-110 transition-transform font-bold">+</button>
            </div>
        `;
    container.appendChild(row);
  });
}

// ===== AGREGAR AL CARRITO =====
function addToCart(nombre, precio, inputId) {
  const qty = parseInt(document.getElementById(inputId).value) || 1;
  const nombreFinal = `[${currentSub}] ${nombre}`;
  cart.push({ n: nombreFinal, c: qty, p: precio, st: precio * qty });
  renderCart();
}

// ===== RENDERIZAR CARRITO =====
function renderCart() {
  const container = document.getElementById("listaItems");
  container.innerHTML = "";
  let total = 0;

  if (cart.length === 0) {
    container.innerHTML =
      '<p class="text-slate-500 text-center py-10 text-[10px] uppercase italic">Sin servicios seleccionados</p>';
  } else {
    cart.forEach((item, i) => {
      total += item.st;
      container.innerHTML += `
                <div class="flex justify-between items-start bg-white/5 p-3 rounded mb-2 border border-white/10">
                    <div class="text-left pr-2">
                        <div class="text-white font-bold uppercase font-mono text-[10px] leading-tight">${item.n}</div>
                        <div class="text-slate-400 text-[9px] mt-1">${item.c} u. x $${item.p.toLocaleString("es-AR")}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-naranja-principal font-bold text-[10px]">$${item.st.toLocaleString("es-AR")}</div>
                        <button onclick="removeItem(${i})" class="text-red-400 text-[9px] font-black uppercase">X</button>
                    </div>
                </div>`;
    });
  }
  document.getElementById("totalDisplay").innerText =
    `$ ${total.toLocaleString("es-AR")}`;
}

// ===== ELIMINAR ITEM =====
function removeItem(i) {
  cart.splice(i, 1);
  renderCart();
}

// ===== BORRAR TODO =====
function borrarTodo() {
  cart = [];
  renderCart();
}

// ===== VALIDAR FORMULARIO =====
function validarFormPresupuesto() {
  const d = {
    name: document.getElementById("quote-name").value,
    phone: document.getElementById("quote-phone").value,
    email: document.getElementById("quote-email").value,
    time: document.getElementById("quote-time").value,
  };
  if (!d.name || !d.phone || !d.email || !d.time) {
    alert("Completá los datos del solicitante.");
    return false;
  }
  if (cart.length === 0) {
    alert("Agregá al menos un servicio.");
    return false;
  }
  return d;
}

// ===== ENVIAR WHATSAPP =====
function enviarWhatsapp() {
  const d = validarFormPresupuesto();
  if (!d) return;

  registrarLog(d);

  let m = `*NUEVO PRESUPUESTO - ELECTRIC TEAM*\nCliente: ${d.name}\nPlazo: ${d.time}\n----------\n`;
  cart.forEach((i) => (m += `• ${i.n} (${i.c}u.)\n`));
  m += `\n*TOTAL: ${document.getElementById("totalDisplay").innerText}*`;

  window.open(`https://wa.me/5491124574478?text=${encodeURIComponent(m)}`);
}

// ===== GENERAR PDF =====
function generarPDF() {
  const d = validarFormPresupuesto();
  if (!d) return;

  registrarLog(d);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Header con colores Naranja/Negro
  doc.setFillColor(26, 26, 26); // Negro #1A1A1A
  doc.rect(0, 0, 210, 45, "F");
  doc.setTextColor(255, 102, 0); // Naranja #FF6600
  doc.setFontSize(24);
  doc.text("ELECTRIC TEAM", 15, 25);
  doc.setFontSize(10);
  doc.text("GESTION TECNICA UNIFICADA", 15, 33);
  doc.text(`CLIENTE: ${d.name.toUpperCase()}`, 195, 33, { align: "right" });

  // Tabla
  const rows = cart.map((i) => [
    i.n,
    i.c,
    `$${i.p.toLocaleString()}`,
    `$${i.st.toLocaleString()}`,
  ]);
  doc.autoTable({
    startY: 55,
    head: [["TAREA", "CANT.", "UNIT.", "SUBTOTAL"]],
    body: rows,
    headStyles: { fillColor: [26, 26, 26], textColor: [255, 102, 0] },
  });

  doc.save(`Presupuesto_ElectricTeam_${d.name}.pdf`);
}

// ===== CONTACTO CON FORMSUBMIT =====
async function analyzeAndSend() {
  const msg = document.getElementById("ai-project-desc").value;
  const btn = document.getElementById("btnSubmitAi");

  if (msg.length < 5) {
    alert("Escribí tu consulta.");
    return;
  }

  btn.disabled = true;
  btn.innerText = "Enviando...";

  const form = document.getElementById("mainContactForm");
  const formData = new FormData(form);

  fetch("https://formsubmit.co/ajax/gomezconstrucciones85@gmail.com", {
    method: "POST",
    body: formData,
  })
    .then(() => {
      alert("¡Enviado! Te respondemos pronto.");
      form.reset();
    })
    .catch(() => alert("Hubo un error. Intentá por WhatsApp."))
    .finally(() => {
      btn.disabled = false;
      btn.innerText = "Enviar Consulta";
    });
}

// ===== INICIALIZAR =====
window.onload = () => {
  loadPrices();
};

/* // ===== BASE DE PRECIOS FIJOS (EDITÁ ACÁ) =====
const dbPrecios = {
    'Electricidad': {
        'Hogar': [
            { n: 'Cambio de tomacorriente', p: 15000, nota: 'Incluye material básico' },
            { n: 'Cambio de interruptor', p: 25000, nota: 'Mecanismo estándar' },
            { n: 'Instalación de luminaria', p: 45000, nota: 'Punto existente' },
            { n: 'Cambio de tablero', p: 80000, nota: 'Hasta 12 módulos' },
            { n: 'Detección de fallas', p: 35000, nota: 'Diagnóstico profesional' }
        ],
        'Urgencias': [
            { n: 'Visita urgente (hasta 1hs)', p: 50000, nota: 'Fuera de horario' },
            { n: 'Reparación de corte', p: 40000, nota: 'Solución inmediata' }
        ]
    },
    'Albañilería': {
        'Reparaciones': [
            { n: 'Reparación de grietas', p: 50000, nota: 'Hasta 1m lineal' },
            { n: 'Revoque fino (m²)', p: 80000, nota: 'Mano de obra' },
            { n: 'Colocación de cerámicos (m²)', p: 120000, nota: 'Incluye adhesivo' }
        ],
        'Obras': [
            { n: 'Pequeña reforma', p: 200000, nota: 'Hasta 2m²' },
            { n: 'Demolición liviana', p: 60000, nota: 'Sin escombros' }
        ]
    },
    'Plomería': {
        'Reparaciones': [
            { n: 'Cambio de grifería', p: 30000, nota: 'Artefacto provisto' },
            { n: 'Destapación de desagüe', p: 45000, nota: 'Método mecánico' },
            { n: 'Reparación de pérdidas', p: 60000, nota: 'Acceso simple' }
        ],
        'Instalaciones': [
            { n: 'Instalación de artefacto', p: 150000, nota: 'Incluye conexiones' },
            { n: 'Cambio de cañería', p: 90000, nota: 'Tramo hasta 2m' }
        ]
    },
    'Mantenimiento': {
        'Hogar': [
            { n: 'Colgado de cuadros/repisas', p: 20000, nota: 'Hasta 3 unidades' },
            { n: 'Armado de muebles', p: 40000, nota: 'Mueble estándar' },
            { n: 'Pintura de habitación', p: 50000, nota: 'Hasta 10m²' },
            { n: 'Visita técnica', p: 35000, nota: 'Evaluación sin cargo' }
        ]
    }
};

// ===== VARIABLES GLOBALES =====
let cart = [];
let currentRubro = null;
let currentSub = null;

// ===== RENDERIZAR GREMIOS (AL CARGAR) =====
function renderGremios() {
    const container = document.getElementById('trade-container');
    container.innerHTML = ''; 
    
    Object.keys(dbPrecios).sort().forEach(rubro => {
        const btn = document.createElement('button');
        // ✅ CLASES ACTUALIZADAS: negro/naranja
        btn.className = "step-btn p-4 rounded-2xl text-[11px] font-black uppercase tracking-tighter bg-white shadow-sm border border-slate-100 hover:border-naranja-principal hover:text-negro-principal transition-all";
        btn.textContent = rubro;
        btn.onclick = () => selectRubro(rubro, btn);
        container.appendChild(btn);
    });
}

// ===== SELECCIONAR RUBRO =====
function selectRubro(rubro, btnElement) {
    currentRubro = rubro;
    
    document.querySelectorAll('#trade-container button').forEach(b => {
        b.classList.remove('active');
    });
    
    btnElement.classList.add('active');
    renderCategorias();
}

// ===== RENDERIZAR CATEGORÍAS =====
function renderCategorias() {
    const container = document.getElementById('category-container');
    container.innerHTML = '';
    
    document.getElementById('category-step').classList.remove('hidden');
    document.getElementById('task-step').classList.add('hidden');
    
    const subs = Object.keys(dbPrecios[currentRubro]).sort();
    
    subs.forEach(sub => {
        const btn = document.createElement('button');
        // ✅ CLASES ACTUALIZADAS: hover con naranja/negro
        btn.className = "step-btn py-2 px-4 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white border border-slate-200 shadow-sm hover:bg-negro-principal hover:text-naranja-principal transition-all";
        btn.textContent = sub;
        btn.onclick = () => selectCategoria(sub, btn);
        container.appendChild(btn);
    });
}

// ===== SELECCIONAR CATEGORÍA =====
function selectCategoria(sub, btnElement) {
    currentSub = sub;
    
    document.querySelectorAll('#category-container button').forEach(b => {
        b.classList.remove('bg-negro-principal', 'text-naranja-principal');
    });
    
    btnElement.classList.add('bg-negro-principal', 'text-naranja-principal');
    renderTareas();
}

// ===== RENDERIZAR TAREAS =====
function renderTareas() {
    const container = document.getElementById('task-container');
    container.innerHTML = '';
    
    document.getElementById('task-step').classList.remove('hidden');
    
    const tareas = dbPrecios[currentRubro][currentSub];
    
    tareas.forEach((item, index) => {
        const row = document.createElement('div');
        const inputId = `qty-${currentRubro}-${currentSub}-${index}`;
        
        row.className = "task-row p-4 border-b border-slate-100 flex justify-between items-center bg-white hover:bg-slate-50 transition-all";
        row.innerHTML = `
            <div class="pr-4 cursor-pointer flex-1">
                <p class="text-[11px] font-bold uppercase text-slate-800 leading-tight">${item.n}</p>
                <p class="text-[9px] text-slate-400 italic mt-1">${item.nota || ''}</p>
            </div>
            <div class="text-right flex items-center gap-3">
                <!-- ✅ COLOR DE PRECIO: naranja-principal -->
                <span class="text-xs font-black text-naranja-principal mr-2">$${item.p.toLocaleString('es-AR')}</span>
                <input type="number" id="${inputId}" value="1" min="1" class="w-12 p-1 text-center text-xs font-bold border border-slate-200 rounded-lg outline-none focus:border-naranja-principal">
                <!-- ✅ BOTÓN +: negro con texto naranja -->
                <button onclick="addToCart('${item.n}', ${item.p}, '${inputId}')" class="w-8 h-8 rounded-full bg-negro-principal text-naranja-principal flex items-center justify-center text-sm shadow-lg hover:scale-110 transition-transform font-bold">+</button>
            </div>
        `;
        container.appendChild(row);
    });
}

// ===== AGREGAR AL CARRITO =====
function addToCart(nombre, precio, inputId) {
    const qty = parseInt(document.getElementById(inputId).value) || 1;
    const nombreFinal = `[${currentSub}] ${nombre}`;
    
    cart.push({ 
        n: nombreFinal, 
        c: qty, 
        p: precio, 
        st: precio * qty 
    });
    
    renderCart();
}

// ===== RENDERIZAR CARRITO =====
function renderCart() {
    const container = document.getElementById('listaItems');
    container.innerHTML = ''; 
    let total = 0;
    
    if(cart.length === 0) {
        container.innerHTML = '<p class="text-slate-500 text-center py-10 text-[10px] uppercase italic">Sin servicios seleccionados</p>';
    } else {
        cart.forEach((item, i) => {
            total += item.st;
            container.innerHTML += `
                <div class="flex justify-between items-start bg-white/5 p-3 rounded-lg mb-2 border border-white/10">
                    <div class="text-left pr-2">
                        <div class="text-white font-bold uppercase font-mono text-[10px] leading-tight">${item.n}</div>
                        <div class="text-slate-400 text-[9px] mt-1">${item.c} u. x $${item.p.toLocaleString('es-AR')}</div>
                    </div>
                    <div class="text-right">
                        <!-- ✅ TOTAL DEL ITEM: naranja -->
                        <div class="text-naranja-principal font-bold text-[10px]">$${item.st.toLocaleString('es-AR')}</div>
                        <button onclick="removeItem(${i})" class="text-red-400 text-[9px] font-black uppercase hover:text-red-300">✕</button>
                    </div>
                </div>`;
        });
    }
    
    document.getElementById('totalDisplay').innerText = `$ ${total.toLocaleString('es-AR')}`;
}

// ===== ELIMINAR ITEM =====
function removeItem(i) { 
    cart.splice(i, 1); 
    renderCart(); 
}

// ===== BORRAR TODO =====
function borrarTodo() { 
    cart = []; 
    renderCart(); 
}

// ===== VALIDAR FORMULARIO =====
function validarFormPresupuesto() {
    const d = {
        name: document.getElementById('quote-name').value.trim(),
        phone: document.getElementById('quote-phone').value.trim(),
        email: document.getElementById('quote-email').value.trim(),
        time: document.getElementById('quote-time').value
    };
    
    if(!d.name || !d.phone || !d.email || !d.time) { 
        alert("Completá los datos obligatorios."); 
        return false; 
    }
    if(cart.length === 0) { 
        alert("Seleccioná al menos un servicio."); 
        return false; 
    }
    return d;
}

// ===== ENVIAR WHATSAPP =====
function enviarWhatsapp() {
    const d = validarFormPresupuesto();
    if(!d) return;
    
    let m = `*🔋 NUEVO PRESUPUESTO - ELECTRIC TEAM*\n\n`;
    m += `*👤 Cliente:* ${d.name}\n`;
    m += `*📱 Teléfono:* ${d.phone}\n`;
    m += `*📧 Email:* ${d.email}\n`;
    m += `*⏱️ Plazo:* ${d.time}\n`;
    m += `\n*🛠️ Servicios:*\n─────────────────\n`;
    
    cart.forEach(i => {
        m += `• ${i.n}\n  ${i.c}u. x $${i.p.toLocaleString('es-AR')} = $${i.st.toLocaleString('es-AR')}\n`;
    });
    
    m += `\n*💰 TOTAL: ${document.getElementById('totalDisplay').innerText}*`;
    m += `\n\n*Solicito confirmación de precio y disponibilidad.*`;
    
    const numero = '5491124574478';
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(m)}`;
    window.open(url, '_blank');
}

// ===== GENERAR PDF =====
function generarPDF() {
    const d = validarFormPresupuesto();
    if(!d) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // ✅ HEADER: Negro y Naranja
    doc.setFillColor(26, 26, 26); // Negro #1A1A1A
    doc.rect(0, 0, 210, 45, 'F');
    doc.setTextColor(255, 102, 0); // Naranja #FF6600
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("ELECTRIC TEAM", 15, 25);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("SERVICIOS INTEGRALES", 15, 32);
    doc.text(`Cliente: ${d.name.toUpperCase()}`, 195, 32, { align: 'right' });
    
    // ✅ TABLA: Header negro con texto naranja
    const rows = cart.map(i => [i.n, i.c.toString(), `$${i.p.toLocaleString('es-AR')}`, `$${i.st.toLocaleString('es-AR')}`]);
    
    doc.autoTable({
        startY: 55,
        head: [['TAREA', 'CANT.', 'UNIT.', 'SUBTOTAL']],
        body: rows,
        headStyles: { 
            fillColor: [26, 26, 26],    // Negro
            textColor: [255, 102, 0],   // Naranja
            fontSize: 9,
            fontStyle: 'bold'
        },
        styles: { fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
    });
    
    // ✅ TOTAL
    const total = document.getElementById('totalDisplay').innerText;
    const finalY = doc.lastAutoTable.finalY + 15;
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 26, 26);
    doc.text(`TOTAL: ${total}`, 195, finalY, { align: 'right' });
    
    // Guardar
    doc.save(`Presupuesto_ElectricTeam_${d.name.replace(/\s+/g, '_')}.pdf`);
}

// ===== CONTACTO =====
async function analyzeAndSend() {
    const msg = document.getElementById('ai-project-desc').value.trim();
    const btn = document.getElementById('btnSubmitAi');
    
    if (msg.length < 10) { 
        alert("Describí tu consulta (mínimo 10 caracteres)."); 
        return; 
    }
    
    btn.disabled = true; 
    btn.innerText = "Enviando...";
    
    const form = document.getElementById('mainContactForm');
    const formData = new FormData(form);
    
    try {
        const response = await fetch("https://formsubmit.co/ajax/info@electricteam.com", { 
            method: "POST", 
            body: formData 
        });
        
        if(response.ok) {
            alert("✅ ¡Enviado! Te respondemos pronto."); 
            form.reset(); 
        } else {
            throw new Error('Error');
        }
    } catch (error) {
        const fallbackMsg = `*📩 Consulta Web*\n\n${msg}`;
        window.open(`https://wa.me/5491124574478?text=${encodeURIComponent(fallbackMsg)}`, '_blank');
        alert("📱 Te redirigimos a WhatsApp.");
    } finally {
        btn.disabled = false; 
        btn.innerText = "Enviar Consulta"; 
    }
}

// ===== INICIALIZAR =====
window.onload = () => { 
    renderGremios(); // ✅ Sin loadPrices(), directo a renderizar
}; */
