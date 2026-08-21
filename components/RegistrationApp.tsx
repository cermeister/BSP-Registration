"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, LogOut, Plus, Search, Settings, ClipboardList } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { supabase } from "../lib/supabase";

type Role = "admin" | "guest";
type Registration = {
  id: string;
  regNo: string;
  date: string;
  division: string;
  district: string;
  category: string;
  school: string;
  scouts: { name: string; grade: string }[];
  leaders: number;
  scoutFee: number;
  leaderFee: number;
  createdBy: Role;
  updatedBy: Role;
  updatedAt: string;
};

type DbRegistration = {
  id: string;
  registration_number: string;
  registration_date: string;
  division_id: string | null;
  district_id: string | null;
  category: string;
  school_name: string | null;
  scout_count: number;
  unit_leader_count: number;
  scout_fee: number | string;
  unit_leader_fee: number | string;
  created_by: string | null;
  updated_by: string | null;
  updated_at: string | null;
  divisions?: { name: string } | null;
  districts?: { name: string } | null;
  scouts?: { complete_name: string; grade_level: string | null }[] | null;
};

const seedDivisions = [
  { name: "Butuan City Division", districts: ["District 1", "District 2", "District 3"] },
  { name: "Cabadbaran City Division", districts: ["District 1", "District 2"] },
  { name: "Agusan del Norte Division", districts: ["District 1", "District 2"] }
];

function money(n: number) { return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n); }
function today() { return new Date().toISOString().slice(0, 10); }

function mapDbRegistration(row: DbRegistration): Registration {
  return {
    id: row.id,
    regNo: row.registration_number,
    date: row.registration_date,
    division: row.divisions?.name ?? "Unknown division",
    district: row.districts?.name ?? "Unknown district",
    category: row.category,
    school: row.school_name ?? "",
    scouts: (row.scouts ?? []).map((s) => ({
      name: s.complete_name ?? "",
      grade: s.grade_level ?? ""
    })),
    leaders: Number(row.unit_leader_count ?? 0),
    scoutFee: Number(row.scout_fee ?? 0),
    leaderFee: Number(row.unit_leader_fee ?? 0),
    createdBy: row.created_by ? "admin" : "guest",
    updatedBy: row.updated_by ? "admin" : "guest",
    updatedAt: row.updated_at ? new Date(row.updated_at).toLocaleString("en-PH") : ""
  };
}

async function ensureDivisionAndDistrict(divisionName: string, districtName: string) {
  if (!supabase) return { divisionId: null, districtId: null };

  const { data: existingDivision, error: divisionLookupError } = await supabase
    .from("divisions")
    .select("id")
    .eq("name", divisionName)
    .maybeSingle();

  if (divisionLookupError) throw divisionLookupError;

  let divisionId = existingDivision?.id ?? null;

  if (!divisionId) {
    const { data: insertedDivision, error: divisionInsertError } = await supabase
      .from("divisions")
      .insert({ name: divisionName })
      .select("id")
      .single();

    if (divisionInsertError) throw divisionInsertError;
    divisionId = insertedDivision.id;
  }

  const { data: existingDistrict, error: districtLookupError } = await supabase
    .from("districts")
    .select("id")
    .eq("division_id", divisionId)
    .eq("name", districtName)
    .maybeSingle();

  if (districtLookupError) throw districtLookupError;

  let districtId = existingDistrict?.id ?? null;

  if (!districtId) {
    const { data: insertedDistrict, error: districtInsertError } = await supabase
      .from("districts")
      .insert({ division_id: divisionId, name: districtName })
      .select("id")
      .single();

    if (districtInsertError) throw districtInsertError;
    districtId = insertedDistrict.id;
  }

  return { divisionId, districtId };
}

export default function RegistrationApp() {
  const [role, setRole] = useState<Role | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<"dashboard" | "registrations" | "manage">("dashboard");
  const [divisions, setDivisions] = useState(seedDivisions);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState(today());
  const [scoutFee, setScoutFee] = useState(150);
  const [leaderFee, setLeaderFee] = useState(200);
  const [showForm, setShowForm] = useState(false);
  const [division, setDivision] = useState(seedDivisions[0].name);
  const [district, setDistrict] = useState(seedDivisions[0].districts[0]);
  const [category, setCategory] = useState("Elementary");
  const [school, setSchool] = useState("");
  const [leaderCount, setLeaderCount] = useState(0);
  const [scoutCount, setScoutCount] = useState(1);
  const [scouts, setScouts] = useState<{ name: string; grade: string }[]>([{ name: "", grade: "" }]);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    async function loadRegistrations() {
      if (!supabase) return;

      const { data, error } = await supabase
        .from("registrations")
        .select("*, divisions(name), districts(name), scouts(complete_name, grade_level)")
        .order("registration_date", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      setRegistrations((data ?? []).map((row) => mapDbRegistration(row as DbRegistration)));
    }

    loadRegistrations();
  }, []);

  const filtered = useMemo(
    () =>
      registrations.filter(
        (r) =>
          (!dateFilter || r.date === dateFilter) &&
          (!search ||
            [r.regNo, r.school, r.division, r.district, ...r.scouts.map((s) => s.name)]
              .join(" ")
              .toLowerCase()
              .includes(search.toLowerCase()))
      ),
    [registrations, dateFilter, search]
  );

  const divisionStats = useMemo(
    () =>
      divisions.map((d) => ({
        name: d.name.replace(" Division", ""),
        value: registrations.filter((r) => r.division === d.name).reduce((a, r) => a + r.scouts.length, 0)
      })),
    [divisions, registrations]
  );

  const totalScouts = registrations.reduce((a, r) => a + r.scouts.length, 0);
  const totalLeaders = registrations.reduce((a, r) => a + r.leaders, 0);
  const totalFees = registrations.reduce((a, r) => a + r.scouts.length * r.scoutFee + r.leaders * r.leaderFee, 0);

  function login(e: React.FormEvent) {
    e.preventDefault();
    if ((username === "admin" && password === "admin") || (username === "guest" && password === "guest")) {
      setRole(username as Role);
      setLoginError("");
    } else {
      setLoginError("Invalid username or password.");
    }
  }

  function resetForm() {
    setEditId(null);
    setDivision(divisions[0]?.name || "");
    setDistrict(divisions[0]?.districts[0] || "");
    setCategory("Elementary");
    setSchool("");
    setLeaderCount(0);
    setScoutCount(1);
    setScouts([{ name: "", grade: "" }]);
  }

  function changeScoutCount(n: number) {
    const count = Math.max(1, Math.min(200, n));
    setScoutCount(count);
    setScouts(Array.from({ length: count }, (_, i) => scouts[i] || { name: "", grade: "" }));
  }

  async function saveRegistration(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;

    const now = new Date().toLocaleString("en-PH");
    const cleanScouts = scouts.slice(0, scoutCount);

    if (cleanScouts.some((s) => !s.name.trim())) {
      alert("Please enter every scout's complete name.");
      return;
    }

    if (!school.trim()) {
      alert("Please enter the school/organization.");
      return;
    }

    const baseEntry: Registration = {
      id: editId ?? crypto.randomUUID(),
      regNo: editId ? registrations.find((r) => r.id === editId)?.regNo ?? `REG-${new Date().getFullYear()}-${String(registrations.length + 1).padStart(5, "0")}` : `REG-${new Date().getFullYear()}-${String(registrations.length + 1).padStart(5, "0")}`,
      date: today(),
      division,
      district,
      category,
      school,
      scouts: cleanScouts,
      leaders: leaderCount,
      scoutFee,
      leaderFee,
      createdBy: role,
      updatedBy: role,
      updatedAt: now
    };

    if (supabase) {
      try {
        const { divisionId, districtId } = await ensureDivisionAndDistrict(division, district);

        const payload = {
          registration_number: baseEntry.regNo,
          registration_date: baseEntry.date,
          division_id: divisionId,
          district_id: districtId,
          category: baseEntry.category,
          school_name: baseEntry.school,
          scout_count: baseEntry.scouts.length,
          unit_leader_count: baseEntry.leaders,
          scout_fee: baseEntry.scoutFee,
          unit_leader_fee: baseEntry.leaderFee,
          status: "confirmed",
          updated_at: new Date().toISOString(),
          created_by: role === "admin" ? "admin" : "guest",
          updated_by: role === "admin" ? "admin" : "guest"
        };

        let savedRegistration: DbRegistration | null = null;

        if (editId) {
          const { data, error } = await supabase
            .from("registrations")
            .update(payload)
            .eq("id", editId)
            .select("*, divisions(name), districts(name), scouts(complete_name, grade_level)")
            .single();

          if (error) throw error;
          savedRegistration = data as DbRegistration;
          const { error: deleteError } = await supabase.from("scouts").delete().eq("registration_id", editId);
          if (deleteError) throw deleteError;
        } else {
          const { data, error } = await supabase
            .from("registrations")
            .insert([{ ...payload }])
            .select("*, divisions(name), districts(name), scouts(complete_name, grade_level)")
            .single();

          if (error) throw error;
          savedRegistration = data as DbRegistration;
        }

        if (savedRegistration) {
          const scoutRows = cleanScouts.map((s) => ({
            registration_id: savedRegistration!.id,
            complete_name: s.name.trim(),
            grade_level: s.grade.trim() || null
          }));

          if (scoutRows.length > 0) {
            const { error: scoutError } = await supabase.from("scouts").insert(scoutRows);
            if (scoutError) throw scoutError;
          }
        }

        const { data: refreshedRows, error: refreshError } = await supabase
          .from("registrations")
          .select("*, divisions(name), districts(name), scouts(complete_name, grade_level)")
          .order("registration_date", { ascending: false });

        if (refreshError) {
          throw refreshError;
        }

        setRegistrations((refreshedRows ?? []).map((row) => mapDbRegistration(row as DbRegistration)));
      } catch (error) {
        console.error(error);
        alert("Could not save the registration to Supabase. The form has not been saved.");
        return;
      }
    } else {
      if (editId) {
        if (role !== "admin") return;
        setRegistrations((rs) =>
          rs.map((r) => (r.id === editId ? { ...r, ...baseEntry } : r))
        );
      } else {
        setRegistrations((rs) => [...rs, baseEntry]);
      }
    }

    setShowForm(false);
    resetForm();
    setTab("registrations");
  }

  function editRegistration(r: Registration) {
    if (role !== "admin") return;
    setEditId(r.id);
    setDivision(r.division);
    setDistrict(r.district);
    setCategory(r.category);
    setSchool(r.school);
    setLeaderCount(r.leaders);
    setScoutCount(r.scouts.length);
    setScouts(r.scouts);
    setShowForm(true);
  }

  async function deleteRegistration(id: string) {
    if (role !== "admin") return;
    if (!confirm("Archive/delete this registration?")) return;

    if (supabase) {
      const { error } = await supabase.from("registrations").delete().eq("id", id);
      if (error) {
        console.error(error);
        alert("Could not delete this registration from Supabase.");
        return;
      }
      setRegistrations((rs) => rs.filter((r) => r.id !== id));
    } else {
      setRegistrations((rs) => rs.filter((r) => r.id !== id));
    }
  }

  if (!role) {
    return (
      <div className="login">
        <div className="login-box">
          <h1>Scout Registration System</h1>
          <p className="muted">Registration management and reporting.</p>
          <form onSubmit={login} className="grid">
            <div className="field">
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {loginError && <div className="alert">{loginError}</div>}
            <button className="primary">Log in</button>
          </form>
          <p className="footer-note">
            Prototype credentials: admin/admin and guest/guest. Connect Supabase Auth before production use.
          </p>
        </div>
      </div>
    );
  }

  const selectedDivision = divisions.find((d) => d.name === division);
  const registrationAmount = scoutCount * scoutFee + leaderCount * leaderFee;

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">Scout Registration Management</div>
          <div className="actions">
            <span className="pill">{role.toUpperCase()}</span>
            <button className="secondary" onClick={() => setRole(null)}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        <div className="nav">
          <button onClick={() => setTab("dashboard")}>
            <BarChart3 size={16} /> Dashboard
          </button>
          <button onClick={() => setTab("registrations")}>
            <ClipboardList size={16} /> Registrations
          </button>
          {role === "admin" && (
            <button onClick={() => setTab("manage")}>
              <Settings size={16} /> Admin Settings
            </button>
          )}
        </div>

        {tab === "dashboard" && (
          <>
            <div className="section-title">
              <div>
                <h2>Dashboard</h2>
                <p className="muted">View registration activity for a specific date.</p>
              </div>
              <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
            </div>

            <div className="grid cards">
              <div className="card">
                <div className="muted">Registrations</div>
                <div className="stat">{filtered.length}</div>
              </div>
              <div className="card">
                <div className="muted">Scouts</div>
                <div className="stat">{filtered.reduce((a, r) => a + r.scouts.length, 0)}</div>
              </div>
              <div className="card">
                <div className="muted">Unit Leaders</div>
                <div className="stat">{filtered.reduce((a, r) => a + r.leaders, 0)}</div>
              </div>
              <div className="card">
                <div className="muted">Fees</div>
                <div className="stat">{money(filtered.reduce((a, r) => a + r.scouts.length * r.scoutFee + r.leaders * r.leaderFee, 0))}</div>
              </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
              <div className="card">
                <h3>Scouts by Division</h3>
                <div className="chart">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={divisionStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {divisionStats.map((_, i) => (
                          <Cell key={i} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <h3>Overall Totals</h3>
                <div className="chart">
                  <ResponsiveContainer>
                    <BarChart data={[{ name: "Scouts", value: totalScouts }, { name: "Unit Leaders", value: totalLeaders }]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "registrations" && (
          <>
            <div className="section-title">
              <div>
                <h2>Registrations</h2>
                <p className="muted">Search and manage registration records.</p>
              </div>
              <button
                className="primary"
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
              >
                <Plus size={16} /> New Registration
              </button>
            </div>

            <div className="card">
              <div className="actions" style={{ marginBottom: 14 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Search by name, registration no., school, division or district</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Search size={18} />
                    <input style={{ flex: 1 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
                  </div>
                </div>
                <div className="field">
                  <label>Date</label>
                  <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                </div>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Registration</th>
                      <th>School</th>
                      <th>Division</th>
                      <th>District</th>
                      <th>Category</th>
                      <th>Scouts</th>
                      <th>Leaders</th>
                      <th>Fees</th>
                      <th>Updated By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id}>
                        <td>
                          {r.regNo}
                          <br />
                          <span className="muted">{r.date}</span>
                        </td>
                        <td>{r.school}</td>
                        <td>{r.division}</td>
                        <td>{r.district}</td>
                        <td>{r.category}</td>
                        <td>{r.scouts.length}</td>
                        <td>{r.leaders}</td>
                        <td>{money(r.scouts.length * r.scoutFee + r.leaders * r.leaderFee)}</td>
                        <td>
                          {r.updatedBy}
                          <br />
                          <span className="muted">{r.updatedAt}</span>
                        </td>
                        <td>
                          <div className="actions">
                            {role === "admin" && (
                              <button className="secondary" onClick={() => editRegistration(r)}>
                                Edit
                              </button>
                            )}
                            {role === "admin" && (
                              <button className="danger" onClick={() => deleteRegistration(r.id)}>
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && <p className="muted">No registrations found for the selected date/search.</p>}
              </div>
            </div>
          </>
        )}

        {tab === "manage" && role === "admin" && (
          <>
            <div className="section-title">
              <div>
                <h2>Admin Settings</h2>
                <p className="muted">Manage fees, divisions, and districts.</p>
              </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="card">
                <h3>Registration Fees</h3>
                <div className="form">
                  <div className="field">
                    <label>Fee per Scout (PHP)</label>
                    <input type="number" value={scoutFee} onChange={(e) => setScoutFee(Number(e.target.value))} />
                  </div>
                  <div className="field">
                    <label>Fee per Unit Leader (PHP)</label>
                    <input type="number" value={leaderFee} onChange={(e) => setLeaderFee(Number(e.target.value))} />
                  </div>
                </div>
                <p className="muted">Current total fees recorded: {money(totalFees)}</p>
              </div>

              <div className="card">
                <h3>Add Division</h3>
                <AddDivision onAdd={(name) => setDivisions((d) => [...d, { name, districts: [] }])} />
              </div>
            </div>

            <div className="card" style={{ marginTop: 16 }}>
              <h3>Divisions & Districts</h3>
              {divisions.map((d, i) => (
                <div key={d.name} style={{ padding: "14px 0", borderBottom: "1px solid #edf0f5" }}>
                  <strong>{d.name}</strong>
                  <div className="actions" style={{ marginTop: 8 }}>
                    {d.districts.map((x) => (
                      <span className="pill" key={x}>
                        {x}
                      </span>
                    ))}
                    <AddDistrict
                      onAdd={(name) =>
                        setDivisions((ds) =>
                          ds.map((x, j) => (j === i ? { ...x, districts: [...x.districts, name] } : x))
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,40,.45)", display: "grid", placeItems: "center", padding: 20, zIndex: 30 }}>
            <div className="card" style={{ width: "min(900px,100%)", maxHeight: "92vh", overflow: "auto" }}>
              <div className="section-title">
                <div>
                  <h2>{editId ? "Edit Registration" : "New Registration"}</h2>
                  <p className="muted">Step 1: Physical form is accepted outside the system. Enter the registration details below.</p>
                </div>
                <button className="secondary" onClick={() => setShowForm(false)}>
                  Close
                </button>
              </div>

              <form onSubmit={saveRegistration} className="form">
                <div className="field">
                  <label>Division</label>
                  <select
                    value={division}
                    onChange={(e) => {
                      setDivision(e.target.value);
                      setDistrict(divisions.find((d) => d.name === e.target.value)?.districts[0] || "");
                    }}
                  >
                    {divisions.map((d) => (
                      <option key={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>District</label>
                  <select value={district} onChange={(e) => setDistrict(e.target.value)}>
                    {(selectedDivision?.districts || []).map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {["High School", "College", "Elementary", "Community"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>School / Organization</label>
                  <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="School or organization" />
                </div>

                <div className="field">
                  <label>Number of Scouts</label>
                  <input type="number" min="1" max="200" value={scoutCount} onChange={(e) => changeScoutCount(Number(e.target.value))} />
                </div>

                <div className="field">
                  <label>Number of Unit Leaders</label>
                  <input type="number" min="0" value={leaderCount} onChange={(e) => setLeaderCount(Math.max(0, Number(e.target.value)))} />
                </div>

                <div className="field full">
                  <h3>Scout Details</h3>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Complete Name</th>
                          <th>Year / Grade Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scouts.map((s, i) => (
                          <tr key={`${i}-${s.name}`}>
                            <td>{i + 1}</td>
                            <td>
                              <input
                                value={s.name}
                                onChange={(e) =>
                                  setScouts((list) =>
                                    list.map((item, index) => (index === i ? { ...item, name: e.target.value } : item))
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                value={s.grade}
                                onChange={(e) =>
                                  setScouts((list) =>
                                    list.map((item, index) => (index === i ? { ...item, grade: e.target.value } : item))
                                  )
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="field full">
                  <div className="actions" style={{ justifyContent: "space-between" }}>
                    <div className="muted">Estimated total: {money(registrationAmount)}</div>
                    <div className="actions">
                      <button type="button" className="secondary" onClick={() => setShowForm(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="primary">
                        {editId ? "Save Changes" : "Save Registration"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function AddDivision({ onAdd }: { onAdd: (x: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="actions">
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="Division name" />
      <button
        className="primary"
        onClick={() => {
          if (v.trim()) {
            onAdd(v.trim());
            setV("");
          }
        }}
      >
        Add
      </button>
    </div>
  );
}

function AddDistrict({ onAdd }: { onAdd: (x: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="actions">
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="New district" />
      <button
        className="secondary"
        onClick={() => {
          if (v.trim()) {
            onAdd(v.trim());
            setV("");
          }
        }}
      >
        Add district
      </button>
    </div>
  );
}
