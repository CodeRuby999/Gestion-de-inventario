const firebaseConfig = {
    apiKey: "AIzaSyBN0Ld0r6ujdyzvrBIhPCt5y2Bm_WJHmEs",
    authDomain: "gestion-de-tickets-ca83e.firebaseapp.com",
    databaseURL: "https://gestion-de-tickets-ca83e-default-rtdb.firebaseio.com",
    projectId: "gestion-de-tickets-ca83e",
    storageBucket: "gestion-de-tickets-ca83e.appspot.com",
    messagingSenderId: "1073338959884",
    appId: "1:1073338959884:web:35d65aa5559b31329c4629",
    measurementId: "G-BS4125GELL"
  };
  
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
  
  
  const estados = ["Por hacer", "En proceso", "Terminado"];
  const container = document.getElementById("ticket-container");
  const form = document.getElementById("form-ticket");
  
  function renderTicket(id, data) {
    const div = document.createElement("div");
    div.className = "ticket";
    div.setAttribute("data-id", id);
    div.setAttribute("data-estado", data.estado);
  
    let clase = data.estado === "Por hacer" ? "urgent" : data.estado === "En proceso" ? "in-progress" : "done";
    let icono = data.estado === "Por hacer" ? "🔴" : data.estado === "En proceso" ? "🟡" : "🟢";
  
    div.innerHTML = `
      <div class="ticket-header ${clase}">${icono} ${data.estado}</div>
      <h3>${data.titulo}</h3>
      <p><strong>Responsable:</strong> ${data.responsable}</p>
      <p><strong class="estado">Estado:</strong> ${data.estado}</p>
      <p class="tag">${data.categoria}</p>
      <button class="btn-estado">Cambiar estado</button>
    `;
  
    div.querySelector(".btn-estado").onclick = () => {
      const nuevoEstado = estados[(estados.indexOf(data.estado) + 1) % estados.length];
      db.ref('tickets/' + id).update({ estado: nuevoEstado });
    };
  
    container.appendChild(div);
  }
  
  function cargarTickets() {
    db.ref('tickets').on('value', snapshot => {
      container.innerHTML = "";
      const tickets = snapshot.val();
      for (let id in tickets) {
        renderTicket(id, tickets[id]);
      }
    });
  }
  
  form.addEventListener("submit", e => {
    e.preventDefault();
    const nuevo = {
      titulo: document.getElementById("titulo").value,
      responsable: document.getElementById("responsable").value,
      estado: document.getElementById("estado").value,
      categoria: document.getElementById("categoria").value
    };
    db.ref('tickets').push(nuevo);
    form.reset();
  });
  
  function aplicarFiltros() {
    const estado = document.getElementById("filtro-estado").value;
    const responsable = document.getElementById("filtro-responsable").value.toLowerCase();
    const categoria = document.getElementById("filtro-categoria").value.toLowerCase();
  
    db.ref('tickets').once('value').then(snapshot => {
      container.innerHTML = "";
      const tickets = snapshot.val();
      for (let id in tickets) {
        const t = tickets[id];
        if (
          (!estado || t.estado === estado) &&
          (!responsable || t.responsable.toLowerCase().includes(responsable)) &&
          (!categoria || t.categoria.toLowerCase().includes(categoria))
        ) {
          renderTicket(id, t);
        }
      }
    });
  }
  
  function resetFiltros() {
    document.getElementById("filtro-estado").value = "";
    document.getElementById("filtro-responsable").value = "";
    document.getElementById("filtro-categoria").value = "";
    cargarTickets();
  }
  
  cargarTickets();
  