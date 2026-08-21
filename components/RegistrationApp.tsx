"use client";

import { useMemo, useState } from "react";
import { BarChart3, LogOut, Plus, Search, Settings, Users, ClipboardList } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

type Role = "admin" | "guest";
type Registration = {
  id:string; regNo:string; date:string; division:string; district:string; category:string;
  school:string; scouts:{name:string;grade:string}[]; leaders:number; scoutFee:number; leaderFee:number;
  createdBy:string; updatedBy:string; updatedAt:string;
};

const seedDivisions = [
  {name:"Butuan City Division",districts:["District 1","District 2","District 3"]},
  {name:"Cabadbaran City Division",districts:["District 1","District 2"]},
  {name:"Agusan del Norte Division",districts:["District 1","District 2"]}
];

function money(n:number){return new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP"}).format(n)}
function today(){return new Date().toISOString().slice(0,10)}

export default function RegistrationApp(){
  const [role,setRole]=useState<Role|null>(null);
  const [username,setUsername]=useState(""); const [password,setPassword]=useState(""); const [loginError,setLoginError]=useState("");
  const [tab,setTab]=useState<"dashboard"|"registrations"|"manage">("dashboard");
  const [divisions,setDivisions]=useState(seedDivisions);
  const [registrations,setRegistrations]=useState<Registration[]>([]);
  const [search,setSearch]=useState(""); const [dateFilter,setDateFilter]=useState(today());
  const [scoutFee,setScoutFee]=useState(150); const [leaderFee,setLeaderFee]=useState(200);
  const [showForm,setShowForm]=useState(false);
  const [division,setDivision]=useState(seedDivisions[0].name);
  const [district,setDistrict]=useState(seedDivisions[0].districts[0]);
  const [category,setCategory]=useState("Elementary"); const [school,setSchool]=useState("");
  const [leaderCount,setLeaderCount]=useState(0); const [scoutCount,setScoutCount]=useState(1);
  const [scouts,setScouts]=useState<{name:string;grade:string}[]>([{name:"",grade:""}]);
  const [editId,setEditId]=useState<string|null>(null);

  const filtered = useMemo(()=>registrations.filter(r =>
    (!dateFilter || r.date===dateFilter) &&
    (!search || [r.regNo,r.school,r.division,r.district,...r.scouts.map(s=>s.name)].join(" ").toLowerCase().includes(search.toLowerCase()))
  ),[registrations,dateFilter,search]);

  const divisionStats = useMemo(()=>divisions.map(d=>({name:d.name.replace(" Division",""),value:registrations.filter(r=>r.division===d.name).reduce((a,r)=>a+r.scouts.length,0)})),[divisions,registrations]);
  const totalScouts=registrations.reduce((a,r)=>a+r.scouts.length,0), totalLeaders=registrations.reduce((a,r)=>a+r.leaders,0);
  const totalFees=registrations.reduce((a,r)=>a+r.scouts.length*r.scoutFee+r.leaders*r.leaderFee,0);

  function login(e:React.FormEvent){e.preventDefault(); if((username==="admin"&&password==="admin")||(username==="guest"&&password==="guest")){setRole(username as Role);setLoginError("")}else setLoginError("Invalid username or password.");}
  function resetForm(){
    setEditId(null); setDivision(divisions[0]?.name||""); setDistrict(divisions[0]?.districts[0]||""); setCategory("Elementary"); setSchool(""); setLeaderCount(0); setScoutCount(1); setScouts([{name:"",grade:""}]);
  }
  function changeScoutCount(n:number){
    const count=Math.max(1,Math.min(200,n)); setScoutCount(count);
    setScouts(Array.from({length:count},(_,i)=>scouts[i]||{name:"",grade:""}));
  }
  function saveRegistration(e:React.FormEvent){
    e.preventDefault();
    const now=new Date().toLocaleString("en-PH");
    const cleanScouts=scouts.slice(0,scoutCount);
    if(cleanScouts.some(s=>!s.name.trim())) return alert("Please enter every scout's complete name.");
    if(!school.trim()) return alert("Please enter the school/organization.");
    if(editId){
      if(role!=="admin") return;
      setRegistrations(rs=>rs.map(r=>r.id===editId?{...r,date:r.date,division,district,category,school,scouts:cleanScouts,leaders:leaderCount,scoutFee,leaderFee,updatedBy:role,updatedAt:now}:r));
    }else{
      const next=registrations.length+1;
      setRegistrations(rs=>[...rs,{id:crypto.randomUUID(),regNo:`REG-${new Date().getFullYear()}-${String(next).padStart(5,"0")}`,date:today(),division,district,category,school,scouts:cleanScouts,leaders:leaderCount,scoutFee,leaderFee,createdBy:role,updatedBy:role,updatedAt:now}]);
    }
    setShowForm(false); resetForm(); setTab("registrations");
  }
  function editRegistration(r:Registration){
    if(role!=="admin") return;
    setEditId(r.id);setDivision(r.division);setDistrict(r.district);setCategory(r.category);setSchool(r.school);setLeaderCount(r.leaders);setScoutCount(r.scouts.length);setScouts(r.scouts);setShowForm(true);
  }
  function deleteRegistration(id:string){
    if(role!=="admin") return;
    if(confirm("Archive/delete this registration?")) setRegistrations(rs=>rs.filter(r=>r.id!==id));
  }
  if(!role) return <div className="login"><div className="login-box"><h1>Scout Registration System</h1><p className="muted">Registration management and reporting.</p><form onSubmit={login} className="grid"><div className="field"><label>Username</label><input value={username} onChange={e=>setUsername(e.target.value)} /></div><div className="field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>{loginError&&<div className="alert">{loginError}</div>}<button className="primary">Log in</button></form><p className="footer-note">Prototype credentials: admin/admin and guest/guest. Connect Supabase Auth before production use.</p></div></div>;

  const selectedDivision=divisions.find(d=>d.name===division);
  const registrationAmount=scoutCount*scoutFee+leaderCount*leaderFee;

  return <><header className="topbar"><div className="topbar-inner"><div className="brand">Scout Registration Management</div><div className="actions"><span className="pill">{role.toUpperCase()}</span><button className="secondary" onClick={()=>setRole(null)}><LogOut size={16}/> Logout</button></div></div></header>
  <main className="container">
    <div className="nav"><button onClick={()=>setTab("dashboard")}><BarChart3 size={16}/> Dashboard</button><button onClick={()=>setTab("registrations")}><ClipboardList size={16}/> Registrations</button>{role==="admin"&&<button onClick={()=>setTab("manage")}><Settings size={16}/> Admin Settings</button>}</div>
    {tab==="dashboard"&&<><div className="section-title"><div><h2>Dashboard</h2><p className="muted">View registration activity for a specific date.</p></div><input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)}/></div>
      <div className="grid cards"><div className="card"><div className="muted">Registrations</div><div className="stat">{filtered.length}</div></div><div className="card"><div className="muted">Scouts</div><div className="stat">{filtered.reduce((a,r)=>a+r.scouts.length,0)}</div></div><div className="card"><div className="muted">Unit Leaders</div><div className="stat">{filtered.reduce((a,r)=>a+r.leaders,0)}</div></div><div className="card"><div className="muted">Fees</div><div className="stat">{money(filtered.reduce((a,r)=>a+r.scouts.length*r.scoutFee+r.leaders*r.leaderFee,0))}</div></div></div>
      <div className="grid" style={{gridTemplateColumns:"1fr 1fr",marginTop:16}}><div className="card"><h3>Scouts by Division</h3><div className="chart"><ResponsiveContainer><PieChart><Pie data={divisionStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>{divisionStats.map((_,i)=><Cell key={i}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div></div><div className="card"><h3>Overall Totals</h3><div className="chart"><ResponsiveContainer><BarChart data={[{name:"Scouts",value:totalScouts},{name:"Unit Leaders",value:totalLeaders}]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value"/></BarChart></ResponsiveContainer></div></div></div>
    </>}
    {tab==="registrations"&&<><div className="section-title"><div><h2>Registrations</h2><p className="muted">Search and manage registration records.</p></div><button className="primary" onClick={()=>{resetForm();setShowForm(true)}}><Plus size={16}/> New Registration</button></div><div className="card"><div className="actions" style={{marginBottom:14}}><div className="field" style={{flex:1}}><label>Search by name, registration no., school, division or district</label><div style={{display:"flex",gap:8}}><Search size={18}/><input style={{flex:1}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..."/></div></div><div className="field"><label>Date</label><input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)}/></div></div><div className="table-wrap"><table className="table"><thead><tr><th>Registration</th><th>School</th><th>Division</th><th>District</th><th>Category</th><th>Scouts</th><th>Leaders</th><th>Fees</th><th>Updated By</th><th>Actions</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td>{r.regNo}<br/><span className="muted">{r.date}</span></td><td>{r.school}</td><td>{r.division}</td><td>{r.district}</td><td>{r.category}</td><td>{r.scouts.length}</td><td>{r.leaders}</td><td>{money(r.scouts.length*r.scoutFee+r.leaders*r.leaderFee)}</td><td>{r.updatedBy}<br/><span className="muted">{r.updatedAt}</span></td><td><div className="actions">{role==="admin"&&<button className="secondary" onClick={()=>editRegistration(r)}>Edit</button>}{role==="admin"&&<button className="danger" onClick={()=>deleteRegistration(r.id)}>Delete</button>}</div></td></tr>)}</tbody></table>{filtered.length===0&&<p className="muted">No registrations found for the selected date/search.</p>}</div></div></>}
    {tab==="manage"&&role==="admin"&&<><div className="section-title"><div><h2>Admin Settings</h2><p className="muted">Manage fees, divisions, and districts.</p></div></div><div className="grid" style={{gridTemplateColumns:"1fr 1fr"}}><div className="card"><h3>Registration Fees</h3><div className="form"><div className="field"><label>Fee per Scout (PHP)</label><input type="number" value={scoutFee} onChange={e=>setScoutFee(Number(e.target.value))}/></div><div className="field"><label>Fee per Unit Leader (PHP)</label><input type="number" value={leaderFee} onChange={e=>setLeaderFee(Number(e.target.value))}/></div></div><p className="muted">Current total fees recorded: {money(totalFees)}</p></div><div className="card"><h3>Add Division</h3><AddDivision onAdd={(name)=>setDivisions(d=>[...d,{name,districts:[]}])}/></div></div><div className="card" style={{marginTop:16}}><h3>Divisions & Districts</h3>{divisions.map((d,i)=><div key={d.name} style={{padding:"14px 0",borderBottom:"1px solid #edf0f5"}}><strong>{d.name}</strong><div className="actions" style={{marginTop:8}}>{d.districts.map(x=><span className="pill" key={x}>{x}</span>)}<AddDistrict onAdd={name=>setDivisions(ds=>ds.map((x,j)=>j===i?{...x,districts:[...x.districts,name]}:x))}/></div></div>)}</div></>}
    {showForm&&<div style={{position:"fixed",inset:0,background:"rgba(10,20,40,.45)",display:"grid",placeItems:"center",padding:20,zIndex:30}}><div className="card" style={{width:"min(900px,100%)",maxHeight:"92vh",overflow:"auto"}}><div className="section-title"><div><h2>{editId?"Edit Registration":"New Registration"}</h2><p className="muted">Step 1: Physical form is accepted outside the system. Enter the registration details below.</p></div><button className="secondary" onClick={()=>setShowForm(false)}>Close</button></div><form onSubmit={saveRegistration} className="form"><div className="field"><label>Division</label><select value={division} onChange={e=>{setDivision(e.target.value);setDistrict(divisions.find(d=>d.name===e.target.value)?.districts[0]||"")}}>{divisions.map(d=><option key={d.name}>{d.name}</option>)}</select></div><div className="field"><label>District</label><select value={district} onChange={e=>setDistrict(e.target.value)}>{(selectedDivision?.districts||[]).map(d=><option key={d}>{d}</option>)}</select></div><div className="field"><label>Category</label><select value={category} onChange={e=>setCategory(e.target.value)}>{["High School","College","Elementary","Community"].map(x=><option key={x}>{x}</option>)}</select></div><div className="field"><label>School / Organization</label><input value={school} onChange={e=>setSchool(e.target.value)} placeholder="School or organization"/></div><div className="field"><label>Number of Scouts</label><input type="number" min="1" max="200" value={scoutCount} onChange={e=>changeScoutCount(Number(e.target.value))}/></div><div className="field"><label>Number of Unit Leaders</label><input type="number" min="0" value={leaderCount} onChange={e=>setLeaderCount(Math.max(0,Number(e.target.value)))}/></div><div className="field full"><h3>Scout Details</h3><div className="table-wrap"><table className="table"><thead><tr><th>#</th><th>Complete Name</th><th>Year / Grade Level</th></tr></thead><tbody>{scouts.map((s,i)=><tr key={i}><td>{i+1}</td><td><input value={s.name} onChange={e=>setScouts(a=>a.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/></td><td><input value={s.grade} onChange={e=>setScouts(a=>a.map((x,j)=>j===i?{...x,grade:e.target.value}:x))}/></td></tr>)}</tbody></table></div></div><div className="field full card" style={{background:"#f8faff"}}><strong>Payment Summary</strong><div className="actions" style={{justifyContent:"space-between"}}><span>{scoutCount} Scouts × {money(scoutFee)} = {money(scoutCount*scoutFee)}</span><span>{leaderCount} Leaders × {money(leaderFee)} = {money(leaderCount*leaderFee)}</span><strong>Total: {money(registrationAmount)}</strong></div></div><div className="field full actions"><button className="primary" type="submit">{editId?"Save Changes":"Confirm & Record Registration"}</button></div></form></div></div>}
  </main></>
}

function AddDivision({onAdd}:{onAdd:(x:string)=>void}){const [v,setV]=useState("");return <div className="actions"><input value={v} onChange={e=>setV(e.target.value)} placeholder="Division name"/><button className="primary" onClick={()=>{if(v.trim()){onAdd(v.trim());setV("")}}}>Add</button></div>}
function AddDistrict({onAdd}:{onAdd:(x:string)=>void}){const [v,setV]=useState("");return <div className="actions"><input value={v} onChange={e=>setV(e.target.value)} placeholder="New district"/><button className="secondary" onClick={()=>{if(v.trim()){onAdd(v.trim());setV("")}}}>Add district</button></div>}
