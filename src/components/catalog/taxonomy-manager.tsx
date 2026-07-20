"use client";

import { useState } from "react";

type Item = { id: string; name: string; slug: string; active: boolean };

export function TaxonomyManager({
  kind,
  initialItems,
}: {
  kind: "categories" | "brands";
  initialItems: Item[];
}) {
  const [items, setItems] = useState(initialItems);
  const [message, setMessage] = useState("");
  const label = kind === "categories" ? "Kategori" : "Marka";
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/v1/admin/${kind}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), slug: form.get("slug") }),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result?.error?.message ?? `${label} oluşturulamadı.`);
    setItems((current) => [
      ...current,
      {
        id: result.data.id,
        name: result.data.name,
        slug: result.data.slug,
        active: kind === "categories" ? result.data.isActive : result.data.status === "ACTIVE",
      },
    ]);
    event.currentTarget.reset();
    setMessage(`${label} oluşturuldu.`);
  }
  async function toggle(item: Item) {
    const body =
      kind === "categories"
        ? { isActive: !item.active }
        : { status: item.active ? "INACTIVE" : "ACTIVE" };
    const singular = kind === "categories" ? "categories" : "brands";
    const response = await fetch(`/api/v1/admin/${singular}/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result?.error?.message ?? "Durum değiştirilemedi.");
    setItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? { ...candidate, active: !candidate.active } : candidate,
      ),
    );
    setMessage(`${label} durumu güncellendi.`);
  }
  return (
    <section className="onboarding-card">
      <form className="auth-form two-column" onSubmit={create}>
        <label>
          {label} adı
          <input name="name" required minLength={2} />
        </label>
        <label>
          URL kısa adı
          <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
        </label>
        <button className="button button-primary" type="submit">
          {label} oluştur
        </button>
      </form>
      {message && <p role="status">{message}</p>}
      <ul className="taxonomy-list">
        {items.map((item) => (
          <li key={item.id}>
            <span>
              <strong>{item.name}</strong>
              <small>
                /{item.slug} · {item.active ? "Aktif" : "Pasif"}
              </small>
            </span>
            <button className="button button-secondary" type="button" onClick={() => toggle(item)}>
              {item.active ? "Pasife al" : "Aktifleştir"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
