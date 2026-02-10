import { useMemo, useState } from "react";
import { Star } from "phosphor-react";

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

function snapToStep(v, step) {
  const snapped = Math.round(v / step) * step;
  return Number(snapped.toFixed(1));
}

export default function StarRating({
  value = 0,
  onChange,
  readOnly = false,
  size = 20,
  step = 0.5, // set to 1 if you want whole stars only
  className = "",
  ariaLabel = "Star rating",
}) {
  const [hoverValue, setHoverValue] = useState(null);

  const stars = useMemo(() => [1, 2, 3, 4, 5], []);
  const safeStep = step === 0.5 ? 0.5 : 1;
  const steps = safeStep === 0.5 ? [0.5, 1] : [1];

  const displayValue = hoverValue ?? value;

  const setRating = (next) => {
    if (readOnly || typeof onChange !== "function") return;

    const normalized = snapToStep(clamp(next, 0, 5), safeStep);

    // clicking same rating clears
    if (Math.abs(normalized - value) < 0.001) onChange(0);
    else onChange(normalized);
  };

  const handleKeyDown = (e) => {
    if (readOnly || typeof onChange !== "function") return;

    const k = e.key;
    if (k === "ArrowRight" || k === "ArrowUp") {
      e.preventDefault();
      setRating(value + safeStep);
      return;
    }
    if (k === "ArrowLeft" || k === "ArrowDown") {
      e.preventDefault();
      setRating(value - safeStep);
      return;
    }
    if (k === "Home") {
      e.preventDefault();
      setRating(0);
      return;
    }
    if (k === "End") {
      e.preventDefault();
      setRating(5);
      return;
    }
    if (k === "Enter" || k === " ") {
      e.preventDefault();
      setRating(hoverValue ?? value);
      return;
    }
  };

  return (
    <div
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={value}
      aria-valuetext={`${value} out of 5`}
      aria-readonly={readOnly}
      tabIndex={readOnly ? -1 : 0}
      onKeyDown={handleKeyDown}
      onMouseLeave={() => setHoverValue(null)}
      className={[
        "inline-flex items-center gap-1 select-none outline-none",
        !readOnly
          ? "rounded-md focus-visible:ring-4 focus-visible:ring-[rgba(247,121,62,0.25)]"
          : "",
        className,
      ].join(" ")}
    >
      {stars.map((star) => {
        // fillAmount is 0..1 for this star
        const fillAmount = clamp(displayValue - (star - 1), 0, 1);

        return (
          <div
            key={star}
            className="relative"
            style={{ width: size, height: size }}
          >
            {/* Outline star */}
            <Star
              size={size}
              weight="regular"
              className="block"
              style={{ color: "rgba(20,20,20,0.28)" }}
            />

            {/* Filled overlay clipped to % width */}
            <div
              className="absolute left-0 top-0 h-full overflow-hidden"
              style={{ width: `${fillAmount * 100}%` }}
            >
              <Star
                size={size}
                weight="fill"
                className="block"
                style={{ color: "var(--accent)" }}
              />
            </div>

            {/* Click/hover hit areas */}
            {!readOnly && (
              <div className="absolute inset-0 flex">
                {steps.map((partial) => {
                  const nextValue = snapToStep(
                    star - 1 + (partial === 0.5 ? 0.5 : 1),
                    safeStep
                  );

                  return (
                    <button
                      key={`${star}-${partial}`}
                      type="button"
                      aria-label={`Rate ${nextValue} stars`}
                      className="h-full flex-1 bg-transparent p-0 m-0 border-0 cursor-pointer"
                      onMouseEnter={() => setHoverValue(nextValue)}
                      onFocus={() => setHoverValue(nextValue)}
                      onPointerDown={(ev) => {
                        // prevents double-trigger on mobile (touch + click)
                        ev.preventDefault();
                        setRating(nextValue);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
