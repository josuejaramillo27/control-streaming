const USER="admin";
const PASS="1234";

const loginDiv = document.getElementById("loginDiv");
const app = document.getElementById("app");
const loginError = document.getElementById("loginError");

let data = JSON.parse(localStorage.getItem("data")||"[]");

function login(){
  if(user.value===USER && pass.value===PASS){
    loginDiv.classList.add("hidden");
    app.classList.remove("hidden");
    render();
  }else{
    loginError.textContent="Usuario o contraseña incorrectos";
  }
}

function logout(){location.reload()}

function add(){
  data.push({
    nombre:cNombre.value,
    numero:cNumero.value,
    servicio:cServicio.value,
    vence:cVence.value,
    pago:Number(cPago.value||0),
    costo:Number(cCosto.value||0)
  });
  localStorage.setItem("data",JSON.stringify(data));
  render();
}

function render(){
  let f=filter.value.toLowerCase();
  rows.innerHTML="";
  data
    .filter(d=>Object.values(d).join(" ").toLowerCase().includes(f))
    .sort((a,b)=>new Date(a.vence)-new Date(b.vence))
    .forEach(d=>{
      let tr=document.createElement("tr");
      tr.innerHTML=`<td>${d.nombre}</td><td>${d.numero}</td><td>${d.servicio}</td>
      <td>${d.vence}</td><td>${d.pago}</td><td>${d.costo}</td><td>${d.pago-d.costo}</td>`;
      rows.appendChild(tr);
    });
}
