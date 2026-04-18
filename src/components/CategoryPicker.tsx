"use client";

import { useState, useEffect } from "react";

type Category = { id: string; name: string; count?: number };

type Props = {
  selected: string[];
  onChange: (ids: string[]) => void;
};

export default function CategoryPicker({ selected, onChange }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setCategories).catch(() => {});
  }, []);

  const searchTrimmed = search.trim();
  const searchLower = searchTrimmed.toLowerCase();

  const displayed = searchLower
    ? categories.filter((c) => c.name.toLowerCase().includes(searchLower))
    : categories.slice(0, 20);

  const exactMatch = categories.some((c) => c.name.toLowerCase() === searchLower);
  const showCreate = searchTrimmed.length > 0 && !exactMatch;

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  async function createCategory() {
    if (!searchTrimmed || creating) return;
    setCreating(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: searchTrimmed }),
    });
    if (res.ok) {
      const cat: Category = await res.json();
      setCategories((prev) => [cat, ...prev]);
      onChange([...selected, cat.id]);
      setSearch("");
    }
    setCreating(false);
  }

  return (
    <div>
      {/* Buscador */}
      <input
        type="text"
        placeholder={`Buscar${categories.length > 20 ? " o crear" : ""}…`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); if (showCreate) createCategory(); }
        }}
        style={{
          width: "100%", fontFamily: "inherit", fontSize: 13,
          background: "var(--bg-soft)", color: "var(--ink)",
          border: "1px solid var(--line)", borderRadius: 10,
          padding: "8px 12px", outline: "none", boxSizing: "border-box",
          marginBottom: 8,
        }}
      />

      {/* Chips */}
      {displayed.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {displayed.map((cat) => {
            const sel = selected.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggle(cat.id)}
                style={{
                  fontFamily: "inherit", fontSize: 12.5,
                  background: sel ? "var(--accent)" : "var(--bg-soft)",
                  color: sel ? "var(--bg)" : "var(--ink-2)",
                  border: sel ? "1px solid var(--accent)" : "1px solid var(--line)",
                  borderRadius: 99, padding: "7px 14px", cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Crear nueva */}
      {showCreate && (
        <button
          type="button"
          onClick={createCategory}
          disabled={creating}
          style={{
            marginTop: displayed.length > 0 ? 8 : 0,
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: "inherit", fontSize: 13, fontWeight: 500,
            background: "none", border: "none", cursor: "pointer",
            color: "var(--accent)", padding: 0,
            opacity: creating ? 0.5 : 1,
          }}
        >
          <span style={{
            width: 20, height: 20, borderRadius: 99, background: "var(--accent-soft)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, color: "var(--accent)", flexShrink: 0,
          }}>+</span>
          {creating ? "Creando…" : `Crear "${searchTrimmed}"`}
        </button>
      )}

      {displayed.length === 0 && !showCreate && categories.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--ink-4)", margin: 0 }}>Sin categorías aún</p>
      )}
    </div>
  );
}
