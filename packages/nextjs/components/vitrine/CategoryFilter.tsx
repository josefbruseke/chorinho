"use client";

import { CATEGORIES } from "~~/utils/vitrine";

/**
 * Category chips. `selected === null` means "all". `only` restricts which
 * categories are offered (e.g. the "Outras experiências" section excludes
 * gastronomy, which has its own section).
 */
export const CategoryFilter = ({
  selected,
  onSelect,
  only,
}: {
  selected: number | null;
  onSelect: (category: number | null) => void;
  only?: readonly number[];
}) => (
  <div className="flex flex-wrap gap-2">
    <button
      className={`btn btn-sm ${selected === null ? "btn-primary" : "btn-ghost border-base-300"}`}
      onClick={() => onSelect(null)}
    >
      Todas
    </button>
    {CATEGORIES.filter(cat => !only || only.includes(cat.id)).map(cat => (
      <button
        key={cat.id}
        className={`btn btn-sm ${selected === cat.id ? "btn-primary" : "btn-ghost border-base-300"}`}
        onClick={() => onSelect(cat.id)}
      >
        {cat.emoji} {cat.label}
      </button>
    ))}
  </div>
);
