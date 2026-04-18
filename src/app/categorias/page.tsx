"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string };

const SERIF: React.CSSProperties = { fontFamily: "var(--font-instrument-serif), serif" };
const DOT_COLORS = ["var(--accent)", "var(--cool)", "#C2883D", "var(--ink-4)", "var(--danger)"];

export default function CategoriasPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function fetchCategories() {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data);
    setLoading(false);
  }

  useEffect(() => { fetchCategories(); }, []);

  async function createCategory() {
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error al crear");
    } else {
      setNewName("");
      fetchCategories();
    }
    setCreating(false);
  }

  async function deleteCategory(id: string) {
    await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
    fetchCategories();
  }

  return (
    <div className="app-frame">
      <div className="app-shell">

        {/* ── Header ── */}
        <header className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <button
            onClick={() => router.back()}
            aria-label="Volver"
            style={{ width: 40, height: 40, borderRadius: 999, background: "var(--card)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ink)", flexShrink: 0 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 18, height: 18 }}>
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <div style={{ ...SERIF, fontSize: 22, letterSpacing: "-0.02em", color: "var(--ink)" }}>Categorías</div>
          <div style={{ width: 40 }} />
        </header>

        {/* ── Body ── */}
        <div className="page-body" style={{}}>
          <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5, margin: "6px 2px 18px" }}>
            Etiquetas para clasificar tus gastos. Puedes asignar{" "}
            <em style={{ ...SERIF, fontStyle: "italic", color: "var(--ink-2)" }}>varias</em>{" "}
            a un mismo gasto.
          </p>

          {/* Row de agregar */}
          <div style={{ display: "flex", gap: 8, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: 10, marginBottom: 16 }}>
            <input
              type="text"
              placeholder="ej: mamá, deporte, fiesta…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createCategory(); }}
              maxLength={50}
              style={{ flex: 1, fontFamily: "inherit", fontSize: 14, background: "transparent", border: 0, outline: "none", padding: "8px 10px", color: "var(--ink)" }}
            />
            <button
              onClick={createCategory}
              disabled={creating || !newName.trim()}
              style={{ padding: "11px 18px", borderRadius: 14, border: "none", background: "var(--ink)", color: "var(--bg)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500, opacity: (creating || !newName.trim()) ? 0.5 : 1, flexShrink: 0 }}
            >
              Agregar
            </button>
          </div>

          {error && (
            <p style={{ fontSize: 12, color: "var(--danger)", margin: "-10px 2px 14px" }}>{error}</p>
          )}

          {/* Lista */}
          {loading ? (
            <p style={{ textAlign: "center", color: "var(--ink-4)", fontSize: 13, padding: "20px 0" }}>Cargando…</p>
          ) : categories.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--ink-4)", fontSize: 13, padding: "20px 0" }}>No hay categorías aún</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {categories.map((cat, idx) => (
                <div
                  key={cat.id}
                  style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: DOT_COLORS[idx % DOT_COLORS.length], flexShrink: 0, display: "block" }} />
                  <span style={{ fontSize: 14.5, color: "var(--ink)", flex: 1 }}>{cat.name}</span>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    aria-label={`Eliminar ${cat.name}`}
                    style={{ width: 26, height: 26, borderRadius: 99, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink-4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
