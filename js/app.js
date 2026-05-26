// WARNING: Exposing service role keys in client-side code is a security risk.
// For production, implement Row Level Security (RLS) in Supabase and use proper auth.
const SUPABASE_URL = 'https://yliohprzqxzpyyrpvlvh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jWnZtBxthINwZnn2NDS6wg_wour17Cc'; // Replace with your key

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const money = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
});

let productos = [];
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

// DOM Elements
const productosDiv = document.getElementById("productos");
const detalleCarrito = document.getElementById("detalle-carrito");
const subtotalEl = document.getElementById("subtotal");
const ivaEl = document.getElementById("iva");
const totalEl = document.getElementById("total");
const contador = document.getElementById("contador");
const carritoPanel = document.getElementById("carrito");
const overlay = document.getElementById("overlay");
const toastDiv = document.getElementById("toast");
const btnCarrito = document.getElementById("btnCarrito");
const btnAdmin = document.getElementById("btnAdmin");
const busqueda = document.getElementById("busqueda");
const numCot = document.getElementById("numCot");
const adminModal = document.getElementById("adminModal");
const formProducto = document.getElementById("formProducto");
const adminLista = document.getElementById("adminLista");
const btnTop = document.getElementById("btnTop");

// Event Listeners
btnCarrito.addEventListener("click", toggleCarrito);
btnAdmin.addEventListener("click", toggleAdmin);
overlay.addEventListener("click", toggleCarrito); // Close cart if overlay clicked
busqueda.addEventListener("input", filtrarProductos);
formProducto.addEventListener("submit", agregarProductoAdmin);
window.addEventListener('scroll', () => {
    btnTop.style.display = window.scrollY > 300 ? 'block' : 'none';
});
btnTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// --- CATALOGUE FUNCTIONS ---
async function cargarProductos() {
    productosDiv.innerHTML = "<p>Cargando productos...</p>";
    const { data, error } = await client.from("productos").select("*");

    if (error) {
        productosDiv.innerHTML = "<p>Error cargando productos.</p>";
        console.error(error);
        return;
    }

    productos = data || [];
    renderProductos(productos);
    renderAdminLista(); // Update admin list as well
}

function renderProductos(lista) {
    if (!lista.length) {
        productosDiv.innerHTML = "<p>No se encontraron productos.</p>";
        return;
    }

    productosDiv.innerHTML = lista.map(p => `
        <div class="producto">
            <img src="${p.imagen_url || 'https://via.placeholder.com/200'}" alt="${p.nombre}">
            <h3>${p.nombre}</h3>
            <p>${p.descripcion || ''}</p>
            <strong>${money.format(p.precio)}</strong>
            <button onclick="agregar(${p.id})">Agregar al carrito</button>
        </div>
    `).join('');
}

function filtrarProductos() {
    const txt = busqueda.value.toLowerCase();
    const filtrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(txt) ||
        (p.descripcion || '').toLowerCase().includes(txt)
    );
    renderProductos(filtrados);
}

// --- CART FUNCTIONS ---
function agregar(id) {
    const p = productos.find(x => x.id === id);
    if (!p) return;

    const item = carrito.find(x => x.id === id);
    if (item) {
        item.cantidad++;
    } else {
        carrito.push({ ...p, cantidad: 1 });
    }

    guardar();
    toast("Producto agregado al carrito");
}

function actualizarCarrito() {
    let subtotal = 0;

    detalleCarrito.innerHTML = carrito.map((p, i) => {
        const total = p.precio * p.cantidad;
        subtotal += total;
        return `
        <tr class="item-carrito">
            <td>${p.nombre}</td>
            <td>
                <button onclick="cambiar(${i},-1)">-</button>
                ${p.cantidad}
                <button onclick="cambiar(${i},1)">+</button>
            </td>
            <td>${money.format(total)}</td>
            <td><button class="btn-danger" onclick="eliminar(${i})">✕</button></td>
        </tr>`;
    }).join('');

    const iva = subtotal * 0.19;
    const total = subtotal + iva;

    subtotalEl.textContent = money.format(subtotal);
    ivaEl.textContent = money.format(iva);
    totalEl.textContent = money.format(total);
    contador.textContent = carrito.reduce((a, b) => a + b.cantidad, 0);
}

function cambiar(i, n) {
    carrito[i].cantidad += n;
    if (carrito[i].cantidad <= 0) carrito.splice(i, 1);
    guardar();
}

function eliminar(i) {
    carrito.splice(i, 1);
    guardar();
}

function vaciarCarrito() {
    if (carrito.length === 0) return;
    if (confirm("¿Estás seguro de vaciar el carrito?")) {
        carrito = [];
        guardar();
    }
}

function guardar() {
    localStorage.setItem("carrito", JSON.stringify(carrito));
    actualizarCarrito();
}

function toggleCarrito() {
    const isVisible = carritoPanel.classList.toggle("visible");
    if (isVisible) {
        overlay.classList.add("active");
    } else {
        overlay.classList.remove("active");
    }
}

function enviarWhatsApp() {
    if (!carrito.length) {
        toast("El carrito está vacío");
        return;
    }

    const nombre = document.getElementById("nombreCliente").value.trim();
    const telefono = document.getElementById("telefonoCliente").value.trim();
    const obs = document.getElementById("observacionesCliente").value.trim();

    if (!nombre) {
        toast("Por favor, ingrese su nombre");
        return;
    }

    let msg = `*PEDIDO*%0A`;
    msg += `Cliente: ${nombre}%0A`;
    msg += `Teléfono: ${telefono}%0A`;
    msg += `Observaciones: ${obs}%0A%0A`;

    carrito.forEach(p => {
        msg += `• ${p.nombre} x${p.cantidad} = ${money.format(p.precio * p.cantidad)}%0A`;
    });

    msg += `%0ATOTAL: ${totalEl.textContent}`;

    window.open(`https://wa.me/573192654225?text=${msg}`);
}

// --- ADMIN FUNCTIONS ---
function toggleAdmin() {
    adminModal.classList.toggle("active");
}

async function agregarProductoAdmin(e) {
    e.preventDefault();
    
    const nuevoProducto = {
        nombre: document.getElementById("adminNombre").value,
        descripcion: document.getElementById("adminDesc").value,
        precio: parseFloat(document.getElementById("adminPrecio").value),
        imagen_url: document.getElementById("adminImagen").value || null
    };

    const { data, error } = await client.from("productos").insert([nuevoProducto]);
    
    if (error) {
        toast("Error al agregar producto");
        console.error(error);
    } else {
        toast("Producto agregado exitosamente");
        formProducto.reset();
        cargarProductos(); // Refresh catalogue
    }
}

async function eliminarProductoAdmin(id) {
    if (!confirm("¿Eliminar este producto de la base de datos?")) return;

    const { error } = await client.from("productos").delete().eq("id", id);
    
    if (error) {
        toast("Error al eliminar producto");
        console.error(error);
    } else {
        toast("Producto eliminado");
        cargarProductos(); // Refresh catalogue
    }
}

function renderAdminLista() {
    adminLista.innerHTML = productos.map(p => `
        <div class="admin-item">
            <span><strong>${p.nombre}</strong> - ${money.format(p.precio)}</span>
            <button class="btn-danger" onclick="eliminarProductoAdmin(${p.id})">Eliminar</button>
        </div>
    `).join('');
}

// --- UTILITIES ---
function toast(msg) {
    toastDiv.textContent = msg;
    toastDiv.classList.add("show");
    setTimeout(() => toastDiv.classList.remove("show"), 2500);
}

// --- INITIALIZATION ---
window.onload = () => {
    numCot.textContent = "Cotización #" + Date.now().toString().slice(-6);
    cargarProductos();
    actualizarCarrito();
};

