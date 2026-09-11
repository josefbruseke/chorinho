"use client";

import { CategoryIcon } from "./CategoryIcon";
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
      className={`btn btn-sm rounded-xl ${selected === null ? "btn-primary" : "btn-ghost border-base-300"}`}
      onClick={() => onSelect(null)}
    >
      Todas
    </button>
    {CATEGORIES.filter(cat => !only || only.includes(cat.id)).map(cat => (
      <button
        key={cat.id}
        className={`btn btn-sm rounded-xl gap-1.5 ${selected === cat.id ? "btn-primary" : "btn-ghost border-base-300"}`}
        onClick={() => onSelect(cat.id)}
      >
        <CategoryIcon iconKey={cat.iconKey} className="w-4 h-4" />
        <span>{cat.label}</span>
      </button>
    ))}
  </div>
);
