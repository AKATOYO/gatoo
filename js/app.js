const SUPABASE_URL = 'https://yliohprzqxzpyyrpvlvh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jWnZtBxthINwZnn2NDS6wg_wour17Cc';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const money = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
});

let productos = [];
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

const productosDiv = document.getElementById("productos");
const detalleCarrito = document.getElementById("detalle-carrito");
const subtotalEl = document.getElementById("subtotal");
const ivaEl = document.getElementById("iva");
const totalEl = document.getElementById("total");
const contador = document.getElementById("contador");
const carritoPanel = document.getElementById("carrito");
const toastDiv = document.getElementById("toast");
const btnCarrito = document.getElementById("btnCarrito");
const busqueda = document.getElementById("busqueda");
const filtroCategoria = document.getElementById("filtroCategoria");
const numCot = document.getElementById("numCot");

btnCarrito.addEventListener("click", toggleCarrito);
busqueda.addEventListener("input", filtrarProductos);
filtroCategoria.addEventListener("change", filtrarProductos);

async function cargarProductos() {

    productosDiv.innerHTML = "<p>Cargando productos...</p>";

    const { data, error } = await client
        .from("productos")
        .select(`
            id,
            categoria,
            nombre,
            descripcion,
            precio,
            imagen_url
        `)
        .order("categoria", { ascending: true })
        .order("nombre", { ascending: true });

    if (error) {
        productosDiv.innerHTML = "<p>Error cargando productos.</p>";
        console.error(error);
        return;
    }

    productos = data || [];

    cargarCategorias();
    renderProductos(productos);
}

function cargarCategorias() {

    const categorias = [...new Set(
        productos.map(p => p.categoria).filter(Boolean)
    )];

    filtroCategoria.innerHTML = `
        <option value="">Todas las categorías</option>
        ${categorias.map(c => `
            <option value="${c}">${c}</option>
        `).join('')}
    `;
}

function renderProductos(lista) {

    if (!lista.length) {
        productosDiv.innerHTML = "<p>No hay productos disponibles.</p>";
        return;
    }

    productosDiv.innerHTML = lista.map(p => `

        <div class="producto">

            <img 
                src="${p.imagen_url || 'https://via.placeholder.com/300x200?text=Sin+Imagen'}"
                alt="${p.nombre}"
            >

            <span class="categoria">
                ${p.categoria || 'Sin categoría'}
            </span>

            <h3>${p.nombre}</h3>

            <p>${p.descripcion || ''}</p>

            <strong>${money.format(p.precio || 0)}</strong>

            <button onclick="agregar(${p.id})">
                Agregar
            </button>

        </div>

    `).join('');
}

function agregar(id) {

    const p = productos.find(x => x.id === id);

    if (!p) return;

    const item = carrito.find(x => x.id === id);

    if (item) {
        item.cantidad++;
    } else {
        carrito.push({
            ...p,
            cantidad: 1
        });
    }

    guardar();
    toast("Producto agregado");
}

function actualizarCarrito() {

    let subtotal = 0;

    detalleCarrito.innerHTML = carrito.map((p, i) => {

        const total = p.precio * p.cantidad;

        subtotal += total;

        return `
            <tr>
                <td>
                    ${p.nombre}
                    <br>
                    <small>${p.categoria || ''}</small>
                </td>

                <td>
                    <button onclick="cambiar(${i},-1)">-</button>

                    ${p.cantidad}

                    <button onclick="cambiar(${i},1)">+</button>
                </td>

                <td>${money.format(total)}</td>

                <td>
                    <button onclick="eliminar(${i})">
                        ✕
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    const iva = subtotal * 0.19;
    const total = subtotal + iva;

    subtotalEl.textContent = money.format(subtotal);
    ivaEl.textContent = money.format(iva);
    totalEl.textContent = money.format(total);

    contador.textContent = carrito.reduce(
        (a, b) => a + b.cantidad,
        0
    );
}

function cambiar(i, n) {

    carrito[i].cantidad += n;

    if (carrito[i].cantidad <= 0) {
        carrito.splice(i, 1);
    }

    guardar();
}

function eliminar(i) {

    carrito.splice(i, 1);

    guardar();
}

function vaciarCarrito() {

    carrito = [];

    guardar();
}

function guardar() {

    localStorage.setItem(
        "carrito",
        JSON.stringify(carrito)
    );

    actualizarCarrito();
}

function filtrarProductos() {

    const txt = busqueda.value.toLowerCase();

    const categoria = filtroCategoria.value;

    const filtrados = productos.filter(p => {

        const coincideTexto =

            p.nombre?.toLowerCase().includes(txt) ||

            p.descripcion?.toLowerCase().includes(txt) ||

            p.categoria?.toLowerCase().includes(txt);

        const coincideCategoria =
            !categoria || p.categoria === categoria;

        return coincideTexto && coincideCategoria;
    });

    renderProductos(filtrados);
}

function toggleCarrito() {

    carritoPanel.classList.toggle("visible");
}

function toast(msg) {

    toastDiv.textContent = msg;

    toastDiv.classList.add("show");

    setTimeout(() => {
        toastDiv.classList.remove("show");
    }, 2000);
}

function enviarWhatsApp() {

    if (!carrito.length) {
        alert("Carrito vacío");
        return;
    }

    const nombre = document
        .getElementById("nombreCliente")
        .value
        .trim();

    const telefono = document
        .getElementById("telefonoCliente")
        .value
        .trim();

    const obs = document
        .getElementById("observacionesCliente")
        .value
        .trim();

    if (!nombre) {
        alert("Ingrese nombre");
        return;
    }

    let msg = `*PEDIDO*%0A`;

    msg += `Cliente: ${nombre}%0A`;
    msg += `Teléfono: ${telefono}%0A`;
    msg += `Observaciones: ${obs}%0A%0A`;

    carrito.forEach(p => {

        msg += `• ${p.nombre}`;
        msg += ` (${p.categoria || 'General'})`;
        msg += ` x${p.cantidad}`;
        msg += ` = ${money.format(p.precio * p.cantidad)}%0A`;
    });

    msg += `%0ATOTAL: ${totalEl.textContent}`;

    window.open(
        `https://wa.me/573192654225?text=${msg}`
    );
}

window.onload = () => {

    numCot.textContent =
        "Cotización #" +
        Date.now().toString().slice(-6);

    cargarProductos();

    actualizarCarrito();
};
