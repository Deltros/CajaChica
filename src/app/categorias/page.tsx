"use client";

import { useEffect, useState } from "react";
import HamburgerMenu from "@/components/HamburgerMenu";

type Category = { id: string; name: string };

export default function CategoriasPage() {
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <HamburgerMenu />
        <h1 className="text-lg font-semibold text-gray-800">Categorías de gastos</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Crear nueva categoría */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-3">Crea tags para clasificar tus gastos. Puedes asignar múltiples categorías a cada gasto.</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="ej: mamá, deporte, fiesta..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createCategory(); }}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={50}
            />
            <button
              onClick={createCategory}
              disabled={creating || !newName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shrink-0"
            >
              Agregar
            </button>
          </div>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </section>

        {/* Lista de categorías */}
        {loading ? (
          <p className="text-center text-gray-400 py-6">Cargando...</p>
        ) : categories.length === 0 ? (
          <p className="text-center text-gray-400 py-6">No hay categorías aún</p>
        ) : (
          <section className="bg-white rounded-xl shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-50">
              {categories.map((cat) => (
                <li key={cat.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-800 bg-gray-100 px-2.5 py-1 rounded-full">{cat.name}</span>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="text-gray-300 hover:text-red-400 text-xs transition-colors"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
