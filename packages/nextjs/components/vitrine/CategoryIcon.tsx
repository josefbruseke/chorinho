import React from "react";
import {
  BookOpenIcon,
  BuildingStorefrontIcon,
  ScissorsIcon,
  ShoppingBagIcon,
  SunIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

export const CategoryIcon = ({ iconKey, className = "w-4 h-4" }: { iconKey?: string; className?: string }) => {
  switch (iconKey) {
    case "cafe":
      return <BuildingStorefrontIcon className={className} />;
    case "lazer":
      return <SunIcon className={className} />;
    case "barbearia":
      return <ScissorsIcon className={className} />;
    case "cultura":
      return <BookOpenIcon className={className} />;
    case "mercado":
      return <ShoppingBagIcon className={className} />;
    default:
      return <TagIcon className={className} />;
  }
};
