import Image from "next/image";
import {
  Car,
  ShoppingBag,
  Utensils,
  House,
  Heart,
  Wallet,
  ArrowDownRight,
  Target,
} from "lucide-react";
export function CategoryGlyph({
  category,
  income = false,
}: {
  category: string;
  income?: boolean;
}) {
  const name = category.toLowerCase();
  const Icon = income
    ? ArrowDownRight
    : /food|dining|grocer|אוכל|מצרכ/.test(name)
      ? Utensils
      : /transport|תחבורה/.test(name)
        ? Car
        : /shop|קניות/.test(name)
          ? ShoppingBag
          : /hous|bills|דיור|חשבונ/.test(name)
            ? House
            : /health|בריאות/.test(name)
              ? Heart
              : Wallet;
  return <Icon size={20} />;
}
export function GoalArtwork({ name }: { name: string }) {
  const travel = /trip|travel|adventure|vacation|טיול|חופש|תאילנד/i.test(name),
    house = /house|home|בית|דירה/i.test(name),
    car = /car|vehicle|רכב|מכונית/i.test(name);
  if (!travel && !house && !car)
    return (
      <span className="generic-goal-art">
        <Target size={32} />
      </span>
    );
  const index = travel ? 1 : house ? 2 : 0;
  return (
    <span
      className="goal-photo"
      role="img"
      aria-label={
        travel
          ? "Decorative travel goal photograph"
          : house
            ? "Decorative home goal photograph"
            : "Decorative car goal photograph"
      }
    >
      <Image
        src="/goal-photos.png"
        width={1536}
        height={512}
        alt=""
        sizes="(max-width:900px) 246px,264px"
        style={{ left: `${-index * 100}%` }}
      />
    </span>
  );
}
