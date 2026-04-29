import React, { useEffect, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Select } from "../components/Select";

export function AdminUsers() {
  console.log("AdminUsers component rendered");
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [newRole, setNewRole] = useState("PATIENT");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get("/departments").then((r) => setDepartments(r.data.departments || [])).catch(() => setDepartments([]));
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Loading users with params:", { q: q.trim() || undefined, role: role || undefined, limit, offset: (page - 1) * limit });
      const { data } = await api.get("/admin/users", { params: { q: q.trim() || undefined, role: role || undefined, limit, offset: (page - 1) * limit } });
      console.log("API response:", data);
      setUsers(data.users);
      setTotal(data.total);
    } catch (e) {
      console.error("API error:", e);
      toast.error("Failed to load users");
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [q, role, page]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      load();
    }, 300); // debounce 300ms
    return () => clearTimeout(timeout);
  }, [load]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="text-2xl font-semibold">Users</div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">Search</div>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="name/email/phone" />
          </div>
          <div>
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">Role</div>
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">All</option>
              <option value="ADMIN">ADMIN</option>
              <option value="RECEPTIONIST">RECEPTIONIST</option>
              <option value="DOCTOR">DOCTOR</option>
              <option value="PATIENT">PATIENT</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold">Create user</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" />
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          <Select
            value={newRole}
            onChange={(e) => {
              setNewRole(e.target.value);
              if (e.target.value !== "PATIENT" && e.target.value !== "DOCTOR") {
                setDepartmentId("");
              }
            }}
          >
            <option value="PATIENT">PATIENT</option>
            <option value="DOCTOR">DOCTOR</option>
            <option value="RECEPTIONIST">RECEPTIONIST</option>
            <option value="ADMIN">ADMIN</option>
          </Select>
        </div>
        {(newRole === "PATIENT" || newRole === "DOCTOR") && (
          <div className="mt-3">
            <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">Department</div>
            <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">-- Select department --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="mt-3">
          <Button
            disabled={creating || (newRole === "PATIENT" && !departmentId)}
            onClick={async () => {
              setCreating(true);
              try {
                await api.post("/admin/users", {
                  fullName,
                  email,
                  phone: phone || undefined,
                  password,
                  role: newRole,
                  departmentId: departmentId ? Number(departmentId) : undefined
                });
                toast.success("Created");
                setFullName("");
                setEmail("");
                setPhone("");
                setPassword("");
                setNewRole("PATIENT");
                setDepartmentId("");
                await load();
              } catch (e) {
                toast.error(e?.response?.data?.error?.message || "Failed");
              } finally {
                setCreating(false);
              }
            }}
          >
            {creating ? "..." : "Create"}
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">List ({total} users)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-6 text-center text-slate-500 dark:text-slate-400" colSpan={4}>
                    Loading...
                  </td>
                </tr>
              ) : (
                <>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="p-3">{u.id}</td>
                      <td className="p-3">{u.full_name}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3">{u.role}</td>
                    </tr>
                  ))}
                  {!users.length ? (
                    <tr>
                      <td className="p-6 text-center text-slate-500 dark:text-slate-400" colSpan={4}>
                        No users found
                      </td>
                    </tr>
                  ) : null}
                </>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 p-4 dark:border-slate-800">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

